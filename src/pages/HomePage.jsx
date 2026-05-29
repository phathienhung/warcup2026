import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import TapBall from '../components/TapBall';
import VoteCounter from '../components/VoteCounter';
import EnergyBar from '../components/EnergyBar';
import MiningSpeed from '../components/MiningSpeed';
import ParticleEngine from '../components/ParticleEngine';
import telegram from '../lib/telegram';
import Modal from '../components/Modal';
import { SPIN_SEGMENTS, formatNumberFull } from '../data/constants';
import useUserStore from '../store/userStore';
import { TonConnectButton } from '@tonconnect/ui-react';
import api from '../lib/api';

export default function HomePage() {
  const { totalVotes, energy, maxEnergy, miningSpeed, tap } = useGameStore();
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
          onClick={() => setActiveModal('wallet')}
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--neon-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: 'var(--glow-blue)' }}
        >💳</button>
        <button 
          onClick={() => setActiveModal('spin')}
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: 'var(--glow-gold)' }}
        >🎡</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '16px 0', zIndex: 5 }}>
        <MiningSpeed speed={miningSpeed} />
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', zIndex: 5 }}>
        <VoteCounter value={totalVotes} />
        <TapBall onTap={handleTap} />
      </div>

      <div style={{ padding: '24px 0', width: '100%', zIndex: 5 }}>
        <EnergyBar current={energy} max={maxEnergy} />
      </div>

      <ParticleEngine particles={particles} setParticles={setParticles} />

      {/* Modals */}
      <Modal isOpen={activeModal === 'rank'} onClose={() => setActiveModal(null)} title="Leaderboard">
        <RankModalContent />
      </Modal>

      <Modal isOpen={activeModal === 'wallet'} onClose={() => setActiveModal(null)} title="TON Wallet">
        <WalletModalContent />
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

// ── Wallet Modal ────────────────────────────────────
function WalletModalContent() {
  const [amount, setAmount] = useState('');
  
  const handleDeposit = () => {
    if (!amount) return;
    alert(`Please send ${amount} TON via TonConnect. Transaction logic will trigger here.`);
  };

  return (
    <div className="wallet-modal mt-md text-center">
      <div className="mb-md">
        <TonConnectButton style={{ margin: '0 auto' }} />
      </div>
      
      <div className="card mb-md">
        <h3 className="mb-sm">Deposit TON</h3>
        <input 
          type="number" 
          placeholder="Amount (TON)" 
          className="input mb-sm" 
          style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', width: '100%' }}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="btn btn-primary btn-full mt-sm" onClick={handleDeposit}>Deposit</button>
      </div>

      <div className="card">
        <h3 className="mb-sm">Withdraw TON</h3>
        <button className="btn btn-outline btn-full">Request Withdrawal</button>
      </div>
    </div>
  );
}

// ── Spin Modal ──────────────────────────────────────
function SpinModalContent() {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    const target = Math.floor(Math.random() * SPIN_SEGMENTS.length);
    const spins = 5; 
    const targetRotation = (spins * 360) + (target * (360/SPIN_SEGMENTS.length)) + 180;
    setRotation(rotation + targetRotation);

    setTimeout(() => {
      setSpinning(false);
      telegram.haptic.notification('success');
      const reward = SPIN_SEGMENTS[target];
      alert(`You won ${reward.label}!`);
      
      // Apply reward
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
        alert('0.1 TON added to your pending wallet balance!');
      }
    }, 4000);
  };

  return (
    <div className="spin-modal text-center">
      <div className="spin-container mb-xl" style={{ marginTop: '20px' }}>
        <div className="spin-wheel-wrapper">
          <div className="spin-pointer" style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '30px', background: 'var(--energy-red)', clipPath: 'polygon(50% 100%, 0 0, 100% 0)', zIndex: 10 }} />
          <div 
            className="spin-wheel"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              background: `conic-gradient(${SPIN_SEGMENTS.map((s, i) => `${s.color} ${i * (100 / SPIN_SEGMENTS.length)}% ${(i + 1) * (100 / SPIN_SEGMENTS.length)}%`).join(', ')})`
            }}
          />
        </div>
      </div>
      <button className="btn btn-gold btn-lg mt-lg btn-full" onClick={handleSpin} disabled={spinning}>
        {spinning ? 'SPINNING...' : 'SPIN NOW'}
      </button>
    </div>
  );
}
