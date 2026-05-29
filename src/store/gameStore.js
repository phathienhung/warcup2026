import { create } from 'zustand';
import api from '../lib/api';

export const useGameStore = create((set, get) => ({
  // ── Tap State ─────────────────────────────────────
  totalVotes: 0,
  availableVotes: 0,
  tonBalance: 0,
  miningSpeed: 1,
  energy: 1000,
  maxEnergy: 1000,
  tapCount: 0,
  pendingTaps: 0,
  isSyncing: false,

  // ── Config State ──────────────────────────────────
  nations: [],
  configLoaded: false,
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

    // Debounced sync to server
    if (state.pendingTaps + touchCount >= 10) {
      get().syncTaps();
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
      set({
        totalVotes: result.stats.totalVotes ?? get().totalVotes,
        availableVotes: result.stats.availableVotes ?? get().availableVotes,
        isSyncing: false,
      });
    } catch (err) {
      console.error('[Game] Sync failed:', err);
      set((s) => ({ pendingTaps: s.pendingTaps + tapsToSync, isSyncing: false }));
    }
  },

  // ── Energy Regeneration ───────────────────────────
  startEnergyRegen() {
    const interval = setInterval(() => {
      set((state) => ({
        energy: Math.min(state.maxEnergy, state.energy + state.energyRegenAmount),
      }));
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
      miningSpeed: data.mining_speed ?? 1,
      energy: data.energy ?? 1000,
      maxEnergy: data.max_energy ?? 1000,
    });
  },
}));

export default useGameStore;
