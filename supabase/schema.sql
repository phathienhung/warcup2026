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
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid()::text = telegram_id::text);
-- Admin backend will bypass RLS via service role key.
