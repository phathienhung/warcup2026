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

    -- If no one won or total pool is 0, we just exit
    IF v_winning_pool <= 0 OR v_total_pool <= 0 THEN
        RETURN json_build_object('success', true, 'message', 'Match finished. No payouts required.', 'processed_count', 0);
    END IF;

    -- Process payouts
    FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id AND predicted_team = p_winner
    LOOP
        -- Calculate proportional reward: (User Stake / Total Winning Pool) * Net Total Pool
        v_reward := ROUND((v_pred.votes_staked::FLOAT / v_winning_pool::FLOAT) * v_net_pool::FLOAT);
        
        -- Mark prediction as correct, set reward, AND SET is_claimed TO TRUE to prevent double claim
        UPDATE predictions 
        SET is_correct = true, reward = v_reward, is_claimed = true
        WHERE id = v_pred.id;

        -- Credit user directly (Auto Payout)
        UPDATE users 
        SET 
            available_votes = COALESCE(available_votes, 0) + v_reward,
            total_votes = COALESCE(total_votes, 0) + v_reward,
            predictions_won = COALESCE(predictions_won, 0) + 1
        WHERE telegram_id = v_pred.user_id;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    -- Mark losing predictions
    UPDATE predictions 
    SET is_correct = false, reward = 0, is_claimed = true
    WHERE match_id = p_match_id AND predicted_team != p_winner;

    -- Increment predictions_total for all participants
    UPDATE users u
    SET predictions_total = COALESCE(predictions_total, 0) + 1
    FROM predictions p
    WHERE p.user_id = u.telegram_id AND p.match_id = p_match_id;

    RETURN json_build_object(
        'success', true, 
        'processed_count', v_processed_count, 
        'winner', p_winner, 
        'total_pool', v_total_pool,
        'winning_pool', v_winning_pool
    );
END;
$$ LANGUAGE plpgsql;
