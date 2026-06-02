/**
 * API Client — communicates with Vercel serverless functions
 * Automatically includes Telegram initData for authentication
 */
import telegram from './telegram';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  get headers() {
    return {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': telegram.initData,
    };
  }

  async request(method, path, body = null) {
    const options = {
      method,
      headers: this.headers,
    };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error || 'Request failed', response.status, data);
    }
    return data;
  }

  get(path) {
    return this.request('GET', path);
  }

  post(path, body) {
    return this.request('POST', path, body);
  }

  put(path, body) {
    return this.request('PUT', path, body);
  }

  delete(path) {
    return this.request('DELETE', path);
  }

  // ── Auth ──────────────────────────────────────────
  auth() {
    return this.post('/auth', { 
      initData: telegram.initData,
      start_param: telegram.startParam 
    });
  }

  // ── User ──────────────────────────────────────────
  getProfile() {
    return this.get('/user?action=profile');
  }

  updateNation(nation) {
    return this.post('/user', { action: 'updateNation', nation });
  }

  // ── Tap / Mining ──────────────────────────────────
  tap(count = 1) {
    return this.post('/tap', { count });
  }

  getMiningInfo() {
    return this.get('/tap?action=info');
  }

  // ── Tasks ─────────────────────────────────────────
  async getTasks() {
    return this.get('/tasks');
  }
  async claimTask(taskId) {
    return this.post('/tasks', { action: 'claim_task', taskId });
  }
  async verifyTask(taskId) {
    return this.post('/tasks', { action: 'verify', taskId });
  }
  async claimStreak() {
    return this.post('/tasks', { action: 'claim_streak' });
  }
  async claimAchievement(achievementId) {
    return this.post('/tasks', { action: 'claim_achievement', taskId: achievementId });
  }

  // ── Leaderboard ───────────────────────────────────
  getLeaderboard(type = 'global', limit = 100) {
    return this.get(`/leaderboard?type=${type}&limit=${limit}`);
  }

  // ── Prediction ────────────────────────────────────
  getMatches(status = 'all') {
    return this.get(`/prediction?action=matches&status=${status}`);
  }

  predict(matchId, team, votesStaked) {
    return this.post('/prediction', { action: 'predict', matchId, team, votesStaked });
  }

  unstake(predictionId) {
    return this.post('/prediction', { action: 'unstake', predictionId });
  }

  claimPrediction(predictionId) {
    return this.post('/prediction', { action: 'claim', predictionId });
  }

  getMyPredictions() {
    return this.get('/prediction?action=myPredictions');
  }

  // ── Shop ──────────────────────────────────────────
  getShopItems() {
    return this.get('/shop');
  }

  getShopHistory() {
    return this.get('/shop?action=history');
  }

  buyItem(itemId, quantity = 1) {
    return this.post('/shop', { action: 'buy', itemId, quantity });
  }

  // ── NFT ───────────────────────────────────────────
  getNFTs(rarity = 'all') {
    return this.get(`/nft?action=list&rarity=${rarity}`);
  }

  buyNFT(nftId) {
    return this.post('/nft', { action: 'buy', nftId });
  }

  getMyNFTs() {
    return this.get('/nft?action=myNfts');
  }

  equipNFT(userNftId) {
    return this.post('/nft', { action: 'equip', userNftId });
  }

  // ── Clan ──────────────────────────────────────────
  getClans() {
    return this.get('/clan?action=list');
  }

  getClan(clanId) {
    return this.get(`/clan?action=detail&clanId=${clanId}`);
  }

  createClan(name, nation) {
    return this.post('/clan', { action: 'create', name, nation });
  }

  joinClan(clanId) {
    return this.post('/clan', { action: 'join', clanId });
  }

  leaveClan() {
    return this.post('/clan', { action: 'leave' });
  }

  // ── Referral ──────────────────────────────────────
  getReferralInfo() {
    return this.get('/referral');
  }

  getFriends() {
    return this.get('/referral?action=friends');
  }

  // ── Wallet ────────────────────────────────────────
  getWalletHistory() {
    return this.get('/wallet');
  }

  withdrawWallet(amount, address) {
    return this.post('/wallet', { action: 'withdraw', amount, address });
  }

  depositWallet(amount, address) {
    return this.post('/wallet', { action: 'deposit', amount, address });
  }

  // ── Spin ──────────────────────────────────────────
  spin(action = 'spin', reward = null, segCount = 8) {
    return this.post('/spin', { action, reward, segCount });
  }

  getSpinInfo() {
    return this.get('/spin');
  }

  // ── Announcements ───────────────────────────────────
  getAnnouncements() {
    return this.get('/announcements');
  }
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient();
export default api;
