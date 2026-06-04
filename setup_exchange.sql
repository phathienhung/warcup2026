-- Cập nhật bảng game_config
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS exchange_rate_votes INTEGER DEFAULT 120000;
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS exchange_rate_ton DECIMAL(10,2) DEFAULT 0.1;
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS exchange_ads_required INTEGER DEFAULT 10;

-- Cập nhật giá trị cho dòng cấu hình (id=1)
UPDATE game_config 
SET 
  exchange_rate_votes = COALESCE(exchange_rate_votes, 120000), 
  exchange_rate_ton = COALESCE(exchange_rate_ton, 0.1), 
  exchange_ads_required = COALESCE(exchange_ads_required, 10)
WHERE id = 1;

-- Cập nhật bảng users
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ads_watched INTEGER DEFAULT 0;
