import React, { useEffect, useState } from 'react';
import { formatNumberFull } from '../data/constants';

export default function VoteCounter({ value }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    // Simple fast update for counter
    setDisplayValue(value);
  }, [value]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="vote-counter">
        {formatNumberFull(displayValue)}
      </div>
      <div className="vote-label">VOTES</div>
    </div>
  );
}
