-- Thêm các cột theo dõi nạp rút vào bảng users
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_deposited FLOAT8 DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_withdrawn_today FLOAT8 DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_withdrawal_date TIMESTAMP WITH TIME ZONE;
