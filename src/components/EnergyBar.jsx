import React from 'react';
import { formatNumberFull } from '../data/constants';

export default function EnergyBar({ current, max, base, multiply }) {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="energy-bar-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="energy-bar" style={{ width: '100%' }}>
        <div 
          className="energy-bar-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="energy-text" style={{ marginTop: '8px' }}>
        <span>{formatNumberFull(current)} / {formatNumberFull(max)} <span className="energy-icon">⚡</span></span>
      </div>
      {multiply > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#00d4ff', background: 'var(--glass-bg)', padding: '2px 8px', borderRadius: '12px', marginTop: '4px' }}>
          (base={base} + multiply={multiply})
        </div>
      )}
    </div>
  );
}
