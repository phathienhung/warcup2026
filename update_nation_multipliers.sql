-- 1. Thêm cột tier và is_knockout vào bảng nations (nếu chưa có)
ALTER TABLE nations ADD COLUMN IF NOT EXISTS tier INT DEFAULT 3;
ALTER TABLE nations ADD COLUMN IF NOT EXISTS is_knockout BOOLEAN DEFAULT FALSE;

-- 2. Cập nhật Tier cho 48 đội (Dựa trên Ranking)
-- Tier 1: FR,ES,AR,GB,PT,BR,NL,MA,BE,DE,HR,CO,SN,MX,US,UY,JP,CH,IR,EC
UPDATE nations SET tier = 1 WHERE code IN ('FR','ES','AR','GB','PT','BR','NL','MA','BE','DE','HR','CO','SN','MX','US','UY','JP','CH','IR','EC');

-- Tier 2: AT,KR,AU,DZ,EG,CA,PA,CI,TN,CD,SA,TR,SE
UPDATE nations SET tier = 2 WHERE code IN ('AT','KR','AU','DZ','EG','CA','PA','CI','TN','CD','SA','TR','SE');

-- Tier 3: SC,CV,ZA,JO,UZ,NZ,IQ,QA,CZ,BA,PY
UPDATE nations SET tier = 3 WHERE code IN ('SC','CV','ZA','JO','UZ','NZ','IQ','QA','CZ','BA','PY');

-- Tier 4: NO,CW,GH,HT
UPDATE nations SET tier = 4 WHERE code IN ('NO','CW','GH','HT');

-- 3. Tạo bảng tier_rewards
CREATE TABLE IF NOT EXISTS tier_rewards (
    tier INT PRIMARY KEY,
    knockout_bonus DECIMAL(5,2) DEFAULT 0
);

-- Insert dữ liệu mặc định
INSERT INTO tier_rewards (tier, knockout_bonus) VALUES 
(1, 0.20),
(2, 0.50),
(3, 1.00),
(4, 1.50)
ON CONFLICT (tier) DO UPDATE SET knockout_bonus = EXCLUDED.knockout_bonus;

-- 4. Tạo Database View tính hệ số động và phần thưởng Knockout
CREATE OR REPLACE VIEW vw_nation_multipliers AS
WITH nation_counts AS (
  SELECT favorite_nation, COUNT(*) as users_count
  FROM users
  WHERE favorite_nation IS NOT NULL
  GROUP BY favorite_nation
),
total_count AS (
  SELECT SUM(users_count) as total_users FROM nation_counts
)
SELECT 
  n.code,
  n.name,
  n.tier,
  n.is_knockout,
  COALESCE(nc.users_count, 0) as users_count,
  COALESCE(tc.total_users, 0) as total_users,
  COALESCE(tr.knockout_bonus, 0) as knockout_bonus,
  -- Logic hệ số dân số: (1.0 + 2.0 * (1 - ratio))
  CASE 
    WHEN tc.total_users IS NULL OR tc.total_users = 0 THEN 3.00
    ELSE ROUND(CAST(1.0 + 2.0 * (1.0 - (COALESCE(nc.users_count, 0)::FLOAT / tc.total_users)) AS NUMERIC), 2)
  END as population_multiplier,
  
  -- Tổng hệ số: population + knockout_bonus
  (
    CASE 
      WHEN tc.total_users IS NULL OR tc.total_users = 0 THEN 3.00
      ELSE ROUND(CAST(1.0 + 2.0 * (1.0 - (COALESCE(nc.users_count, 0)::FLOAT / tc.total_users)) AS NUMERIC), 2)
    END 
    + 
    CASE WHEN n.is_knockout THEN COALESCE(tr.knockout_bonus, 0) ELSE 0 END
  ) as final_multiplier

FROM nations n
LEFT JOIN nation_counts nc ON n.code = nc.favorite_nation
CROSS JOIN (SELECT COALESCE((SELECT total_users FROM total_count), 0) as total_users) tc
LEFT JOIN tier_rewards tr ON n.tier = tr.tier;
