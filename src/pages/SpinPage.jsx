import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import telegram from '../lib/telegram';

export default function SpinPage() {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);

  const segments = useGameStore(s => s.spinSegments) || [];
  const segCount = segments.length;

  const handleSpin = () => {
    if (spinning || segCount === 0) return;
    setSpinning(true);
    setResult(null);
    telegram.haptic.impact('light');

    const target = Math.floor(Math.random() * segCount);
    const segmentAngle = 360 / segCount;
    const offsetInSegment = (Math.random() - 0.5) * segmentAngle * 0.7;

    // Same math as HomePage spin
    const desiredRemainder = ((360 - target * segmentAngle - offsetInSegment) % 360 + 360) % 360;
    const currentRemainder = ((rotation % 360) + 360) % 360;
    let delta = desiredRemainder - currentRemainder;
    if (delta < 0) delta += 360;
    const totalDelta = 5 * 360 + delta;

    setRotation(prev => prev + totalDelta);

    setTimeout(() => {
      setSpinning(false);
      const reward = segments[target];
      setResult(reward);
      telegram.haptic.notification('success');

      // Apply reward locally
      if (reward.type === 'energy') {
        useGameStore.setState(s => ({ energy: Math.min(s.maxEnergy, s.energy + reward.reward) }));
      } else if (reward.type === 'votes') {
        useGameStore.setState(s => ({ totalVotes: s.totalVotes + reward.reward, availableVotes: s.availableVotes + reward.reward }));
      } else if (reward.type === 'speed') {
        useGameStore.setState(s => ({ miningSpeed: s.miningSpeed + reward.reward }));
      } else if (reward.type === 'xp') {
        useUserStore.getState().addXp(reward.reward);
      } else if (reward.type === 'regen') {
        useGameStore.setState(s => ({ energyRegenAmount: s.energyRegenAmount + reward.reward }));
      } else if (reward.type === 'ton') {
        useGameStore.setState(s => ({ tonBalance: s.tonBalance + reward.reward }));
      }

      // Save to database
      api.spin('save_reward', reward).catch(e => console.error('Failed to save spin reward', e));
    }, 4000);
  };

  if (segCount === 0) return <div className="page"><div className="page-header"><h1 className="page-title">Lucky Spin</h1></div><div className="text-center mt-xl">Loading spin config...</div></div>;

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
              background: `conic-gradient(from -${(360/segCount)/2}deg, ${segments.map((s, i) => `${s.color} ${i * (100 / segCount)}% ${(i + 1) * (100 / segCount)}%`).join(', ')})`
            }}
          >
            {segments.map((segment, index) => {
              const segmentAngle = 360 / segCount;
              const centerAngle = index * segmentAngle;
              return (
                <div 
                  key={index}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '120px',
                    height: '1px',
                    transformOrigin: '0% 50%',
                    transform: `rotate(${centerAngle - 90}deg)`,
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    left: '75px',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                    whiteSpace: 'nowrap'
                  }}>
                    {segment.label}
                  </span>
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
