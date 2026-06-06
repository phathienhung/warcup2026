-- 1. Add unclaimed_ref_ton to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS unclaimed_ref_ton FLOAT DEFAULT 0;

-- 2. Modify process_deposit to calculate and distribute MLM TON commissions
CREATE OR REPLACE FUNCTION process_deposit(
    p_user_id BIGINT,
    p_amount FLOAT,
    p_wallet_address TEXT,
    p_tx_hash TEXT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_f1_id BIGINT;
    v_f2_id BIGINT;
    v_f3_id BIGINT;
    v_config RECORD;
    v_f1_pct FLOAT := 0;
    v_f2_pct FLOAT := 0;
    v_f3_pct FLOAT := 0;
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

    -- Insert transaction record
    INSERT INTO wallet_transactions (user_id, tx_type, amount_ton, wallet_address, tx_hash, status)
    VALUES (p_user_id, 'deposit', p_amount, p_wallet_address, p_tx_hash, 'completed');

    -- ==========================================
    -- TON REFERRAL COMMISSION (MLM)
    -- ==========================================
    -- Fetch referral config
    SELECT * INTO v_config FROM game_config WHERE id = 1;
    IF FOUND AND v_config.referral_system_json IS NOT NULL THEN
        v_f1_pct := COALESCE((v_config.referral_system_json->>'f1_percent')::FLOAT, 0) / 100.0;
        v_f2_pct := COALESCE((v_config.referral_system_json->>'f2_percent')::FLOAT, 0) / 100.0;
        v_f3_pct := COALESCE((v_config.referral_system_json->>'f3_percent')::FLOAT, 0) / 100.0;

        -- F1
        v_f1_id := v_user.referred_by;
        IF v_f1_id IS NOT NULL AND v_f1_pct > 0 THEN
            UPDATE users SET unclaimed_ref_ton = COALESCE(unclaimed_ref_ton, 0) + (p_amount * v_f1_pct)
            WHERE telegram_id = v_f1_id RETURNING referred_by INTO v_f2_id;
            
            -- F2
            IF v_f2_id IS NOT NULL AND v_f2_pct > 0 THEN
                UPDATE users SET unclaimed_ref_ton = COALESCE(unclaimed_ref_ton, 0) + (p_amount * v_f2_pct)
                WHERE telegram_id = v_f2_id RETURNING referred_by INTO v_f3_id;
                
                -- F3
                IF v_f3_id IS NOT NULL AND v_f3_pct > 0 THEN
                    UPDATE users SET unclaimed_ref_ton = COALESCE(unclaimed_ref_ton, 0) + (p_amount * v_f3_pct)
                    WHERE telegram_id = v_f3_id;
                END IF;
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

-- 3. Create claim_ton_commissions RPC
CREATE OR REPLACE FUNCTION claim_ton_commissions(
    p_user_id BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_claim_amount FLOAT;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    v_claim_amount := COALESCE(v_user.unclaimed_ref_ton, 0);

    IF v_claim_amount <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'No commissions to claim');
    END IF;

    -- Transfer unclaimed to main balance
    UPDATE users SET 
        ton_balance = COALESCE(ton_balance, 0) + v_claim_amount,
        unclaimed_ref_ton = 0
    WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true, 'claimed_amount', v_claim_amount, 'new_ton_balance', COALESCE(v_user.ton_balance, 0) + v_claim_amount);
END;
$$ LANGUAGE plpgsql;
