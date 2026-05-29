-- Cập nhật đường dẫn ảnh cho các NFT Chibi Collectibles bằng tên quốc gia đầy đủ
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/argentina.png' WHERE player_name IN ('Messi', 'Lautaro');
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/portugal.png' WHERE player_name = 'Ronaldo';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/france.png' WHERE player_name = 'Mbappé';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/brazil.png' WHERE player_name IN ('Neymar', 'Vinicius Jr');
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/norway.png' WHERE player_name = 'Haaland';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/england.png' WHERE player_name IN ('Bellingham', 'Saka');
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/spain.png' WHERE player_name IN ('Pedri', 'Gavi', 'Yamal', 'Rodri');
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/belgium.png' WHERE player_name = 'De Bruyne';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/egypt.png' WHERE player_name = 'Salah';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/south_korea.png' WHERE player_name = 'Son';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/usa.png' WHERE player_name = 'Pulisic';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/nigeria.png' WHERE player_name = 'Osimhen';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/morocco.png' WHERE player_name = 'Hakimi';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/uruguay.png' WHERE player_name = 'Valverde';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/senegal.png' WHERE player_name = 'Mané';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/colombia.png' WHERE player_name = 'James';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/canada.png' WHERE player_name = 'Davies';
UPDATE nft_templates SET image_url = 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/japan.png' WHERE player_name = 'Doan';

-- Thêm cầu thủ mẫu Algeria
INSERT INTO nft_templates (player_name, nation, rarity, image_url, total_supply, price_votes) 
SELECT 'Mahrez', 'DZ', 'epic', 'https://lzckrpviyogydxfhcuyp.supabase.co/storage/v1/object/public/warcup2026_players/algeria.png', 1000, 50000
WHERE NOT EXISTS (SELECT 1 FROM nft_templates WHERE player_name = 'Mahrez');
