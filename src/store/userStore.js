import { create } from 'zustand';
import api from '../lib/api';
import telegram from '../lib/telegram';
import useGameStore from './gameStore';

export const useUserStore = create((set, get) => ({
  // ── User Data ─────────────────────────────────────
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  // ── Profile Fields ────────────────────────────────
  telegramId: null,
  username: '',
  firstName: '',
  avatarUrl: '',
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  favoriteNation: null,
  clanId: null,
  clanName: null,
  vipLevel: 0,
  loginStreak: 0,
  referralCode: '',
  founderBadge: false,
  boostExpiresAt: null,
  boostMultiplier: 1,

  // ── Stats ─────────────────────────────────────────
  totalTaps: 0,
  friendCount: 0,
  completedTasks: 0,
  achievementCount: 0,
  nftCount: 0,
  predictionsWon: 0,
  predictionsTotal: 0,
  unclaimedRefTon: 0,
  winStreak: 0,

  // ── Auth ──────────────────────────────────────────
  async authenticate() {
    set({ isLoading: true, error: null });
    try {
      const data = await api.auth();
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        telegramId: data.user.telegram_id,
        username: data.user.username || telegram.username,
        firstName: data.user.first_name || telegram.firstName,
        avatarUrl: data.user.avatar_url || '',
        level: data.user.level || 1,
        xp: data.user.xp || 0,
        favoriteNation: data.user.favorite_nation,
        clanId: data.user.clan_id,
        clanName: data.user.clan_name,
        vipLevel: data.user.vip_level || 0,
        loginStreak: data.user.login_streak || 0,
        referralCode: data.user.referral_code || '',
        founderBadge: data.user.founder_badge || false,
        friendCount: data.user.friend_count || 0,
        completedTasks: data.user.completed_tasks || 0,
        achievementCount: data.user.achievement_count || 0,
        nftCount: data.user.nft_count || 0,
        predictionsWon: data.user.predictions_won || 0,
        predictionsTotal: data.user.predictions_total || 0,
        totalTaps: data.user.total_taps || 0,
        boostExpiresAt: data.user.boost_expires_at || null,
        boostMultiplier: data.user.boost_multiplier || 1,
        unclaimedRefTon: data.user.unclaimed_ref_ton || 0,
      });
      const currentLevel = data.user.level || 1;
      set({ xpToNextLevel: get().getXpForLevel(currentLevel + 1) });
      return data;
    } catch (err) {
      console.error('[User] Auth failed:', err);
      // Dev mode fallback
      if (!telegram.isAvailable) {
        set({
          isLoading: false,
          isAuthenticated: true,
          user: { id: 1, telegram_id: 12345, username: 'dev_player', first_name: 'Dev' },
          username: 'dev_player',
          firstName: 'Dev',
          referralCode: 'DEV123',
          level: 5,
          loginStreak: 3,
        });
        return;
      }
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  // ── Update Profile ────────────────────────────────
  async selectNation(nation) {
    try {
      await api.updateNation(nation);
      set({ favoriteNation: nation });
    } catch (err) {
      console.error('[User] Failed to update nation:', err);
    }
  },

  // ── Level System ──────────────────────────────────
  getXpForLevel(level) {
    // Returns total XP required to REACH this level from 0
    const baseXp = useGameStore.getState().configBaseXp || 1000;
    if (level <= 1) return 0;
    return baseXp * (Math.pow(2, level - 1) - 1);
  },

  addXp(amount) {
    const state = get();
    const newTotalXp = state.xp + amount;
    
    // Find new level
    const baseXp = useGameStore.getState().configBaseXp || 1000;
    const newLevel = Math.floor(Math.log2((newTotalXp / baseXp) + 1)) + 1;
    const xpNeededForNext = state.getXpForLevel(newLevel + 1);

    set({
      xp: newTotalXp,
      level: newLevel,
      xpToNextLevel: xpNeededForNext,
    });
  },

  // ── Computed ──────────────────────────────────────
  get displayName() {
    return get().firstName || get().username || 'Player';
  },

  updateStats(stats) {
    set(stats);
  },

  reset() {
    set({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    });
  },
}));

export default useUserStore;
