/**
 * Game Constants — Single source of truth for game configuration
 */

// ── Energy System ────────────────────────────────────
export const ENERGY = {
  BASE_MAX: 1000,
  COST_PER_TAP: 1,
  REGEN_RATE: 1,        // energy per tick
  REGEN_INTERVAL: 3000, // ms between regen ticks
};

// ── Combo System ─────────────────────────────────────
export const COMBO = {
  WINDOW: 500,           // ms between taps to build combo
  TIMEOUT: 2000,         // ms before combo resets
  THRESHOLDS: [
    { combo: 0, multiplier: 1, label: '' },
    { combo: 5, multiplier: 2, label: '🔥 x2' },
    { combo: 15, multiplier: 3, label: '⚡ x3' },
    { combo: 30, multiplier: 5, label: '💥 x5' },
    { combo: 50, multiplier: 10, label: '🌟 x10' },
  ],
};

// ── Level System ─────────────────────────────────────
export const LEVELS = {
  XP_BASE: 100,
  XP_MULTIPLIER: 1.5,
  MAX_LEVEL: 100,
  XP_PER_TAP: 1,
};

// ── Mining Speed Bonuses ─────────────────────────────
export const MINING_BONUSES = {
  PER_FRIEND: 1,
  PER_TASK: 1,
  PER_ACHIEVEMENT: 1,
  PER_LEVEL: 1,
  PER_STREAK_DAY: 1,
};

// ── NFT Rarities ─────────────────────────────────────
export const NFT_RARITIES = {
  common: {
    label: 'Common',
    color: '#8892b0',
    miningBonus: [1, 2],
    voteMultiplier: [0.01, 0.03],
    rewardBonus: [0.01, 0.02],
    energyBonus: [50, 100],
    dropRate: 0.40,
  },
  rare: {
    label: 'Rare',
    color: '#00d4ff',
    miningBonus: [2, 4],
    voteMultiplier: [0.03, 0.06],
    rewardBonus: [0.02, 0.05],
    energyBonus: [100, 200],
    dropRate: 0.30,
  },
  epic: {
    label: 'Epic',
    color: '#a855f7',
    miningBonus: [4, 7],
    voteMultiplier: [0.06, 0.10],
    rewardBonus: [0.05, 0.08],
    energyBonus: [200, 350],
    dropRate: 0.18,
  },
  legendary: {
    label: 'Legendary',
    color: '#ffd700',
    miningBonus: [8, 12],
    voteMultiplier: [0.10, 0.20],
    rewardBonus: [0.10, 0.15],
    energyBonus: [350, 500],
    dropRate: 0.10,
  },
  mythic: {
    label: 'Mythic',
    color: '#ff3366',
    miningBonus: [15, 25],
    voteMultiplier: [0.20, 0.35],
    rewardBonus: [0.15, 0.25],
    energyBonus: [500, 1000],
    dropRate: 0.02,
  },
};

// ── Prediction System ────────────────────────────────
export const PREDICTION = {
  HOUSE_FEE: 0.10,          // 10% fee
  TON_POOL_FEE: 0.05,       // 5% of TON purchases → reward pool
  VOTES_PER_TON: 100,       // 1 TON = 100 vote-ton
  EARLY_VOTE_BONUS: 0.10,   // +10% for voting in first hour
  WIN_STREAK_BONUS: 0.05,   // +5% per consecutive correct prediction
  CLAN_BONUS: 0.03,         // +3% if clan has >100 members
  VIP_BONUS: 0.05,          // +5% per VIP level
};

// ── Shop Items ───────────────────────────────────────
export const SHOP_CATEGORIES = {
  vote_pack: { label: 'Vote Packs', icon: '🗳️' },
  energy: { label: 'Energy', icon: '⚡' },
  boost: { label: 'Boosts', icon: '🚀' },
  spin_ticket: { label: 'Spin Tickets', icon: '🎰' },
};

export const SHOP_ITEMS = [
  { id: 1, name: 'Starter Pack', type: 'vote_pack', priceType: 'stars', price: 10, value: 1000, description: '1,000 Votes', icon: '📦' },
  { id: 2, name: 'Pro Pack', type: 'vote_pack', priceType: 'stars', price: 50, value: 6000, description: '6,000 Votes (+20% bonus)', icon: '💎' },
  { id: 3, name: 'Mega Pack', type: 'vote_pack', priceType: 'stars', price: 100, value: 15000, description: '15,000 Votes (+50% bonus)', icon: '🏆' },
  { id: 4, name: 'Energy Refill', type: 'energy', priceType: 'votes', price: 500, value: 1000, description: 'Full energy refill', icon: '⚡' },
  { id: 5, name: 'Double Mining (1h)', type: 'boost', priceType: 'votes', price: 2000, value: 3600, description: '2x mining speed for 1 hour', icon: '🚀' },
  { id: 6, name: 'Triple Mining (1h)', type: 'boost', priceType: 'stars', price: 20, value: 3600, description: '3x mining speed for 1 hour', icon: '💫' },
  { id: 7, name: 'Spin Ticket x1', type: 'spin_ticket', priceType: 'votes', price: 1000, value: 1, description: '1 Lucky Spin ticket', icon: '🎟️' },
  { id: 8, name: 'Spin Ticket x5', type: 'spin_ticket', priceType: 'votes', price: 4000, value: 5, description: '5 Lucky Spin tickets (-20%)', icon: '🎫' },
];

// ── Lucky Spin ───────────────────────────────────────
export const SPIN_SEGMENTS = [
  { label: '+50 Energy', reward: 50, type: 'energy', color: '#ff6b35', probability: 0.20 },
  { label: '+500 Votes', reward: 500, type: 'votes', color: '#00d4ff', probability: 0.20 },
  { label: '+0.1 TON', reward: 0.1, type: 'ton', color: '#00d4ff', probability: 0.05 },
  { label: '+1 Speed', reward: 1, type: 'speed', color: '#ff3366', probability: 0.15 },
  { label: '+100 XP', reward: 100, type: 'xp', color: '#a855f7', probability: 0.20 },
  { label: '+Regen', reward: 1, type: 'regen', color: '#00ff88', probability: 0.20 },
];

// ── Daily Tasks ──────────────────────────────────────
export const DAILY_TASKS = [
  { id: 'tap_100', title: 'Mine 100 votes', type: 'tap', target: 100, rewardVotes: 50, rewardXp: 10, icon: '⛏️' },
  { id: 'tap_500', title: 'Mine 500 votes', type: 'tap', target: 500, rewardVotes: 200, rewardXp: 25, icon: '⛏️' },
  { id: 'tap_2000', title: 'Mine 2,000 votes', type: 'tap', target: 2000, rewardVotes: 800, rewardXp: 50, icon: '💪' },
  { id: 'combo_5', title: 'Reach combo x5', type: 'combo', target: 30, rewardVotes: 300, rewardXp: 30, icon: '🔥' },
  { id: 'invite_1', title: 'Invite 1 friend', type: 'invite', target: 1, rewardVotes: 1000, rewardXp: 100, icon: '👥' },
  { id: 'predict_1', title: 'Make a prediction', type: 'predict', target: 1, rewardVotes: 200, rewardXp: 20, icon: '🔮' },
  { id: 'login', title: 'Daily check-in', type: 'login', target: 1, rewardVotes: 100, rewardXp: 10, icon: '📅' },
];

// ── Achievements ─────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first_tap', title: 'First Tap', description: 'Mine your first vote', icon: '🎯', rewardVotes: 100 },
  { id: 'tap_1k', title: 'Miner', description: 'Mine 1,000 votes total', icon: '⛏️', rewardVotes: 500 },
  { id: 'tap_10k', title: 'Pro Miner', description: 'Mine 10,000 votes total', icon: '💎', rewardVotes: 2000 },
  { id: 'tap_100k', title: 'Mining Legend', description: 'Mine 100,000 votes total', icon: '👑', rewardVotes: 10000 },
  { id: 'tap_1m', title: 'Mining God', description: 'Mine 1,000,000 votes total', icon: '🌟', rewardVotes: 50000 },
  { id: 'friends_5', title: 'Social Butterfly', description: 'Invite 5 friends', icon: '🦋', rewardVotes: 2000 },
  { id: 'friends_20', title: 'Influencer', description: 'Invite 20 friends', icon: '📢', rewardVotes: 10000 },
  { id: 'predict_win_3', title: 'Oracle', description: 'Win 3 predictions in a row', icon: '🔮', rewardVotes: 5000 },
  { id: 'predict_win_10', title: 'Prophet', description: 'Win 10 predictions in a row', icon: '🏆', rewardVotes: 25000 },
  { id: 'nft_5', title: 'Collector', description: 'Own 5 NFT players', icon: '🖼️', rewardVotes: 3000 },
  { id: 'streak_7', title: 'Dedicated', description: '7-day login streak', icon: '🔥', rewardVotes: 2000 },
  { id: 'streak_30', title: 'Hardcore', description: '30-day login streak', icon: '💥', rewardVotes: 15000 },
  { id: 'level_10', title: 'Rising Star', description: 'Reach level 10', icon: '⭐', rewardVotes: 5000 },
  { id: 'level_50', title: 'Superstar', description: 'Reach level 50', icon: '🌟', rewardVotes: 50000 },
  { id: 'clan_join', title: 'Team Player', description: 'Join a clan', icon: '🤝', rewardVotes: 500 },
  { id: 'founder', title: 'Founder', description: 'Joined during pre-season', icon: '🏅', rewardVotes: 10000 },
];

export const formatNumber = (num) => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
};

export const formatNumberFull = (num) => {
  return num.toLocaleString('en-US');
};
