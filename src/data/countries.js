/**
 * FIFA World Cup 2026 — Participating Nations
 * 48 teams across 12 groups (Groups A–L)
 */

export const NATIONS = [
  // Group A
  { code: 'FR', name: 'France', flag: '🇫🇷', group: 'A', confederation: 'UEFA' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', group: 'A', confederation: 'UEFA' },
  { code: 'US', name: 'United States', flag: '🇺🇸', group: 'A', confederation: 'CONCACAF' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', group: 'A', confederation: 'AFC' },

  // Group B
  { code: 'GB', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'B', confederation: 'UEFA' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', group: 'B', confederation: 'UEFA' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', group: 'B', confederation: 'CONCACAF' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', group: 'B', confederation: 'CAF' },

  // Group C
  { code: 'ES', name: 'Spain', flag: '🇪🇸', group: 'C', confederation: 'UEFA' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', group: 'C', confederation: 'UEFA' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', group: 'C', confederation: 'CONCACAF' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', group: 'C', confederation: 'CONMEBOL' },

  // Group D
  { code: 'DE', name: 'Germany', flag: '🇩🇪', group: 'D', confederation: 'UEFA' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', group: 'D', confederation: 'UEFA' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', group: 'D', confederation: 'CONMEBOL' },
  { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮', group: 'D', confederation: 'CAF' },

  // Group E
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', group: 'E', confederation: 'UEFA' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', group: 'E', confederation: 'CONMEBOL' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', group: 'E', confederation: 'CAF' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', group: 'E', confederation: 'AFC' },

  // Group F
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', group: 'F', confederation: 'UEFA' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', group: 'F', confederation: 'CONMEBOL' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', group: 'F', confederation: 'CAF' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', group: 'F', confederation: 'AFC' },

  // Group G
  { code: 'IT', name: 'Italy', flag: '🇮🇹', group: 'G', confederation: 'UEFA' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', group: 'G', confederation: 'CONMEBOL' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', group: 'G', confederation: 'CAF' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', group: 'G', confederation: 'AFC' },

  // Group H
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', group: 'H', confederation: 'UEFA' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', group: 'H', confederation: 'CONMEBOL' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', group: 'H', confederation: 'CAF' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', group: 'H', confederation: 'AFC' },

  // Group I
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', group: 'I', confederation: 'UEFA' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', group: 'I', confederation: 'CONMEBOL' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', group: 'I', confederation: 'CAF' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', group: 'I', confederation: 'OFC' },

  // Group J
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', group: 'J', confederation: 'UEFA' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', group: 'J', confederation: 'CONCACAF' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', group: 'J', confederation: 'CAF' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', group: 'J', confederation: 'AFC' },

  // Group K
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', group: 'K', confederation: 'UEFA' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', group: 'K', confederation: 'CONCACAF' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', group: 'K', confederation: 'CAF' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', group: 'K', confederation: 'AFC' },

  // Group L
  { code: 'AT', name: 'Austria', flag: '🇦🇹', group: 'L', confederation: 'UEFA' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', group: 'L', confederation: 'CONCACAF' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', group: 'L', confederation: 'CAF' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', group: 'L', confederation: 'AFC' }
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
