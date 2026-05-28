import React, { useState } from 'react';
import CountdownTimer from '../components/CountdownTimer';
import { formatNumber } from '../data/constants';

export default function PredictionPage() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [stake, setStake] = useState(1000);

  const mockMatch = {
    id: 1,
    teamA: { name: 'Brazil', flag: '🇧🇷', code: 'BR' },
    teamB: { name: 'France', flag: '🇫🇷', code: 'FR' },
    stage: 'Quarter Final',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days from now
    poolA: 1500000,
    poolB: 1200000,
  };

  const totalPool = mockMatch.poolA + mockMatch.poolB;
  const percentA = (mockMatch.poolA / totalPool) * 100;
  const percentB = (mockMatch.poolB / totalPool) * 100;

  const handlePredict = () => {
    if (!selectedTeam) return alert('Select a team first!');
    alert(`Successfully staked ${stake} votes on ${selectedTeam}!`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Predictions</h1>
        <div className="page-subtitle">Predict matches to multiply your votes</div>
      </div>

      <div className="match-card mb-lg">
        <div className="match-stage">{mockMatch.stage}</div>
        
        <div className="match-teams">
          <div 
            className={`match-team ${selectedTeam === mockMatch.teamA.code ? 'selected' : ''}`}
            onClick={() => setSelectedTeam(mockMatch.teamA.code)}
          >
            <div className="match-team-flag">{mockMatch.teamA.flag}</div>
            <div className="match-team-name">{mockMatch.teamA.name}</div>
          </div>
          
          <div className="match-vs">VS</div>
          
          <div 
            className={`match-team ${selectedTeam === mockMatch.teamB.code ? 'selected' : ''}`}
            onClick={() => setSelectedTeam(mockMatch.teamB.code)}
          >
            <div className="match-team-flag">{mockMatch.teamB.flag}</div>
            <div className="match-team-name">{mockMatch.teamB.name}</div>
          </div>
        </div>

        <CountdownTimer targetDate={mockMatch.date} />

        <div className="match-vote-bar">
          <div className="match-vote-bar-a" style={{ width: `${percentA}%` }} />
          <div className="match-vote-bar-b" style={{ width: `${percentB}%` }} />
        </div>
        <div className="match-vote-stats">
          <span>{percentA.toFixed(1)}%</span>
          <span style={{ color: 'var(--gold)' }}>Pool: {formatNumber(totalPool)}</span>
          <span>{percentB.toFixed(1)}%</span>
        </div>
      </div>

      {selectedTeam && (
        <div className="card">
          <h3 className="section-title">Stake Your Votes</h3>
          <input 
            type="range" 
            min="100" 
            max="100000" 
            step="100" 
            value={stake} 
            onChange={(e) => setStake(Number(e.target.value))}
            style={{ width: '100%', margin: '16px 0' }}
          />
          <div className="flex-between mb-md">
            <span style={{ color: 'var(--text-secondary)' }}>Amount to stake:</span>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontWeight: 'bold' }}>{formatNumber(stake)}</span>
          </div>
          <button className="btn btn-primary btn-full" onClick={handlePredict}>
            CONFIRM PREDICTION
          </button>
        </div>
      )}
    </div>
  );
}
