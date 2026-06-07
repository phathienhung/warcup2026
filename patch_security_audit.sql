-- =========================================================
-- SECURITY AUDIT PATCH 
-- Fixes Race Conditions, RLS Escalation, and Resolve Match Bugs
-- =========================================================

-- 1. [CRITICAL] Fix Race Condition in claim_ton_commissions & Auth Bypass
CREATE OR REPLACE FUNCTION claim_ton_commissions(
    p_user_id BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_claim_amount FLOAT := 0;
    v_legacy_amount FLOAT := 0;
    v_total_amount FLOAT := 0;
BEGIN
    -- Security Check: Ensure caller authorization
    IF auth.uid()::text != p_user_id::text THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'User not found'); END IF;

    -- FIX: Atomically lock, mark claimed, and extract exact sum
    WITH claimed AS (
        UPDATE referral_commissions 
        SET is_claimed = true 
        WHERE referrer_id = p_user_id AND is_claimed = false
        RETURNING commission_amount
    )
    SELECT COALESCE(SUM(commission_amount), 0) INTO v_claim_amount FROM claimed;

    v_legacy_amount := COALESCE(v_user.unclaimed_ref_ton, 0);

    IF v_legacy_amount > v_claim_amount THEN
        v_total_amount := v_legacy_amount;
    ELSE
        v_total_amount := v_claim_amount;
    END IF;

    IF v_total_amount <= 0 THEN RETURN json_build_object('success', false, 'error', 'No commissions to claim'); END IF;

    UPDATE users SET 
        ton_balance = COALESCE(ton_balance, 0) + v_total_amount,
        unclaimed_ref_ton = 0
    WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true, 'claimed_amount', v_total_amount, 'new_ton_balance', COALESCE(v_user.ton_balance, 0) + v_total_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. [HIGH] Fix Logic Flaw in resolve_match leaving losing bets pending
CREATE OR REPLACE FUNCTION resolve_match(
    p_match_id UUID,
    p_score_a INT,
    p_score_b INT,
    p_winner TEXT
) RETURNS JSON AS $$
DECLARE
    v_match RECORD; v_pred RECORD;
    v_total_pool BIGINT; v_winning_pool BIGINT; v_reward BIGINT; v_net_pool BIGINT;
    v_platform_fee FLOAT := 0.05;
    v_processed_count INT := 0;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Match not found'); END IF;
    IF v_match.status = 'finished' THEN RETURN json_build_object('success', false, 'error', 'Match already resolved'); END IF;

    v_total_pool := COALESCE(v_match.total_pool, 0) + COALESCE(v_match.seed_a, 0) + COALESCE(v_match.seed_b, 0) + COALESCE(v_match.seed_draw, 0);
    
    IF p_winner = 'A' THEN v_winning_pool := COALESCE((v_match.outcome_pools->>'A')::bigint, 0) + COALESCE(v_match.seed_a, 0);
    ELSIF p_winner = 'B' THEN v_winning_pool := COALESCE((v_match.outcome_pools->>'B')::bigint, 0) + COALESCE(v_match.seed_b, 0);
    ELSIF p_winner = 'DRAW' THEN v_winning_pool := COALESCE((v_match.outcome_pools->>'DRAW')::bigint, 0) + COALESCE(v_match.seed_draw, 0);
    ELSE RETURN json_build_object('success', false, 'error', 'Invalid winner outcome'); END IF;

    UPDATE matches SET status = 'finished', score_a = p_score_a, score_b = p_score_b, winner = p_winner WHERE id = p_match_id;
    v_net_pool := v_total_pool - (v_total_pool * v_platform_fee);

    -- FIX: Process losing predictions and loser stats before early return
    UPDATE predictions SET is_correct = false, reward = 0 WHERE match_id = p_match_id AND predicted_team != p_winner;
    
    UPDATE users u SET predictions_total = COALESCE(predictions_total, 0) + 1
    FROM predictions p WHERE p.user_id = u.telegram_id AND p.match_id = p_match_id AND p.predicted_team != p_winner;

    IF v_winning_pool <= 0 OR v_total_pool <= 0 THEN
        RETURN json_build_object('success', true, 'message', 'Match finished. No payouts required.', 'processed_count', 0);
    END IF;

    FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id AND predicted_team = p_winner LOOP
        v_reward := ROUND((v_pred.votes_staked::FLOAT / v_winning_pool::FLOAT) * v_net_pool::FLOAT);
        UPDATE predictions SET is_correct = true, reward = v_reward WHERE id = v_pred.id;
        UPDATE users SET predictions_won = COALESCE(predictions_won, 0) + 1, predictions_total = COALESCE(predictions_total, 0) + 1 WHERE telegram_id = v_pred.user_id;
        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'processed_count', v_processed_count, 'winner', p_winner, 'total_pool', v_total_pool, 'winning_pool', v_winning_pool);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. [HIGH] Privilege Escalation / RPC Auth for claim_prediction_reward
CREATE OR REPLACE FUNCTION claim_prediction_reward(
    p_user_id BIGINT,
    p_prediction_id UUID
) RETURNS JSON AS $$
DECLARE
    v_prediction RECORD; v_reward BIGINT;
BEGIN
    -- FIX: Verify identity to prevent proxy execution
    IF auth.uid()::text != p_user_id::text THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    SELECT * INTO v_prediction FROM predictions WHERE id = p_prediction_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Prediction not found'); END IF;
    IF NOT COALESCE(v_prediction.is_correct, false) THEN RETURN json_build_object('success', false, 'error', 'Cannot claim a lost prediction'); END IF;
    IF COALESCE(v_prediction.is_claimed, false) THEN RETURN json_build_object('success', false, 'error', 'Reward already claimed'); END IF;

    v_reward := COALESCE(v_prediction.reward, 0);
    UPDATE predictions SET is_claimed = true WHERE id = p_prediction_id;
    
    UPDATE users SET 
        available_votes = COALESCE(available_votes, 0) + v_reward,
        total_votes = COALESCE(total_votes, 0) + v_reward
    WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true, 'reward', v_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. [HIGH] Enable RLS and missing policies on Tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Block public REST inserts on critical state
DROP POLICY IF EXISTS "Read only for users" ON matches;
CREATE POLICY "Read only for users" ON matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own predictions" ON predictions;
CREATE POLICY "Users can insert own predictions" ON predictions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can read own predictions" ON predictions;
CREATE POLICY "Users can read own predictions" ON predictions FOR SELECT USING (auth.uid()::text = user_id::text);
