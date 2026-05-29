import React, { useState, useEffect } from 'react';
import { formatNumber } from '../data/constants';
import useGameStore from '../store/gameStore';
import telegram from '../lib/telegram';

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const { dailyTasks: dbTasks, achievements: dbAchievements } = useGameStore();

  const [tasks, setTasks] = useState([]);
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    if (dbTasks.length > 0) {
      setTasks(dbTasks.map(t => ({ ...t, progress: 0, completed: false })));
    }
  }, [dbTasks]);

  useEffect(() => {
    if (dbAchievements.length > 0) {
      setAchievements(dbAchievements.map(a => ({ ...a, unlocked: false })));
    }
  }, [dbAchievements]);

  // Mock progress for first item
  useEffect(() => {
    if (tasks.length > 0) {
      setTasks(prev => prev.map((t, i) => i === 0 ? { ...t, progress: t.target, completed: true } : t));
    }
    if (achievements.length > 0) {
      setAchievements(prev => prev.map((a, i) => i === 0 ? { ...a, unlocked: true } : a));
    }
  }, [dbTasks, dbAchievements]);

  const handleClaim = (taskId) => {
    telegram.haptic.notification('success');
    alert(`Claimed reward for task ${taskId}!`);
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
          <div className="card mb-lg text-center">
            <h3 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>7-Day Login Streak</h3>
            <div className="streak-calendar">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <div key={day} className={`streak-day ${day <= 3 ? 'active' : ''} ${day === 3 ? 'today' : ''}`}>
                  Day {day}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neon-green)', marginTop: '8px' }}>+1 Mining Speed unlocked!</div>
          </div>

          <div className="flex-col gap-sm">
            {tasks.map(task => (
              <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`}>
                <div className="task-icon">{task.icon}</div>
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-reward">+{formatNumber(task.reward_votes)} Votes | +{task.reward_xp} XP</div>
                  <div className="progress-bar mt-sm" style={{ height: '4px' }}>
                    <div className="progress-bar-fill" style={{ width: `${(task.progress / task.target) * 100}%` }} />
                  </div>
                </div>
                <div className="task-action">
                  {task.completed ? (
                    <button className="btn btn-primary btn-sm" onClick={() => handleClaim(task.id)}>Claim</button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatNumber(task.progress)}/{formatNumber(task.target)}</div>
                  )}
                </div>
              </div>
            ))}
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
              <div className="badge badge-gold">+{formatNumber(achievement.reward_votes)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
