import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import telegram from '../lib/telegram';

export default function SpinPage() {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);

  const segments = useGameStore(s => s.spinSegments) || [];
  const segCount = segments.length;

  const handleSpin = async () => {
    if (spinning || segCount === 0) return;
    setSpinning(true);
    setResult(null);
    telegram.haptic.impact('light');

    try {
      const res = await api.spin('start_spin');
      if (!res.success) {
        throw new Error(res.error || 'Failed to spin');
      }

      const target = res.targetIndex;
      const reward = segments[target];
      
      const segmentAngle = 360 / segCount;
      const offsetInSegment = (Math.random() - 0.5) * segmentAngle * 0.7;

      const desiredRemainder = ((360 - target * segmentAngle - offsetInSegment) % 360 + 360) % 360;
      const currentRemainder = ((rotation % 360) + 360) % 360;
      let delta = desiredRemainder - currentRemainder;
      if (delta < 0) delta += 360;
      const totalDelta = 5 * 360 + delta;

      setRotation(prev => prev + totalDelta);

      setTimeout(() => {
        setSpinning(false);
        setResult(reward);
        telegram.haptic.notification('success');

        // Apply reward locally for instant UI update (backend already saved it)
        if (res.rewardType === 'energy') {
          useGameStore.setState(s => ({ energy: Math.min(s.maxEnergy, s.energy + res.rewardAmount) }));
        } else if (res.rewardType === 'votes') {
          useGameStore.setState(s => ({ totalVotes: s.totalVotes + res.rewardAmount, availableVotes: s.availableVotes + res.rewardAmount }));
        } else if (res.rewardType === 'speed') {
          useGameStore.setState(s => ({ miningSpeed: s.miningSpeed + res.rewardAmount }));
        } else if (res.rewardType === 'xp') {
          useUserStore.getState().addXp(res.rewardAmount);
        } else if (res.rewardType === 'regen') {
          useGameStore.setState(s => ({ energyRegenAmount: s.energyRegenAmount + res.rewardAmount }));
        } else if (res.rewardType === 'ton') {
          useGameStore.setState(s => ({ tonBalance: (s.tonBalance || 0) + res.rewardAmount }));
        }
      }, 4000);
    } catch (e) {
      alert(e.message || 'Spin failed');
      setSpinning(false);
    }
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
