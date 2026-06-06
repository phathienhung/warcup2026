CREATE OR REPLACE FUNCTION request_withdrawal(
    p_user_id BIGINT,
    p_amount FLOAT,
    p_wallet_address TEXT,
    p_today_str TEXT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_daily_limit FLOAT;
    v_withdrawn_today FLOAT;
    v_new_transaction_id UUID;
    v_fee FLOAT;
    v_payout FLOAT;
BEGIN
    IF p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid withdrawal amount');
    END IF;

    v_fee := p_amount * 0.10;
    v_payout := p_amount - v_fee;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF COALESCE(v_user.ton_balance, 0) < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    
    IF COALESCE(v_user.ton_deposited, 0) <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'You must deposit TON first to unlock withdrawals.');
    END IF;

    v_daily_limit := COALESCE(v_user.ton_deposited, 0) * 0.1;
    v_withdrawn_today := COALESCE(v_user.ton_withdrawn_today, 0);
    
    -- Reset daily limit if date changed
    IF (v_user.last_withdrawal_date IS NULL) OR (to_char(v_user.last_withdrawal_date, 'YYYY-MM-DD') != p_today_str) THEN
        v_withdrawn_today := 0;
    END IF;

    IF v_withdrawn_today + p_amount > v_daily_limit THEN
        RETURN json_build_object('success', false, 'error', 'Daily limit exceeded.');
    END IF;

    UPDATE users 
    SET ton_balance = ton_balance - p_amount,
        ton_withdrawn_today = v_withdrawn_today + p_amount,
        last_withdrawal_date = NOW()
    WHERE telegram_id = p_user_id;

    INSERT INTO wallet_transactions(user_id, tx_type, amount_ton, wallet_address, status)
    VALUES (p_user_id, 'withdraw', v_payout, p_wallet_address, 'pending')
    RETURNING id INTO v_new_transaction_id;

    RETURN json_build_object(
        'success', true, 
        'newBalance', v_user.ton_balance - p_amount,
        'transaction_id', v_new_transaction_id,
        'fee', v_fee,
        'payout', v_payout
    );
END;
$$ LANGUAGE plpgsql;
