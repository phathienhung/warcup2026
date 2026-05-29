ALTER TABLE game_config ADD COLUMN IF NOT EXISTS level_up_reward_type TEXT DEFAULT 'speed';
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS level_up_reward_value INT DEFAULT 1;
