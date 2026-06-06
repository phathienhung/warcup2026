-- SECURITY PATCH 5: Atomic RPCs for NFT, Spin, and fixes for Streak Logic

-- 1. Atomic Buy NFT
CREATE OR REPLACE FUNCTION buy_nft(
    p_user_id BIGINT,
    p_nft_id UUID
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_nft RECORD;
    v_cost_votes BIGINT;
    v_cost_ton FLOAT;
BEGIN
    SELECT * INTO v_nft FROM nft_templates WHERE id = p_nft_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'NFT not found');
    END IF;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Assume the cost is in votes (based on earlier schema) or TON if defined.
    -- Assuming price_votes
    v_cost_votes := COALESCE(v_nft.price_votes, 0);

    IF v_cost_votes > 0 THEN
        IF COALESCE(v_user.available_votes, 0) < v_cost_votes THEN
            RETURN json_build_object('success', false, 'error', 'Not enough votes');
        END IF;
        
        UPDATE users SET available_votes = available_votes - v_cost_votes WHERE telegram_id = p_user_id;
    END IF;

    -- Check total_supply limit if applicable
    IF v_nft.total_supply IS NOT NULL AND v_nft.minted_count >= v_nft.total_supply THEN
         RETURN json_build_object('success', false, 'error', 'NFT is sold out');
    END IF;

    -- Insert into user_nfts
    INSERT INTO user_nfts (user_id, nft_template_id, mint_number)
    VALUES (p_user_id, p_nft_id, v_nft.minted_count + 1);

    -- Increment minted count
    UPDATE nft_templates SET minted_count = minted_count + 1 WHERE id = p_nft_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- 2. Atomic Execute Spin
CREATE OR REPLACE FUNCTION execute_spin(
    p_user_id BIGINT,
    p_today_str TEXT,
    p_reward_type TEXT,
    p_reward_amount FLOAT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_using_free_spin BOOLEAN := false;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF COALESCE(v_user.last_free_spin, '') != p_today_str THEN
        v_using_free_spin := true;
    ELSIF COALESCE(v_user.spin_tickets, 0) > 0 THEN
        v_using_free_spin := false;
    ELSE
        RETURN json_build_object('success', false, 'error', 'No tickets available');
    END IF;

    -- Deduct ticket or use free spin
    IF v_using_free_spin THEN
        UPDATE users SET last_free_spin = p_today_str WHERE telegram_id = p_user_id;
    ELSE
        UPDATE users SET spin_tickets = spin_tickets - 1 WHERE telegram_id = p_user_id;
    END IF;

    -- Apply reward
    IF p_reward_type = 'energy' THEN
        UPDATE users SET energy = COALESCE(energy, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'votes' THEN
        UPDATE users SET total_votes = COALESCE(total_votes, 0) + p_reward_amount, available_votes = COALESCE(available_votes, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'xp' THEN
        UPDATE users SET xp = COALESCE(xp, 0) + p_reward_amount WHERE telegram_id = p_user_id;
        -- Assuming level-up logic is handled separately or client-side for now
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'ton' THEN
        UPDATE users SET ton_balance = COALESCE(ton_balance, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    END IF;

    INSERT INTO spin_results (user_id, reward_type, reward_amount) VALUES (p_user_id, p_reward_type, p_reward_amount);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- 3. Fix Claim Streak Reward Logic
CREATE OR REPLACE FUNCTION claim_streak_reward(
    p_user_id BIGINT,
    p_today_str TEXT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_new_streak INT;
    v_speed_reward INT := 1;
    v_max_energy_reward INT := 100;
    v_streak_config RECORD;
    v_days_diff INT;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF COALESCE(v_user.last_streak_claim, '') = p_today_str THEN
        RETURN json_build_object('success', false, 'error', 'Already claimed today');
    END IF;

    IF v_user.last_streak_claim IS NULL OR v_user.last_streak_claim = '' THEN
        v_new_streak := 1;
    ELSE
        BEGIN
            v_days_diff := (to_date(p_today_str, 'YYYY-MM-DD') - to_date(v_user.last_streak_claim, 'YYYY-MM-DD'));
            IF v_days_diff = 1 THEN
                v_new_streak := COALESCE(v_user.login_streak, 0) + 1;
            ELSE
                v_new_streak := 1;
            END IF;
        EXCEPTION WHEN others THEN
            v_new_streak := 1;
        END;
    END IF;

    IF v_new_streak > 7 THEN
        v_new_streak := 1;
    END IF;

    -- Fetch config if available
    BEGIN
        SELECT speed_reward, max_energy_reward INTO v_streak_config FROM streak_rewards WHERE day = v_new_streak;
        IF FOUND THEN
            v_speed_reward := COALESCE(v_streak_config.speed_reward, 1);
            v_max_energy_reward := COALESCE(v_streak_config.max_energy_reward, 100);
        END IF;
    EXCEPTION WHEN undefined_table THEN
        -- ignore
    END;

    UPDATE users SET 
        last_streak_claim = p_today_str,
        login_streak = v_new_streak,
        mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + v_speed_reward,
        max_energy = COALESCE(max_energy, 1000) + v_max_energy_reward
    WHERE telegram_id = p_user_id;

    RETURN json_build_object(
        'success', true, 
        'day', v_new_streak, 
        'speedReward', v_speed_reward, 
        'maxEnergyReward', v_max_energy_reward
    );
END;
$$ LANGUAGE plpgsql;
