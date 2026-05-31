-- 1. Add advanced statistics columns to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds JSONB DEFAULT '{"1-0": 5.0, "2-0": 6.5, "2-1": 7.0, "3-0": 12.0, "3-1": 15.0, "3-2": 25.0, "0-0": 8.0, "1-1": 6.0, "2-2": 14.0}'::jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS total_pool BIGINT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS total_users INT DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS outcome_pools JSONB DEFAULT '{}'::jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS outcome_users JSONB DEFAULT '{}'::jsonb;

-- 2. Update existing rows to initialize empty JSON objects if they are null
UPDATE matches SET outcome_pools = '{}'::jsonb WHERE outcome_pools IS NULL;
UPDATE matches SET outcome_users = '{}'::jsonb WHERE outcome_users IS NULL;
