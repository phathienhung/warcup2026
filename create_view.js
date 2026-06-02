const { createClient } = require('C:/Users/ADMIN/.antigravity/projects/worldcup2026/node_modules/@supabase/supabase-js');
const supabase = createClient('https://lzckrpviyogydxfhcuyp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6Y2tycHZpeW9neWR4ZmhjdXlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk3MjQ2NiwiZXhwIjoyMDk1NTQ4NDY2fQ.4LHNnBUuV68nDrHLM4u701pmIuc1V_zVT1xX9MHCamg');

const sql = `
CREATE OR REPLACE VIEW user_nft_multipliers AS
SELECT 
  u.telegram_id, 
  u.username, 
  u.favorite_nation, 
  u.avatar_url, 
  1.0 + COALESCE(SUM(t.vote_multiplier - 1.0), 0) as nft_multiplier,
  count(un.id) as nft_count
FROM users u
JOIN user_nfts un ON u.telegram_id = un.user_id
JOIN nft_templates t ON un.nft_template_id = t.id
GROUP BY u.telegram_id, u.username, u.favorite_nation, u.avatar_url;
`;

// Supabase REST client doesn't support raw SQL natively without RPC. Let's see if we can use postgres.
// Wait, I can just create an RPC function on Supabase or execute it using postgres client.
// Or I can just write a quick backend route `api/_routes/dev.js` to execute it, or use psql.
