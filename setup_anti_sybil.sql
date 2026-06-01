-- ==============================================================================
-- CẬP NHẬT CƠ CHẾ CHỐNG CLONE (ANTI-SYBIL)
-- 1. Bơm thanh khoản ngẫu nhiên (Fake Seed Volume)
-- 2. Đặt trần tỉ lệ ăn (Max Multiplier Cap)
-- ==============================================================================

-- 1. BẢNG CẤU HÌNH HỆ THỐNG
CREATE TABLE IF NOT EXISTS game_config (
  id INT PRIMARY KEY
);

-- Tạo ENUM cho seed_mode để Supabase hiển thị dưới dạng dropdown
DO $$ BEGIN
    CREATE TYPE seed_mode_enum AS ENUM ('fixed', 'dynamic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Thêm các cột nếu chưa có (Phòng trường hợp bảng game_config đã tồn tại từ trước)
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS seed_mode seed_mode_enum DEFAULT 'dynamic';
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS seed_fixed INT DEFAULT 50000;
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS seed_min INT DEFAULT 10000;
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS seed_max INT DEFAULT 50000;
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS max_multiplier FLOAT DEFAULT 15.0;

-- Chuyển đổi cột seed_mode sang kiểu enum nếu nó đang là text
ALTER TABLE game_config ALTER COLUMN seed_mode TYPE seed_mode_enum USING seed_mode::seed_mode_enum;
ALTER TABLE game_config ALTER COLUMN seed_mode SET DEFAULT 'dynamic'::seed_mode_enum;

-- Xóa các cột bị trùng lặp / dư thừa (vì đã có bảng streak_rewards riêng)
ALTER TABLE game_config DROP COLUMN IF EXISTS streak_reward_type;
ALTER TABLE game_config DROP COLUMN IF EXISTS streak_reward_value;

INSERT INTO game_config (id, seed_mode, seed_fixed, seed_min, seed_max, max_multiplier) 
VALUES (1, 'dynamic', 50000, 10000, 50000, 15.0) 
ON CONFLICT (id) DO UPDATE 
SET seed_mode = EXCLUDED.seed_mode,
    seed_fixed = EXCLUDED.seed_fixed,
    seed_min = EXCLUDED.seed_min,
    seed_max = EXCLUDED.seed_max,
    max_multiplier = EXCLUDED.max_multiplier;

-- 2. THÊM CỘT SEED VÀO BẢNG MATCHES
ALTER TABLE matches ADD COLUMN IF NOT EXISTS seed_a BIGINT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS seed_b BIGINT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS seed_draw BIGINT DEFAULT 0;

-- 3. HÀM TẠO SEED CHO TẤT CẢ TRẬN ĐẤU CŨ VÀ MỚI (LƯU Ý: CHỈ ÁP DỤNG VỚI CÁC TRẬN CHƯA CÓ SEED)
DO $$
DECLARE
  v_mode TEXT;
  v_fixed INT;
  v_min INT;
  v_max INT;
BEGIN
  SELECT seed_mode, seed_fixed, seed_min, seed_max INTO v_mode, v_fixed, v_min, v_max FROM game_config WHERE id = 1;
  
  -- Fallback nếu bị null
  IF v_mode IS NULL THEN v_mode := 'dynamic'; END IF;
  IF v_fixed IS NULL THEN v_fixed := 50000; END IF;
  IF v_min IS NULL THEN v_min := 10000; END IF;
  IF v_max IS NULL THEN v_max := 50000; END IF;

  IF v_mode = 'fixed' THEN
    -- Nếu chọn mode cố định, cập nhật đồng loạt bằng con số N
    UPDATE matches SET 
      seed_a = v_fixed,
      seed_b = v_fixed,
      seed_draw = v_fixed
    WHERE seed_a = 0 OR seed_a IS NULL;
  ELSE
    -- Nếu chọn mode động, random trong khoảng min max
    UPDATE matches SET 
      seed_a = floor(random() * (v_max - v_min + 1) + v_min)::BIGINT,
      seed_b = floor(random() * (v_max - v_min + 1) + v_min)::BIGINT,
      seed_draw = floor(random() * (v_max - v_min + 1) + v_min)::BIGINT
    WHERE seed_a = 0 OR seed_a IS NULL;
  END IF;
END $$;

-- 4. CẬP NHẬT HÀM TRẢ THƯỞNG (PARIMUTUEL) KÈM MAX MULTIPLIER & SEED
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
  v_raw_payout BIGINT;
  v_max_payout BIGINT;
  v_commission FLOAT := 0.95; 
  v_max_mult FLOAT;
  v_target_pool BIGINT;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status = 'completed' THEN RAISE EXCEPTION 'Match already completed'; END IF;

  -- Lấy max_multiplier từ config
  SELECT max_multiplier INTO v_max_mult FROM game_config WHERE id = 1;
  IF v_max_mult IS NULL THEN v_max_mult := 15.0; END IF;

  -- Tính tổng pool của các cửa chính (bao gồm cả Seed ảo của Hệ thống)
  v_winner_pool := COALESCE((v_match.outcome_pools->>'A')::BIGINT, 0) + COALESCE(v_match.seed_a, 0) +
                   COALESCE((v_match.outcome_pools->>'B')::BIGINT, 0) + COALESCE(v_match.seed_b, 0) +
                   COALESCE((v_match.outcome_pools->>'DRAW')::BIGINT, 0) + COALESCE(v_match.seed_draw, 0);
  
  -- Pool cho điểm số chính xác (Tạm thời không dùng seed cho tỉ số vì tỉ số có quá nhiều cửa)
  v_score_pool := COALESCE(v_match.total_pool, 0) - (
                    COALESCE((v_match.outcome_pools->>'A')::BIGINT, 0) + 
                    COALESCE((v_match.outcome_pools->>'B')::BIGINT, 0) + 
                    COALESCE((v_match.outcome_pools->>'DRAW')::BIGINT, 0)
                  );

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
        -- Lấy tổng volume của cửa đó (Bao gồm User + Seed Hệ Thống)
        v_target_pool := COALESCE((v_match.outcome_pools->>p_winner)::BIGINT, 0);
        IF p_winner = 'A' THEN v_target_pool := v_target_pool + COALESCE(v_match.seed_a, 0); END IF;
        IF p_winner = 'B' THEN v_target_pool := v_target_pool + COALESCE(v_match.seed_b, 0); END IF;
        IF p_winner = 'DRAW' THEN v_target_pool := v_target_pool + COALESCE(v_match.seed_draw, 0); END IF;

        -- Tính thưởng gốc
        v_raw_payout := FLOOR((v_winner_pool * v_commission) * v_pred.votes_staked / NULLIF(v_target_pool, 0));
        
        -- Cắt ngọn (Max Cap)
        v_max_payout := FLOOR(v_pred.votes_staked * v_max_mult);
        IF v_raw_payout > v_max_payout THEN
           v_payout := v_max_payout;
        ELSE
           v_payout := v_raw_payout;
        END IF;

      END IF;
    ELSE
      IF v_pred.predicted_team = p_score THEN
        -- Tỉ số không dùng Seed nên tính bình thường, nhưng vẫn áp dụng Max Cap
        v_raw_payout := FLOOR((v_score_pool * v_commission) * v_pred.votes_staked / NULLIF((v_match.outcome_pools->>p_score)::BIGINT, 0));
        v_max_payout := FLOOR(v_pred.votes_staked * v_max_mult);
        IF v_raw_payout > v_max_payout THEN
           v_payout := v_max_payout;
        ELSE
           v_payout := v_raw_payout;
        END IF;
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

-- HƯỚNG DẪN:
-- 1. Chạy đoạn Script này trong SQL Editor của Supabase.
-- 2. Bạn có thể tự chỉnh sửa (Range Seed) và (Max Multiplier) tại Table `game_config`.
