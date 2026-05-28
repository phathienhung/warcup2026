import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { id: '/', label: 'Mine', icon: '⚽' },
    { id: '/leaderboard', label: 'Rank', icon: '🏆' },
    { id: '/tasks', label: 'Tasks', icon: '✅', hasBadge: true },
    { id: '/shop', label: 'Shop', icon: '🛒' },
    { id: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="nav-bar">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(tab.id)}
          >
            <div className="nav-icon" style={{ position: 'relative' }}>
              {tab.icon}
              {tab.hasBadge && <div className="nav-badge" />}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
