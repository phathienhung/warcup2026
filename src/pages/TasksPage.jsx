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
  const [loading, setLoading] = useState(true);
  const [claimingStreak, setClaimingStreak] = useState(false);
  const [processingTask, setProcessingTask] = useState(null);

  // Fetch tasks from API on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchTasks() {
      try {
        const data = await api.getTasks();
        if (!cancelled && Array.isArray(data)) {
          setTasks(data);
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

  const today = new Date().toISOString().split('T')[0];
  const lastStreakClaim = user?.last_streak_claim;
  const canClaimStreak = lastStreakClaim !== today;
  const streakDay = Math.min(loginStreak || 1, 7);

  const handleClaimStreak = async () => {
    if (!canClaimStreak || claimingStreak) return;
    
    setClaimingStreak(true);
    try {
      const res = await api.claimStreak();
      if (res.success) {
        telegram.haptic.notification('success');
        useUserStore.setState(s => ({ 
          user: { ...s.user, last_streak_claim: today } 
        }));
        alert(`Streak Claimed! +${res.rewardValue} ${res.rewardType}`);
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
        const res = await api.claimTask(task.id);
        if (res.success) {
          telegram.haptic.notification('success');
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'claimed' } : t));
          alert(`Task Claimed! +${res.rewardValue} ${res.rewardType}`);
        }
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
              {canClaimStreak ? '🎁 Tap to claim daily streak!' : '✅ Come back tomorrow!'}
            </h3>
            <div className="streak-calendar">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <div key={day} className={`streak-day ${day <= streakDay ? 'active' : ''} ${day === streakDay && canClaimStreak ? 'today' : ''}`}>
                  Day {day}
                </div>
              ))}
            </div>
            {canClaimStreak && (
              <button className="btn btn-primary btn-sm mt-md" disabled={claimingStreak} style={{ marginTop: '12px' }}>
                {claimingStreak ? 'Claiming...' : 'Claim Streak'}
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
              {tasks.map(task => (
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
          {(achievements || []).map((achievement, i) => (
            <div key={achievement.id || i} className={`card ${i === 0 ? 'card-gold' : ''}`} style={{ opacity: i === 0 ? 1 : 0.5, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{achievement.icon || '🏆'}</div>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{achievement.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{achievement.description}</div>
              <div className="badge badge-gold">+{formatNumber(achievement.reward_votes || achievement.rewardVotes || 0)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
