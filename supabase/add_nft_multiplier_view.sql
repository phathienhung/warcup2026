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
