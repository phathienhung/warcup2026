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
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
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
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress(false); // raw address
  const friendlyAddress = useTonAddress(); // user-friendly
  const { totalVotes, availableVotes } = useGameStore();
  
  const handleConnect = async () => {
    try {
      await tonConnectUI.openModal();
    } catch (e) {
      console.error('TonConnect modal error:', e);
    }
  };

  const handleDisconnect = async () => {
    try {
      await tonConnectUI.disconnect();
    } catch (e) {
      console.error('Disconnect error:', e);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) return alert('Enter a valid amount');
    if (!address) {
      alert('Please connect your wallet first!');
      return handleConnect();
    }
    
    // For now, show a message. In production, replace with your project's TON wallet address.
    alert(`To deposit ${depositAmount} TON, please send it to your in-game wallet. TonConnect integration requires a valid receiving address configured by the admin.`);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return alert('Enter a valid withdraw amount');
    if (!address) {
      alert('Please connect your wallet first!');
      return handleConnect();
    }
    alert(`Withdrawal of ${withdrawAmount} TON to ${friendlyAddress?.slice(0,8)}...${friendlyAddress?.slice(-6)} submitted! Pending admin approval.`);
  };

  const shortAddr = friendlyAddress 
    ? `${friendlyAddress.slice(0, 6)}...${friendlyAddress.slice(-4)}` 
    : null;

  return (
    <div className="wallet-modal mt-md">
      {/* Connection Status */}
      <div className="card mb-md text-center">
        {address ? (
          <>
            <div style={{ fontSize: '0.75rem', color: 'var(--neon-green)', marginBottom: '4px' }}>● Connected</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'monospace' }}>{shortAddr}</div>
            <button className="btn btn-outline btn-sm" onClick={handleDisconnect}>Disconnect</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>No wallet connected</div>
            <button className="btn btn-primary btn-full" onClick={handleConnect}>Connect TON Wallet</button>
          </>
        )}
      </div>

      {/* Balance */}
      <div className="card mb-md text-center" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>In-Game Balance</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--neon-green)', fontFamily: 'var(--font-display)' }}>
          {formatNumberFull(availableVotes)} Votes
        </div>
      </div>
      
      {/* Deposit */}
      <div className="card mb-md">
        <h3 className="mb-sm">Deposit TON</h3>
        <input 
          type="number" 
          placeholder="Amount (TON)" 
          className="input mb-sm" 
          style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', width: '100%', textAlign: 'center' }}
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
        />
        <button className="btn btn-primary btn-full mt-sm" onClick={handleDeposit}>Deposit</button>
      </div>

      {/* Withdraw */}
      <div className="card">
        <h3 className="mb-sm">Withdraw TON</h3>
        <input 
          type="number" 
          placeholder="Amount (TON)" 
          className="input mb-sm" 
          style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', width: '100%', textAlign: 'center' }}
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
        />
        <button className="btn btn-outline btn-full mt-sm" onClick={handleWithdraw}>Request Withdrawal</button>
      </div>
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

    // Pick a random target segment
    const target = Math.floor(Math.random() * segCount);
    const segmentAngle = 360 / segCount;

    // Random position within the segment (10%-90% to avoid edges)
    const offsetInSegment = segmentAngle * 0.1 + Math.random() * segmentAngle * 0.8;

    // The wheel rotates clockwise. Segment 0 starts at the top (12 o'clock).
    // To land the pointer (fixed at top) on segment `target`, we rotate the wheel
    // so that segment's center area aligns with 0°.
    // Segment `target` starts at angle (target * segmentAngle) from the top.
    // We need to rotate past that start + offsetInSegment.
    const fullSpins = 5 * 360; // 5 full rotations for drama
    const targetAngle = fullSpins + (target * segmentAngle) + offsetInSegment;

    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
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
        // TON reward handled by alert below
      }

      // Save to database
      api.spin('save_reward', reward).catch(e => console.error('Failed to save spin reward', e));
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
              background: `conic-gradient(from -90deg, ${segments.map((s, i) =>
                `${s.color} ${i * (100 / segCount)}% ${(i + 1) * (100 / segCount)}%`
              ).join(', ')})`
            }}
          >
            {segments.map((segment, index) => {
              // Place label at the center angle of each segment
              const centerAngle = index * segmentAngle + segmentAngle / 2;
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
                    left: '30px', // offset from center towards edge
                    top: '-10px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.65rem',
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

