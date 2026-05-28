import React, { useState } from 'react';
import { SPIN_SEGMENTS } from '../data/constants';
import telegram from '../lib/telegram';

export default function SpinPage() {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    telegram.haptic.impact('light');

    // Simulate random spin
    const targetSegmentIndex = Math.floor(Math.random() * SPIN_SEGMENTS.length);
    const segmentAngle = 360 / SPIN_SEGMENTS.length;
    const spins = 5; // number of full rotations
    
    // Calculate final rotation to land on target segment (adjusting for pointer position)
    const targetRotation = (spins * 360) + (targetSegmentIndex * segmentAngle) + (segmentAngle / 2);
    const newRotation = rotation + targetRotation;
    
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(SPIN_SEGMENTS[targetSegmentIndex]);
      telegram.haptic.notification('success');
    }, 4000);
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="page-header" style={{ width: '100%' }}>
        <h1 className="page-title">Lucky Spin</h1>
        <div className="page-subtitle">Win daily prizes</div>
      </div>

      <div className="spin-container mb-xl" style={{ marginTop: '20px' }}>
        <div className="spin-wheel-wrapper">
          <div className="spin-pointer" />
          <div 
            className="spin-wheel"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              background: `conic-gradient(${SPIN_SEGMENTS.map((s, i) => `${s.color} ${i * (100 / SPIN_SEGMENTS.length)}% ${(i + 1) * (100 / SPIN_SEGMENTS.length)}%`).join(', ')})`
            }}
          >
            {/* Draw text on wheel segments */}
            {SPIN_SEGMENTS.map((segment, index) => {
              const angle = (index * (360 / SPIN_SEGMENTS.length)) + ((360 / SPIN_SEGMENTS.length) / 2);
              return (
                <div 
                  key={index}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '50%',
                    transformOrigin: '0% 50%',
                    transform: `translateY(-50%) rotate(${angle}deg)`,
                    paddingLeft: '20px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                  }}
                >
                  {segment.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button 
        className="btn btn-gold btn-lg mt-lg" 
        onClick={handleSpin}
        disabled={spinning}
        style={{ width: '80%', maxWidth: '300px' }}
      >
        {spinning ? 'SPINNING...' : 'SPIN NOW (1 TICKET)'}
      </button>

      {result && (
        <div className="card mt-lg card-glow text-center" style={{ animation: 'scaleIn 0.3s ease' }}>
          <h3 style={{ color: 'var(--neon-green)', marginBottom: '8px' }}>🎉 YOU WON 🎉</h3>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{result.label}</div>
        </div>
      )}
    </div>
  );
}
