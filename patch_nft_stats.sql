-- =========================================================
-- NFT STATS PATCH
-- Populates the missing mining_bonus and vote_multiplier 
-- values for all NFT templates based on their rarity.
-- =========================================================

UPDATE nft_templates SET mining_bonus = 50, vote_multiplier = 2.0 WHERE rarity = 'mythic';
UPDATE nft_templates SET mining_bonus = 40, vote_multiplier = 1.8 WHERE rarity = 'legendary';
UPDATE nft_templates SET mining_bonus = 30, vote_multiplier = 1.5 WHERE rarity = 'epic';
UPDATE nft_templates SET mining_bonus = 20, vote_multiplier = 1.3 WHERE rarity = 'rare';
UPDATE nft_templates SET mining_bonus = 10, vote_multiplier = 1.1 WHERE rarity = 'common';
