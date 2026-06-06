-- SECURITY PATCH 6: Atomic RPCs for Critical Vulnerabilities
-- Run this in Supabase SQL Editor AFTER security_patch_5.sql

-- C-4: Atomic Deposit with tx_hash uniqueness
-- First, add UNIQUE constraint on tx_hash (M-10)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_tx_hash_unique'
  ) THEN
    ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_tx_hash_unique UNIQUE (tx_hash);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add tx_hash unique constraint, may already exist or column missing';
END $$;

-- Add tx_hash column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_transactions' AND column_name = 'tx_hash'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN tx_hash TEXT;
  END IF;
END $$;

-- Atomic deposit RPC
CREATE OR REPLACE FUNCTION process_deposit(
    p_user_id BIGINT,
    p_amount FLOAT,
    p_wallet_address TEXT,
    p_tx_hash TEXT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_existing_tx RECORD;
BEGIN
    IF p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid deposit amount');
    END IF;

    -- Check for duplicate tx_hash atomically
    SELECT id INTO v_existing_tx FROM wallet_transactions WHERE tx_hash = p_tx_hash LIMIT 1;
    IF FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Transaction already processed');
    END IF;

    -- Lock user row
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Update balance atomically
    UPDATE users SET 
        ton_balance = COALESCE(ton_balance, 0) + p_amount,
        ton_deposited = COALESCE(ton_deposited, 0) + p_amount
    WHERE telegram_id = p_user_id;

    -- Insert transaction record (will fail on duplicate tx_hash due to UNIQUE constraint)
    INSERT INTO wallet_transactions (user_id, tx_type, amount_ton, wallet_address, tx_hash, status)
    VALUES (p_user_id, 'deposit', p_amount, p_wallet_address, p_tx_hash, 'completed');

    RETURN json_build_object(
        'success', true,
        'newBalance', COALESCE(v_user.ton_balance, 0) + p_amount,
        'newDeposited', COALESCE(v_user.ton_deposited, 0) + p_amount
    );
END;
$$ LANGUAGE plpgsql;

-- C-6: Atomic Refund Withdrawal
CREATE OR REPLACE FUNCTION refund_withdrawal(
    p_user_id BIGINT,
    p_amount FLOAT
) RETURNS JSON AS $$
BEGIN
    IF p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid refund amount');
    END IF;

    UPDATE users SET ton_balance = COALESCE(ton_balance, 0) + p_amount
    WHERE telegram_id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- H-2: Atomic Tap RPC
CREATE OR REPLACE FUNCTION process_tap(
    p_user_id BIGINT,
    p_count INT,
    p_mining_speed INT,
    p_max_energy INT,
    p_regen_amount INT,
    p_nation_multiplier FLOAT DEFAULT 1.0
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_valid_count INT;
    v_energy_cost INT;
    v_votes_gained BIGINT;
    v_xp_gained INT;
    v_new_energy INT;
BEGIN
    IF p_count <= 0 OR p_count > 1000 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid tap count');
    END IF;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Calculate how many taps the user can actually afford
    v_valid_count := LEAST(p_count, FLOOR(COALESCE(v_user.energy, 0)::float / GREATEST(p_mining_speed, 1)));
    
    IF v_valid_count <= 0 THEN
        RETURN json_build_object(
            'success', true,
            'energy', v_user.energy,
            'totalVotes', v_user.total_votes,
            'availableVotes', v_user.available_votes,
            'validCount', 0
        );
    END IF;

    v_energy_cost := v_valid_count * p_mining_speed;
    v_votes_gained := v_valid_count * p_mining_speed;
    v_xp_gained := v_valid_count;
    v_new_energy := GREATEST(0, COALESCE(v_user.energy, 0) - v_energy_cost);

    UPDATE users SET
        energy = v_new_energy,
        total_votes = COALESCE(total_votes, 0) + v_votes_gained,
        available_votes = COALESCE(available_votes, 0) + v_votes_gained,
        total_taps = COALESCE(total_taps, 0) + v_valid_count,
        xp = COALESCE(xp, 0) + v_xp_gained,
        last_login = NOW()
    WHERE telegram_id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'energy', v_new_energy,
        'totalVotes', COALESCE(v_user.total_votes, 0) + v_votes_gained,
        'availableVotes', COALESCE(v_user.available_votes, 0) + v_votes_gained,
        'xp', COALESCE(v_user.xp, 0) + v_xp_gained,
        'validCount', v_valid_count
    );
END;
$$ LANGUAGE plpgsql;

-- H-3: Add last_ad_watched column for ads cooldown
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_ad_watched'
  ) THEN
    ALTER TABLE users ADD COLUMN last_ad_watched TIMESTAMPTZ;
  END IF;
END $$;

-- H-5: Atomic webhook withdrawal completion
CREATE OR REPLACE FUNCTION complete_webhook_withdrawal(
    p_user_id TEXT,
    p_amount FLOAT
) RETURNS JSON AS $$
BEGIN
    IF p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid amount');
    END IF;

    UPDATE "Wallet" SET 
        "frozenBalance" = GREATEST(0, COALESCE("frozenBalance", 0) - p_amount),
        "totalSpent" = COALESCE("totalSpent", 0) + p_amount,
        "updatedAt" = NOW()
    WHERE "userId" = p_user_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
