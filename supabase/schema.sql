-- Schema for World Cup Mining War 2026

CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  avatar_url TEXT,
  total_votes BIGINT DEFAULT 0,
  available_votes BIGINT DEFAULT 0,
  mining_speed INT DEFAULT 1,
  energy INT DEFAULT 1000,
  max_energy INT DEFAULT 1000,
  level INT DEFAULT 1,
  xp BIGINT DEFAULT 0,
  favorite_nation TEXT,
  clan_id UUID,
  referral_code TEXT UNIQUE,
  referred_by BIGINT,
  vip_level INT DEFAULT 0,
  login_streak INT DEFAULT 1,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_taps BIGINT DEFAULT 0,
  founder_badge BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id BIGINT REFERENCES users(telegram_id),
  referred_id BIGINT REFERENCES users(telegram_id) UNIQUE,
  tier INT DEFAULT 1,
  reward_given BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(telegram_id),
  task_id TEXT,
  progress BIGINT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reset_date DATE,
  UNIQUE(user_id, task_id, reset_date)
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a TEXT,
  team_b TEXT,
  flag_a TEXT,
  flag_b TEXT,
  match_date TIMESTAMP WITH TIME ZONE,
  stage TEXT,
  group_name TEXT,
  status TEXT DEFAULT 'upcoming',
  winner TEXT,
  score_a INT,
  score_b INT,
  total_votes_a BIGINT DEFAULT 0,
  total_votes_b BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(telegram_id),
  match_id UUID REFERENCES matches(id),
  predicted_team TEXT,
  votes_staked BIGINT,
  multiplier FLOAT DEFAULT 1.0,
  reward BIGINT DEFAULT 0,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nft_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT,
  nation TEXT,
  rarity TEXT,
  mining_bonus INT DEFAULT 0,
  vote_multiplier FLOAT DEFAULT 1.0,
  reward_bonus FLOAT DEFAULT 0,
  energy_bonus INT DEFAULT 0,
  image_url TEXT,
  total_supply INT,
  minted_count INT DEFAULT 0,
  price_votes BIGINT
);

CREATE TABLE IF NOT EXISTS user_nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(telegram_id),
  nft_template_id UUID REFERENCES nft_templates(id),
  mint_number INT,
  equipped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE,
  nation TEXT,
  flag TEXT,
  leader_id BIGINT REFERENCES users(telegram_id),
  total_votes BIGINT DEFAULT 0,
  member_count INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_config (
  id INT PRIMARY KEY DEFAULT 1,
  energy_regen_rate_ms INT DEFAULT 1000,
  energy_regen_amount INT DEFAULT 1,
  max_energy_base INT DEFAULT 1000,
  base_mining_speed INT DEFAULT 1,
  base_xp_req INT DEFAULT 1000,
  spin_segments_json JSONB DEFAULT '[]'::jsonb
);

INSERT INTO game_config (id, energy_regen_rate_ms, energy_regen_amount, max_energy_base, base_mining_speed, base_xp_req, spin_segments_json) 
VALUES (1, 1000, 1, 1000, 1, 1000, '[
  {"label": "+50 Energy", "reward": 50, "type": "energy", "color": "#ff6b35", "probability": 0.20},
  {"label": "+500 Votes", "reward": 500, "type": "votes", "color": "#00d4ff", "probability": 0.20},
  {"label": "+0.1 TON", "reward": 0.1, "type": "ton", "color": "#00d4ff", "probability": 0.05},
  {"label": "+1 Speed", "reward": 1, "type": "speed", "color": "#ff3366", "probability": 0.15},
  {"label": "+100 XP", "reward": 100, "type": "xp", "color": "#a855f7", "probability": 0.20},
  {"label": "+Regen", "reward": 1, "type": "regen", "color": "#00ff88", "probability": 0.20}
]'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS nations (
  code TEXT PRIMARY KEY,
  name TEXT,
  flag TEXT,
  multiplier FLOAT DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  type TEXT,
  name TEXT,
  description TEXT,
  icon TEXT,
  price BIGINT,
  price_type TEXT, -- 'votes' or 'ton'
  bonus_value FLOAT
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(telegram_id),
  tx_type TEXT, -- 'deposit' or 'withdraw'
  amount_ton FLOAT,
  tx_hash TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_purchases (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(telegram_id),
  item_type TEXT,
  item_id TEXT,
  quantity INT DEFAULT 1,
  price_paid BIGINT,
  price_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spin_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(telegram_id),
  reward_type TEXT,
  reward_amount INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS setup (simple example for games)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid()::text = telegram_id::text);
-- Admin backend will bypass RLS via service role key.
