-- ============================================================
-- Update odds for all matches based on FIFA World Cup 2026
-- team ranking tiers
-- ============================================================
-- Tier 1 (Rank 1-20): FR,ES,AR,GB,PT,BR,NL,MA,BE,DE,HR,CO,SN,MX,US,UY,JP,CH,IR,EC
-- Tier 2 (Rank 21-31): AT,KR,AU,DZ,EG,CA,PA,CI,TN,CD,SA,TR,SE
-- Tier 3 (Rank 32-40): SC,CV,ZA,JO,UZ,NZ,IQ,QA,CZ,BA,PY
-- Tier 4 (Rank 41-48): NO,CW,GH,HT
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  t_a INT;
  t_b INT;
  d INT;
  o JSONB;
BEGIN
  FOR rec IN SELECT id, team_a, team_b FROM matches LOOP

    -- Tier for team_a
    t_a := CASE rec.team_a
      WHEN 'FR' THEN 1 WHEN 'ES' THEN 1 WHEN 'AR' THEN 1 WHEN 'GB' THEN 1
      WHEN 'PT' THEN 1 WHEN 'BR' THEN 1 WHEN 'NL' THEN 1 WHEN 'MA' THEN 1
      WHEN 'BE' THEN 1 WHEN 'DE' THEN 1 WHEN 'HR' THEN 1 WHEN 'CO' THEN 1
      WHEN 'SN' THEN 1 WHEN 'MX' THEN 1 WHEN 'US' THEN 1 WHEN 'UY' THEN 1
      WHEN 'JP' THEN 1 WHEN 'CH' THEN 1 WHEN 'IR' THEN 1 WHEN 'EC' THEN 1
      WHEN 'AT' THEN 2 WHEN 'KR' THEN 2 WHEN 'AU' THEN 2 WHEN 'DZ' THEN 2
      WHEN 'EG' THEN 2 WHEN 'CA' THEN 2 WHEN 'PA' THEN 2 WHEN 'CI' THEN 2
      WHEN 'TN' THEN 2 WHEN 'CD' THEN 2 WHEN 'SA' THEN 2 WHEN 'TR' THEN 2
      WHEN 'SE' THEN 2
      WHEN 'SC' THEN 3 WHEN 'CV' THEN 3 WHEN 'ZA' THEN 3 WHEN 'JO' THEN 3
      WHEN 'UZ' THEN 3 WHEN 'NZ' THEN 3 WHEN 'IQ' THEN 3 WHEN 'QA' THEN 3
      WHEN 'CZ' THEN 3 WHEN 'BA' THEN 3 WHEN 'PY' THEN 3
      WHEN 'NO' THEN 4 WHEN 'CW' THEN 4 WHEN 'GH' THEN 4 WHEN 'HT' THEN 4
      ELSE 3
    END;

    -- Tier for team_b
    t_b := CASE rec.team_b
      WHEN 'FR' THEN 1 WHEN 'ES' THEN 1 WHEN 'AR' THEN 1 WHEN 'GB' THEN 1
      WHEN 'PT' THEN 1 WHEN 'BR' THEN 1 WHEN 'NL' THEN 1 WHEN 'MA' THEN 1
      WHEN 'BE' THEN 1 WHEN 'DE' THEN 1 WHEN 'HR' THEN 1 WHEN 'CO' THEN 1
      WHEN 'SN' THEN 1 WHEN 'MX' THEN 1 WHEN 'US' THEN 1 WHEN 'UY' THEN 1
      WHEN 'JP' THEN 1 WHEN 'CH' THEN 1 WHEN 'IR' THEN 1 WHEN 'EC' THEN 1
      WHEN 'AT' THEN 2 WHEN 'KR' THEN 2 WHEN 'AU' THEN 2 WHEN 'DZ' THEN 2
      WHEN 'EG' THEN 2 WHEN 'CA' THEN 2 WHEN 'PA' THEN 2 WHEN 'CI' THEN 2
      WHEN 'TN' THEN 2 WHEN 'CD' THEN 2 WHEN 'SA' THEN 2 WHEN 'TR' THEN 2
      WHEN 'SE' THEN 2
      WHEN 'SC' THEN 3 WHEN 'CV' THEN 3 WHEN 'ZA' THEN 3 WHEN 'JO' THEN 3
      WHEN 'UZ' THEN 3 WHEN 'NZ' THEN 3 WHEN 'IQ' THEN 3 WHEN 'QA' THEN 3
      WHEN 'CZ' THEN 3 WHEN 'BA' THEN 3 WHEN 'PY' THEN 3
      WHEN 'NO' THEN 4 WHEN 'CW' THEN 4 WHEN 'GH' THEN 4 WHEN 'HT' THEN 4
      ELSE 3
    END;

    d := t_b - t_a;
    -- d > 0 => A is favorite (lower tier number = stronger)
    -- d < 0 => B is favorite
    -- d = 0 => even

    IF d = 0 THEN
      -- EVEN MATCH
      o := '{
        "A":2.2,"B":2.2,"DRAW":3.2,
        "1-0":6,"2-0":8,"2-1":8,"3-0":15,"3-1":17,"3-2":28,"4-0":25,"4-1":28,"4-2":32,"4-3":40,"5-0":35,"5-1":38,"5-2":42,"5-3":45,"5-4":50,
        "0-1":6,"0-2":8,"1-2":8,"0-3":15,"1-3":17,"2-3":28,"0-4":25,"1-4":28,"2-4":32,"3-4":40,"0-5":35,"1-5":38,"2-5":42,"3-5":45,"4-5":50,
        "0-0":8,"1-1":6,"2-2":14,"3-3":25,"4-4":40,"5-5":50
      }'::jsonb;

    ELSIF d = 1 THEN
      -- A SLIGHT FAVORITE (1 tier diff)
      o := '{
        "A":1.7,"B":3.2,"DRAW":3.5,
        "1-0":4.5,"2-0":6,"2-1":6.5,"3-0":10,"3-1":12,"3-2":22,"4-0":15,"4-1":18,"4-2":25,"4-3":32,"5-0":22,"5-1":25,"5-2":30,"5-3":38,"5-4":45,
        "0-1":9,"0-2":14,"1-2":12,"0-3":25,"1-3":28,"2-3":35,"0-4":38,"1-4":42,"2-4":45,"3-4":48,"0-5":45,"1-5":48,"2-5":50,"3-5":50,"4-5":50,
        "0-0":7.5,"1-1":6,"2-2":14,"3-3":26,"4-4":42,"5-5":50
      }'::jsonb;

    ELSIF d = 2 THEN
      -- A STRONG FAVORITE (2 tier diff)
      o := '{
        "A":1.35,"B":5.0,"DRAW":4.2,
        "1-0":3.5,"2-0":4.5,"2-1":5.5,"3-0":7,"3-1":9,"3-2":16,"4-0":10,"4-1":13,"4-2":20,"4-3":28,"5-0":16,"5-1":20,"5-2":26,"5-3":34,"5-4":40,
        "0-1":14,"0-2":22,"1-2":18,"0-3":35,"1-3":38,"2-3":42,"0-4":45,"1-4":48,"2-4":50,"3-4":50,"0-5":50,"1-5":50,"2-5":50,"3-5":50,"4-5":50,
        "0-0":8,"1-1":7,"2-2":16,"3-3":30,"4-4":45,"5-5":50
      }'::jsonb;

    ELSIF d >= 3 THEN
      -- A DOMINANT (3+ tier diff)
      o := '{
        "A":1.15,"B":8.0,"DRAW":5.5,
        "1-0":3,"2-0":3.5,"2-1":4.5,"3-0":5,"3-1":7,"3-2":12,"4-0":7,"4-1":9,"4-2":15,"4-3":22,"5-0":10,"5-1":14,"5-2":20,"5-3":28,"5-4":35,
        "0-1":20,"0-2":32,"1-2":28,"0-3":45,"1-3":48,"2-3":50,"0-4":50,"1-4":50,"2-4":50,"3-4":50,"0-5":50,"1-5":50,"2-5":50,"3-5":50,"4-5":50,
        "0-0":9,"1-1":8,"2-2":18,"3-3":35,"4-4":48,"5-5":50
      }'::jsonb;

    ELSIF d = -1 THEN
      -- B SLIGHT FAVORITE (1 tier diff)
      o := '{
        "A":3.2,"B":1.7,"DRAW":3.5,
        "1-0":9,"2-0":14,"2-1":12,"3-0":25,"3-1":28,"3-2":35,"4-0":38,"4-1":42,"4-2":45,"4-3":48,"5-0":45,"5-1":48,"5-2":50,"5-3":50,"5-4":50,
        "0-1":4.5,"0-2":6,"1-2":6.5,"0-3":10,"1-3":12,"2-3":22,"0-4":15,"1-4":18,"2-4":25,"3-4":32,"0-5":22,"1-5":25,"2-5":30,"3-5":38,"4-5":45,
        "0-0":7.5,"1-1":6,"2-2":14,"3-3":26,"4-4":42,"5-5":50
      }'::jsonb;

    ELSIF d = -2 THEN
      -- B STRONG FAVORITE (2 tier diff)
      o := '{
        "A":5.0,"B":1.35,"DRAW":4.2,
        "1-0":14,"2-0":22,"2-1":18,"3-0":35,"3-1":38,"3-2":42,"4-0":45,"4-1":48,"4-2":50,"4-3":50,"5-0":50,"5-1":50,"5-2":50,"5-3":50,"5-4":50,
        "0-1":3.5,"0-2":4.5,"1-2":5.5,"0-3":7,"1-3":9,"2-3":16,"0-4":10,"1-4":13,"2-4":20,"3-4":28,"0-5":16,"1-5":20,"2-5":26,"3-5":34,"4-5":40,
        "0-0":8,"1-1":7,"2-2":16,"3-3":30,"4-4":45,"5-5":50
      }'::jsonb;

    ELSIF d <= -3 THEN
      -- B DOMINANT (3+ tier diff)
      o := '{
        "A":8.0,"B":1.15,"DRAW":5.5,
        "1-0":20,"2-0":32,"2-1":28,"3-0":45,"3-1":48,"3-2":50,"4-0":50,"4-1":50,"4-2":50,"4-3":50,"5-0":50,"5-1":50,"5-2":50,"5-3":50,"5-4":50,
        "0-1":3,"0-2":3.5,"1-2":4.5,"0-3":5,"1-3":7,"2-3":12,"0-4":7,"1-4":9,"2-4":15,"3-4":22,"0-5":10,"1-5":14,"2-5":20,"3-5":28,"4-5":35,
        "0-0":9,"1-1":8,"2-2":18,"3-3":35,"4-4":48,"5-5":50
      }'::jsonb;
    END IF;

    UPDATE matches SET odds = o WHERE id = rec.id;
  END LOOP;

  RAISE NOTICE 'All match odds updated successfully!';
END $$;
