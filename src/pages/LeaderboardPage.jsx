import React, { useState, useEffect } from 'react';
import useUserStore from '../store/userStore';
import api from '../lib/api';
import { formatNumber } from '../data/constants';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('global');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUserStore();

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Mock data for dev
      setTimeout(() => {
        setData([
          { id: 1, rank: 1, username: 'CryptoKing', favorite_nation: 'BR', total_votes: 12500000 },
          { id: 2, rank: 2, username: 'MessiFan', favorite_nation: 'AR', total_votes: 9800000 },
          { id: 3, rank: 3, username: 'NinjaTap', favorite_nation: 'JP', total_votes: 7500000 },
          { id: 4, rank: 4, username: user?.username || 'You', favorite_nation: user?.favorite_nation || 'US', total_votes: 5200000 },
          { id: 5, rank: 5, username: 'MbappeSpeed', favorite_nation: 'FR', total_votes: 4100000 },
        ]);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

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

      <div className="tabs mb-lg">
        <button className={`tab ${activeTab === 'global' ? 'active' : ''}`} onClick={() => setActiveTab('global')}>Global</button>
        <button className={`tab ${activeTab === 'nation' ? 'active' : ''}`} onClick={() => setActiveTab('nation')}>Nation</button>
        <button className={`tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>Friends</button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: '200px' }}>
          <div className="loading-ball" style={{ width: '40px', height: '40px' }} />
        </div>
      ) : (
        <div className="leaderboard-list">
          {data.map((item) => (
            <div key={item.id} className={`leaderboard-item ${item.username === user?.username ? 'is-self' : ''}`}>
              {renderRank(item.rank)}
              <div className="leaderboard-info">
                <div className="leaderboard-name">{item.username}</div>
                <div className="leaderboard-nation">Team {item.favorite_nation || 'Unknown'}</div>
              </div>
              <div className="leaderboard-score">{formatNumber(item.total_votes)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
