-- Add Streak configuration to game_config
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS streak_reward_type TEXT DEFAULT 'speed';
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS streak_reward_value INT DEFAULT 1;

-- Add tracking for daily streak claim in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_streak_claim DATE;

-- Create dynamic tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  type TEXT NOT NULL, -- 'telegram', 'link', 'tap', 'invite', etc.
  action_url TEXT,
  verification_data TEXT, -- e.g., '@warcup2026_community' for telegram check
  reward_type TEXT NOT NULL, -- 'speed', 'regen', 'max_energy', 'votes', 'xp'
  reward_value INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample tasks
INSERT INTO tasks (id, title, description, icon, type, action_url, verification_data, reward_type, reward_value)
VALUES 
  ('join_channel', 'Join Official Channel', 'Join our Telegram channel for news!', '📢', 'telegram', 'https://t.me/warcup2026_community', '@warcup2026_community', 'speed', 1),
  ('play_other_game', 'Play Partner Game', 'Try our partner game!', '🎮', 'link', 'https://t.me/OtherGameBot', NULL, 'votes', 1000)
ON CONFLICT (id) DO NOTHING;

-- Modify user_tasks if needed. user_tasks already has (user_id, task_id, progress, completed, completed_at, reset_date)
-- We might need a status column 'pending', 'verified', 'claimed' but we can use 'completed' for 'claimed' and 'progress' for 'verified' (1 = verified).
ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'; -- 'pending', 'verified', 'claimed'
