-- Add missing wallet columns to the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_deposited FLOAT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_withdrawn_today FLOAT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_withdrawal_date TIMESTAMP WITH TIME ZONE;
