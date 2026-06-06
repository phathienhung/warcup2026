import React, { useState } from 'react';
import useUserStore from '../store/userStore';
import useGameStore from '../store/gameStore';
import { NATIONS } from '../data/countries';

export default function ClanPage() {
  const { clanId, favoriteNation, selectNation } = useUserStore();
  const storeNations = useGameStore(s => s.nations);
  const allNations = storeNations && storeNations.length > 0 ? storeNations : NATIONS;
  const [selectedGroup, setSelectedGroup] = useState('A');

  const groups = [...new Set(allNations.map(n => n.group))].sort();
  const nationsInGroup = allNations.filter(n => n.group === selectedGroup);

  const handleSelectNation = (code) => {
    selectNation(code);
    alert('Nation updated successfully!');
  };

  if (!clanId && !favoriteNation) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Choose Your Nation</h1>
          <div className="page-subtitle">Select the team you want to support</div>
        </div>

        <div className="tabs mb-md" style={{ flexWrap: 'wrap' }}>
          {groups.map(group => (
            <button 
              key={group} 
              className={`tab ${selectedGroup === group ? 'active' : ''}`}
              onClick={() => setSelectedGroup(group)}
            >
              Group {group}
            </button>
          ))}
        </div>

        <div className="nation-grid">
          {nationsInGroup.map(nation => (
            <div 
              key={nation.code} 
              className="nation-item"
              onClick={() => handleSelectNation(nation.code)}
              style={{ position: 'relative' }}
            >
              <div style={{ position: 'absolute', top: 4, right: 4, fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: 4 }}>
                Tier {nation.tier || '?'}
              </div>
              <div className="nation-flag" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{nation.flag}</div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{nation.name || nation.code}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--neon-green)' }}>
                x{Number(nation.final_multiplier || nation.multiplier || 1).toFixed(2)} Boost
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Simplified Clan view for now
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Clans</h1>
        <div className="page-subtitle">Join forces with other miners</div>
      </div>

      <div className="card mb-lg">
        <h3 className="mb-sm">My Nation: {favoriteNation}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          You are currently mining for Team {favoriteNation}. Clan features are coming soon in Phase 2!
        </p>
      </div>

      <h3 className="section-title">Top Clans</h3>
      <div className="flex-col gap-sm">
        {[1, 2, 3].map(i => (
          <div key={i} className="clan-card">
            <div className="clan-emblem">🛡️</div>
            <div className="clan-info">
              <div className="clan-name">Crypto Strikers</div>
              <div className="clan-members">1,204 Members • 50M+ Votes</div>
            </div>
            <button className="btn btn-outline btn-sm">Join</button>
          </div>
        ))}
      </div>
    </div>
  );
}
