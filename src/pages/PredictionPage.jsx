import React, { useState, useMemo } from 'react';
import { NATIONS } from '../data/countries';
import Modal from '../components/Modal';
import { formatNumber } from '../data/constants';
import telegram from '../lib/telegram';

// Helper to generate all group matches for 48 teams (12 groups)
function generateMatches() {
  const matches = [];
  let matchId = 1;
  const groups = [...new Set(NATIONS.map(n => n.group))].sort();
  
  groups.forEach(g => {
    const teams = NATIONS.filter(n => n.group === g);
    if (teams.length === 4) {
      // Round robin matches for 4 teams: 0v1, 2v3, 0v2, 1v3, 0v3, 1v2
      const pairs = [[0,1], [2,3], [0,2], [1,3], [0,3], [1,2]];
      pairs.forEach(([i, j], idx) => {
        matches.push({
          id: matchId++,
          teamA: teams[i],
          teamB: teams[j],
          stage: `Group ${g}`,
          // Mock pool data
          poolA: Math.floor(Math.random() * 50000) + 10000,
          poolB: Math.floor(Math.random() * 50000) + 10000,
          poolDraw: Math.floor(Math.random() * 20000) + 5000,
          // Mock date during the tournament
          date: new Date(Date.now() + (matchId * 1000 * 60 * 60 * 12)).toISOString()
        });
      });
    }
  });
  return matches;
}

const SCORE_OPTIONS = [
  { label: '1-0', mult: 5.0 },
  { label: '2-0', mult: 6.5 },
  { label: '2-1', mult: 7.0 },
  { label: '3-0', mult: 12.0 },
  { label: '3-1', mult: 15.0 },
  { label: '3-2', mult: 25.0 },
  { label: '0-0', mult: 8.0 },
  { label: '1-1', mult: 6.0 },
  { label: '2-2', mult: 14.0 },
];

export default function PredictionPage() {
  const matches = useMemo(() => generateMatches(), []);
  
  // Group matches by Group letter for UI
  const groupedMatches = useMemo(() => {
    const obj = {};
    matches.forEach(m => {
      if (!obj[m.stage]) obj[m.stage] = [];
      obj[m.stage].push(m);
    });
    return obj;
  }, [matches]);

  const [selectedGroup, setSelectedGroup] = useState('Group A');
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Modal state
  const [outcome, setOutcome] = useState('A'); // 'A', 'B', 'DRAW'
  const [score, setScore] = useState(null);
  const [stake, setStake] = useState(100);
  
  // Track user predictions (matchId -> { outcome, score, stake })
  const [myPredictions, setMyPredictions] = useState({});

  const handleOpenModal = (match) => {
    setSelectedMatch(match);
    const existing = myPredictions[match.id];
    if (existing) {
      setOutcome(existing.outcome);
      setScore(existing.score);
      setStake(existing.stake);
    } else {
      setOutcome('A');
      setScore(null);
      setStake(100);
    }
  };

  const handlePredict = () => {
    if (stake < 100) return alert('Minimum stake is 100 votes.');
    
    setMyPredictions(prev => ({
      ...prev,
      [selectedMatch.id]: { outcome, score, stake }
    }));
    
    telegram.haptic.notification('success');
    setSelectedMatch(null);
  };

  const getMultiplier = (match, type) => {
    const total = match.poolA + match.poolB + match.poolDraw;
    if (type === 'A') return (total / (match.poolA || 1)).toFixed(2);
    if (type === 'B') return (total / (match.poolB || 1)).toFixed(2);
    return (total / (match.poolDraw || 1)).toFixed(2);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Predictions</h1>
        <div className="page-subtitle">Predict all World Cup 2026 matches</div>
      </div>

      <div className="tabs mb-lg" style={{ flexWrap: 'wrap', gap: '8px', padding: '8px' }}>
        {Object.keys(groupedMatches).map(group => (
          <button 
            key={group} 
            className={`tab ${selectedGroup === group ? 'active' : ''}`}
            onClick={() => setSelectedGroup(group)}
            style={{ minWidth: '70px' }}
          >
            {group}
          </button>
        ))}
      </div>

      <div className="matches-list">
        {groupedMatches[selectedGroup]?.map(match => {
          const prediction = myPredictions[match.id];
          return (
            <div key={match.id} className="match-card mb-md" onClick={() => handleOpenModal(match)} style={{ cursor: 'pointer' }}>
              <div className="match-teams">
                <div className="match-team">
                  <div className="match-team-flag">{match.teamA.flag}</div>
                  <div className="match-team-name">{match.teamA.name}</div>
                  {prediction && prediction.outcome === 'A' && (
                    <div className="badge badge-green mt-sm">Staked: {formatNumber(prediction.stake)}</div>
                  )}
                </div>
                
                <div className="match-vs">VS</div>
                
                <div className="match-team">
                  <div className="match-team-flag">{match.teamB.flag}</div>
                  <div className="match-team-name">{match.teamB.name}</div>
                  {prediction && prediction.outcome === 'B' && (
                    <div className="badge badge-green mt-sm">Staked: {formatNumber(prediction.stake)}</div>
                  )}
                </div>
              </div>
              
              {prediction && prediction.outcome === 'DRAW' && (
                <div className="text-center mt-sm">
                  <div className="badge badge-gold">Draw Staked: {formatNumber(prediction.stake)}</div>
                </div>
              )}
              {prediction && prediction.score && (
                <div className="text-center mt-sm">
                  <span style={{ fontSize: '0.75rem', color: 'var(--neon-blue)' }}>Score Prediction: {prediction.score.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={!!selectedMatch} onClose={() => setSelectedMatch(null)} title="Make Prediction">
        {selectedMatch && (
          <div>
            <h3 className="mb-sm text-center">Match Outcome</h3>
            <div className="grid-3 mb-lg" style={{ gap: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              <button 
                className={`btn ${outcome === 'A' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setOutcome('A')}
                style={{ padding: '8px' }}
              >
                <div>{selectedMatch.teamA.name}</div>
                <div style={{ fontSize: '0.7rem' }}>x{getMultiplier(selectedMatch, 'A')}</div>
              </button>
              <button 
                className={`btn ${outcome === 'DRAW' ? 'btn-gold' : 'btn-secondary'} btn-sm`}
                onClick={() => setOutcome('DRAW')}
                style={{ padding: '8px' }}
              >
                <div>Draw</div>
                <div style={{ fontSize: '0.7rem' }}>x{getMultiplier(selectedMatch, 'DRAW')}</div>
              </button>
              <button 
                className={`btn ${outcome === 'B' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setOutcome('B')}
                style={{ padding: '8px' }}
              >
                <div>{selectedMatch.teamB.name}</div>
                <div style={{ fontSize: '0.7rem' }}>x{getMultiplier(selectedMatch, 'B')}</div>
              </button>
            </div>

            <h3 className="mb-sm text-center">Correct Score (Optional Bonus)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
              {SCORE_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  className={`btn ${score?.label === opt.label ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setScore(score?.label === opt.label ? null : opt)}
                  style={{ padding: '4px' }}
                >
                  {opt.label} (x{opt.mult})
                </button>
              ))}
            </div>

            <div className="card mb-lg" style={{ padding: '16px' }}>
              <h3 className="mb-sm text-center">Stake Votes</h3>
              <input 
                type="number"
                min="100"
                className="input mb-sm"
                style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', width: '100%', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
              />
              <input 
                type="range" 
                min="100" 
                max="100000" 
                step="100" 
                value={stake} 
                onChange={(e) => setStake(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={handlePredict}>
              CONFIRM PREDICTION
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
