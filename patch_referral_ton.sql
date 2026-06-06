-- 1. Add missing column for MLM TON commissions
ALTER TABLE users ADD COLUMN IF NOT EXISTS unclaimed_ref_ton FLOAT DEFAULT 0;

-- 2. Modify process_deposit to distribute commissions to F1, F2, F3
CREATE OR REPLACE FUNCTION process_deposit(
    p_user_id BIGINT,
    p_amount FLOAT,
    p_wallet_address TEXT,
    p_tx_hash TEXT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_existing_tx RECORD;
    
    v_f1_pct FLOAT := 5.0;
    v_f2_pct FLOAT := 2.0;
    v_f3_pct FLOAT := 1.0;
    
    v_f1_id BIGINT;
    v_f2_id BIGINT;
    v_f3_id BIGINT;
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

    -- Insert transaction record
    INSERT INTO wallet_transactions (user_id, tx_type, amount_ton, wallet_address, tx_hash, status)
    VALUES (p_user_id, 'deposit', p_amount, p_wallet_address, p_tx_hash, 'completed');

    -- MLM COMMISSION LOGIC
    BEGIN
        -- Get config safely, fallback to defaults if null
        SELECT 
            COALESCE((referral_system_json->>'f1_percent')::FLOAT, 5.0),
            COALESCE((referral_system_json->>'f2_percent')::FLOAT, 2.0),
            COALESCE((referral_system_json->>'f3_percent')::FLOAT, 1.0)
        INTO v_f1_pct, v_f2_pct, v_f3_pct
        FROM game_config WHERE id = 1;
    EXCEPTION WHEN OTHERS THEN
        -- Keep defaults if JSON parsing fails
    END;

    -- F1
    SELECT referred_by INTO v_f1_id FROM users WHERE telegram_id = p_user_id;
    IF v_f1_id IS NOT NULL AND v_f1_pct > 0 THEN
        UPDATE users SET unclaimed_ref_ton = COALESCE(unclaimed_ref_ton, 0) + (p_amount * v_f1_pct / 100.0)
        WHERE telegram_id = v_f1_id;

        -- F2
        SELECT referred_by INTO v_f2_id FROM users WHERE telegram_id = v_f1_id;
        IF v_f2_id IS NOT NULL AND v_f2_pct > 0 THEN
            UPDATE users SET unclaimed_ref_ton = COALESCE(unclaimed_ref_ton, 0) + (p_amount * v_f2_pct / 100.0)
            WHERE telegram_id = v_f2_id;

            -- F3
            SELECT referred_by INTO v_f3_id FROM users WHERE telegram_id = v_f2_id;
            IF v_f3_id IS NOT NULL AND v_f3_pct > 0 THEN
                UPDATE users SET unclaimed_ref_ton = COALESCE(unclaimed_ref_ton, 0) + (p_amount * v_f3_pct / 100.0)
                WHERE telegram_id = v_f3_id;
            END IF;
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'newBalance', COALESCE(v_user.ton_balance, 0) + p_amount,
        'newDeposited', COALESCE(v_user.ton_deposited, 0) + p_amount
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Create claim_commissions RPC
CREATE OR REPLACE FUNCTION claim_commissions(
    p_user_id BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_ton_reward FLOAT;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'User not found'); END IF;

    v_ton_reward := COALESCE(v_user.unclaimed_ref_ton, 0);

    IF v_ton_reward <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'No commissions to claim');
    END IF;

    UPDATE users SET 
        ton_balance = COALESCE(ton_balance, 0) + v_ton_reward,
        unclaimed_ref_ton = 0
    WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true, 'ton_claimed', v_ton_reward);
END;
$$ LANGUAGE plpgsql;
