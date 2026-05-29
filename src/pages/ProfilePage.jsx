import React, { useState } from 'react';
import useUserStore from '../store/userStore';
import useGameStore from '../store/gameStore';
import { formatNumber } from '../data/constants';
import { NATIONS } from '../data/countries';
import ShareCard from '../components/ShareCard';
import telegram from '../lib/telegram';

export default function ProfilePage() {
  const { user, username, firstName, level, xp, xpToNextLevel, favoriteNation, totalTaps, referralCode, friendCount } = useUserStore();
  const { tapCount } = useGameStore();
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'friends'
  
  const nations = useGameStore(s => s.nations) || [];
  const nationData = nations.find(n => n.code === favoriteNation) || NATIONS.find(n => n.code === favoriteNation);
  const initial = (firstName || username || 'P').charAt(0).toUpperCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode || 'REF123');
    telegram.haptic.notification('success');
    alert('Referral code copied!');
  };

  const handleInvite = () => {
    const link = `https://t.me/WorldCupMiningBot?start=${referralCode || 'REF123'}`;
    const text = `Join World Cup Mining War 2026 and get a 5,000 vote bonus! ⚽🏆`;
    telegram.shareUrl(link, text);
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
      </div>

      {activeTab === 'stats' && (
        <>
          <div className="card mb-lg">
            <div className="flex-between mb-sm">
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Level {level}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatNumber(xp)} / {formatNumber(xpToNextLevel)} XP</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${(xp / xpToNextLevel) * 100}%` }} />
            </div>
          </div>

          <div className="profile-stats mb-lg">
            <div className="profile-stat">
              <div className="profile-stat-value">{formatNumber(liveTotalTaps)}</div>
              <div className="profile-stat-label">Total Taps</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{friendCount || 0}</div>
              <div className="profile-stat-label">Friends</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">0</div>
              <div className="profile-stat-label">NFTs</div>
            </div>
          </div>

          <h3 className="section-title">My Achievements</h3>
          <ShareCard 
            title="Pro Miner" 
            subtitle="Mined over 10,000 votes" 
            value="Level 5" 
            icon="💎" 
          />
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
            <div className="referral-code">{referralCode || 'REF123'}</div>
            <button className="copy-btn" onClick={handleCopy}>COPY</button>
          </div>

          <button className="btn btn-primary btn-full mb-lg" onClick={handleInvite}>
            SEND INVITE LINK
          </button>

          <h3 className="section-title text-left">My Referrals ({friendCount || 0})</h3>
          {friendCount === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">You haven't invited anyone yet.</div>
            </div>
          ) : (
            <div className="card text-left">
              <div className="flex-between">
                <span>Total Bonus Earned:</span>
                <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>+{friendCount} Speed</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
