-- =====================================================
-- MIGRATION: Move all hardcoded data to Supabase
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add missing columns to nations table
ALTER TABLE nations ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE nations ADD COLUMN IF NOT EXISTS confederation TEXT;

-- 2. Drop and re-insert nations with group data
DELETE FROM nations;
INSERT INTO nations (code, name, flag, "group", confederation, multiplier) VALUES
('US', 'United States', '🇺🇸', 'A', 'CONCACAF', 1),
('MA', 'Morocco', '🇲🇦', 'A', 'CAF', 1),
('PT', 'Portugal', '🇵🇹', 'A', 'UEFA', 1),
('UZ', 'Uzbekistan', '🇺🇿', 'A', 'AFC', 1),
('AR', 'Argentina', '🇦🇷', 'B', 'CONMEBOL', 1),
('PE', 'Peru', '🇵🇪', 'B', 'CONMEBOL', 1),
('EG', 'Egypt', '🇪🇬', 'B', 'CAF', 1),
('BA', 'Bosnia', '🇧🇦', 'B', 'UEFA', 1),
('MX', 'Mexico', '🇲🇽', 'C', 'CONCACAF', 1),
('EC', 'Ecuador', '🇪🇨', 'C', 'CONMEBOL', 1),
('SN', 'Senegal', '🇸🇳', 'C', 'CAF', 1),
('RS', 'Serbia', '🇷🇸', 'C', 'UEFA', 1),
('BR', 'Brazil', '🇧🇷', 'D', 'CONMEBOL', 1),
('CO', 'Colombia', '🇨🇴', 'D', 'CONMEBOL', 1),
('NG', 'Nigeria', '🇳🇬', 'D', 'CAF', 1),
('NZ', 'New Zealand', '🇳🇿', 'D', 'OFC', 1),
('FR', 'France', '🇫🇷', 'E', 'UEFA', 1),
('AU', 'Australia', '🇦🇺', 'E', 'AFC', 1),
('UY', 'Uruguay', '🇺🇾', 'E', 'CONMEBOL', 1),
('ID', 'Indonesia', '🇮🇩', 'E', 'AFC', 1),
('GB', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'F', 'UEFA', 1),
('CL', 'Chile', '🇨🇱', 'F', 'CONMEBOL', 1),
('CM', 'Cameroon', '🇨🇲', 'F', 'CAF', 1),
('SI', 'Slovenia', '🇸🇮', 'F', 'UEFA', 1),
('ES', 'Spain', '🇪🇸', 'G', 'UEFA', 1),
('KR', 'South Korea', '🇰🇷', 'G', 'AFC', 1),
('VE', 'Venezuela', '🇻🇪', 'G', 'CONMEBOL', 1),
('HN', 'Honduras', '🇭🇳', 'G', 'CONCACAF', 1),
('DE', 'Germany', '🇩🇪', 'H', 'UEFA', 1),
('SA', 'Saudi Arabia', '🇸🇦', 'H', 'AFC', 1),
('PY', 'Paraguay', '🇵🇾', 'H', 'CONMEBOL', 1),
('DK', 'Denmark', '🇩🇰', 'H', 'UEFA', 1),
('NL', 'Netherlands', '🇳🇱', 'I', 'UEFA', 1),
('JP', 'Japan', '🇯🇵', 'I', 'AFC', 1),
('CA', 'Canada', '🇨🇦', 'I', 'CONCACAF', 1),
('TN', 'Tunisia', '🇹🇳', 'I', 'CAF', 1),
('IT', 'Italy', '🇮🇹', 'J', 'UEFA', 1),
('CR', 'Costa Rica', '🇨🇷', 'J', 'CONCACAF', 1),
('GH', 'Ghana', '🇬🇭', 'J', 'CAF', 1),
('PH', 'Philippines', '🇵🇭', 'J', 'AFC', 1),
('HR', 'Croatia', '🇭🇷', 'K', 'UEFA', 1),
('IR', 'Iran', '🇮🇷', 'K', 'AFC', 1),
('PA', 'Panama', '🇵🇦', 'K', 'CONCACAF', 1),
('AT', 'Austria', '🇦🇹', 'K', 'UEFA', 1),
('BE', 'Belgium', '🇧🇪', 'L', 'UEFA', 1),
('JM', 'Jamaica', '🇯🇲', 'L', 'CONCACAF', 1),
('ZA', 'South Africa', '🇿🇦', 'L', 'CAF', 1),
('CH', 'Switzerland', '🇨🇭', 'L', 'UEFA', 1)
ON CONFLICT (code) DO UPDATE SET "group" = EXCLUDED."group", confederation = EXCLUDED.confederation;

-- 3. Add columns to shop_items table
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS max_purchases INT;

-- 4. Insert shop items
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

-- 5. Insert NFT templates with Supabase Storage image URLs
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

-- 6. Create daily_tasks table and insert data
CREATE TABLE IF NOT EXISTS daily_tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  type TEXT,
  target INT,
  reward_votes INT,
  reward_xp INT,
  icon TEXT
);

INSERT INTO daily_tasks (id, title, type, target, reward_votes, reward_xp, icon) VALUES
('tap_100', 'Mine 100 votes', 'tap', 100, 50, 10, '⛏️'),
('tap_500', 'Mine 500 votes', 'tap', 500, 200, 25, '⛏️'),
('tap_2000', 'Mine 2,000 votes', 'tap', 2000, 800, 50, '💪'),
('combo_5', 'Reach combo x5', 'combo', 30, 300, 30, '🔥'),
('invite_1', 'Invite 1 friend', 'invite', 1, 1000, 100, '👥'),
('predict_1', 'Make a prediction', 'predict', 1, 200, 20, '🔮'),
('login', 'Daily check-in', 'login', 1, 100, 10, '📅')
ON CONFLICT (id) DO NOTHING;

-- 7. Create achievements table and insert data
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  icon TEXT,
  reward_votes INT
);

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
