import React, { useState, useEffect, useMemo } from 'react';
import { NATIONS } from '../data/countries';
import useGameStore from '../store/gameStore';
import Modal from '../components/Modal';
import CountdownTimer from '../components/CountdownTimer';
import { formatNumber } from '../data/constants';
import telegram from '../lib/telegram';
import api from '../lib/api';

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
  const storeNations = useGameStore(s => s.nations);
  const allNations = storeNations && storeNations.length > 0 ? storeNations : NATIONS;
  
  const [rawMatches, setRawMatches] = useState([]);
  const [myPredictions, setMyPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGroup, setSelectedGroup] = useState('Group A');
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Modal state
  const [outcome, setOutcome] = useState('A'); // 'A', 'B', 'DRAW'
  const [score, setScore] = useState(null);
  const [stake, setStake] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchesData, predsData] = await Promise.all([
        api.getMatches(),
        api.getMyPredictions()
      ]);
      setRawMatches(matchesData || []);
      setMyPredictions(predsData || []);
    } catch (err) {
      console.error('Failed to load prediction data', err);
    } finally {
      setLoading(false);
    }
  };

  const matches = useMemo(() => {
    return rawMatches.map(m => {
      const tA = allNations.find(n => n.code === m.team_a) || { code: m.team_a, name: m.team_a, flag: '🏳️' };
      const tB = allNations.find(n => n.code === m.team_b) || { code: m.team_b, name: m.team_b, flag: '🏳️' };
      return {
        ...m,
        teamA: tA,
        teamB: tB,
        // Calculate dynamic pools
        poolA: Number(m.base_pool_a) + Number(m.total_votes_a),
        poolB: Number(m.base_pool_b) + Number(m.total_votes_b),
        poolDraw: Number(m.base_pool_draw) + Number(m.total_votes_draw),
      };
    });
  }, [rawMatches, allNations]);
  
  // Group matches by Group letter for UI
  const groupedMatches = useMemo(() => {
    const obj = {};
    matches.forEach(m => {
      if (!obj[m.stage]) obj[m.stage] = [];
      obj[m.stage].push(m);
    });
    return obj;
  }, [matches]);

  const handleOpenModal = (match) => {
    setSelectedMatch(match);
    setOutcome('A');
    setScore(null);
    setStake(100);
  };

  const handlePredict = async () => {
    if (stake < 100) return alert('Minimum stake is 100 votes.');
    
    setSubmitting(true);
    try {
      const res = await api.predict(selectedMatch.id, outcome, stake);
      if (res.success) {
        telegram.haptic.notification('success');
        await loadData(); // Refresh data to show updated pools and predictions
        setSelectedMatch(null);
      }
    } catch (err) {
      telegram.haptic.notification('error');
      alert(err.message || 'Failed to place prediction');
    } finally {
      setSubmitting(false);
    }
  };

  const getMultiplier = (match, type) => {
    const total = match.poolA + match.poolB + match.poolDraw;
    if (type === 'A') return (total / (match.poolA || 1)).toFixed(2);
    if (type === 'B') return (total / (match.poolB || 1)).toFixed(2);
    return (total / (match.poolDraw || 1)).toFixed(2);
  };

  if (loading && rawMatches.length === 0) {
    return <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading Matches...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Predictions</h1>
        <div className="page-subtitle">Predict all World Cup 2026 matches</div>
      </div>

      <div className="tabs mb-lg" style={{ flexWrap: 'wrap', gap: '8px', padding: '8px' }}>
        {Object.keys(groupedMatches).sort().map(group => (
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
        {groupedMatches[selectedGroup]?.map((match, index, array) => {
          // Get all predictions for this match
          const matchPredictions = myPredictions.filter(p => p.match_id === match.id);
          const predA = matchPredictions.find(p => p.predicted_team === 'A');
          const predB = matchPredictions.find(p => p.predicted_team === 'B');
          const predDraw = matchPredictions.find(p => p.predicted_team === 'DRAW');

          // Date logic
          let matchDate;
          try {
            matchDate = new Date(match.match_date);
          } catch (e) {
            matchDate = new Date();
          }
          const dateStr = matchDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
          const timeStr = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

          return (
            <React.Fragment key={match.id}>
              <div className="match-card mb-md" onClick={() => handleOpenModal(match)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>{timeStr} - {dateStr}</div>
                  <CountdownTimer targetDate={match.match_date} />
                </div>
                <div className="match-teams">
                  <div className="match-team">
                    <div className="match-team-flag">{match.teamA.flag}</div>
                    <div className="match-team-name">{match.teamA.name}</div>
                    {predA && (
                      <div className="badge badge-green mt-sm">Staked: {formatNumber(predA.votes_staked)}</div>
                    )}
                  </div>
                  
                  <div className="match-vs">
                    <div>VS</div>
                    {predDraw && (
                      <div className="badge badge-gold mt-sm">Draw: {formatNumber(predDraw.votes_staked)}</div>
                    )}
                  </div>
                  
                  <div className="match-team">
                    <div className="match-team-flag">{match.teamB.flag}</div>
                    <div className="match-team-name">{match.teamB.name}</div>
                    {predB && (
                      <div className="badge badge-green mt-sm">Staked: {formatNumber(predB.votes_staked)}</div>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <Modal isOpen={!!selectedMatch} onClose={() => { if (!submitting) setSelectedMatch(null); }} title="Make Prediction">
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
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Balance: {formatNumber(useGameStore.getState().availableVotes)}
              </p>
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

            <button 
              className="btn btn-primary btn-full btn-lg" 
              onClick={handlePredict}
              disabled={submitting}
              style={{ opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'PROCESSING...' : 'CONFIRM PREDICTION'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
