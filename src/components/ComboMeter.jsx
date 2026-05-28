import React, { useEffect, useState } from 'react';
import { COMBO } from '../data/constants';

export default function ComboMeter({ combo, multiplier }) {
  const [show, setShow] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (combo >= COMBO.THRESHOLDS[1].combo) {
      setShow(true);
      setKey(prev => prev + 1); // trigger animation restart
    } else {
      setShow(false);
    }
  }, [combo, multiplier]);

  if (!show) return null;

  // Find the appropriate label
  let label = '';
  for (let i = COMBO.THRESHOLDS.length - 1; i >= 0; i--) {
    if (combo >= COMBO.THRESHOLDS[i].combo) {
      label = COMBO.THRESHOLDS[i].label;
      break;
    }
  }

  return (
    <div key={key} className="combo-meter">
      {label}
    </div>
  );
}
