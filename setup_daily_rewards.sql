-- ==============================================================================
-- BẢNG CẤU HÌNH PHẦN THƯỞNG ĐIỂM DANH HÀNG NGÀY (DAILY LOGIN REWARDS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS daily_rewards_config (
  day INT PRIMARY KEY,
  reward_type VARCHAR(50) NOT NULL, -- 'speed', 'max_energy', 'votes'
  reward_value BIGINT NOT NULL
);

-- Xóa dữ liệu cũ nếu có
TRUNCATE TABLE daily_rewards_config;

-- Insert cấu hình 7 ngày mặc định
INSERT INTO daily_rewards_config (day, reward_type, reward_value) VALUES
(1, 'speed', 1),
(2, 'max_energy', 500),
(3, 'speed', 2),
(4, 'max_energy', 1000),
(5, 'speed', 3),
(6, 'max_energy', 2000),
(7, 'votes', 10000);

-- Note: Nếu user điểm danh đến ngày 8, hệ thống có thể quay vòng (modulo 7) hoặc cap ở ngày 7 tùy logic.
-- Trong code hiện tại, streak_reward sẽ lấy (streak - 1) % 7 + 1 để quay vòng.
