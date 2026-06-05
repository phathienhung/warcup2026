-- SECURITY PATCH V2: Atomic Operations & Race Condition Prevention
-- Run this script in the Supabase SQL Editor.

-- 1. TAP RPC (Atomic tap processing to prevent infinite energy exploits)
CREATE OR REPLACE FUNCTION process_tap(p_user_id BIGINT, p_taps INT, p_speed INT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_energy_cost INT;
    v_votes_gained BIGINT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_energy_gained INT;
    v_current_regenned_energy INT;
    v_valid_taps INT;
    v_config RECORD;
    v_new_level INT;
    v_level_up_bonus_speed INT := 0;
    v_level_up_bonus_regen INT := 0;
    v_level_up_bonus_max INT := 0;
BEGIN
    IF p_taps < 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid tap count');
    END IF;

    -- Lock the user row for update
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Calculate offline regen based on last_login
    v_energy_gained := FLOOR(EXTRACT(EPOCH FROM (v_now - v_user.last_login)) / 1.0) * 1; 
    v_current_regenned_energy := v_user.energy;

    v_energy_cost := p_taps * p_speed;
    v_valid_taps := p_taps;
    
    IF v_user.energy < v_energy_cost THEN
        -- Clamp to max affordable taps
        v_valid_taps := FLOOR(v_user.energy / p_speed);
        v_energy_cost := v_valid_taps * p_speed;
    END IF;

    IF v_valid_taps <= 0 AND p_taps > 0 THEN
        RETURN json_build_object('success', true, 'valid_taps', 0, 'new_energy', v_user.energy);
    END IF;

    v_votes_gained := v_valid_taps * p_speed;

    UPDATE users 
    SET 
        energy = energy - v_energy_cost,
        total_votes = total_votes + v_votes_gained,
        available_votes = available_votes + v_votes_gained,
        total_taps = total_taps + p_taps,
        xp = xp + v_valid_taps,
        last_login = v_now
    WHERE telegram_id = p_user_id
    RETURNING * INTO v_user;

    RETURN json_build_object(
        'success', true,
        'valid_taps', v_valid_taps,
        'votes_gained', v_votes_gained,
        'new_energy', v_user.energy,
        'new_total_votes', v_user.total_votes,
        'new_available_votes', v_user.available_votes,
        'new_xp', v_user.xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. PREDICTION RPC
CREATE OR REPLACE FUNCTION make_prediction(p_user_id BIGINT, p_match_id UUID, p_team TEXT, p_votes BIGINT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_match RECORD;
BEGIN
    IF p_votes <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid stake');
    END IF;

    -- Lock user
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF v_user.available_votes < p_votes THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient votes');
    END IF;

    -- Check match
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF v_match.status != 'voting' THEN
        RETURN json_build_object('success', false, 'error', 'Match not open for voting');
    END IF;

    -- Deduct votes
    UPDATE users SET available_votes = available_votes - p_votes WHERE telegram_id = p_user_id;

    -- Update match pools
    IF p_team = v_match.team_a THEN
        UPDATE matches SET total_votes_a = total_votes_a + p_votes WHERE id = p_match_id;
    ELSIF p_team = v_match.team_b THEN
        UPDATE matches SET total_votes_b = total_votes_b + p_votes WHERE id = p_match_id;
    ELSE
        UPDATE matches SET total_votes_draw = total_votes_draw + p_votes WHERE id = p_match_id;
    END IF;

    -- Insert prediction
    INSERT INTO predictions (user_id, match_id, predicted_team, votes_staked)
    VALUES (p_user_id, p_match_id, p_team, p_votes);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. DEPOSIT TON RPC
CREATE OR REPLACE FUNCTION deposit_ton(p_user_id BIGINT, p_tx_hash TEXT, p_amount FLOAT)
RETURNS JSON AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check if hash already processed
    SELECT EXISTS(SELECT 1 FROM wallet_transactions WHERE tx_hash = p_tx_hash) INTO v_exists;
    IF v_exists THEN
        RETURN json_build_object('success', false, 'error', 'Transaction already processed');
    END IF;

    -- Insert transaction
    INSERT INTO wallet_transactions (user_id, tx_type, amount_ton, tx_hash, status)
    VALUES (p_user_id, 'deposit', p_amount, p_tx_hash, 'completed');

    -- Credit user
    UPDATE users SET ton_balance = COALESCE(ton_balance, 0) + p_amount, ton_deposited = COALESCE(ton_deposited, 0) + p_amount WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. BUY SHOP ITEM RPC
CREATE OR REPLACE FUNCTION buy_shop_item(p_user_id BIGINT, p_item_id TEXT, p_quantity INT, p_price BIGINT, p_price_type TEXT, p_reward_type TEXT, p_reward_value INT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid quantity');
    END IF;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;

    IF p_price_type = 'votes' THEN
        IF v_user.available_votes < p_price THEN
            RETURN json_build_object('success', false, 'error', 'Insufficient votes');
        END IF;
        UPDATE users SET available_votes = available_votes - p_price WHERE telegram_id = p_user_id;
    ELSIF p_price_type = 'ton' THEN
        IF v_user.ton_balance < p_price THEN
            RETURN json_build_object('success', false, 'error', 'Insufficient TON');
        END IF;
        UPDATE users SET ton_balance = ton_balance - p_price WHERE telegram_id = p_user_id;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid price type');
    END IF;

    -- Apply reward
    IF p_reward_type = 'energy' THEN
        UPDATE users SET energy = energy + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = energy_regen_bonus + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = max_energy + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = mining_speed_bonus + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'spin' THEN
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) + p_reward_value WHERE telegram_id = p_user_id;
    END IF;

    -- Log purchase
    INSERT INTO shop_purchases (user_id, item_type, item_id, quantity, price_paid, price_type)
    VALUES (p_user_id, p_reward_type, p_item_id, p_quantity, p_price, p_price_type);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. BUY NFT RPC
CREATE OR REPLACE FUNCTION buy_nft(p_user_id BIGINT, p_template_id UUID, p_price BIGINT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_template RECORD;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF v_user.available_votes < p_price THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient votes');
    END IF;

    SELECT * INTO v_template FROM nft_templates WHERE id = p_template_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'NFT not found');
    END IF;
    
    IF v_template.minted_count >= v_template.total_supply THEN
        RETURN json_build_object('success', false, 'error', 'NFT sold out');
    END IF;

    -- Deduct
    UPDATE users SET available_votes = available_votes - p_price WHERE telegram_id = p_user_id;
    
    -- Increment mint
    UPDATE nft_templates SET minted_count = minted_count + 1 WHERE id = p_template_id;
    
    -- Assign NFT
    INSERT INTO user_nfts (user_id, nft_template_id, mint_number)
    VALUES (p_user_id, p_template_id, v_template.minted_count + 1);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. EXECUTE SPIN RPC
CREATE OR REPLACE FUNCTION execute_spin(p_user_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_config RECORD;
    v_segments JSONB;
    v_segment JSONB;
    v_idx INT;
    v_rand FLOAT;
    v_cumulative FLOAT := 0;
    v_target_index INT := 0;
    v_reward_type TEXT;
    v_reward_amount FLOAT;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    
    IF v_user.last_free_spin != v_today THEN
        UPDATE users SET last_free_spin = v_today WHERE telegram_id = p_user_id;
    ELSIF v_user.spin_tickets > 0 THEN
        UPDATE users SET spin_tickets = spin_tickets - 1 WHERE telegram_id = p_user_id;
    ELSE
        RETURN json_build_object('success', false, 'error', 'No tickets available');
    END IF;

    SELECT spin_segments_json INTO v_segments FROM game_config WHERE id = 1;
    IF v_segments IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Spin configuration not found');
    END IF;

    v_rand := random();
    
    FOR v_idx IN 0 .. jsonb_array_length(v_segments) - 1 LOOP
        v_segment := v_segments->v_idx;
        v_cumulative := v_cumulative + COALESCE((v_segment->>'probability')::FLOAT, 0);
        IF v_rand <= v_cumulative THEN
            v_target_index := v_idx;
            v_reward_type := v_segment->>'type';
            v_reward_amount := (v_segment->>'reward')::FLOAT;
            EXIT;
        END IF;
    END LOOP;

    -- Apply reward
    IF v_reward_type = 'energy' THEN
        UPDATE users SET energy = energy + v_reward_amount WHERE telegram_id = p_user_id;
    ELSIF v_reward_type = 'votes' THEN
        UPDATE users SET total_votes = total_votes + v_reward_amount, available_votes = available_votes + v_reward_amount WHERE telegram_id = p_user_id;
    ELSIF v_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = mining_speed_bonus + v_reward_amount WHERE telegram_id = p_user_id;
    ELSIF v_reward_type = 'xp' THEN
        UPDATE users SET xp = xp + v_reward_amount WHERE telegram_id = p_user_id;
    ELSIF v_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = energy_regen_bonus + v_reward_amount WHERE telegram_id = p_user_id;
    ELSIF v_reward_type = 'ton' THEN
        UPDATE users SET ton_balance = ton_balance + v_reward_amount WHERE telegram_id = p_user_id;
    END IF;

    INSERT INTO spin_results (user_id, reward_type, reward_amount) VALUES (p_user_id, v_reward_type, v_reward_amount);

    RETURN json_build_object('success', true, 'targetIndex', v_target_index, 'rewardType', v_reward_type, 'rewardAmount', v_reward_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. GRANT REWARD RPC (Server-side utility)
CREATE OR REPLACE FUNCTION grant_reward(p_user_id BIGINT, p_reward_type TEXT, p_reward_value FLOAT)
RETURNS void AS $$
BEGIN
    IF p_reward_type = 'energy' THEN
        UPDATE users SET energy = energy + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'votes' THEN
        UPDATE users SET total_votes = total_votes + p_reward_value, available_votes = available_votes + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = mining_speed_bonus + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'xp' THEN
        UPDATE users SET xp = xp + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = energy_regen_bonus + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = max_energy + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'ton' THEN
        UPDATE users SET ton_balance = ton_balance + p_reward_value WHERE telegram_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. CLAIM STREAK RPC
CREATE OR REPLACE FUNCTION claim_streak(p_user_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_today DATE := CURRENT_DATE;
    v_new_streak INT;
    v_speed_reward FLOAT := 1;
    v_max_energy_reward FLOAT := 100;
    v_config RECORD;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    
    IF v_user.last_streak_claim = v_today THEN
        RETURN json_build_object('success', false, 'error', 'Already claimed today');
    END IF;

    v_new_streak := COALESCE(v_user.login_streak, 0) + 1;
    IF v_new_streak > 7 THEN
        v_new_streak := 1;
    END IF;

    -- try to read from streak_rewards table if exists (assuming it does or ignore)
    BEGIN
        SELECT * INTO v_config FROM streak_rewards WHERE day = v_new_streak;
        IF FOUND THEN
            v_speed_reward := COALESCE(v_config.speed_reward, 1);
            v_max_energy_reward := COALESCE(v_config.max_energy_reward, 100);
        END IF;
    EXCEPTION WHEN undefined_table THEN
        -- ignore
    END;

    UPDATE users SET 
        last_streak_claim = v_today,
        login_streak = v_new_streak,
        mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + v_speed_reward,
        max_energy = COALESCE(max_energy, 1000) + v_max_energy_reward
    WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true, 'day', v_new_streak, 'speedReward', v_speed_reward, 'maxEnergyReward', v_max_energy_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;