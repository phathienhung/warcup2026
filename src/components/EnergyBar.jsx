import React from 'react';
import { formatNumberFull } from '../data/constants';

export default function EnergyBar({ current, max }) {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="energy-bar-wrapper">
      <div className="energy-bar">
        <div 
          className="energy-bar-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="energy-text">
        <span>{formatNumberFull(current)} / {formatNumberFull(max)} <span className="energy-icon">⚡</span></span>
      </div>
    </div>
  );
}
