-- 1. Atomic Exchange: Votes for TON
CREATE OR REPLACE FUNCTION exchange_votes_for_ton(
    p_user_id BIGINT,
    p_votes_cost BIGINT,
    p_ton_reward FLOAT,
    p_ads_required INT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Lock row for update
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF COALESCE(v_user.ads_watched, 0) < p_ads_required THEN
        RETURN json_build_object('success', false, 'error', 'Not enough ads watched');
    END IF;

    IF COALESCE(v_user.available_votes, 0) < p_votes_cost THEN
        RETURN json_build_object('success', false, 'error', 'Not enough votes');
    END IF;

    UPDATE users 
    SET available_votes = available_votes - p_votes_cost,
        ton_balance = ton_balance + p_ton_reward,
        ads_watched = 0
    WHERE telegram_id = p_user_id;

    RETURN json_build_object(
        'success', true, 
        'new_balance', v_user.ton_balance + p_ton_reward, 
        'new_votes', v_user.available_votes - p_votes_cost
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Atomic Withdraw TON
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
BEGIN
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
    VALUES (p_user_id, 'withdraw', p_amount, p_wallet_address, 'pending')
    RETURNING id INTO v_new_transaction_id;

    RETURN json_build_object(
        'success', true, 
        'newBalance', v_user.ton_balance - p_amount,
        'transaction_id', v_new_transaction_id
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Atomic Shop Purchase
CREATE OR REPLACE FUNCTION buy_shop_item(
    p_user_id BIGINT,
    p_item_id TEXT,
    p_quantity INT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_item RECORD;
    v_total_cost BIGINT;
    v_total_cost_ton FLOAT;
    v_total_value FLOAT;
BEGIN
    SELECT * INTO v_item FROM shop_items WHERE id = p_item_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    v_total_value := v_item.bonus_value * p_quantity;

    IF v_item.price_type = 'votes' THEN
        v_total_cost := v_item.price * p_quantity;
        IF COALESCE(v_user.available_votes, 0) < v_total_cost THEN
            RETURN json_build_object('success', false, 'error', 'Not enough votes');
        END IF;
        
        UPDATE users SET available_votes = available_votes - v_total_cost WHERE telegram_id = p_user_id;
        
    ELSIF v_item.price_type = 'ton' THEN
        v_total_cost_ton := v_item.price * p_quantity;
        IF COALESCE(v_user.ton_balance, 0) < v_total_cost_ton THEN
            RETURN json_build_object('success', false, 'error', 'Not enough TON');
        END IF;
        
        UPDATE users SET ton_balance = ton_balance - v_total_cost_ton WHERE telegram_id = p_user_id;
    END IF;

    -- Apply Item Effect
    IF v_item.type = 'energy' THEN
        UPDATE users SET energy = COALESCE(energy, 0) + v_total_value WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + v_total_value WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + v_total_value WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'spin_ticket' THEN
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) + v_total_value WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'vote_pack' THEN
        UPDATE users SET available_votes = COALESCE(available_votes, 0) + v_total_value, total_votes = COALESCE(total_votes, 0) + v_total_value WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'boost' THEN
        IF p_item_id = '6' THEN
            UPDATE users SET boost_multiplier = 3, boost_expires_at = NOW() + INTERVAL '1 hour' WHERE telegram_id = p_user_id;
        ELSE
            UPDATE users SET boost_multiplier = 2, boost_expires_at = NOW() + INTERVAL '1 hour' WHERE telegram_id = p_user_id;
        END IF;
    END IF;

    INSERT INTO shop_purchases(user_id, item_type, item_id, quantity, price_paid, price_type)
    VALUES (p_user_id, v_item.type, p_item_id, p_quantity, COALESCE(v_total_cost, v_total_cost_ton), v_item.price_type);

    RETURN json_build_object('success', true, 'message', 'Successfully purchased ' || v_item.name);
END;
$$ LANGUAGE plpgsql;

-- 4. Atomic Prediction Stake
CREATE OR REPLACE FUNCTION stake_prediction(
    p_user_id BIGINT,
    p_match_id UUID,
    p_team TEXT,
    p_votes_staked BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_match RECORD;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF COALESCE(v_user.available_votes, 0) < p_votes_staked THEN
        RETURN json_build_object('success', false, 'error', 'Not enough votes');
    END IF;

    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF v_match.status != 'voting' THEN
        RETURN json_build_object('success', false, 'error', 'Voting is closed for this match');
    END IF;

    -- Create prediction
    INSERT INTO predictions (user_id, match_id, predicted_team, votes_staked)
    VALUES (p_user_id, p_match_id, p_team, p_votes_staked);

    -- Deduct votes
    UPDATE users SET available_votes = available_votes - p_votes_staked WHERE telegram_id = p_user_id;

    -- Update match total pool
    IF p_team = v_match.team_a THEN
        UPDATE matches SET total_votes_a = COALESCE(total_votes_a, 0) + p_votes_staked WHERE id = p_match_id;
    ELSE
        UPDATE matches SET total_votes_b = COALESCE(total_votes_b, 0) + p_votes_staked WHERE id = p_match_id;
    END IF;

    RETURN json_build_object('success', true, 'newAvailableVotes', v_user.available_votes - p_votes_staked);
END;
$$ LANGUAGE plpgsql;
