-- 1. Thêm cột base_bonus vào bảng tier_rewards
ALTER TABLE tier_rewards ADD COLUMN IF NOT EXISTS base_bonus DECIMAL(5,2) DEFAULT 0;

-- 2. Cập nhật các mức thưởng (base_bonus và knockout_bonus)
INSERT INTO tier_rewards (tier, base_bonus, knockout_bonus) VALUES 
(1, 0.10, 0.10),
(2, 0.20, 0.10),
(3, 0.30, 0.10),
(4, 0.40, 0.10)
ON CONFLICT (tier) DO UPDATE SET 
    base_bonus = EXCLUDED.base_bonus,
    knockout_bonus = EXCLUDED.knockout_bonus;

-- 3. Cập nhật View để FIX lỗi mất cờ và chuyển sang cơ chế Hệ số Cố định
DROP VIEW IF EXISTS vw_nation_multipliers;

CREATE VIEW vw_nation_multipliers AS
WITH nation_counts AS (
  SELECT favorite_nation, COUNT(*) as users_count
  FROM users
  WHERE favorite_nation IS NOT NULL
  GROUP BY favorite_nation
)
SELECT 
  n.code,
  n.name,
  n.flag,
  n."group",
  n.confederation,
  n.tier,
  n.is_knockout,
  COALESCE(nc.users_count, 0) as users_count,
  COALESCE(tr.base_bonus, 0) as base_bonus,
  COALESCE(tr.knockout_bonus, 0) as knockout_bonus,
  
  COALESCE(tr.base_bonus, 0) as population_multiplier,
  
  -- Tổng hệ số cuối cùng: 1.0 + base_bonus + (knockout_bonus nếu vào vòng trong)
  ROUND(CAST(
    1.0 + 
    COALESCE(tr.base_bonus, 0) + 
    (CASE WHEN n.is_knockout THEN COALESCE(tr.knockout_bonus, 0) ELSE 0 END)
  AS NUMERIC), 2) as final_multiplier

FROM nations n
LEFT JOIN nation_counts nc ON n.code = nc.favorite_nation
LEFT JOIN tier_rewards tr ON n.tier = tr.tier;
