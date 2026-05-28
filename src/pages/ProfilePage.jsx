import React from 'react';
import useUserStore from '../store/userStore';
import { formatNumber } from '../data/constants';
import { NATIONS } from '../data/countries';
import ShareCard from '../components/ShareCard';

export default function ProfilePage() {
  const { user, username, firstName, level, xp, xpToNextLevel, favoriteNation, totalTaps } = useUserStore();
  
  const nationData = NATIONS.find(n => n.code === favoriteNation);
  const initial = (firstName || username || 'P').charAt(0).toUpperCase();

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
            {nationData.flag} Team {nationData.name}
          </div>
        )}
      </div>

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
          <div className="profile-stat-value">{formatNumber(totalTaps || 0)}</div>
          <div className="profile-stat-label">Total Taps</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value">0</div>
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
    </div>
  );
}
