-- ==============================================================================
-- SCRIPT BẮT BUỘC (FORCE) ÁP DỤNG LẠI SEED CHO TẤT CẢ TRẬN ĐẤU
-- Lưu ý: Lệnh này sẽ ghi đè lên toàn bộ các Seed cũ.
-- ==============================================================================
DO $$
DECLARE
  v_mode seed_mode_enum;
  v_fixed INT;
  v_min INT;
  v_max INT;
BEGIN
  -- Lấy cấu hình hiện tại từ game_config
  SELECT seed_mode, seed_fixed, seed_min, seed_max INTO v_mode, v_fixed, v_min, v_max FROM game_config WHERE id = 1;
  
  -- Fallback nếu bị null
  IF v_mode IS NULL THEN v_mode := 'dynamic'; END IF;
  IF v_fixed IS NULL THEN v_fixed := 50000; END IF;
  IF v_min IS NULL THEN v_min := 10000; END IF;
  IF v_max IS NULL THEN v_max := 50000; END IF;

  IF v_mode = 'fixed' THEN
    -- ÉP CẬP NHẬT TẤT CẢ THÀNH FIXED (Không có WHERE)
    UPDATE matches SET 
      seed_a = v_fixed,
      seed_b = v_fixed,
      seed_draw = v_fixed;
  ELSE
    -- ÉP CẬP NHẬT TẤT CẢ THÀNH DYNAMIC MỚI (Không có WHERE)
    UPDATE matches SET 
      seed_a = floor(random() * (v_max - v_min + 1) + v_min)::BIGINT,
      seed_b = floor(random() * (v_max - v_min + 1) + v_min)::BIGINT,
      seed_draw = floor(random() * (v_max - v_min + 1) + v_min)::BIGINT;
  END IF;
END $$;
