import React from 'react';
import { formatNumberFull } from '../data/constants';

export default function MiningSpeed({ speed }) {
  return (
    <div className="mining-speed">
      <span className="mining-speed-icon">⛏️</span>
      <span>{formatNumberFull(speed)} votes/tap</span>
    </div>
  );
}
