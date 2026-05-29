-- Xóa default cũ
ALTER TABLE game_config ALTER COLUMN level_up_reward_type DROP DEFAULT;

-- Tạo kiểu ENUM (sẽ hiển thị thành dropdown trong Supabase)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_type_enum') THEN
        CREATE TYPE reward_type_enum AS ENUM ('speed', 'regen', 'max_energy');
    END IF;
END $$;

-- Đổi kiểu dữ liệu của cột sang ENUM
ALTER TABLE game_config 
  ALTER COLUMN level_up_reward_type TYPE reward_type_enum 
  USING level_up_reward_type::text::reward_type_enum;

-- Thiết lập lại default
ALTER TABLE game_config ALTER COLUMN level_up_reward_type SET DEFAULT 'speed'::reward_type_enum;
