/**
 * FIFA World Cup 2026 — Participating Nations
 * 48 teams across 12 groups (Groups A–L)
 * Source: https://www.24h.com.vn/bong-da/lich-thi-dau-bong-da-world-cup-2026-moi-nhat-c48a1747402.html
 */

export const NATIONS = [
  // Group A
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', group: 'A', confederation: 'CONCACAF' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', group: 'A', confederation: 'CAF' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', group: 'A', confederation: 'AFC' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', group: 'A', confederation: 'UEFA' },

  // Group B
  { code: 'CA', name: 'Canada', flag: '🇨🇦', group: 'B', confederation: 'CONCACAF' },
  { code: 'BA', name: 'Bosnia', flag: '🇧🇦', group: 'B', confederation: 'UEFA' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', group: 'B', confederation: 'AFC' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', group: 'B', confederation: 'UEFA' },

  // Group C
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', group: 'C', confederation: 'CONMEBOL' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', group: 'C', confederation: 'CAF' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹', group: 'C', confederation: 'CONCACAF' },
  { code: 'SC', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C', confederation: 'UEFA' },

  // Group D
  { code: 'US', name: 'United States', flag: '🇺🇸', group: 'D', confederation: 'CONCACAF' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', group: 'D', confederation: 'CONMEBOL' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', group: 'D', confederation: 'AFC' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', group: 'D', confederation: 'UEFA' },

  // Group E
  { code: 'DE', name: 'Germany', flag: '🇩🇪', group: 'E', confederation: 'UEFA' },
  { code: 'CW', name: 'Curacao', flag: '🇨🇼', group: 'E', confederation: 'CONCACAF' },
  { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮', group: 'E', confederation: 'CAF' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', group: 'E', confederation: 'CONMEBOL' },

  // Group F
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', group: 'F', confederation: 'UEFA' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', group: 'F', confederation: 'AFC' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', group: 'F', confederation: 'UEFA' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', group: 'F', confederation: 'CAF' },

  // Group G
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', group: 'G', confederation: 'UEFA' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', group: 'G', confederation: 'CAF' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', group: 'G', confederation: 'AFC' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', group: 'G', confederation: 'OFC' },

  // Group H
  { code: 'ES', name: 'Spain', flag: '🇪🇸', group: 'H', confederation: 'UEFA' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻', group: 'H', confederation: 'CAF' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', group: 'H', confederation: 'AFC' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', group: 'H', confederation: 'CONMEBOL' },

  // Group I
  { code: 'FR', name: 'France', flag: '🇫🇷', group: 'I', confederation: 'UEFA' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', group: 'I', confederation: 'CAF' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', group: 'I', confederation: 'AFC' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', group: 'I', confederation: 'UEFA' },

  // Group J
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', group: 'J', confederation: 'CONMEBOL' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', group: 'J', confederation: 'UEFA' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', group: 'J', confederation: 'AFC' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', group: 'J', confederation: 'CAF' },

  // Group K
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', group: 'K', confederation: 'UEFA' },
  { code: 'CD', name: 'DR Congo', flag: '🇨🇩', group: 'K', confederation: 'CAF' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', group: 'K', confederation: 'AFC' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', group: 'K', confederation: 'CONMEBOL' },

  // Group L
  { code: 'GB', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', confederation: 'UEFA' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', group: 'L', confederation: 'UEFA' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', group: 'L', confederation: 'CAF' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', group: 'L', confederation: 'CONCACAF' }
];

// Sample NFT players per nation
export const NFT_PLAYERS = [
  { id: 'nft_messi', name: 'Lionel Messi', nation: 'AR', rarity: 'mythic', miningBonus: 50, voteMultiplier: 2.0 },
  { id: 'nft_ronaldo', name: 'Cristiano Ronaldo', nation: 'PT', rarity: 'mythic', miningBonus: 50, voteMultiplier: 2.0 },
  { id: 'nft_mbappe', name: 'Kylian Mbappé', nation: 'FR', rarity: 'legendary', miningBonus: 40, voteMultiplier: 1.8 },
  { id: 'nft_neymar', name: 'Neymar Jr', nation: 'BR', rarity: 'legendary', miningBonus: 40, voteMultiplier: 1.8 },
  { id: 'nft_haaland', name: 'Erling Haaland', nation: 'NO', rarity: 'legendary', miningBonus: 40, voteMultiplier: 1.8 },
  { id: 'nft_vinicius', name: 'Vinícius Jr', nation: 'BR', rarity: 'legendary', miningBonus: 35, voteMultiplier: 1.7 },
  { id: 'nft_bellingham', name: 'Jude Bellingham', nation: 'GB', rarity: 'epic', miningBonus: 30, voteMultiplier: 1.5 },
  { id: 'nft_pedri', name: 'Pedri', nation: 'ES', rarity: 'epic', miningBonus: 25, voteMultiplier: 1.4 },
  { id: 'nft_saka', name: 'Bukayo Saka', nation: 'GB', rarity: 'epic', miningBonus: 25, voteMultiplier: 1.4 },
  { id: 'nft_debruyne', name: 'Kevin De Bruyne', nation: 'BE', rarity: 'epic', miningBonus: 30, voteMultiplier: 1.5 },
  { id: 'nft_salah', name: 'Mohamed Salah', nation: 'EG', rarity: 'epic', miningBonus: 28, voteMultiplier: 1.5 },
  { id: 'nft_son', name: 'Son Heung-min', nation: 'KR', rarity: 'rare', miningBonus: 20, voteMultiplier: 1.3 },
  { id: 'nft_pulisic', name: 'Christian Pulisic', nation: 'US', rarity: 'rare', miningBonus: 18, voteMultiplier: 1.3 },
  { id: 'nft_lautaro', name: 'Lautaro Martínez', nation: 'AR', rarity: 'rare', miningBonus: 20, voteMultiplier: 1.3 },
  { id: 'nft_gavi', name: 'Gavi', nation: 'ES', rarity: 'rare', miningBonus: 18, voteMultiplier: 1.3 },
  { id: 'nft_yamal', name: 'Lamine Yamal', nation: 'ES', rarity: 'rare', miningBonus: 20, voteMultiplier: 1.3 },
  { id: 'nft_osimhen', name: 'Victor Osimhen', nation: 'GH', rarity: 'rare', miningBonus: 18, voteMultiplier: 1.2 },
  { id: 'nft_hakimi', name: 'Achraf Hakimi', nation: 'MA', rarity: 'rare', miningBonus: 18, voteMultiplier: 1.2 },
  { id: 'nft_valverde', name: 'Federico Valverde', nation: 'UY', rarity: 'rare', miningBonus: 18, voteMultiplier: 1.2 },
  { id: 'nft_rodri', name: 'Rodri', nation: 'ES', rarity: 'epic', miningBonus: 25, voteMultiplier: 1.4 },
  { id: 'nft_mane', name: 'Sadio Mané', nation: 'SN', rarity: 'common', miningBonus: 10, voteMultiplier: 1.1 },
  { id: 'nft_james', name: 'James Rodríguez', nation: 'CO', rarity: 'common', miningBonus: 10, voteMultiplier: 1.1 },
  { id: 'nft_davies', name: 'Alphonso Davies', nation: 'CA', rarity: 'common', miningBonus: 10, voteMultiplier: 1.1 },
  { id: 'nft_doan', name: 'Ritsu Doan', nation: 'JP', rarity: 'common', miningBonus: 8, voteMultiplier: 1.1 },
];

export const getNationByCode = (code) => NATIONS.find(n => n.code === code);
export const getNFTsByNation = (nationCode) => NFT_PLAYERS.filter(p => p.nation === nationCode);
export const getNFTsByRarity = (rarity) => NFT_PLAYERS.filter(p => p.rarity === rarity);
