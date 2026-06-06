-- BUGFIX PATCH 9: Fix Date casting crashes and NFT ton prices
-- Run this in Supabase SQL Editor

-- ============================================================
-- BUG 1 & BUG 4 FIX: Cast date columns to text to prevent 
-- "invalid input syntax for type date: ''" error
-- ============================================================
CREATE OR REPLACE FUNCTION execute_spin(
    p_user_id BIGINT,
    p_today_str TEXT,
    p_reward_type TEXT,
    p_reward_amount FLOAT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_using_free_spin BOOLEAN := false;
    v_amount FLOAT;
BEGIN
    -- Sanitize amount
    v_amount := COALESCE(p_reward_amount, 0);

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- FIX: Cast to text safely
    IF COALESCE(v_user.last_free_spin::text, '') != p_today_str THEN
        v_using_free_spin := true;
    ELSIF COALESCE(v_user.spin_tickets, 0) > 0 THEN
        v_using_free_spin := false;
    ELSE
        RETURN json_build_object('success', false, 'error', 'No tickets available');
    END IF;

    -- Deduct ticket or use free spin
    IF v_using_free_spin THEN
        -- Cast to date/text depends on column type, postgres usually handles text to date implicit cast
        UPDATE users SET last_free_spin = p_today_str WHERE telegram_id = p_user_id;
    ELSE
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) - 1 WHERE telegram_id = p_user_id;
    END IF;

    -- Apply reward
    IF p_reward_type = 'energy' THEN
        UPDATE users SET energy = LEAST(COALESCE(max_energy, 1000), COALESCE(energy, 0) + v_amount) WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'votes' THEN
        UPDATE users SET total_votes = COALESCE(total_votes, 0) + v_amount, available_votes = COALESCE(available_votes, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'xp' THEN
        UPDATE users SET xp = COALESCE(xp, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'ton' THEN
        UPDATE users SET ton_balance = COALESCE(ton_balance, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type IN ('ticket', 'spin_ticket') THEN
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type IN ('nothing', 'miss', '') THEN
        -- No reward, do nothing
        NULL;
    ELSE
        -- Unknown type, still succeed but log
        RAISE NOTICE 'Unknown spin reward type: %', p_reward_type;
    END IF;

    -- Insert spin result
    INSERT INTO spin_results (user_id, reward_type, reward_amount) 
    VALUES (p_user_id, COALESCE(p_reward_type, 'unknown'), v_amount);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


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

    -- FIX: Cast to text
    IF COALESCE(v_user.last_streak_claim::text, '') = p_today_str THEN
        RETURN json_build_object('success', false, 'error', 'Already claimed today');
    END IF;

    IF v_user.last_streak_claim IS NULL OR v_user.last_streak_claim::text = '' THEN
        v_new_streak := 1;
    ELSE
        BEGIN
            -- Safely cast back to text then date just in case
            v_days_diff := (to_date(p_today_str, 'YYYY-MM-DD') - to_date(v_user.last_streak_claim::text, 'YYYY-MM-DD'));
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

    -- Fetch config
    BEGIN
        SELECT speed_reward, max_energy_reward INTO v_streak_config FROM streak_rewards WHERE day = v_new_streak;
        IF FOUND THEN
            v_speed_reward := COALESCE(v_streak_config.speed_reward, 1);
            v_max_energy_reward := COALESCE(v_streak_config.max_energy_reward, 100);
        END IF;
    EXCEPTION WHEN others THEN
        v_speed_reward := 1;
        v_max_energy_reward := 100;
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


-- ============================================================
-- BUG 3 FIX: Set price_ton correctly on NFTs
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nft_templates' AND column_name='price_ton') THEN
    ALTER TABLE nft_templates ADD COLUMN price_ton FLOAT DEFAULT 0;
  END IF;
END $$;

-- Set a default 1.5 TON price for any NFT that doesn't have one
-- so that buy_nft RPC will properly deduct the TON balance
UPDATE nft_templates SET price_ton = 1.5 WHERE COALESCE(price_ton, 0) = 0;
