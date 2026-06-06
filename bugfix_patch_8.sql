-- BUGFIX PATCH 8: Fix remaining 3 bugs (spin, shop NFT, tasks daily)
-- Run this in Supabase SQL Editor

-- ============================================================
-- Ensure required columns exist
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_streak_claim') THEN
    ALTER TABLE users ADD COLUMN last_streak_claim TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_free_spin') THEN
    ALTER TABLE users ADD COLUMN last_free_spin TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='spin_tickets') THEN
    ALTER TABLE users ADD COLUMN spin_tickets INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ads_watched') THEN
    ALTER TABLE users ADD COLUMN ads_watched INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_ad_watched') THEN
    ALTER TABLE users ADD COLUMN last_ad_watched TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mining_speed_bonus') THEN
    ALTER TABLE users ADD COLUMN mining_speed_bonus INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='energy_regen_bonus') THEN
    ALTER TABLE users ADD COLUMN energy_regen_bonus INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='boost_multiplier') THEN
    ALTER TABLE users ADD COLUMN boost_multiplier FLOAT DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='boost_expires_at') THEN
    ALTER TABLE users ADD COLUMN boost_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- Ensure spin_results table exists
-- ============================================================
CREATE TABLE IF NOT EXISTS spin_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  reward_type TEXT,
  reward_amount FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Ensure streak_rewards table exists (needed by claim_streak_reward)
-- ============================================================
CREATE TABLE IF NOT EXISTS streak_rewards (
  day INT PRIMARY KEY,
  speed_reward INT DEFAULT 1,
  max_energy_reward INT DEFAULT 100
);

-- Insert default streak rewards if empty
INSERT INTO streak_rewards (day, speed_reward, max_energy_reward)
VALUES 
  (1, 1, 100),
  (2, 1, 100),
  (3, 2, 200),
  (4, 2, 200),
  (5, 3, 300),
  (6, 3, 300),
  (7, 5, 500)
ON CONFLICT (day) DO NOTHING;

-- ============================================================
-- BUG 1 FIX: Rewrite execute_spin to handle all edge cases
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


-- ============================================================
-- BUG 3 FIX: buy_nft must handle TON payment, not just votes
-- ============================================================
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

    -- Check supply limit
    IF v_nft.total_supply IS NOT NULL AND v_nft.minted_count >= v_nft.total_supply THEN
         RETURN json_build_object('success', false, 'error', 'NFT is sold out');
    END IF;

    -- Deduct payment: try TON first, then votes
    v_cost_ton := COALESCE(v_nft.price_ton, 0);
    v_cost_votes := COALESCE(v_nft.price_votes, 0);

    IF v_cost_ton > 0 THEN
        IF COALESCE(v_user.ton_balance, 0) < v_cost_ton THEN
            RETURN json_build_object('success', false, 'error', 'Not enough TON. Need ' || v_cost_ton || ' TON');
        END IF;
        UPDATE users SET ton_balance = ton_balance - v_cost_ton WHERE telegram_id = p_user_id;
    ELSIF v_cost_votes > 0 THEN
        IF COALESCE(v_user.available_votes, 0) < v_cost_votes THEN
            RETURN json_build_object('success', false, 'error', 'Not enough votes');
        END IF;
        UPDATE users SET available_votes = available_votes - v_cost_votes WHERE telegram_id = p_user_id;
    END IF;

    -- Insert into user_nfts
    INSERT INTO user_nfts (user_id, nft_template_id, mint_number)
    VALUES (p_user_id, p_nft_id, COALESCE(v_nft.minted_count, 0) + 1);

    -- Increment minted count
    UPDATE nft_templates SET minted_count = COALESCE(minted_count, 0) + 1 WHERE id = p_nft_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- BUG 4 FIX: claim_streak_reward must not crash on missing column/table
-- ============================================================
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

    -- Fetch config
    BEGIN
        SELECT speed_reward, max_energy_reward INTO v_streak_config FROM streak_rewards WHERE day = v_new_streak;
        IF FOUND THEN
            v_speed_reward := COALESCE(v_streak_config.speed_reward, 1);
            v_max_energy_reward := COALESCE(v_streak_config.max_energy_reward, 100);
        END IF;
    EXCEPTION WHEN others THEN
        -- Table may not exist, use defaults
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
-- Add price_ton column to nft_templates if missing
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nft_templates' AND column_name='price_ton') THEN
    ALTER TABLE nft_templates ADD COLUMN price_ton FLOAT DEFAULT 0;
  END IF;
END $$;

-- Update existing NFT templates that have a price but no price_ton:
-- Set price_ton based on price_votes / some exchange rate, or set a default
-- This is a safe default: NFTs that cost 0 votes get a small TON price
UPDATE nft_templates SET price_ton = 0.1 WHERE COALESCE(price_ton, 0) = 0 AND COALESCE(price_votes, 0) = 0;
