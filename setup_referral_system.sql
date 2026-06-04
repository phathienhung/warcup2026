-- 1. Thêm cấu hình JSON vào game_config
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS referral_system_json JSONB;

-- Cập nhật cấu hình mặc định do User cung cấp
UPDATE game_config
SET referral_system_json = '{
  "bot_link": "https://t.me/warcup2026_bot/app",
  "f1_percent": 10,
  "f2_percent": 5,
  "f3_percent": 2,
  "milestones": [
    {
      "count": 1,
      "reward_type": "votes",
      "reward": 10000
    },
    {
      "count": 3,
      "reward_type": "votes",
      "reward": 30000
    },
    {
      "count": 5,
      "reward_type": "votes",
      "reward": 50000
    },
    {
      "count": 10,
      "reward_type": "votes",
      "reward": 100000
    },
    {
      "count": 20,
      "reward_type": "votes",
      "reward": 200000
    },
    {
      "count": 50,
      "reward_type": "votes",
      "reward": 500000
    },
    {
      "count": 100,
      "reward_type": "votes",
      "reward": 1000000
    }
  ]
}'::jsonb
WHERE id = 1 AND (referral_system_json IS NULL OR referral_system_json = '{}'::jsonb);

-- 2. Thêm mảng theo dõi tiến độ claim của User
ALTER TABLE users ADD COLUMN IF NOT EXISTS claimed_friend_milestones INTEGER[] DEFAULT '{}';
