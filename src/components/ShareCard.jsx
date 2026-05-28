import React from 'react';
import telegram from '../lib/telegram';

export default function ShareCard({ title, subtitle, value, icon }) {
  const handleShare = () => {
    const text = `I just reached ${value} in World Cup Mining War 2026! ⚽🏆 Join my clan and let's win together!`;
    telegram.shareUrl(window.location.origin, text);
  };

  return (
    <div className="card card-glow" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{icon}</div>
      <h3 className="page-title" style={{ fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>{subtitle}</p>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--neon-green)', marginBottom: '16px' }}>
        {value}
      </div>
      <button className="btn btn-primary btn-full" onClick={handleShare}>
        SHARE TO TELEGRAM
      </button>
    </div>
  );
}
