import React, { useState, useEffect } from 'react';
import useUserStore from '../store/userStore';
import api from '../lib/api';
import useGameStore from '../store/gameStore';
import { formatNumber } from '../data/constants';
import { NATIONS } from '../data/countries';
import ShareCard from '../components/ShareCard';
import telegram from '../lib/telegram';

export default function ProfilePage() {
  const { user, username, firstName, level, xp, xpToNextLevel, favoriteNation, totalTaps, referralCode, friendCount, telegramId } = useUserStore();
  const { tapCount } = useGameStore();
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'friends' | 'nfts'
  const [myNfts, setMyNfts] = useState([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  const nations = useGameStore(s => s.nations) || [];

  useEffect(() => {
    if (activeTab === 'nfts') {
      loadNfts();
    } else if (activeTab === 'friends') {
      loadFriends();
    }
  }, [activeTab]);

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await api.getFriends();
      setFriendsList(data?.friends || []);
    } catch (err) {
      console.error('Failed to load friends', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadNfts = async () => {
    setLoadingNfts(true);
    try {
      const data = await api.getMyNFTs();
      setMyNfts(data || []);
    } catch (err) {
      console.error('Failed to load NFTs', err);
    } finally {
      setLoadingNfts(false);
    }
  };
  const nationData = nations.find(n => n.code === favoriteNation) || NATIONS.find(n => n.code === favoriteNation);
  const initial = (firstName || username || 'P').charAt(0).toUpperCase();
  const inviteLink = `https://t.me/warcup2026_bot/app?startapp=${referralCode || ''}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    telegram.haptic.notification('success');
    alert('Invite link copied!');
  };

  const handleInvite = () => {
    const text = `Join World Cup Mining War 2026 and get a 5,000 vote bonus! ⚽🏆`;
    telegram.shareUrl(inviteLink, text);
  };

  // Live total taps calculation
  const liveTotalTaps = (totalTaps || 0) + (tapCount || 0);

  return (
    <div className="page">
      <div className="profile-header">
        <div className="profile-avatar">
          {initial}
          <div className="profile-level-badge">{level}</div>
        </div>
        <div className="profile-name">{firstName || username || 'Player'}</div>
        
        {nationData && (
          <div className="badge badge-blue">
            {nationData.flag} Team {nationData.name} (x{nationData.multiplier} Bonus)
          </div>
        )}
      </div>

      <div className="tabs mb-md">
        <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>My Stats</button>
        <button className={`tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>Friends</button>
        <button className={`tab ${activeTab === 'nfts' ? 'active' : ''}`} onClick={() => setActiveTab('nfts')}>NFTs</button>
      </div>

      {activeTab === 'stats' && (
        <>
          <div className="card mb-lg">
            <div className="flex-between mb-sm">
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Level {level}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {formatNumber(Math.max(0, xp - (useGameStore.getState().configBaseXp || 1000) * (Math.pow(2, level - 1) - 1)))} / {formatNumber((useGameStore.getState().configBaseXp || 1000) * Math.pow(2, level - 1))} XP
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${Math.min(100, (Math.max(0, xp - (useGameStore.getState().configBaseXp || 1000) * (Math.pow(2, level - 1) - 1)) / ((useGameStore.getState().configBaseXp || 1000) * Math.pow(2, level - 1))) * 100)}%` 
                }} 
              />
            </div>
          </div>

          <div className="profile-stats mb-lg">
            <div className="profile-stat">
              <div className="profile-stat-value">{formatNumber(liveTotalTaps)}</div>
              <div className="profile-stat-label">Total Taps</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value" style={{ color: 'var(--neon-green)' }}>{formatNumber(useGameStore.getState().availableVotes)}</div>
              <div className="profile-stat-label">Votes</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value" style={{ color: '#00d4ff' }}>{useGameStore.getState().tonBalance || 0}</div>
              <div className="profile-stat-label">TON</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{friendCount || 0}</div>
              <div className="profile-stat-label">Friends</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{useGameStore.getState().miningSpeed}</div>
              <div className="profile-stat-label">Speed</div>
              {useGameStore.getState().miningSpeedMultiply > 0 && (
                <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)', marginTop: '4px' }}>
                  (base={useGameStore.getState().miningSpeedBase} + multiply={useGameStore.getState().miningSpeedMultiply})
                </div>
              )}
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{useGameStore.getState().energyRegenAmount}</div>
              <div className="profile-stat-label">Regen</div>
              {useGameStore.getState().energyRegenMultiply > 0 && (
                <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)', marginTop: '4px' }}>
                  (base={useGameStore.getState().energyRegenBase} + multiply={useGameStore.getState().energyRegenMultiply})
                </div>
              )}
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{useGameStore.getState().maxEnergy}</div>
              <div className="profile-stat-label">Max Energy</div>
              {useGameStore.getState().maxEnergyMultiply > 0 && (
                <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)', marginTop: '4px' }}>
                  (base={useGameStore.getState().maxEnergyBase} + multiply={useGameStore.getState().maxEnergyMultiply})
                </div>
              )}
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">x{useGameStore.getState().rewardMultiplier?.toFixed(1) || '1.0'}</div>
              <div className="profile-stat-label">Rewards</div>
            </div>
          </div>


        </>
      )}

      {activeTab === 'friends' && (
        <div className="card text-center">
          <div style={{ fontSize: '3rem', margin: '16px 0' }}>🤝</div>
          <h3 style={{ marginBottom: '8px' }}>Invite & Earn</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Invite friends to boost your mining power!
          </p>
          
          <div className="referral-code-box mb-md">
            <div className="referral-code" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inviteLink}</div>
            <button className="copy-btn" onClick={handleCopy}>COPY</button>
          </div>

          <button className="btn btn-primary btn-full mb-lg" onClick={handleInvite}>
            SEND INVITE LINK
          </button>

          <h3 className="section-title text-left">My Referrals ({friendCount || 0})</h3>
          {loadingFriends ? (
            <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : friendsList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">You haven't invited anyone yet.</div>
            </div>
          ) : (
            <div className="flex-col gap-sm">
              <div className="card text-left mb-sm">
                <div className="flex-between">
                  <span>Total Bonus Earned:</span>
                  <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>+{friendCount} Speed</span>
                </div>
              </div>
              {friendsList.map((f, i) => (
                <div key={f.referred_id || i} className="card flex-between" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(f.users?.username || 'P').charAt(0).toUpperCase()}
                    </div>
                    <span>{f.users?.username || 'Player'}</span>
                  </div>
                  <div style={{ color: 'var(--neon-green)', fontSize: '0.9rem' }}>
                    {formatNumber(f.users?.total_votes || 0)} votes
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'nfts' && (
        <div className="flex-col gap-sm">
          <h3 className="section-title text-left">My NFT Collection</h3>
          {loadingNfts ? (
            <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>Loading NFTs...</div>
          ) : myNfts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🖼️</div>
              <div className="empty-state-text">You don't have any NFTs yet. Go to Shop to collect some!</div>
            </div>
          ) : (
            <div className="grid-2">
              {myNfts.map((nft) => {
                const player = nft.nft_templates || {};
                return (
                  <div key={nft.id} className={`nft-card nft-rarity-${player.rarity}`}>
                    <div className="nft-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {player.image_url ? (
                        <img src={player.image_url} alt={player.player_name} style={{ width: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '3rem' }}>👤</span>
                      )}
                    </div>
                    <div className="nft-card-body">
                      <div className="nft-card-name">{player.player_name}</div>
                      <div className="nft-card-rarity">{player.rarity}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Mint #{nft.mint_number || '1'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
