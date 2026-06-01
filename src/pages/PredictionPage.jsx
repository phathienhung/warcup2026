import React, { useState, useEffect, useMemo } from 'react';
import { NATIONS } from '../data/countries';
import useGameStore from '../store/gameStore';
import useUserStore from '../store/userStore';
import Modal from '../components/Modal';
import CountdownTimer from '../components/CountdownTimer';
import { formatNumber } from '../data/constants';
import telegram from '../lib/telegram';
import api from '../lib/api';

const DEFAULT_ODDS = {
  "A": 1.5,
  "B": 1.5,
  "DRAW": 3.0,
  "0-0": 8.0, "1-1": 6.0, "2-2": 14.0, "3-3": 20.0, "4-4": 25.0, "5-5": 25.0,
  "1-0": 5.0, "2-0": 6.5, "2-1": 7.0, "3-0": 12.0, "3-1": 15.0, "3-2": 25.0,
  "4-0": 12.0, "4-1": 15.0, "4-2": 25.0, "4-3": 25.0,
  "5-0": 12.0, "5-1": 15.0, "5-2": 25.0, "5-3": 25.0, "5-4": 25.0,
  "0-1": 5.0, "0-2": 6.5, "1-2": 7.0, "0-3": 12.0, "1-3": 15.0, "2-3": 25.0,
  "0-4": 12.0, "1-4": 15.0, "2-4": 25.0, "3-4": 25.0,
  "0-5": 12.0, "1-5": 15.0, "2-5": 25.0, "3-5": 25.0, "4-5": 25.0
};

const SCORE_GROUPS = {
  "A": ['1-0', '2-0', '2-1', '3-0', '3-1', '3-2', '4-0', '4-1', '4-2', '4-3', '5-0', '5-1', '5-2', '5-3', '5-4'],
  "B": ['0-1', '0-2', '1-2', '0-3', '1-3', '2-3', '0-4', '1-4', '2-4', '3-4', '0-5', '1-5', '2-5', '3-5', '4-5'],
  "DRAW": ['0-0', '1-1', '2-2', '3-3', '4-4', '5-5']
};

export default function PredictionPage() {
  const storeNations = useGameStore(s => s.nations);
  const allNations = storeNations && storeNations.length > 0 ? storeNations : NATIONS;
  
  const [rawMatches, setRawMatches] = useState([]);
  const [myPredictions, setMyPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGroup, setSelectedGroup] = useState('Group A');
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Modal state
  const [selectedTeam, setSelectedTeam] = useState('A'); // 'A', 'B', 'DRAW'
  const [selectedScore, setSelectedScore] = useState(null); // '1-0', etc.
  const [stake, setStake] = useState(1000);
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

  const refreshUserBalance = async () => {
    try {
      const data = await api.auth();
      if (data?.user) {
        useGameStore.getState().setGameState(data.user);
      }
    } catch (e) {
      console.error('Failed to refresh balance', e);
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
        odds: m.odds || DEFAULT_ODDS,
        totalPool: Number(m.total_pool || 0),
        totalUsers: Number(m.total_users || 0),
        outcomePools: m.outcome_pools || {},
        outcomeUsers: m.outcome_users || {}
      };
    }).sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  }, [rawMatches, allNations]);
  
  // Group matches by Group letter and inject pseudo-Matchday
  const groupedMatches = useMemo(() => {
    const obj = {};
    matches.forEach(m => {
      if (!obj[m.stage]) obj[m.stage] = [];
      obj[m.stage].push(m);
    });

    Object.keys(obj).forEach(group => {
      obj[group] = obj[group].map((m, index) => ({
        ...m,
        matchday: `Matchday ${Math.floor(index / 2) + 1}`
      }));
    });

    return obj;
  }, [matches]);

  const handleOpenModal = (match) => {
    setSelectedMatch(match);
    setSelectedTeam('A');
    setSelectedScore(null);
    setStake(100);
  };

  const handlePredict = async () => {
    if (stake < 100) return alert('Minimum stake is 100 votes.');
    
    const finalOutcome = selectedScore || selectedTeam;
    
    setSubmitting(true);
    try {
      const res = await api.predict(selectedMatch.id, finalOutcome, stake);
      if (res.success) {
        telegram.haptic.notification('success');
        await loadData();
        await refreshUserBalance();
        setSelectedMatch(null);
      }
    } catch (err) {
      telegram.haptic.notification('error');
      alert(err.message || 'Failed to place prediction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnstake = async (predictionId) => {
    if (!window.confirm("Are you sure you want to unstake this prediction?")) return;
    
    try {
      const res = await api.unstake(predictionId);
      if (res.success) {
        telegram.haptic.notification('success');
        await loadData();
        await refreshUserBalance();
      }
    } catch (err) {
      telegram.haptic.notification('error');
      alert(err.message || 'Failed to unstake');
    }
  };

  const handleClaim = async (predictionId) => {
    try {
      const res = await api.claimPrediction(predictionId);
      if (res.success) {
        telegram.haptic.notification('success');
        // Show success toast or alert
        alert(`🎉 Successfully claimed ${formatNumber(res.reward)} votes!`);
        await loadData();
        await refreshUserBalance();
      }
    } catch (err) {
      telegram.haptic.notification('error');
      alert(err.message || 'Failed to claim reward');
    }
  };

  const getMultiplier = (match, type) => {
    const isWinnerMarket = ['A', 'B', 'DRAW'].includes(type);
    const outcomePool = match.outcomePools[type] || 0;
    
    // Baseline odds from DB (used as starting point / display when no bets)
    const baselineOdds = match.odds[type] || DEFAULT_ODDS[type] || 1.0;
    
    if (outcomePool === 0) return baselineOdds;

    const winnerPool = (match.outcomePools['A'] || 0) + (match.outcomePools['B'] || 0) + (match.outcomePools['DRAW'] || 0);
    const scorePool = Number(match.totalPool || 0) - winnerPool;
    
    const marketPool = isWinnerMarket ? winnerPool : scorePool;

    if (marketPool <= outcomePool) return baselineOdds;

    // Parimutuel Formula: (MarketPool * 0.95) / OutcomePool
    const COMMISSION = 0.95;
    const liveOdds = (marketPool * COMMISSION) / outcomePool;
    
    return parseFloat(liveOdds.toFixed(2));
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
          const matchPredictions = myPredictions.filter(p => p.match_id === match.id);
          const showRoundHeader = index === 0 || array[index - 1].matchday !== match.matchday;
          
          let matchDate;
          try {
            matchDate = new Date(match.match_date);
          } catch (e) {
            matchDate = new Date();
          }
          const hasStarted = matchDate.getTime() < Date.now();
          const dateStr = matchDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
          const timeStr = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

          return (
            <React.Fragment key={match.id}>
              {showRoundHeader && (
                <div className="round-header" style={{ margin: '16px 0 8px', color: 'var(--neon-green)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                  Group Stage - {match.matchday}
                </div>
              )}
              
              <div className="match-card mb-md">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>{timeStr} - {dateStr}</div>
                  {match.status === 'completed' ? (
                    <div style={{ color: 'var(--neon-green)', fontWeight: 'bold', textShadow: 'var(--glow-green)' }}>
                      MATCH ENDED
                    </div>
                  ) : (
                    <CountdownTimer targetDate={match.match_date} />
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.75rem', color: 'var(--neon-blue)' }}>
                  <div>
                    Winner Pool: {formatNumber((match.outcomePools['A']||0) + (match.outcomePools['B']||0) + (match.outcomePools['DRAW']||0))}
                  </div>
                  <div>
                    Score Pool: {formatNumber(Number(match.totalPool || 0) - ((match.outcomePools['A']||0) + (match.outcomePools['B']||0) + (match.outcomePools['DRAW']||0)))}
                  </div>
                </div>

                <div className="match-teams" onClick={() => !hasStarted && handleOpenModal(match)} style={{ cursor: hasStarted ? 'default' : 'pointer' }}>
                  <div className="match-team">
                    <div className="match-team-flag">{match.teamA.flag}</div>
                    <div className="match-team-name">{match.teamA.name}</div>
                  </div>
                  
                  <div className="match-vs">
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: match.status === 'completed' ? 'var(--neon-green)' : 'inherit' }}>
                      {match.status === 'completed' ? `${match.score_a} - ${match.score_b}` : 'VS'}
                    </div>
                  </div>
                  
                  <div className="match-team">
                    <div className="match-team-flag">{match.teamB.flag}</div>
                    <div className="match-team-name">{match.teamB.name}</div>
                  </div>
                </div>
                
                {matchPredictions.length > 0 && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Your Stakes:</div>
                    {matchPredictions.map(pred => {
                      let label = pred.predicted_team;
                      if (label === 'A') label = `${match.teamA.name} Win`;
                      else if (label === 'B') label = `${match.teamB.name} Win`;
                      else if (label === 'DRAW') label = 'Draw';
                      else label = `Score: ${label}`;

                      return (
                        <div key={pred.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', marginBottom: '4px', borderLeft: pred.is_correct ? '3px solid var(--neon-green)' : (pred.is_correct === false ? '3px solid #ff4d4d' : 'none') }}>
                          <div>
                            <span style={{ color: pred.is_correct === false ? 'var(--text-secondary)' : 'var(--neon-green)', fontWeight: 'bold' }}>{label}</span>
                            <span style={{ fontSize: '0.75rem', marginLeft: '8px', color: 'var(--text-secondary)' }}>Staked: {formatNumber(pred.votes_staked)}</span>
                            {pred.is_correct && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--gold)', marginTop: '4px', fontWeight: 'bold' }}>
                                Won: {formatNumber(pred.reward)} votes
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {!hasStarted && (
                              <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={() => handleUnstake(pred.id)}
                                style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#ff4d4d' }}
                              >
                                Unstake
                              </button>
                            )}
                            
                            {hasStarted && pred.is_correct && !pred.is_claimed && (
                              <button 
                                className="btn btn-primary btn-sm" 
                                onClick={() => handleClaim(pred.id)}
                                style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'var(--gold)', color: '#000' }}
                              >
                                CLAIM
                              </button>
                            )}
                            
                            {hasStarted && pred.is_correct && pred.is_claimed && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--neon-green)' }}>Claimed ✓</span>
                            )}
                            
                            {hasStarted && pred.is_correct === false && (
                              <span style={{ fontSize: '0.7rem', color: '#ff4d4d' }}>Lost</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <Modal isOpen={!!selectedMatch} onClose={() => { if (!submitting) setSelectedMatch(null); }} title="Make Prediction">
        {selectedMatch && (
          <div>
            <div style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid var(--gold)', padding: '8px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.75rem', color: 'var(--gold)', textAlign: 'center' }}>
              ⚠️ Odds are dynamic (Parimutuel). The multipliers shown below will adjust as more users place their stakes. Platform fee is 5%.
            </div>
            <h3 className="mb-sm text-center">Match Outcome</h3>
            <div className="grid-3 mb-lg" style={{ gap: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              <button 
                className={`btn ${selectedTeam === 'A' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => { setSelectedTeam('A'); setSelectedScore(null); }}
                style={{ padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div>{selectedMatch.teamA.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--neon-green)' }}>x{getMultiplier(selectedMatch, 'A')}</div>
                <div style={{ fontSize: '0.6rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Pool: {formatNumber(selectedMatch.outcomePools['A'] || 0)}
                  <br />Users: {selectedMatch.outcomeUsers['A'] || 0}
                </div>
              </button>
              
              <button 
                className={`btn ${selectedTeam === 'DRAW' ? 'btn-gold' : 'btn-secondary'} btn-sm`}
                onClick={() => { setSelectedTeam('DRAW'); setSelectedScore(null); }}
                style={{ padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div>Draw</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--neon-green)' }}>x{getMultiplier(selectedMatch, 'DRAW')}</div>
                <div style={{ fontSize: '0.6rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Pool: {formatNumber(selectedMatch.outcomePools['DRAW'] || 0)}
                  <br />Users: {selectedMatch.outcomeUsers['DRAW'] || 0}
                </div>
              </button>
              
              <button 
                className={`btn ${selectedTeam === 'B' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => { setSelectedTeam('B'); setSelectedScore(null); }}
                style={{ padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div>{selectedMatch.teamB.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--neon-green)' }}>x{getMultiplier(selectedMatch, 'B')}</div>
                <div style={{ fontSize: '0.6rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Pool: {formatNumber(selectedMatch.outcomePools['B'] || 0)}
                  <br />Users: {selectedMatch.outcomeUsers['B'] || 0}
                </div>
              </button>
            </div>

            {selectedTeam && (
              <>
                <h3 className="mb-sm text-center">Correct Score (Optional)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
                  {SCORE_GROUPS[selectedTeam].map(scoreStr => {
                    const isSelected = selectedScore === scoreStr;
                    const pool = selectedMatch.outcomePools[scoreStr] || 0;
                    const users = selectedMatch.outcomeUsers[scoreStr] || 0;
                    
                    return (
                      <button
                        key={scoreStr}
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setSelectedScore(isSelected ? null : scoreStr)}
                        style={{ padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                      >
                        <div>{scoreStr}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)' }}>x{getMultiplier(selectedMatch, scoreStr)}</div>
                        {pool > 0 && (
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            P: {formatNumber(pool)} | U: {users}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <div className="card mb-lg" style={{ padding: '16px' }}>
              <h3 className="mb-sm text-center">Stake Votes</h3>
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Balance: {formatNumber(useGameStore.getState().availableVotes)}
              </p>
              <input 
                type="number"
                min="1000"
                step="1000"
                className="input mb-sm"
                style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', width: '100%', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                value={stake}
                onChange={(e) => {
                  const v = Math.max(1000, Math.round(Number(e.target.value) / 1000) * 1000);
                  setStake(Math.min(v, useGameStore.getState().availableVotes));
                }}
              />
              <input 
                type="range" 
                min="1000" 
                max={Math.max(1000, Math.floor(useGameStore.getState().availableVotes / 1000) * 1000)} 
                step="1000" 
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
              {submitting ? 'PROCESSING...' : `CONFIRM ${selectedScore || selectedTeam} PREDICTION`}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
