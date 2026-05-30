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
('FR', 'France', '🇫🇷', 'A', 'UEFA', 1),
('PL', 'Poland', '🇵🇱', 'A', 'UEFA', 1),
('US', 'United States', '🇺🇸', 'A', 'CONCACAF', 1),
('UZ', 'Uzbekistan', '🇺🇿', 'A', 'AFC', 1),
('GB', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'B', 'UEFA', 1),
('SE', 'Sweden', '🇸🇪', 'B', 'UEFA', 1),
('MX', 'Mexico', '🇲🇽', 'B', 'CONCACAF', 1),
('DZ', 'Algeria', '🇩🇿', 'B', 'CAF', 1),
('ES', 'Spain', '🇪🇸', 'C', 'UEFA', 1),
('UA', 'Ukraine', '🇺🇦', 'C', 'UEFA', 1),
('CA', 'Canada', '🇨🇦', 'C', 'CONCACAF', 1),
('PE', 'Peru', '🇵🇪', 'C', 'CONMEBOL', 1),
('DE', 'Germany', '🇩🇪', 'D', 'UEFA', 1),
('RS', 'Serbia', '🇷🇸', 'D', 'UEFA', 1),
('AR', 'Argentina', '🇦🇷', 'D', 'CONMEBOL', 1),
('CI', 'Ivory Coast', '🇨🇮', 'D', 'CAF', 1),
('PT', 'Portugal', '🇵🇹', 'E', 'UEFA', 1),
('BR', 'Brazil', '🇧🇷', 'E', 'CONMEBOL', 1),
('ML', 'Mali', '🇲🇱', 'E', 'CAF', 1),
('IQ', 'Iraq', '🇮🇶', 'E', 'AFC', 1),
('NL', 'Netherlands', '🇳🇱', 'F', 'UEFA', 1),
('UY', 'Uruguay', '🇺🇾', 'F', 'CONMEBOL', 1),
('ZA', 'South Africa', '🇿🇦', 'F', 'CAF', 1),
('QA', 'Qatar', '🇶🇦', 'F', 'AFC', 1),
('IT', 'Italy', '🇮🇹', 'G', 'UEFA', 1),
('CO', 'Colombia', '🇨🇴', 'G', 'CONMEBOL', 1),
('CM', 'Cameroon', '🇨🇲', 'G', 'CAF', 1),
('SA', 'Saudi Arabia', '🇸🇦', 'G', 'AFC', 1),
('BE', 'Belgium', '🇧🇪', 'H', 'UEFA', 1),
('EC', 'Ecuador', '🇪🇨', 'H', 'CONMEBOL', 1),
('TN', 'Tunisia', '🇹🇳', 'H', 'CAF', 1),
('AU', 'Australia', '🇦🇺', 'H', 'AFC', 1),
('HR', 'Croatia', '🇭🇷', 'I', 'UEFA', 1),
('VE', 'Venezuela', '🇻🇪', 'I', 'CONMEBOL', 1),
('EG', 'Egypt', '🇪🇬', 'I', 'CAF', 1),
('NZ', 'New Zealand', '🇳🇿', 'I', 'OFC', 1),
('CH', 'Switzerland', '🇨🇭', 'J', 'UEFA', 1),
('PA', 'Panama', '🇵🇦', 'J', 'CONCACAF', 1),
('NG', 'Nigeria', '🇳🇬', 'J', 'CAF', 1),
('KR', 'South Korea', '🇰🇷', 'J', 'AFC', 1),
('DK', 'Denmark', '🇩🇰', 'K', 'UEFA', 1),
('CR', 'Costa Rica', '🇨🇷', 'K', 'CONCACAF', 1),
('SN', 'Senegal', '🇸🇳', 'K', 'CAF', 1),
('IR', 'Iran', '🇮🇷', 'K', 'AFC', 1),
('AT', 'Austria', '🇦🇹', 'L', 'UEFA', 1),
('JM', 'Jamaica', '🇯🇲', 'L', 'CONCACAF', 1),
('MA', 'Morocco', '🇲🇦', 'L', 'CAF', 1),
('JP', 'Japan', '🇯🇵', 'L', 'AFC', 1)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS max_purchases INT;
INSERT INTO shop_items (id, type, name, description, icon, price, price_type, bonus_value) VALUES
('1', 'vote_pack', 'Starter Pack', '1,000 Votes', '📦', 10, 'stars', 1000),
('2', 'vote_pack', 'Pro Pack', '6,000 Votes (+20% bonus)', '💎', 50, 'stars', 6000),
('3', 'vote_pack', 'Mega Pack', '15,000 Votes (+50% bonus)', '🏆', 100, 'stars', 15000),
('4', 'energy', 'Energy Refill', 'Full energy refill', '⚡', 500, 'votes', 1000),
('5', 'boost', 'Double Mining (1h)', '2x mining speed for 1 hour', '🚀', 2000, 'votes', 3600),
('6', 'boost', 'Triple Mining (1h)', '3x mining speed for 1 hour', '💫', 20, 'stars', 3600),
('7', 'spin_ticket', 'Spin Ticket x1', '1 Lucky Spin ticket', '🎟️', 1000, 'votes', 1),
('8', 'spin_ticket', 'Spin Ticket x5', '5 Lucky Spin tickets (-20%)', '🎫', 4000, 'votes', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO nft_templates (player_name, nation, rarity, image_url, total_supply, price_votes) VALUES
('Messi', 'AR', 'mythic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/ar.png', 1000, 50000),
('Ronaldo', 'PT', 'mythic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/pt.png', 1000, 50000),
('Mbappé', 'FR', 'legendary', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/fr.png', 1000, 50000),
('Neymar', 'BR', 'legendary', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/br.png', 1000, 50000),
('Haaland', 'NO', 'legendary', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/no.png', 1000, 50000),
('Vinicius Jr', 'BR', 'legendary', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/br.png', 1000, 50000),
('Bellingham', 'GB', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/gb.png', 1000, 50000),
('Pedri', 'ES', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/es.png', 1000, 50000),
('Saka', 'GB', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/gb.png', 1000, 50000),
('De Bruyne', 'BE', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/be.png', 1000, 50000),
('Salah', 'EG', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/eg.png', 1000, 50000),
('Son', 'KR', 'rare', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/kr.png', 1000, 50000),
('Pulisic', 'US', 'rare', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/us.png', 1000, 50000),
('Lautaro', 'AR', 'rare', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/ar.png', 1000, 50000),
('Gavi', 'ES', 'rare', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/es.png', 1000, 50000),
('Yamal', 'ES', 'rare', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/es.png', 1000, 50000),
('Osimhen', 'NG', 'rare', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/ng.png', 1000, 50000),
('Hakimi', 'MA', 'rare', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/ma.png', 1000, 50000),
('Valverde', 'UY', 'rare', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/uy.png', 1000, 50000),
('Rodri', 'ES', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/es.png', 1000, 50000),
('Mané', 'SN', 'common', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/sn.png', 1000, 50000),
('James', 'CO', 'common', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/co.png', 1000, 50000),
('Davies', 'CA', 'common', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/ca.png', 1000, 50000),
('Doan', 'JP', 'common', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/jp.png', 1000, 50000);

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

