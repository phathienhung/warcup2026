import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import TapBall from '../components/TapBall';
import VoteCounter from '../components/VoteCounter';
import EnergyBar from '../components/EnergyBar';
import MiningSpeed from '../components/MiningSpeed';
import ParticleEngine from '../components/ParticleEngine';
import telegram from '../lib/telegram';
import Modal from '../components/Modal';
import { formatNumberFull } from '../data/constants';
import useUserStore from '../store/userStore';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import api from '../lib/api';

export default function HomePage() {
  const { totalVotes, energy, maxEnergy, miningSpeed, miningSpeedBase, miningSpeedMultiply, tap } = useGameStore();
  const [particles, setParticles] = useState([]);
  
  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'rank', 'wallet', 'spin'
  
  const handleTap = (touches) => {
    const { success, votes } = tap(touches.length);
    if (!success) return;

    telegram.haptic.impact('light');

    // Add particles
    const newParticles = touches.map(t => ({
      x: t.clientX,
      y: t.clientY,
      timestamp: Date.now(),
      votes
    }));
    setParticles(prev => [...prev, ...newParticles]);
  };

  return (
    <div className="page" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Left Sidebar for circular action buttons */}
      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 10 }}>
        <button 
          onClick={() => setActiveModal('rank')}
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--neon-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: 'var(--glow-green)' }}
        >🏆</button>
        <button 
          onClick={() => setActiveModal('spin')}
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: 'var(--glow-gold)' }}
        >🎡</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '16px 0', zIndex: 5 }}>
        <MiningSpeed speed={miningSpeed} base={miningSpeedBase} multiply={miningSpeedMultiply} />
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', zIndex: 5 }}>
        <VoteCounter value={totalVotes} />
        <TapBall onTap={handleTap} />
      </div>

      <div style={{ padding: '24px 0', width: '100%', zIndex: 5 }}>
        <EnergyBar current={energy} max={maxEnergy} base={useGameStore.getState().maxEnergyBase} multiply={useGameStore.getState().maxEnergyMultiply} />
      </div>

      <ParticleEngine particles={particles} setParticles={setParticles} />

      <Modal isOpen={activeModal === 'rank'} onClose={() => setActiveModal(null)} title="Leaderboard">
        <RankModalContent />
      </Modal>

      <Modal isOpen={activeModal === 'spin'} onClose={() => setActiveModal(null)} title="Lucky Spin">
        <SpinModalContent />
      </Modal>
    </div>
  );
}

// ── Rank Modal ──────────────────────────────────────
function RankModalContent() {
  const [leaders, setLeaders] = useState([]);
  
  useEffect(() => {
    api.getLeaderboard('global', 10).then(setLeaders).catch(console.error);
  }, []);

  return (
    <div className="leaderboard-list mt-md">
      {leaders.map((u, i) => (
        <div key={u.telegram_id} className="leaderboard-item">
          <div className="leaderboard-rank">{u.rank || i + 1}</div>
          <div className="leaderboard-info">
            <div className="leaderboard-name">{u.username || 'Player'}</div>
            <div className="leaderboard-score">{formatNumberFull(u.total_votes)} votes</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Spin Modal ──────────────────────────────────────
function SpinModalContent() {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);
  
  const segments = useGameStore(s => s.spinSegments) || [];
  const segCount = segments.length;

  const handleSpin = () => {
    if (spinning || segCount === 0) return;
    setSpinning(true);
    setWonPrize(null);

    const target = Math.floor(Math.random() * segCount);
    const segmentAngle = 360 / segCount;

    // Segment 0 is now centered at the top.
    // Random position within the target segment (-35% to +35% of segment angle from center)
    const offsetInSegment = (Math.random() - 0.5) * segmentAngle * 0.7;

    // The pointer is fixed at the top (0°).
    // When the wheel has rotated a total of R degrees clockwise, the pointer points at
    // the angle (360 - R % 360) % 360 from the top.
    // We want that to equal target*segmentAngle + offsetInSegment.
    const desiredRemainder = ((360 - target * segmentAngle - offsetInSegment) % 360 + 360) % 360;
    const currentRemainder = ((rotation % 360) + 360) % 360;
    let delta = desiredRemainder - currentRemainder;
    if (delta < 0) delta += 360;
    const fullSpins = 5 * 360;
    const totalDelta = fullSpins + delta;

    setRotation(prev => prev + totalDelta);

    setTimeout(async () => {
      setSpinning(false);
      const reward = segments[target];
      setWonPrize(reward);
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

      // Save to database and refresh stats
      try {
        await api.spin('save_reward', reward);
        // Re-fetch from server to get accurate stats
        const authData = await api.auth();
        if (authData?.user) {
          useGameStore.getState().setGameState(authData.user);
        }
      } catch (e) {
        console.error('Failed to save spin reward', e);
      }
    }, 4000);
  };

  if (!segments || segCount === 0) return <div>Loading spin config...</div>;

  const segmentAngle = 360 / segCount;

  return (
    <div className="spin-modal text-center">
      <div className="spin-container mb-xl" style={{ marginTop: '20px' }}>
        <div className="spin-wheel-wrapper">
          {/* Pointer at top center */}
          <div style={{
            position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
            borderTop: '28px solid #ff2255',
            zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(255,0,0,0.5))'
          }} />
          <div 
            className="spin-wheel"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              background: `conic-gradient(from -${(360/segCount)/2}deg, ${segments.map((s, i) =>
                `${s.color} ${i * (100 / segCount)}% ${(i + 1) * (100 / segCount)}%`
              ).join(', ')})`
            }}
          >
            {segments.map((segment, index) => {
              // Place label exactly at the center of the segment (which is index * segmentAngle)
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
                    transform: `rotate(${centerAngle - 90}deg)`, // -90 because CSS 0deg is east, we want north
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    left: '75px', // Exact middle point of the 150px radius
                    top: '50%',
                    transform: 'translate(-50%, -50%)', // Center the text perfectly on that point
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
      
      {wonPrize && (
        <div style={{ 
          padding: '12px', borderRadius: '12px', marginBottom: '16px',
          background: 'rgba(0,255,136,0.15)', border: '1px solid var(--neon-green)',
          fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--neon-green)'
        }}>
          🎉 You won: {wonPrize.label}
        </div>
      )}
      
      <button className="btn btn-gold btn-lg mt-lg btn-full" onClick={handleSpin} disabled={spinning}>
        {spinning ? 'SPINNING...' : 'SPIN NOW'}
      </button>
    </div>
  );
}

