-- ==============================================================================
-- BẢNG CẤU HÌNH PHẦN THƯỞNG ĐIỂM DANH (streak_rewards)
-- Mỗi ngày điểm danh sẽ nhận +speed và +max_energy
-- Bạn có thể chỉnh số liệu trực tiếp trên Supabase Table Editor
-- ==============================================================================
CREATE TABLE IF NOT EXISTS streak_rewards (
  day INT PRIMARY KEY,              -- Ngày thứ mấy (1-7)
  speed_reward INT DEFAULT 1,       -- Số speed cộng thêm
  max_energy_reward INT DEFAULT 100 -- Số max energy cộng thêm
);

-- Dữ liệu mẫu: Bạn có thể sửa lại trực tiếp trên Supabase
INSERT INTO streak_rewards (day, speed_reward, max_energy_reward) VALUES
  (1, 1, 100),     -- Day 1: +1 Speed, +100 Max Energy
  (2, 1, 100),     -- Day 2: +1 Speed, +100 Max Energy
  (3, 2, 200),     -- Day 3: +2 Speed, +200 Max Energy
  (4, 2, 200),     -- Day 4: +2 Speed, +200 Max Energy
  (5, 3, 300),     -- Day 5: +3 Speed, +300 Max Energy
  (6, 3, 300),     -- Day 6: +3 Speed, +300 Max Energy
  (7, 5, 500)      -- Day 7: +5 Speed, +500 Max Energy (JACKPOT!)
ON CONFLICT (day) DO UPDATE 
  SET speed_reward = EXCLUDED.speed_reward,
      max_energy_reward = EXCLUDED.max_energy_reward;

-- ==============================================================================
-- HƯỚNG DẪN:
-- 1. Copy toàn bộ đoạn SQL này, chạy trên Supabase SQL Editor.
-- 2. Sau đó mở Table Editor > streak_rewards để chỉnh giá trị từng ngày.
-- 3. Ví dụ muốn Day 7 thưởng +10 Speed và +1000 Max Energy, 
--    chỉ cần sửa trực tiếp trên giao diện Supabase.
-- ==============================================================================
