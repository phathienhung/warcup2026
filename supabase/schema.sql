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
  ton_balance FLOAT DEFAULT 0,
  mining_speed_bonus INT DEFAULT 0,
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
  base_pool_a BIGINT DEFAULT 10000,
  base_pool_b BIGINT DEFAULT 10000,
  base_pool_draw BIGINT DEFAULT 5000,
  total_votes_a BIGINT DEFAULT 0,
  total_votes_b BIGINT DEFAULT 0,
  total_votes_draw BIGINT DEFAULT 0
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
  "group" TEXT,
  confederation TEXT,
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
INSERT INTO nations (code, name, flag, "group", confederation, multiplier) VALUES
-- Group A
('MX', 'Mexico', '🇲🇽', 'A', 'CONCACAF', 1),
('ZA', 'South Africa', '🇿🇦', 'A', 'CAF', 1),
('KR', 'South Korea', '🇰🇷', 'A', 'AFC', 1),
('CZ', 'Czech Republic', '🇨🇿', 'A', 'UEFA', 1),
-- Group B
('CA', 'Canada', '🇨🇦', 'B', 'CONCACAF', 1),
('BA', 'Bosnia', '🇧🇦', 'B', 'UEFA', 1),
('QA', 'Qatar', '🇶🇦', 'B', 'AFC', 1),
('CH', 'Switzerland', '🇨🇭', 'B', 'UEFA', 1),
-- Group C
('BR', 'Brazil', '🇧🇷', 'C', 'CONMEBOL', 1),
('MA', 'Morocco', '🇲🇦', 'C', 'CAF', 1),
('HT', 'Haiti', '🇭🇹', 'C', 'CONCACAF', 1),
('SC', 'Scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C', 'UEFA', 1),
-- Group D
('US', 'United States', '🇺🇸', 'D', 'CONCACAF', 1),
('PY', 'Paraguay', '🇵🇾', 'D', 'CONMEBOL', 1),
('AU', 'Australia', '🇦🇺', 'D', 'AFC', 1),
('TR', 'Turkey', '🇹🇷', 'D', 'UEFA', 1),
-- Group E
('DE', 'Germany', '🇩🇪', 'E', 'UEFA', 1),
('CW', 'Curacao', '🇨🇼', 'E', 'CONCACAF', 1),
('CI', 'Ivory Coast', '🇨🇮', 'E', 'CAF', 1),
('EC', 'Ecuador', '🇪🇨', 'E', 'CONMEBOL', 1),
-- Group F
('NL', 'Netherlands', '🇳🇱', 'F', 'UEFA', 1),
('JP', 'Japan', '🇯🇵', 'F', 'AFC', 1),
('SE', 'Sweden', '🇸🇪', 'F', 'UEFA', 1),
('TN', 'Tunisia', '🇹🇳', 'F', 'CAF', 1),
-- Group G
('BE', 'Belgium', '🇧🇪', 'G', 'UEFA', 1),
('EG', 'Egypt', '🇪🇬', 'G', 'CAF', 1),
('IR', 'Iran', '🇮🇷', 'G', 'AFC', 1),
('NZ', 'New Zealand', '🇳🇿', 'G', 'OFC', 1),
-- Group H
('ES', 'Spain', '🇪🇸', 'H', 'UEFA', 1),
('CV', 'Cabo Verde', '🇨🇻', 'H', 'CAF', 1),
('SA', 'Saudi Arabia', '🇸🇦', 'H', 'AFC', 1),
('UY', 'Uruguay', '🇺🇾', 'H', 'CONMEBOL', 1),
-- Group I
('FR', 'France', '🇫🇷', 'I', 'UEFA', 1),
('SN', 'Senegal', '🇸🇳', 'I', 'CAF', 1),
('IQ', 'Iraq', '🇮🇶', 'I', 'AFC', 1),
('NO', 'Norway', '🇳🇴', 'I', 'UEFA', 1),
-- Group J
('AR', 'Argentina', '🇦🇷', 'J', 'CONMEBOL', 1),
('AT', 'Austria', '🇦🇹', 'J', 'UEFA', 1),
('JO', 'Jordan', '🇯🇴', 'J', 'AFC', 1),
('DZ', 'Algeria', '🇩🇿', 'J', 'CAF', 1),
-- Group K
('PT', 'Portugal', '🇵🇹', 'K', 'UEFA', 1),
('CD', 'DR Congo', '🇨🇩', 'K', 'CAF', 1),
('UZ', 'Uzbekistan', '🇺🇿', 'K', 'AFC', 1),
('CO', 'Colombia', '🇨🇴', 'K', 'CONMEBOL', 1),
-- Group L
('GB', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L', 'UEFA', 1),
('HR', 'Croatia', '🇭🇷', 'L', 'UEFA', 1),
('GH', 'Ghana', '🇬🇭', 'L', 'CAF', 1),
('PA', 'Panama', '🇵🇦', 'L', 'CONCACAF', 1)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS max_purchases INT;
INSERT INTO shop_items (id, type, name, description, icon, price, price_type, bonus_value) VALUES
('1', 'vote_pack', 'Starter Pack', '1,000 Votes', '??', 10, 'stars', 1000),
('2', 'vote_pack', 'Pro Pack', '6,000 Votes (+20% bonus)', '??', 50, 'stars', 6000),
('3', 'vote_pack', 'Mega Pack', '15,000 Votes (+50% bonus)', '??', 100, 'stars', 15000),
('4', 'energy', 'Energy Refill', 'Full energy refill', '?', 500, 'votes', 1000),
('5', 'boost', 'Double Mining (1h)', '2x mining speed for 1 hour', '??', 2000, 'votes', 3600),
('6', 'boost', 'Triple Mining (1h)', '3x mining speed for 1 hour', '??', 20, 'stars', 3600),
('7', 'spin_ticket', 'Spin Ticket x1', '1 Lucky Spin ticket', '???', 1000, 'votes', 1),
('8', 'spin_ticket', 'Spin Ticket x5', '5 Lucky Spin tickets (-20%)', '??', 4000, 'votes', 5)
ON CONFLICT (id) DO NOTHING;


DELETE FROM nft_templates;
INSERT INTO nft_templates (player_name, nation, rarity, image_url, total_supply, price_votes) VALUES
('Algeria', 'DZ', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/algeria.png', 1000, 50000),
('Argentina', 'AR', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/argentina.png', 1000, 50000),
('Australia', 'AU', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/australia.png', 1000, 50000),
('Austria', 'AT', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/austria.png', 1000, 50000),
('Belgium', 'BE', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/belgium.png', 1000, 50000),
('Bosnia', 'BA', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/bosnia.png', 1000, 50000),
('Brasil', 'BR', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/brasil.png', 1000, 50000),
('Caboverde', 'CV', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/caboverde.png', 1000, 50000),
('Canada', 'CA', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/canada.png', 1000, 50000),
('Colombia', 'CO', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/colombia.png', 1000, 50000),
('Congo', 'CD', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/congo.png', 1000, 50000),
('Croatia', 'HR', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/croatia.png', 1000, 50000),
('Curacao', 'CW', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/curacao.png', 1000, 50000),
('Czechia', 'CZ', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/czechia.png', 1000, 50000),
('Ecuador', 'EC', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/ecuador.png', 1000, 50000),
('Egypt', 'EG', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/egypt.png', 1000, 50000),
('England', 'GB', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/england.png', 1000, 50000),
('France', 'FR', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/france.png', 1000, 50000),
('Germany', 'DE', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/germany.png', 1000, 50000),
('Ghana', 'GH', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/ghana.png', 1000, 50000),
('Haiti', 'HT', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/haiti.png', 1000, 50000),
('Iran', 'IR', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/iran.png', 1000, 50000),
('Iraq', 'IQ', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/iraq.png', 1000, 50000),
('Ivorycoast', 'CI', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/ivorycoast.png', 1000, 50000),
('Japan', 'JP', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/japan.png', 1000, 50000),
('Jordan', 'JO', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/jordan.png', 1000, 50000),
('Korea', 'KR', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/korea.png', 1000, 50000),
('Mexico', 'MX', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/mexico.png', 1000, 50000),
('Morocco', 'MA', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/morocco.png', 1000, 50000),
('Netherlands', 'NL', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/netherlands.png', 1000, 50000),
('Newzealand', 'NZ', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/newzealand.png', 1000, 50000),
('Nigeria', 'NG', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/nigeria.png', 1000, 50000),
('Norway', 'NO', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/norway.png', 1000, 50000),
('Panama', 'PA', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/panama.png', 1000, 50000),
('Paraguay', 'PY', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/paraguay.png', 1000, 50000),
('Portugal', 'PT', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/portugal.png', 1000, 50000),
('Qatar', 'QA', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/qatar.png', 1000, 50000),
('Saudi', 'SA', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/saudi.png', 1000, 50000),
('Scotland', 'SC', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/scotland.png', 1000, 50000),
('Senegal', 'SN', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/senegal.png', 1000, 50000),
('Southafrica', 'ZA', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/southafrica.png', 1000, 50000),
('Spain', 'ES', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/spain.png', 1000, 50000),
('Sweden', 'SE', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/sweden.png', 1000, 50000),
('Switzerland', 'CH', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/switzerland.png', 1000, 50000),
('Tunisia', 'TN', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/tunisia.png', 1000, 50000),
('Turkey', 'TR', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/turkey.png', 1000, 50000),
('Uruguay', 'UY', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/uruguay.png', 1000, 50000),
('Usa', 'US', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/usa.png', 1000, 50000);


CREATE TABLE IF NOT EXISTS daily_tasks (id TEXT PRIMARY KEY, title TEXT, type TEXT, target INT, reward_votes INT, reward_xp INT, icon TEXT);
INSERT INTO daily_tasks (id, title, type, target, reward_votes, reward_xp, icon) VALUES
('tap_100', 'Mine 100 votes', 'tap', 100, 50, 10, '⛏️'),
('tap_500', 'Mine 500 votes', 'tap', 500, 200, 25, '⛏️'),
('tap_2000', 'Mine 2,000 votes', 'tap', 2000, 800, 50, '💪'),
('combo_5', 'Reach combo x5', 'combo', 30, 300, 30, '🔥'),
('invite_1', 'Invite 1 friend', 'invite', 1, 1000, 100, '👥'),
('predict_1', 'Make a prediction', 'predict', 1, 200, 20, '🔮'),
('login', 'Daily check-in', 'login', 1, 100, 10, '📅')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS achievements (id TEXT PRIMARY KEY, title TEXT, description TEXT, icon TEXT, reward_votes INT);
INSERT INTO achievements (id, title, description, icon, reward_votes) VALUES
('first_tap', 'First Tap', 'Mine your first vote', '🎯', 100),
('tap_1k', 'Miner', 'Mine 1,000 votes total', '⛏️', 500),
('tap_10k', 'Pro Miner', 'Mine 10,000 votes total', '💎', 2000),
('tap_100k', 'Mining Legend', 'Mine 100,000 votes total', '👑', 10000),
('tap_1m', 'Mining God', 'Mine 1,000,000 votes total', '🌟', 50000),
('friends_5', 'Social Butterfly', 'Invite 5 friends', '🦋', 2000),
('friends_20', 'Influencer', 'Invite 20 friends', '📢', 10000),
('predict_win_3', 'Oracle', 'Win 3 predictions in a row', '🔮', 5000),
('predict_win_10', 'Prophet', 'Win 10 predictions in a row', '🏆', 25000),
('nft_5', 'Collector', 'Own 5 NFT players', '🖼️', 3000),
('streak_7', 'Dedicated', '7-day login streak', '🔥', 2000),
('streak_30', 'Hardcore', '30-day login streak', '💥', 15000),
('level_10', 'Rising Star', 'Reach level 10', '⭐', 5000),
('level_50', 'Superstar', 'Reach level 50', '🌟', 50000),
('clan_join', 'Team Player', 'Join a clan', '🤝', 500),
('founder', 'Founder', 'Joined during pre-season', '🏅', 10000)
ON CONFLICT (id) DO NOTHING;


