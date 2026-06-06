CREATE OR REPLACE FUNCTION resolve_match(
    p_match_id UUID,
    p_score_a INT,
    p_score_b INT,
    p_winner TEXT -- 'A', 'B', or 'DRAW'
) RETURNS JSON AS $$
DECLARE
    v_match RECORD;
    v_pred RECORD;
    
    -- Winner Pool Variables
    v_total_winner_pool BIGINT := 0;
    v_winning_winner_pool BIGINT := 0;
    v_net_winner_pool FLOAT := 0;
    
    -- Score Pool Variables
    v_total_score_pool BIGINT := 0;
    v_winning_score_pool BIGINT := 0;
    v_net_score_pool FLOAT := 0;
    
    v_actual_score TEXT;
    v_reward BIGINT;
    v_platform_fee FLOAT := 0.05; -- 5% fee for the house
    v_processed_count INT := 0;
BEGIN
    -- Lock match for update to prevent race conditions
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Match not found'); END IF;
    IF v_match.status = 'finished' THEN RETURN json_build_object('success', false, 'error', 'Match already resolved'); END IF;

    v_actual_score := p_score_a::TEXT || '-' || p_score_b::TEXT;

    -- 1. CALCULATE WINNER POOL
    v_total_winner_pool := COALESCE(v_match.seed_a, 0) + COALESCE(v_match.seed_b, 0) + COALESCE(v_match.seed_draw, 0)
                           + COALESCE((v_match.outcome_pools->>'A')::bigint, 0)
                           + COALESCE((v_match.outcome_pools->>'B')::bigint, 0)
                           + COALESCE((v_match.outcome_pools->>'DRAW')::bigint, 0);

    IF p_winner = 'A' THEN 
        v_winning_winner_pool := COALESCE((v_match.outcome_pools->>'A')::bigint, 0) + COALESCE(v_match.seed_a, 0);
    ELSIF p_winner = 'B' THEN 
        v_winning_winner_pool := COALESCE((v_match.outcome_pools->>'B')::bigint, 0) + COALESCE(v_match.seed_b, 0);
    ELSIF p_winner = 'DRAW' THEN 
        v_winning_winner_pool := COALESCE((v_match.outcome_pools->>'DRAW')::bigint, 0) + COALESCE(v_match.seed_draw, 0);
    ELSE 
        RETURN json_build_object('success', false, 'error', 'Invalid winner outcome'); 
    END IF;

    -- 2. CALCULATE SCORE POOL
    v_total_score_pool := COALESCE(v_match.total_pool, 0) - (
        COALESCE((v_match.outcome_pools->>'A')::bigint, 0) + 
        COALESCE((v_match.outcome_pools->>'B')::bigint, 0) + 
        COALESCE((v_match.outcome_pools->>'DRAW')::bigint, 0)
    );
    -- Prevent negative score pool due to any data inconsistency
    IF v_total_score_pool < 0 THEN v_total_score_pool := 0; END IF;

    v_winning_score_pool := COALESCE((v_match.outcome_pools->>v_actual_score)::bigint, 0);

    -- Calculate net pools
    v_net_winner_pool := v_total_winner_pool::FLOAT * (1.0 - v_platform_fee);
    v_net_score_pool := v_total_score_pool::FLOAT * (1.0 - v_platform_fee);

    -- Update match status
    UPDATE matches SET status = 'finished', score_a = p_score_a, score_b = p_score_b, winner = p_winner WHERE id = p_match_id;

    -- Process all predictions
    FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id LOOP
        
        IF v_pred.predicted_team = p_winner THEN
            -- WINNER POOL WIN
            IF v_winning_winner_pool > 0 THEN
                v_reward := ROUND((v_pred.votes_staked::FLOAT / v_winning_winner_pool::FLOAT) * v_net_winner_pool);
            ELSE
                v_reward := 0;
            END IF;
            
            UPDATE predictions SET is_correct = true, reward = v_reward WHERE id = v_pred.id;
            
            UPDATE users SET 
                predictions_won = COALESCE(predictions_won, 0) + 1,
                predictions_total = COALESCE(predictions_total, 0) + 1
            WHERE telegram_id = v_pred.user_id;

        ELSIF v_pred.predicted_team = v_actual_score THEN
            -- SCORE POOL WIN
            IF v_winning_score_pool > 0 THEN
                v_reward := ROUND((v_pred.votes_staked::FLOAT / v_winning_score_pool::FLOAT) * v_net_score_pool);
            ELSE
                v_reward := 0;
            END IF;
            
            UPDATE predictions SET is_correct = true, reward = v_reward WHERE id = v_pred.id;
            
            UPDATE users SET 
                predictions_won = COALESCE(predictions_won, 0) + 1,
                predictions_total = COALESCE(predictions_total, 0) + 1
            WHERE telegram_id = v_pred.user_id;

        ELSE
            -- LOSS (Either wrong winner or wrong score)
            UPDATE predictions SET is_correct = false, reward = 0 WHERE id = v_pred.id;
            
            UPDATE users SET predictions_total = COALESCE(predictions_total, 0) + 1
            WHERE telegram_id = v_pred.user_id;
        END IF;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true, 
        'processed_count', v_processed_count, 
        'winner', p_winner,
        'actual_score', v_actual_score,
        'winner_pool', json_build_object('total', v_total_winner_pool, 'winning', v_winning_winner_pool),
        'score_pool', json_build_object('total', v_total_score_pool, 'winning', v_winning_score_pool)
    );
END;
$$ LANGUAGE plpgsql;
