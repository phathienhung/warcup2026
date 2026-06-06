-- Add missing columns for prediction statistics
ALTER TABLE users ADD COLUMN IF NOT EXISTS predictions_won INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS predictions_total INT DEFAULT 0;
