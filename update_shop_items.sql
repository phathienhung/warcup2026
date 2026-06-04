-- 1. Create ENUM type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shop_item_type') THEN
        CREATE TYPE shop_item_type AS ENUM ('energy', 'spin_ticket', 'max_energy', 'vote_pack', 'boost', 'regen');
    END IF;
END
$$;

-- 2. Alter column to use ENUM
ALTER TABLE shop_items ALTER COLUMN type TYPE shop_item_type USING type::shop_item_type;

-- 2.5 Add energy_regen_bonus to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS energy_regen_bonus FLOAT8 DEFAULT 0;

-- 3. Insert +1 regen item
INSERT INTO shop_items (id, type, name, description, icon, price, price_type, bonus_value) 
VALUES ('regen_1', 'regen', '+1 Energy Regen', 'Permanently increase your energy regeneration by 1 per second.', '🔄', 0.1, 'ton', 1)
ON CONFLICT (id) DO UPDATE SET 
price = EXCLUDED.price, 
price_type = EXCLUDED.price_type, 
bonus_value = EXCLUDED.bonus_value,
type = EXCLUDED.type;
