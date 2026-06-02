import React, { useState, useEffect } from 'react';
import useUserStore from '../store/userStore';
import api from '../lib/api';
import { formatNumber } from '../data/constants';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('global');
  const [data, setData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useUserStore();

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await api.getLeaderboard(activeTab, 100);
      setData(result || []);
    } catch (err) {
      console.error('Leaderboard error:', err);
      setErrorMsg(err.message || 'Failed to load');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const rewardPool = [
    { rank: 1, type: "ton", amount: 10 },
    { rank: 2, type: "ton", amount: 5 },
    { rank: 3, type: "ton", amount: 3 },
    { rank: 4, type: "ton", amount: 2 },
    { rank: 5, type: "ton", amount: 1 },
    { rank: 6, type: "ton", amount: 0.5 },
    { rank: 7, type: "ton", amount: 0.4 },
    { rank: 8, type: "ton", amount: 0.3 },
    { rank: 9, type: "ton", amount: 0.2 },
    { rank: 10, type: "ton", amount: 0.1 }
  ];

  const renderRank = (rank) => {
    if (rank === 1) return <div className="leaderboard-rank gold">👑</div>;
    if (rank === 2) return <div className="leaderboard-rank silver">🥈</div>;
    if (rank === 3) return <div className="leaderboard-rank bronze">🥉</div>;
    return <div className="leaderboard-rank">#{rank}</div>;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Leaderboard</h1>
        <div className="page-subtitle">Compete for the top spot</div>
      </div>

      <div className="tabs mb-lg" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <button className={`tab ${activeTab === 'global' ? 'active' : ''}`} onClick={() => setActiveTab('global')}>Global</button>
        <button className={`tab ${activeTab === 'nation' ? 'active' : ''}`} onClick={() => setActiveTab('nation')}>Nation</button>
        <button className={`tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>Friends</button>
        <button className={`tab ${activeTab === 'multiplier' ? 'active' : ''}`} onClick={() => setActiveTab('multiplier')}>NFT Multipliers</button>
      </div>

      {activeTab === 'multiplier' && (
        <div className="card mb-md" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,212,255,0.1))', border: '1px solid var(--gold)' }}>
          <h3 className="text-center" style={{ color: 'var(--gold)', marginBottom: '10px' }}>🏆 World Cup 2026 Rewards 🏆</h3>
          <p className="text-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
            Top 10 players with the highest NFT Multipliers will receive TON rewards when the World Cup ends!
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {rewardPool.map(r => (
              <div key={r.rank} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: r.rank <= 3 ? 'var(--gold)' : 'var(--text-primary)' }}>Top {r.rank}</span>
                <span style={{ fontWeight: 'bold', color: '#00d4ff' }}>{r.amount} TON</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="card mb-md" style={{ background: 'rgba(255,0,0,0.15)', border: '1px solid red', padding: '12px', fontSize: '0.8rem', color: '#ff6b6b' }}>
          ⚠️ Error: {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ height: '200px' }}>
          <div className="loading-ball" style={{ width: '40px', height: '40px' }} />
        </div>
      ) : (
        <div className="leaderboard-list">
          {data.map((item) => (
            <div key={item.telegram_id || item.id} className={`leaderboard-item ${item.username === user?.username ? 'is-self' : ''}`}>
              {renderRank(item.rank)}
              <div className="leaderboard-info">
                <div className="leaderboard-name">{item.username}</div>
                <div className="leaderboard-nation">Team {item.favorite_nation || 'Unknown'}</div>
              </div>
              <div className="leaderboard-score" style={{ color: activeTab === 'multiplier' ? 'var(--gold)' : 'var(--primary)' }}>
                {activeTab === 'multiplier' ? item.total_votes : formatNumber(item.total_votes)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
