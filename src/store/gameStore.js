import { create } from 'zustand';
import api from '../lib/api';

export const useGameStore = create((set, get) => ({
  // ── Tap State ─────────────────────────────────────
  totalVotes: 0,
  availableVotes: 0,
  miningSpeed: 1,
  energy: 1000,
  maxEnergy: 1000,
  combo: 0,
  comboMultiplier: 1,
  lastTapTime: 0,
  tapCount: 0,
  pendingTaps: 0,
  isSyncing: false,

  // ── Energy Regen ──────────────────────────────────
  energyRegenRate: 1, // per 3 seconds
  energyRegenInterval: null,

  // ── Combo Thresholds ──────────────────────────────
  comboThresholds: [
    { combo: 0, multiplier: 1 },
    { combo: 5, multiplier: 2 },
    { combo: 15, multiplier: 3 },
    { combo: 30, multiplier: 5 },
    { combo: 50, multiplier: 10 },
  ],

  // ── Tap Action ────────────────────────────────────
  tap(touchCount = 1) {
    const state = get();
    if (state.energy < touchCount) return { success: false, votes: 0 };

    const now = Date.now();
    const timeSinceLastTap = now - state.lastTapTime;
    let newCombo = timeSinceLastTap < 500 ? state.combo + touchCount : touchCount;
    if (timeSinceLastTap > 2000) newCombo = touchCount;

    // Calculate combo multiplier
    let comboMultiplier = 1;
    for (const threshold of state.comboThresholds) {
      if (newCombo >= threshold.combo) {
        comboMultiplier = threshold.multiplier;
      }
    }

    const votesEarned = state.miningSpeed * touchCount * comboMultiplier;

    set({
      totalVotes: state.totalVotes + votesEarned,
      availableVotes: state.availableVotes + votesEarned,
      energy: Math.max(0, state.energy - touchCount),
      combo: newCombo,
      comboMultiplier,
      lastTapTime: now,
      tapCount: state.tapCount + touchCount,
      pendingTaps: state.pendingTaps + touchCount,
    });

    // Debounced sync to server
    if (state.pendingTaps + touchCount >= 10) {
      get().syncTaps();
    }

    return { success: true, votes: votesEarned, combo: newCombo, comboMultiplier };
  },

  // ── Sync taps to server ───────────────────────────
  async syncTaps() {
    const state = get();
    if (state.isSyncing || state.pendingTaps === 0) return;

    const tapsToSync = state.pendingTaps;
    set({ isSyncing: true, pendingTaps: 0 });

    try {
      const result = await api.tap(tapsToSync);
      set({
        totalVotes: result.totalVotes ?? get().totalVotes,
        availableVotes: result.availableVotes ?? get().availableVotes,
        miningSpeed: result.miningSpeed ?? get().miningSpeed,
        isSyncing: false,
      });
    } catch (err) {
      console.error('[Game] Sync failed:', err);
      // Re-add pending taps on failure
      set((s) => ({ pendingTaps: s.pendingTaps + tapsToSync, isSyncing: false }));
    }
  },

  // ── Energy Regeneration ───────────────────────────
  startEnergyRegen() {
    const interval = setInterval(() => {
      set((state) => ({
        energy: Math.min(state.maxEnergy, state.energy + state.energyRegenRate),
      }));
    }, 3000);
    set({ energyRegenInterval: interval });
  },

  stopEnergyRegen() {
    const interval = get().energyRegenInterval;
    if (interval) clearInterval(interval);
    set({ energyRegenInterval: null });
  },

  // ── Set state from server ─────────────────────────
  setGameState(data) {
    set({
      totalVotes: data.total_votes ?? 0,
      availableVotes: data.available_votes ?? 0,
      miningSpeed: data.mining_speed ?? 1,
      energy: data.energy ?? 1000,
      maxEnergy: data.max_energy ?? 1000,
    });
  },

  // ── Reset combo on timeout ────────────────────────
  checkComboTimeout() {
    const state = get();
    if (state.combo > 0 && Date.now() - state.lastTapTime > 2000) {
      set({ combo: 0, comboMultiplier: 1 });
    }
  },
}));

export default useGameStore;
