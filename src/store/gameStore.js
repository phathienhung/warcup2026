import { create } from 'zustand';
import api from '../lib/api';

export const useGameStore = create((set, get) => ({
  // ── Tap State ─────────────────────────────────────
  totalVotes: 0,
  availableVotes: 0,
  tonBalance: 0,
  miningSpeed: 1,
  miningSpeedBase: 1,
  miningSpeedMultiply: 0,
  nationMultiplier: 1.0,
  energy: 1000,
  maxEnergy: 1000,
  maxEnergyBase: 1000,
  maxEnergyMultiply: 0,
  tapCount: 0,
  pendingTaps: 0,
  isSyncing: false,
  syncTimeout: null,

  // ── Exchange State ────────────────────────────────
  tonBalance: 0,
  adsWatched: 0,
  exchangeRateVotes: 120000,
  exchangeRateTon: 0.1,
  exchangeAdsRequired: 10,

  // ── Config State ──────────────────────────────────
  nations: [],
  configLoaded: false,
  referralSystem: null,
  energyRegenRateMs: 1000,
  energyRegenAmount: 1,
  energyRegenInterval: null,
  configBaseXp: 1000,
  spinSegments: null,
  
  shopItems: [],
  nftTemplates: [],
  dailyTasks: [],
  achievements: [],

  async loadConfig() {
    try {
      const res = await api.get('/config');
      const { config, nations, shop_items, nft_templates, daily_tasks, achievements } = res;
      set({
        nations: nations || [],
        energyRegenRateMs: config?.energy_regen_rate_ms || 1000,
        energyRegenAmount: config?.energy_regen_amount || 1,
        configBaseXp: config?.base_xp_req || 1000,
        spinSegments: config?.spin_segments_json || null,
        exchangeRateVotes: config?.exchange_rate_votes || 120000,
        exchangeRateTon: config?.exchange_rate_ton || 0.1,
        exchangeAdsRequired: config?.exchange_ads_required || 10,
        referralSystem: config?.referral_system_json || null,
        shopItems: shop_items || [],
        nftTemplates: nft_templates || [],
        dailyTasks: daily_tasks || [],
        achievements: achievements || [],
        configLoaded: true
      });
      // Restart regen with new rate
      get().stopEnergyRegen();
      get().startEnergyRegen();
    } catch (err) {
      console.error('Failed to load config', err);
    }
  },

  async loadTasks() {
    try {
      const data = await api.getTasks();
      set({ dailyTasks: Array.isArray(data) ? data : [] });
    } catch (e) {
      console.error('Failed to load tasks', e);
      set({ dailyTasks: [] });
    }
  },

  // ── Tap Action ────────────────────────────────────
  tap(touchCount = 1) {
    const state = get();
    const energyCost = state.miningSpeed * touchCount;
    if (state.energy < energyCost) return { success: false, votes: 0 };

    const votesEarned = state.miningSpeed * touchCount;

    set({
      totalVotes: state.totalVotes + votesEarned,
      availableVotes: state.availableVotes + votesEarned,
      energy: Math.max(0, state.energy - energyCost),
      tapCount: state.tapCount + touchCount,
      pendingTaps: state.pendingTaps + touchCount,
    });

    // Sync immediately if we hit 5 taps
    if (state.pendingTaps + touchCount >= 5) {
      get().syncTaps();
    } else {
      // Otherwise, set a timeout to sync after 1 second of inactivity
      if (state.syncTimeout) clearTimeout(state.syncTimeout);
      const timeout = setTimeout(() => {
        if (get().pendingTaps > 0) get().syncTaps();
      }, 1000);
      set({ syncTimeout: timeout });
    }

    return { success: true, votes: votesEarned };
  },

  // ── Sync taps to server ───────────────────────────
  async syncTaps() {
    const state = get();
    if (state.isSyncing || state.pendingTaps === 0) return;

    const tapsToSync = state.pendingTaps;
    set({ isSyncing: true, pendingTaps: 0 });

    try {
      const result = await api.tap(tapsToSync);
      // Only sync votes from server. DO NOT overwrite energy here because
      // the client regen timer has been adding energy while the sync was in-flight.
      // Energy is authoritative on the client during a session.
      set((state) => ({
        totalVotes: result.stats.totalVotes ?? state.totalVotes,
        availableVotes: result.stats.availableVotes ?? state.availableVotes,
        miningSpeed: result.stats.miningSpeed ?? state.miningSpeed,
        miningSpeedBase: result.stats.miningSpeedBase ?? state.miningSpeedBase,
        miningSpeedMultiply: result.stats.miningSpeedMultiply ?? state.miningSpeedMultiply,
        nationMultiplier: result.stats.nationMultiplier ?? state.nationMultiplier,
        isSyncing: false,
      }));
      
      // If user kept tapping while we were syncing, trigger another sync immediately
      if (get().pendingTaps > 0) {
        get().syncTaps();
      }
    } catch (err) {
      console.error('[Game] Sync failed:', err);
      set((s) => ({ pendingTaps: s.pendingTaps + tapsToSync, isSyncing: false }));
    }
  },

  // ── Energy Regeneration ───────────────────────────
  startEnergyRegen() {
    const interval = setInterval(() => {
      set((state) => {
        if (state.energy < state.maxEnergy) {
          return { energy: Math.min(state.maxEnergy, state.energy + state.energyRegenAmount) };
        }
        return {};
      });
    }, get().energyRegenRateMs);
    set({ energyRegenInterval: interval });
  },

  stopEnergyRegen() {
    const interval = get().energyRegenInterval;
    if (interval) clearInterval(interval);
    set({ energyRegenInterval: null });
  },

  // ── Set state from server (called after auth) ────
  setGameState(data) {
    set({
      totalVotes: data.total_votes ?? 0,
      availableVotes: data.available_votes ?? 0,
      tonBalance: data.ton_balance ?? 0,
      tonDeposited: data.ton_deposited ?? 0,
      tonWithdrawnToday: data.ton_withdrawn_today ?? 0,
      lastWithdrawalDate: data.last_withdrawal_date ?? null,
      adsWatched: data.ads_watched ?? 0,
      claimedFriendMilestones: data.claimed_friend_milestones || [],
      miningSpeed: data.mining_speed ?? 1,
      miningSpeedBase: data.mining_speed_base ?? 1,
      miningSpeedMultiply: data.mining_speed_multiply ?? 0,
      energy: data.energy ?? 1000,
      maxEnergy: data.max_energy ?? 1000,
      maxEnergyBase: data.max_energy_base ?? 1000,
      maxEnergyMultiply: data.max_energy_multiply ?? 0,
      energyRegenAmount: data.energy_regen_amount ?? (1 + (data.energy_regen_bonus || 0)),
      energyRegenBase: data.energy_regen_base ?? 1,
      energyRegenMultiply: data.energy_regen_multiply ?? 0,
      rewardMultiplier: data.reward_multiplier ?? 1.0,
      nationMultiplier: data.nation_multiplier ?? 1.0,
      nftMultiplier: data.nft_count ? (data.reward_multiplier || 1.0) : 1.0,
    });
  },
}));

export default useGameStore;
