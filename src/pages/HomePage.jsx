import React, { useState, useEffect, useCallback } from 'react';
import useGameStore from '../store/gameStore';
import TapBall from '../components/TapBall';
import VoteCounter from '../components/VoteCounter';
import EnergyBar from '../components/EnergyBar';
import ComboMeter from '../components/ComboMeter';
import MiningSpeed from '../components/MiningSpeed';
import ParticleEngine from '../components/ParticleEngine';
import CoinRain from '../components/CoinRain';
import telegram from '../lib/telegram';

export default function HomePage() {
  const { totalVotes, energy, maxEnergy, combo, comboMultiplier, miningSpeed, tap, checkComboTimeout } = useGameStore();
  const [particles, setParticles] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [showCoinRain, setShowCoinRain] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      checkComboTimeout();
    }, 100);
    return () => clearInterval(interval);
  }, [checkComboTimeout]);

  const handleTap = useCallback((touchPoints) => {
    const result = tap(touchPoints.length);
    if (!result.success) return;

    telegram.haptic.impact('medium');

    const newFeedbacks = touchPoints.map(t => ({
      id: Date.now() + Math.random(),
      x: t.x,
      y: t.y,
      value: result.votes / touchPoints.length,
    }));
    
    setFeedbacks(prev => [...prev, ...newFeedbacks].slice(-20)); // Keep max 20
    setParticles(touchPoints);

    // Trigger coin rain on every 1000 combo multiple or high random chance on x10
    if (result.combo > 0 && result.combo % 100 === 0) {
      setShowCoinRain(true);
      setTimeout(() => setShowCoinRain(false), 3000);
      telegram.haptic.notification('success');
    }
  }, [tap]);

  // Clean up floating numbers
  useEffect(() => {
    if (feedbacks.length > 0) {
      const timer = setTimeout(() => {
        setFeedbacks(prev => prev.filter(f => Date.now() - f.id < 800));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [feedbacks]);

  return (
    <div className="page" style={{ padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ParticleEngine particles={particles} />
      <CoinRain active={showCoinRain} />
      
      <div className="flex-between mb-lg">
        <MiningSpeed speed={miningSpeed} />
      </div>

      <div style={{ marginTop: '20px', marginBottom: 'auto' }}>
        <VoteCounter value={totalVotes} />
      </div>

      <div className="tap-area">
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ComboMeter combo={combo} multiplier={comboMultiplier} />
          <TapBall onTap={handleTap} />
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
        <EnergyBar current={energy} max={maxEnergy} />
      </div>

      {/* Tap Floating Numbers */}
      {feedbacks.map(f => (
        <div 
          key={f.id} 
          className="tap-feedback" 
          style={{ left: f.x - 20, top: f.y - 40 }}
        >
          +{Math.round(f.value)}
        </div>
      ))}
    </div>
  );
}
