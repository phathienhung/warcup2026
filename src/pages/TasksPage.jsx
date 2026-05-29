import React, { useState, useEffect } from 'react';
import { formatNumber } from '../data/constants';
import useGameStore from '../store/gameStore';
import useUserStore from '../store/userStore';
import telegram from '../lib/telegram';
import api from '../lib/api';

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const { dailyTasks: dbTasks, achievements: dbAchievements, loadTasks } = useGameStore();
  const { user } = useUserStore();
  
  const [tasks, setTasks] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [claimingStreak, setClaimingStreak] = useState(false);
  const [processingTask, setProcessingTask] = useState(null);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (dbTasks && dbTasks.length > 0) {
      setTasks(dbTasks);
    }
  }, [dbTasks]);

  useEffect(() => {
    if (dbAchievements && dbAchievements.length > 0) {
      setAchievements(dbAchievements.map((a, i) => ({ ...a, unlocked: i === 0 })));
    }
  }, [dbAchievements]);

  const today = new Date().toISOString().split('T')[0];
  const lastStreakClaim = user?.last_streak_claim;
  const canClaimStreak = lastStreakClaim !== today;
  const streakDay = Math.min(user?.login_streak || 1, 7);

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
      alert(e.response?.data?.error || 'Failed to claim streak');
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
          telegram.openLink(task.action_url);
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
          alert(`Task Claimed! +${res.rewardValue} ${res.rewardType}`);
          await loadTasks();
        }
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Action failed');
    } finally {
      setProcessingTask(null);
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
          <div 
            className={`card mb-lg text-center ${canClaimStreak ? 'card-gold' : ''}`} 
            style={{ cursor: canClaimStreak ? 'pointer' : 'default', opacity: canClaimStreak ? 1 : 0.8 }}
            onClick={handleClaimStreak}
          >
            <h3 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              {canClaimStreak ? 'Tap to claim daily streak!' : 'Come back tomorrow for next streak!'}
            </h3>
            <div className="streak-calendar">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <div key={day} className={`streak-day ${day <= streakDay ? 'active' : ''} ${day === streakDay && canClaimStreak ? 'today' : ''}`}>
                  Day {day}
                </div>
              ))}
            </div>
            {canClaimStreak && (
              <button className="btn btn-primary btn-sm mt-md" disabled={claimingStreak}>
                {claimingStreak ? 'Claiming...' : 'Claim Streak'}
              </button>
            )}
          </div>

          <div className="flex-col gap-sm">
            {Array.isArray(tasks) ? tasks.map(task => (
              <div key={task.id} className={`task-card ${task.status === 'claimed' ? 'completed' : ''}`}>
                <div className="task-icon">{task.icon}</div>
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-reward">+{formatNumber(task.reward_value)} {task.reward_type}</div>
                  {task.description && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{task.description}</div>
                  )}
                </div>
                <div className="task-action">
                  {task.status === 'claimed' ? (
                    <button className="btn btn-sm" disabled style={{ background: '#333' }}>Done</button>
                  ) : task.status === 'verified' ? (
                    <button className="btn btn-primary btn-sm" disabled={processingTask === task.id} onClick={() => handleTaskAction(task)}>
                      Claim
                    </button>
                  ) : task.status === 'verifying' ? (
                    <button className="btn btn-outline btn-sm" disabled={processingTask === task.id} onClick={() => handleTaskAction(task)}>
                      Verify
                    </button>
                  ) : (
                    <button className="btn btn-outline btn-sm" disabled={processingTask === task.id} onClick={() => handleTaskAction(task)}>
                      Go
                    </button>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>
                No tasks available or failed to load.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'achievements' && (
        <div className="grid-2">
          {achievements.map(achievement => (
            <div key={achievement.id} className={`card ${achievement.unlocked ? 'card-gold' : ''}`} style={{ opacity: achievement.unlocked ? 1 : 0.5, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{achievement.icon}</div>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{achievement.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{achievement.description}</div>
              <div className="badge badge-gold">+{formatNumber(achievement.rewardVotes || achievement.reward_votes)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
