-- 1. Modify resolve_match to ONLY set the reward and stats, but NOT credit the user's balance
CREATE OR REPLACE FUNCTION resolve_match(
    p_match_id UUID,
    p_score_a INT,
    p_score_b INT,
    p_winner TEXT -- 'A', 'B', or 'DRAW'
) RETURNS JSON AS $$
DECLARE
    v_match RECORD;
    v_pred RECORD;
    v_total_pool BIGINT;
    v_winning_pool BIGINT;
    v_reward BIGINT;
    v_platform_fee FLOAT := 0.05; -- 5% fee for the house
    v_net_pool BIGINT;
    v_processed_count INT := 0;
BEGIN
    -- Lock match for update to prevent race conditions
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Match not found');
    END IF;

    IF v_match.status = 'finished' THEN
        RETURN json_build_object('success', false, 'error', 'Match already resolved');
    END IF;

    -- Calculate pools including seeds
    v_total_pool := COALESCE(v_match.total_pool, 0) + COALESCE(v_match.seed_a, 0) + COALESCE(v_match.seed_b, 0) + COALESCE(v_match.seed_draw, 0);
    
    IF p_winner = 'A' THEN
        v_winning_pool := COALESCE((v_match.outcome_pools->>'A')::bigint, 0) + COALESCE(v_match.seed_a, 0);
    ELSIF p_winner = 'B' THEN
        v_winning_pool := COALESCE((v_match.outcome_pools->>'B')::bigint, 0) + COALESCE(v_match.seed_b, 0);
    ELSIF p_winner = 'DRAW' THEN
        v_winning_pool := COALESCE((v_match.outcome_pools->>'DRAW')::bigint, 0) + COALESCE(v_match.seed_draw, 0);
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid winner outcome');
    END IF;

    -- Update match status
    UPDATE matches SET 
        status = 'finished',
        score_a = p_score_a,
        score_b = p_score_b,
        winner = p_winner
    WHERE id = p_match_id;

    -- Net pool available for distribution
    v_net_pool := v_total_pool - (v_total_pool * v_platform_fee);

    IF v_winning_pool <= 0 OR v_total_pool <= 0 THEN
        RETURN json_build_object('success', true, 'message', 'Match finished. No payouts required.', 'processed_count', 0);
    END IF;

    -- Process winning predictions
    FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id AND predicted_team = p_winner
    LOOP
        v_reward := ROUND((v_pred.votes_staked::FLOAT / v_winning_pool::FLOAT) * v_net_pool::FLOAT);
        
        -- ONLY mark correct and set reward (is_claimed remains false by default)
        UPDATE predictions 
        SET is_correct = true, reward = v_reward 
        WHERE id = v_pred.id;

        -- Update stats only
        UPDATE users 
        SET 
            predictions_won = COALESCE(predictions_won, 0) + 1,
            predictions_total = COALESCE(predictions_total, 0) + 1
        WHERE telegram_id = v_pred.user_id;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    -- Mark losing predictions
    UPDATE predictions 
    SET is_correct = false, reward = 0 
    WHERE match_id = p_match_id AND predicted_team != p_winner;

    -- Update stats for losers
    UPDATE users u
    SET predictions_total = COALESCE(predictions_total, 0) + 1
    FROM predictions p
    WHERE p.user_id = u.telegram_id AND p.match_id = p_match_id AND p.predicted_team != p_winner;

    RETURN json_build_object(
        'success', true, 
        'processed_count', v_processed_count, 
        'winner', p_winner, 
        'total_pool', v_total_pool,
        'winning_pool', v_winning_pool
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Modify claim_prediction_reward to ONLY credit balance, since stats are handled above
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
    
    -- Credit user's available balance and total lifetime balance
    UPDATE users SET 
        available_votes = COALESCE(available_votes, 0) + v_reward,
        total_votes = COALESCE(total_votes, 0) + v_reward
    WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true, 'reward', v_reward);
END;
$$ LANGUAGE plpgsql;
