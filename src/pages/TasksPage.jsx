import React, { useState, useEffect, useCallback } from 'react';
import { formatNumber } from '../data/constants';
import useGameStore from '../store/gameStore';
import useUserStore from '../store/userStore';
import telegram from '../lib/telegram';
import api from '../lib/api';

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const achievements = useGameStore(s => s.achievements);
  const loginStreak = useUserStore(s => s.loginStreak);
  const user = useUserStore(s => s.user);
  
  const [tasks, setTasks] = useState([]);
  const [claimedAchievements, setClaimedAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingStreak, setClaimingStreak] = useState(false);
  const [processingTask, setProcessingTask] = useState(null);



  // Check if an achievement is met based on user stats
  const isAchievementMet = useCallback((id) => {
    if (!user) return false;
    switch (id) {
      case 'first_tap': return user.total_taps > 0;
      case 'tap_1k': return user.total_taps >= 1000;
      case 'tap_10k': return user.total_taps >= 10000;
      case 'tap_100k': return user.total_taps >= 100000;
      case 'tap_1m': return user.total_taps >= 1000000;
      case 'friends_5': return user.friend_count >= 5;
      case 'friends_20': return user.friend_count >= 20;
      case 'predict_win_3': return user.predictions_won >= 3;
      case 'predict_win_10': return user.predictions_won >= 10;
      case 'nft_5': return user.nft_count >= 5;
      case 'streak_7': return user.login_streak >= 7;
      case 'streak_30': return user.login_streak >= 30;
      case 'level_10': return user.level >= 10;
      case 'level_50': return user.level >= 50;
      case 'clan_join': return user.clan_id != null;
      case 'founder': return user.founder_badge === true;
      default: return false;
    }
  }, [user]);

  const sortedTasks = [...tasks].sort((a, b) => {
    const aDone = a.status === 'claimed';
    const bDone = b.status === 'claimed';
    if (aDone === bDone) return 0;
    return aDone ? 1 : -1;
  });

  const sortedAchievements = [...(achievements || [])].sort((a, b) => {
    const aMet = isAchievementMet(a.id);
    const bMet = isAchievementMet(b.id);
    const aClaimed = claimedAchievements.includes(a.id);
    const bClaimed = claimedAchievements.includes(b.id);
    
    const aReady = aMet && !aClaimed;
    const bReady = bMet && !bClaimed;

    if (aReady === bReady) {
      if (aClaimed === bClaimed) return 0;
      return aClaimed ? 1 : -1;
    }
    return aReady ? -1 : 1;
  });

  // Fetch tasks from API on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchTasks() {
      try {
        const data = await api.getTasks();
        if (!cancelled && data) {
          if (Array.isArray(data)) {
            setTasks(data); // Fallback if backend hasn't been updated
          } else {
            setTasks(data.tasks || []);
            setClaimedAchievements(data.claimedAchievements || []);
          }
        }
      } catch (e) {
        console.error('Failed to load tasks', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTasks();
    return () => { cancelled = true; };
  }, []);

  const refreshUserStats = async () => {
    try {
      const data = await useUserStore.getState().authenticate();
      if (data?.user) {
        useGameStore.getState().setGameState(data.user);
      }
    } catch (e) {
      console.error('Failed to refresh user stats', e);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const lastStreakClaim = user?.last_streak_claim;
  const canClaimStreak = lastStreakClaim !== today;
  // streakDay = the day that was LAST claimed. Next day to claim = streakDay + 1.
  const claimedDays = Math.min(loginStreak || 0, 7);
  const nextDay = claimedDays >= 7 ? 1 : claimedDays + 1;

  const handleClaimStreak = async () => {
    if (!canClaimStreak || claimingStreak) return;
    
    setClaimingStreak(true);
    try {
      const res = await api.claimStreak();
      if (res.success) {
        telegram.haptic.notification('success');
        useUserStore.setState(s => ({ 
          loginStreak: res.day,
          user: { ...s.user, last_streak_claim: today, login_streak: res.day } 
        }));
        // Refresh full user stats to update UI instantly
        await refreshUserStats();
        alert(`🎉 Day ${res.day} Streak Claimed!\n${res.rewardValue}`);
      }
    } catch (e) {
      const msg = e?.message || 'Failed to claim streak';
      alert(msg);
    } finally {
      setClaimingStreak(false);
    }
  };

  const handleTaskAction = async (task) => {
    if (processingTask) return;
    setProcessingTask(task.id);
    
    try {
      if (task.status === 'pending') {
        // Step 1: Open link
        if (task.action_url) {
          try { telegram.openLink(task.action_url); } catch { window.open(task.action_url, '_blank'); }
        }
        // Change status locally to allow verify step
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'verifying' } : t));
      } else if (task.status === 'verifying') {
        // Step 2: Verify with backend
        const res = await api.verifyTask(task.id);
        if (res.success) {
          telegram.haptic.notification('success');
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'verified' } : t));
        }
      } else if (task.status === 'verified') {
        // Step 3: Claim reward
        
        // Show Ad before claiming
        let canClaim = true;
        if (window.Adsgram) {
          const AdController = window.Adsgram.init({ blockId: "33999" });
          try {
            await AdController.show();
          } catch (err) {
            console.error('Ad skipped or error:', err);
            if (err?.error === 'skip' || err?.done === false) {
              alert('Please watch the ad to the end to claim your reward!');
              canClaim = false;
            } else {
              // Ad blocker or no ad available, let them claim anyway
              canClaim = true;
            }
          }
        }

        if (canClaim) {
          const res = await api.claimTask(task.id);
          if (res.success) {
            telegram.haptic.notification('success');
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'claimed' } : t));
            // Refresh user stats instantly
            await refreshUserStats();
            alert(`Task Claimed! +${res.rewardValue} ${res.rewardType}`);
          }
        }
      }
    } catch (e) {
      const msg = e?.message || 'Action failed';
      alert(msg);
    } finally {
      setProcessingTask(null);
    }
  };

  const handleClaimAchievement = async (achievement) => {
    if (processingTask) return;
    setProcessingTask(achievement.id);
    
    try {
      const res = await api.claimAchievement(achievement.id);
      if (res.success) {
        telegram.haptic.notification('success');
        setClaimedAchievements(prev => [...prev, achievement.id]);
        await refreshUserStats();
        alert(`Achievement Claimed! +${res.rewardVotes} Votes`);
      }
    } catch (e) {
      const msg = e?.message || 'Action failed';
      alert(msg);
    } finally {
      setProcessingTask(null);
    }
  };

  const getButtonLabel = (status) => {
    switch (status) {
      case 'claimed': return 'Done';
      case 'verified': return 'Claim';
      case 'verifying': return 'Verify';
      default: return 'Go';
    }
  };

  const getButtonClass = (status) => {
    switch (status) {
      case 'claimed': return 'btn btn-sm';
      case 'verified': return 'btn btn-primary btn-sm';
      default: return 'btn btn-outline btn-sm';
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Tasks & Rewards</h1>
        <div className="page-subtitle">Complete missions to boost mining speed</div>
      </div>

      <div className="tabs mb-lg">
        <button className={`tab ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>Daily Tasks</button>
        <button className={`tab ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => setActiveTab('achievements')}>Achievements</button>
      </div>

      {activeTab === 'daily' && (
        <>
          {/* Streak Card */}
          <div 
            className={`card mb-lg text-center ${canClaimStreak ? 'card-gold' : ''}`} 
            style={{ cursor: canClaimStreak ? 'pointer' : 'default', opacity: canClaimStreak ? 1 : 0.8 }}
            onClick={handleClaimStreak}
          >
            <h3 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              {canClaimStreak ? `🎁 Tap to claim Day ${nextDay} streak!` : '✅ Come back tomorrow!'}
            </h3>
            <div className="streak-calendar">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <div key={day} className={`streak-day ${day <= claimedDays ? 'active' : ''} ${day === nextDay && canClaimStreak ? 'today' : ''}`}>
                  Day {day}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neon-green)', marginTop: '8px' }}>
              Reward: +Speed & +Max Energy
            </div>
            {canClaimStreak && (
              <button className="btn btn-primary btn-sm mt-md" disabled={claimingStreak} style={{ marginTop: '12px' }}>
                {claimingStreak ? 'Claiming...' : `Claim Day ${nextDay}`}
              </button>
            )}
          </div>

          {/* Tasks List */}
          {loading ? (
            <div className="text-center" style={{ color: 'var(--text-secondary)', padding: '24px' }}>Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center" style={{ color: 'var(--text-secondary)', padding: '24px' }}>No tasks available yet.</div>
          ) : (
            <div className="flex-col gap-sm">
              {sortedTasks.map(task => (
                <div key={task.id} className={`task-card ${task.status === 'claimed' ? 'completed' : ''}`}>
                  <div className="task-icon">{task.icon || '📋'}</div>
                  <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    <div className="task-reward" style={{ color: 'var(--neon-green)', fontSize: '0.75rem' }}>
                      +{task.reward_value || 0} {task.reward_type || 'reward'}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{task.description}</div>
                    )}
                  </div>
                  <div className="task-action">
                    <button 
                      className={getButtonClass(task.status)}
                      disabled={task.status === 'claimed' || processingTask === task.id}
                      onClick={() => handleTaskAction(task)}
                      style={task.status === 'claimed' ? { background: '#333', opacity: 0.6 } : {}}
                    >
                      {processingTask === task.id ? '...' : getButtonLabel(task.status)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'achievements' && (
        <div className="grid-2">
          {sortedAchievements.map((achievement, i) => {
            const isClaimed = claimedAchievements.includes(achievement.id);
            const isMet = isAchievementMet(achievement.id);
            
            return (
              <div key={achievement.id || i} className={`card ${isClaimed ? '' : (isMet ? 'card-gold' : '')}`} style={{ opacity: isClaimed ? 0.5 : 1, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{achievement.icon || '🏆'}</div>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{achievement.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px', flexGrow: 1 }}>{achievement.description}</div>
                
                {isClaimed ? (
                  <div className="badge" style={{ alignSelf: 'center', background: '#333' }}>Claimed</div>
                ) : isMet ? (
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ alignSelf: 'center', marginTop: '8px' }}
                    onClick={() => handleClaimAchievement(achievement)}
                    disabled={processingTask === achievement.id}
                  >
                    {processingTask === achievement.id ? '...' : `Claim +${formatNumber(achievement.rewardVotes || achievement.reward_votes)}`}
                  </button>
                ) : (
                  <div className="badge badge-gold" style={{ alignSelf: 'center' }}>+{formatNumber(achievement.rewardVotes || achievement.reward_votes)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
