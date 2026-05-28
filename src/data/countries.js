/**
 * FIFA World Cup 2026 — Participating Nations
 * 48 teams across 12 groups (Groups A–L)
 */

export const NATIONS = [
  // Group A
  { code: 'US', name: 'United States', flag: '🇺🇸', group: 'A', confederation: 'CONCACAF' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', group: 'A', confederation: 'CAF' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', group: 'A', confederation: 'UEFA' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', group: 'A', confederation: 'AFC' },

  // Group B
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', group: 'B', confederation: 'CONMEBOL' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', group: 'B', confederation: 'CONMEBOL' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', group: 'B', confederation: 'CAF' },
  { code: 'BA', name: 'Bosnia', flag: '🇧🇦', group: 'B', confederation: 'UEFA' },

  // Group C
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', group: 'C', confederation: 'CONCACAF' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', group: 'C', confederation: 'CONMEBOL' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', group: 'C', confederation: 'CAF' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', group: 'C', confederation: 'UEFA' },

  // Group D
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', group: 'D', confederation: 'CONMEBOL' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', group: 'D', confederation: 'CONMEBOL' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', group: 'D', confederation: 'CAF' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', group: 'D', confederation: 'OFC' },

  // Group E
  { code: 'FR', name: 'France', flag: '🇫🇷', group: 'E', confederation: 'UEFA' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', group: 'E', confederation: 'AFC' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', group: 'E', confederation: 'CONMEBOL' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', group: 'E', confederation: 'AFC' },

  // Group F
  { code: 'GB', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'F', confederation: 'UEFA' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', group: 'F', confederation: 'CONMEBOL' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', group: 'F', confederation: 'CAF' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', group: 'F', confederation: 'UEFA' },

  // Group G
  { code: 'ES', name: 'Spain', flag: '🇪🇸', group: 'G', confederation: 'UEFA' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', group: 'G', confederation: 'AFC' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', group: 'G', confederation: 'CONMEBOL' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', group: 'G', confederation: 'CONCACAF' },

  // Group H
  { code: 'DE', name: 'Germany', flag: '🇩🇪', group: 'H', confederation: 'UEFA' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', group: 'H', confederation: 'AFC' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', group: 'H', confederation: 'CONMEBOL' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', group: 'H', confederation: 'UEFA' },

  // Group I
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', group: 'I', confederation: 'UEFA' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', group: 'I', confederation: 'AFC' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', group: 'I', confederation: 'CONCACAF' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', group: 'I', confederation: 'CAF' },

  // Group J
  { code: 'IT', name: 'Italy', flag: '🇮🇹', group: 'J', confederation: 'UEFA' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', group: 'J', confederation: 'CONCACAF' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', group: 'J', confederation: 'CAF' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', group: 'J', confederation: 'AFC' },

  // Group K
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', group: 'K', confederation: 'UEFA' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', group: 'K', confederation: 'AFC' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', group: 'K', confederation: 'CONCACAF' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', group: 'K', confederation: 'UEFA' },

  // Group L
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', group: 'L', confederation: 'UEFA' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', group: 'L', confederation: 'CONCACAF' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', group: 'L', confederation: 'CAF' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', group: 'L', confederation: 'UEFA' },
];

// Sample NFT players per nation
export const NFT_PLAYERS = [
  { name: 'Messi', nation: 'AR', position: 'FW', overall: 95, rarity: 'mythic' },
  { name: 'Ronaldo', nation: 'PT', position: 'FW', overall: 93, rarity: 'mythic' },
  { name: 'Mbappé', nation: 'FR', position: 'FW', overall: 96, rarity: 'legendary' },
  { name: 'Neymar', nation: 'BR', position: 'FW', overall: 91, rarity: 'legendary' },
  { name: 'Haaland', nation: 'NO', position: 'FW', overall: 94, rarity: 'legendary' },
  { name: 'Vinicius Jr', nation: 'BR', position: 'FW', overall: 93, rarity: 'legendary' },
  { name: 'Bellingham', nation: 'GB', position: 'MF', overall: 92, rarity: 'epic' },
  { name: 'Pedri', nation: 'ES', position: 'MF', overall: 90, rarity: 'epic' },
  { name: 'Saka', nation: 'GB', position: 'FW', overall: 89, rarity: 'epic' },
  { name: 'De Bruyne', nation: 'BE', position: 'MF', overall: 91, rarity: 'epic' },
  { name: 'Salah', nation: 'EG', position: 'FW', overall: 90, rarity: 'epic' },
  { name: 'Son', nation: 'KR', position: 'FW', overall: 88, rarity: 'rare' },
  { name: 'Pulisic', nation: 'US', position: 'MF', overall: 85, rarity: 'rare' },
  { name: 'Lautaro', nation: 'AR', position: 'FW', overall: 89, rarity: 'rare' },
  { name: 'Gavi', nation: 'ES', position: 'MF', overall: 86, rarity: 'rare' },
  { name: 'Yamal', nation: 'ES', position: 'FW', overall: 88, rarity: 'rare' },
  { name: 'Osimhen', nation: 'NG', position: 'FW', overall: 87, rarity: 'rare' },
  { name: 'Hakimi', nation: 'MA', position: 'DF', overall: 87, rarity: 'rare' },
  { name: 'Valverde', nation: 'UY', position: 'MF', overall: 88, rarity: 'rare' },
  { name: 'Rodri', nation: 'ES', position: 'MF', overall: 91, rarity: 'epic' },
  { name: 'Mané', nation: 'SN', position: 'FW', overall: 86, rarity: 'common' },
  { name: 'James', nation: 'CO', position: 'MF', overall: 84, rarity: 'common' },
  { name: 'Davies', nation: 'CA', position: 'DF', overall: 85, rarity: 'common' },
  { name: 'Doan', nation: 'JP', position: 'FW', overall: 82, rarity: 'common' },
];

export const getNationByCode = (code) => NATIONS.find(n => n.code === code);
export const getNationsByGroup = (group) => NATIONS.filter(n => n.group === group);
export const getGroups = () => [...new Set(NATIONS.map(n => n.group))].sort();
export const getNFTsByNation = (nationCode) => NFT_PLAYERS.filter(p => p.nation === nationCode);
export const getNFTsByRarity = (rarity) => NFT_PLAYERS.filter(p => p.rarity === rarity);
