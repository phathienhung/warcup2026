-- ==============================================================================
-- 1. THÊM CỘT is_claimed VÀO BẢNG PREDICTIONS
-- ==============================================================================
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT FALSE;

-- ==============================================================================
-- 2. HÀM TRẢ THƯỞNG TỰ ĐỘNG (PARIMUTUEL) - CẬP NHẬT
-- Lưu ý: Không tự cộng tiền vào users nữa, chỉ ghi nhận reward
-- ==============================================================================
CREATE OR REPLACE FUNCTION resolve_match_parimutuel(
  p_match_id UUID, 
  p_winner VARCHAR,
  p_score VARCHAR
)
RETURNS VOID AS $$
DECLARE
  v_match RECORD;
  v_winner_pool BIGINT;
  v_score_pool BIGINT;
  v_pred RECORD;
  v_payout BIGINT;
  v_commission FLOAT := 0.95; 
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status = 'completed' THEN RAISE EXCEPTION 'Match already completed'; END IF;

  v_winner_pool := COALESCE((v_match.outcome_pools->>'A')::BIGINT, 0) + 
                   COALESCE((v_match.outcome_pools->>'B')::BIGINT, 0) + 
                   COALESCE((v_match.outcome_pools->>'DRAW')::BIGINT, 0);
  
  v_score_pool := COALESCE(v_match.total_pool, 0) - v_winner_pool;

  UPDATE matches 
  SET status = 'completed', 
      winner = p_winner, 
      score_a = SPLIT_PART(p_score, '-', 1)::INT,
      score_b = SPLIT_PART(p_score, '-', 2)::INT
  WHERE id = p_match_id;

  FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id LOOP
    v_payout := 0;

    IF v_pred.predicted_team IN ('A', 'B', 'DRAW') THEN
      IF v_pred.predicted_team = p_winner THEN
        v_payout := FLOOR((v_winner_pool * v_commission) * v_pred.votes_staked / NULLIF((v_match.outcome_pools->>p_winner)::BIGINT, 0));
      END IF;
    ELSE
      IF v_pred.predicted_team = p_score THEN
        v_payout := FLOOR((v_score_pool * v_commission) * v_pred.votes_staked / NULLIF((v_match.outcome_pools->>p_score)::BIGINT, 0));
      END IF;
    END IF;

    IF v_payout > 0 THEN
      UPDATE predictions SET is_correct = TRUE, reward = v_payout, is_claimed = FALSE WHERE id = v_pred.id;
    ELSE
      UPDATE predictions SET is_correct = FALSE, reward = 0, is_claimed = TRUE WHERE id = v_pred.id;
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TẠO TRẬN ĐẤU GIẢ LẬP (MOCK MATCH)
-- ==============================================================================
INSERT INTO matches (
  team_a, team_b, flag_a, flag_b, match_date, stage, group_name, status,
  odds, total_pool, total_users, outcome_pools, outcome_users
) VALUES (
  'VN', 'TH', '🇻🇳', '🇹🇭', 
  NOW() + INTERVAL '5 minutes', 
  'TEST MATCH', 'TEST', 'voting',
  '{"A": 1.5, "B": 2.5, "DRAW": 3.0, "1-0": 5.0}',
  0, 0, '{}'::jsonb, '{}'::jsonb
);
