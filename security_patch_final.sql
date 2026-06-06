-- SECURITY PATCH 2: Prevent negative number exploits and add atomic RPCs for tasks & predictions

-- 1. Atomic Exchange: Votes for TON (with positive checks)
CREATE OR REPLACE FUNCTION exchange_votes_for_ton(
    p_user_id BIGINT,
    p_votes_cost BIGINT,
    p_ton_reward FLOAT,
    p_ads_required INT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
BEGIN
    IF p_votes_cost <= 0 OR p_ton_reward <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid exchange values');
    END IF;

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

-- 2. Atomic Withdraw TON (with positive checks)
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
    IF p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid withdrawal amount');
    END IF;

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

-- 3. Atomic Shop Purchase (with positive checks)
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
    IF p_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid quantity');
    END IF;

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

-- 4. Atomic Prediction Stake (with positive checks)
CREATE OR REPLACE FUNCTION stake_prediction(
    p_user_id BIGINT,
    p_match_id UUID,
    p_team TEXT,
    p_votes_staked BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_match RECORD;
    v_existing_pred RECORD;
    v_is_new BOOLEAN := false;
BEGIN
    IF p_votes_staked <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid stake amount');
    END IF;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF COALESCE(v_user.available_votes, 0) < p_votes_staked THEN
        RETURN json_build_object('success', false, 'error', 'Not enough votes');
    END IF;

    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF v_match.status != 'voting' THEN
        RETURN json_build_object('success', false, 'error', 'Voting is closed for this match');
    END IF;

    -- Upsert prediction
    SELECT * INTO v_existing_pred FROM predictions 
    WHERE user_id = p_user_id AND match_id = p_match_id AND predicted_team = p_team FOR UPDATE;

    IF FOUND THEN
        UPDATE predictions SET votes_staked = votes_staked + p_votes_staked WHERE id = v_existing_pred.id;
    ELSE
        v_is_new := true;
        INSERT INTO predictions (user_id, match_id, predicted_team, votes_staked)
        VALUES (p_user_id, p_match_id, p_team, p_votes_staked);
    END IF;

    -- Deduct votes
    UPDATE users SET available_votes = available_votes - p_votes_staked WHERE telegram_id = p_user_id;

    -- Update match total pool dynamically via JSONB
    UPDATE matches SET 
        total_pool = COALESCE(total_pool, 0) + p_votes_staked,
        outcome_pools = jsonb_set(
            COALESCE(outcome_pools, '{}'::jsonb),
            array[p_team],
            to_jsonb(COALESCE((outcome_pools->>p_team)::bigint, 0) + p_votes_staked)
        ),
        outcome_users = CASE WHEN v_is_new THEN jsonb_set(
            COALESCE(outcome_users, '{}'::jsonb),
            array[p_team],
            to_jsonb(COALESCE((outcome_users->>p_team)::bigint, 0) + 1)
        ) ELSE outcome_users END
    WHERE id = p_match_id;

    RETURN json_build_object('success', true, 'newAvailableVotes', v_user.available_votes - p_votes_staked);
END;
$$ LANGUAGE plpgsql;

-- 5. Atomic Claim Reward (Task / Achievement)
CREATE OR REPLACE FUNCTION claim_reward(
    p_user_id BIGINT,
    p_task_id TEXT,
    p_reward_type TEXT,
    p_reward_value BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user_task RECORD;
BEGIN
    -- Lock user_task row
    SELECT * INTO v_user_task FROM user_tasks WHERE user_id = p_user_id AND task_id = p_task_id FOR UPDATE;
    
    IF NOT FOUND THEN
        -- Insert dummy row so we can lock it? Or just insert and return. Wait, if not found, it hasn't been completed.
        -- But this is called after backend verifies it's complete.
        -- For tasks, backend creates the user_tasks row with completed=false initially, or upserts it.
        RETURN json_build_object('success', false, 'error', 'Task progress not found');
    END IF;

    IF v_user_task.status = 'claimed' THEN
        RETURN json_build_object('success', false, 'error', 'Reward already claimed');
    END IF;

    -- Mark as claimed
    UPDATE user_tasks SET status = 'claimed', completed = true, completed_at = NOW() WHERE id = v_user_task.id;

    -- Apply reward to user
    IF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'energy' THEN
        UPDATE users SET energy = COALESCE(energy, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'votes' THEN
        UPDATE users SET total_votes = COALESCE(total_votes, 0) + p_reward_value, available_votes = COALESCE(available_votes, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'xp' THEN
        UPDATE users SET xp = COALESCE(xp, 0) + p_reward_value WHERE telegram_id = p_user_id;
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 6. Atomic Unstake Prediction
CREATE OR REPLACE FUNCTION unstake_prediction(
    p_user_id BIGINT,
    p_prediction_id UUID
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_prediction RECORD;
    v_match RECORD;
BEGIN
    -- Lock prediction
    SELECT * INTO v_prediction FROM predictions WHERE id = p_prediction_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Prediction not found');
    END IF;

    -- Lock match
    SELECT * INTO v_match FROM matches WHERE id = v_prediction.match_id FOR UPDATE;
    IF v_match.status != 'voting' THEN
        RETURN json_build_object('success', false, 'error', 'Cannot unstake: Match has already started');
    END IF;

    -- Refund votes
    UPDATE users SET available_votes = COALESCE(available_votes, 0) + v_prediction.votes_staked WHERE telegram_id = p_user_id;

    -- Delete prediction
    DELETE FROM predictions WHERE id = p_prediction_id;

    -- Update match total pool dynamically via JSONB
    UPDATE matches SET 
        total_pool = GREATEST(0, COALESCE(total_pool, 0) - v_prediction.votes_staked),
        outcome_pools = jsonb_set(
            COALESCE(outcome_pools, '{}'::jsonb),
            array[v_prediction.predicted_team],
            to_jsonb(GREATEST(0::bigint, COALESCE((outcome_pools->>v_prediction.predicted_team)::bigint, 0) - v_prediction.votes_staked))
        ),
        outcome_users = jsonb_set(
            COALESCE(outcome_users, '{}'::jsonb),
            array[v_prediction.predicted_team],
            to_jsonb(GREATEST(0::bigint, COALESCE((outcome_users->>v_prediction.predicted_team)::bigint, 0) - 1))
        )
    WHERE id = v_prediction.match_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 7. Atomic Claim Prediction Reward
CREATE OR REPLACE FUNCTION claim_prediction_reward(
    p_user_id BIGINT,
    p_prediction_id UUID
) RETURNS JSON AS $$
DECLARE
    v_prediction RECORD;
    v_reward BIGINT;
BEGIN
    SELECT * INTO v_prediction FROM predictions WHERE id = p_prediction_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Prediction not found');
    END IF;

    IF NOT COALESCE(v_prediction.is_correct, false) THEN
        RETURN json_build_object('success', false, 'error', 'Cannot claim a lost prediction');
    END IF;

    IF COALESCE(v_prediction.is_claimed, false) THEN
        RETURN json_build_object('success', false, 'error', 'Reward already claimed');
    END IF;

    v_reward := COALESCE(v_prediction.reward, 0);

    UPDATE predictions SET is_claimed = true WHERE id = p_prediction_id;
    UPDATE users SET available_votes = COALESCE(available_votes, 0) + v_reward WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true, 'reward', v_reward);
END;
$$ LANGUAGE plpgsql;
-- 8. Atomic Claim Achievement Reward
CREATE OR REPLACE FUNCTION claim_achievement_reward(
    p_user_id BIGINT,
    p_achievement_id TEXT,
    p_reward_votes BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Attempt to insert the achievement claim record
    -- If it already exists, this will raise a unique violation error (which we catch)
    BEGIN
        INSERT INTO user_tasks (user_id, task_id, status, completed, completed_at)
        VALUES (p_user_id, p_achievement_id, 'claimed', true, NOW());
    EXCEPTION WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'error', 'Reward already claimed');
    END;

    -- If insert succeeded, we can safely apply the reward
    UPDATE users SET 
        total_votes = COALESCE(total_votes, 0) + p_reward_votes, 
        available_votes = COALESCE(available_votes, 0) + p_reward_votes 
    WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
-- 9. Atomic Claim Streak Reward
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
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF COALESCE(v_user.last_streak_claim, '') = p_today_str THEN
        RETURN json_build_object('success', false, 'error', 'Already claimed today');
    END IF;

    v_new_streak := COALESCE(v_user.login_streak, 0);
    IF v_new_streak >= 7 THEN
        v_new_streak := 1;
    ELSE
        v_new_streak := v_new_streak + 1;
    END IF;

    -- Try to fetch config, fallback handled by COALESCE below if empty
    BEGIN
        SELECT speed_reward, max_energy_reward INTO v_streak_config FROM streak_rewards WHERE day = v_new_streak;
        IF FOUND THEN
            v_speed_reward := COALESCE(v_streak_config.speed_reward, 1);
            v_max_energy_reward := COALESCE(v_streak_config.max_energy_reward, 100);
        END IF;
    EXCEPTION WHEN undefined_table THEN
        -- table doesn't exist yet, ignore
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
