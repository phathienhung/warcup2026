import React from 'react';
import { formatNumberFull } from '../data/constants';

export default function MiningSpeed({ speed, base, multiply, nationMultiplier = 1.0 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div className="mining-speed">
        <span className="mining-speed-icon">⛏️</span>
        <span>{formatNumberFull(speed)} votes/tap</span>
      </div>
      {(multiply > 0 || nationMultiplier > 1.0) && (
        <div style={{ fontSize: '0.75rem', color: 'var(--neon-green)', background: 'var(--glass-bg)', padding: '2px 8px', borderRadius: '12px' }}>
          {`((base:${base} + multiply:${Math.round(speed / nationMultiplier) - base}) x Nation boost: ${nationMultiplier} = ${speed})`}
        </div>
      )}
    </div>
  );
}
