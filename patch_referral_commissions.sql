-- 1. Create referral_commissions table
CREATE TABLE IF NOT EXISTS referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id BIGINT REFERENCES users(telegram_id),
    referred_id BIGINT REFERENCES users(telegram_id),
    tier INT,
    deposit_amount FLOAT,
    commission_amount FLOAT,
    is_claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup when claiming
CREATE INDEX IF NOT EXISTS idx_ref_comm_referrer ON referral_commissions(referrer_id, is_claimed);

-- 2. Update process_deposit RPC
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
    v_f1_comm FLOAT := 0;
    v_f2_comm FLOAT := 0;
    v_f3_comm FLOAT := 0;
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
    SELECT * INTO v_config FROM game_config WHERE id = 1;
    IF FOUND AND v_config.referral_system_json IS NOT NULL THEN
        v_f1_pct := COALESCE((v_config.referral_system_json->>'f1_percent')::FLOAT, 0) / 100.0;
        v_f2_pct := COALESCE((v_config.referral_system_json->>'f2_percent')::FLOAT, 0) / 100.0;
        v_f3_pct := COALESCE((v_config.referral_system_json->>'f3_percent')::FLOAT, 0) / 100.0;

        -- F1
        v_f1_id := v_user.referred_by;
        IF v_f1_id IS NOT NULL AND v_f1_pct > 0 THEN
            v_f1_comm := p_amount * v_f1_pct;
            INSERT INTO referral_commissions (referrer_id, referred_id, tier, deposit_amount, commission_amount)
            VALUES (v_f1_id, p_user_id, 1, p_amount, v_f1_comm);
            
            -- Keep the legacy column updated just in case frontend relies on it
            UPDATE users SET unclaimed_ref_ton = COALESCE(unclaimed_ref_ton, 0) + v_f1_comm WHERE telegram_id = v_f1_id RETURNING referred_by INTO v_f2_id;
            
            -- F2
            IF v_f2_id IS NOT NULL AND v_f2_pct > 0 THEN
                v_f2_comm := p_amount * v_f2_pct;
                INSERT INTO referral_commissions (referrer_id, referred_id, tier, deposit_amount, commission_amount)
                VALUES (v_f2_id, p_user_id, 2, p_amount, v_f2_comm);
                
                UPDATE users SET unclaimed_ref_ton = COALESCE(unclaimed_ref_ton, 0) + v_f2_comm WHERE telegram_id = v_f2_id RETURNING referred_by INTO v_f3_id;
                
                -- F3
                IF v_f3_id IS NOT NULL AND v_f3_pct > 0 THEN
                    v_f3_comm := p_amount * v_f3_pct;
                    INSERT INTO referral_commissions (referrer_id, referred_id, tier, deposit_amount, commission_amount)
                    VALUES (v_f3_id, p_user_id, 3, p_amount, v_f3_comm);
                    
                    UPDATE users SET unclaimed_ref_ton = COALESCE(unclaimed_ref_ton, 0) + v_f3_comm WHERE telegram_id = v_f3_id;
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

-- 3. Update claim_ton_commissions RPC securely
CREATE OR REPLACE FUNCTION claim_ton_commissions(
    p_user_id BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_claim_amount FLOAT := 0;
    v_legacy_amount FLOAT := 0;
    v_total_amount FLOAT := 0;
    v_updated_rows INT;
BEGIN
    -- 1. Lock user row to prevent concurrent claims
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- 2. Calculate sum of new commissions
    SELECT SUM(commission_amount) INTO v_claim_amount 
    FROM referral_commissions 
    WHERE referrer_id = p_user_id AND is_claimed = false;

    v_claim_amount := COALESCE(v_claim_amount, 0);

    -- 3. Check for legacy unclaimed_ref_ton that wasn't recorded in the new table
    v_legacy_amount := COALESCE(v_user.unclaimed_ref_ton, 0);

    -- To avoid double counting, if v_legacy_amount > v_claim_amount, the difference is legacy
    IF v_legacy_amount > v_claim_amount THEN
        v_total_amount := v_legacy_amount;
    ELSE
        v_total_amount := v_claim_amount;
    END IF;

    IF v_total_amount <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'No commissions to claim');
    END IF;

    -- 4. Mark all as claimed
    UPDATE referral_commissions 
    SET is_claimed = true 
    WHERE referrer_id = p_user_id AND is_claimed = false;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    -- 5. Add to user balance and reset unclaimed_ref_ton
    UPDATE users SET 
        ton_balance = COALESCE(ton_balance, 0) + v_total_amount,
        unclaimed_ref_ton = 0
    WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true, 'claimed_amount', v_total_amount, 'new_ton_balance', COALESCE(v_user.ton_balance, 0) + v_total_amount);
END;
$$ LANGUAGE plpgsql;
