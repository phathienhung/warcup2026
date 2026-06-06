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
  const { totalVotes, availableVotes, tonBalance, energy, maxEnergy, miningSpeed, miningSpeedBase, miningSpeedMultiply, nationMultiplier, tap } = useGameStore();
  const { boostExpiresAt, boostMultiplier } = useUserStore();
  const [particles, setParticles] = useState([]);
  const [boostRemainingStr, setBoostRemainingStr] = useState('');
  
  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'rank', 'wallet', 'spin', 'claim'
  const [unclaimedPredictions, setUnclaimedPredictions] = useState([]);
  const [claiming, setClaiming] = useState(false);
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    startupSequence();
  }, []);

  const startupSequence = async () => {
    // 1. Check if new user
    const isNew = useUserStore.getState().totalTaps === 0 && !localStorage.getItem('guide_seen');
    if (isNew) {
      setActiveModal('guide');
      return; // Stop here, rest will trigger on close
    }
    
    checkAnnouncementsAndRewards();
  };

  useEffect(() => {
    let interval;
    if (boostExpiresAt && new Date(boostExpiresAt) > new Date()) {
      const updateTimer = () => {
        const diff = new Date(boostExpiresAt) - new Date();
        if (diff <= 0) {
          setBoostRemainingStr('');
          clearInterval(interval);
        } else {
          const m = Math.floor(diff / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setBoostRemainingStr(`${m}:${s.toString().padStart(2, '0')}`);
        }
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setBoostRemainingStr('');
    }
    return () => clearInterval(interval);
  }, [boostExpiresAt]);

  const checkAnnouncementsAndRewards = async () => {
    // 2. Fetch announcements
    try {
      const anns = await api.getAnnouncements();
      if (anns && anns.length > 0) {
        const latest = anns[0]; // Assuming sorted by latest
        const seenIds = JSON.parse(localStorage.getItem('seen_announcements') || '[]');
        if (!seenIds.includes(latest.id)) {
          setAnnouncement(latest);
          setActiveModal('announcement');
          return; // Wait for close to check rewards
        }
      }
    } catch (e) {
      console.error('Failed to load announcements', e);
    }
    
    // 3. Check Rewards
    checkUnclaimedRewards();
  };

  const handleCloseGuide = () => {
    localStorage.setItem('guide_seen', 'true');
    setActiveModal(null);
    checkAnnouncementsAndRewards();
  };

  const handleCloseAnnouncement = () => {
    if (announcement) {
      const seenIds = JSON.parse(localStorage.getItem('seen_announcements') || '[]');
      seenIds.push(announcement.id);
      localStorage.setItem('seen_announcements', JSON.stringify(seenIds));
    }
    setActiveModal(null);
    checkUnclaimedRewards();
  };

  const checkUnclaimedRewards = async () => {
    try {
      const preds = await api.getMyPredictions();
      if (preds && preds.length > 0) {
        const unclaimed = preds.filter(p => p.is_correct && !p.is_claimed);
        if (unclaimed.length > 0) {
          setUnclaimedPredictions(unclaimed);
          setActiveModal('claim');
          telegram.haptic.notification('success');
        }
      }
    } catch (e) {
      console.error('Failed to check rewards', e);
    }
  };

  const handleClaimAll = async () => {
    setClaiming(true);
    let totalWon = 0;
    try {
      for (const p of unclaimedPredictions) {
        try {
          const res = await api.claimPrediction(p.id);
          if (res.success) {
            totalWon += res.reward;
          }
        } catch (e) {
          console.error('Failed to claim prediction', p.id, e);
        }
      }
      telegram.haptic.notification('success');
      alert(`🎉 Successfully claimed ${formatNumberFull(totalWon)} votes!`);
      setActiveModal(null);
      setUnclaimedPredictions([]);
      
      // Refresh balance
      const data = await api.auth();
      if (data?.user) {
        useGameStore.getState().setGameState(data.user);
      }
    } catch (err) {
      alert('Error claiming some rewards');
    } finally {
      setClaiming(false);
    }
  };
  
  const handleTap = (touches) => {
    const { success, votes } = tap(touches.length);
    if (!success) return;

    telegram.haptic.impact('light');

    const votesPerParticle = Math.max(1, Math.floor(votes / touches.length));
    const newParticles = touches.map(t => ({
      x: t.clientX,
      y: t.clientY,
      timestamp: Date.now(),
      votes: votesPerParticle
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

      {/* Right Sidebar */}
      <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 10 }}>
        <button 
          onClick={() => setActiveModal('exchange')}
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--neon-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: 'var(--glow-blue)' }}
        >💱</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '16px 0', zIndex: 5 }}>
        <MiningSpeed speed={miningSpeed} base={miningSpeedBase} multiply={miningSpeedMultiply} nationMultiplier={nationMultiplier} />
        {boostRemainingStr && (
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--gold)' }}>
            🔥 x{boostMultiplier} BOOST: {boostRemainingStr}
          </div>
        )}
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', zIndex: 5 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <VoteCounter value={availableVotes} />
          {tonBalance > 0 && (
            <div style={{ fontSize: '1.2rem', color: 'var(--neon-blue)', fontWeight: 'bold', textShadow: 'var(--glow-blue)' }}>
              💎 {tonBalance.toFixed(2)} TON
            </div>
          )}
        </div>
        <TapBall onTap={handleTap} />
      </div>

      <div style={{ padding: '24px 0', width: '100%', zIndex: 5 }}>
        <EnergyBar current={energy} max={maxEnergy} base={useGameStore.getState().maxEnergyBase} multiply={useGameStore.getState().maxEnergyMultiply} />
      </div>

      <ParticleEngine particles={particles} setParticles={setParticles} />

      <Modal isOpen={activeModal === 'rank'} onClose={() => setActiveModal(null)} title="TOP MULTIPLIER">
        <RankModalContent />
      </Modal>

      <Modal isOpen={activeModal === 'spin'} onClose={() => setActiveModal(null)} title="Lucky Spin">
        <SpinModalContent />
      </Modal>

      <Modal isOpen={activeModal === 'exchange'} onClose={() => setActiveModal(null)} title="Exchange to TON">
        <ExchangeModalContent />
      </Modal>

      <Modal isOpen={activeModal === 'claim'} onClose={() => !claiming && setActiveModal(null)} title="🎉 Congratulations! 🎉">
        <div style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
          <h3 style={{ color: 'var(--neon-green)', marginBottom: '16px' }}>You Won Predictions!</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            You have {unclaimedPredictions.length} unclaimed winning {unclaimedPredictions.length === 1 ? 'ticket' : 'tickets'}.
          </p>
          
          <div style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gold)', marginBottom: '8px' }}>Total Reward</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gold)' }}>
              {formatNumberFull(unclaimedPredictions.reduce((acc, p) => acc + (p.reward || 0), 0))} Votes
            </div>
          </div>
          
          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={handleClaimAll}
            disabled={claiming}
            style={{ background: 'var(--gold)', color: '#000', fontWeight: 'bold' }}
          >
            {claiming ? 'CLAIMING...' : 'CLAIM ALL REWARDS'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'guide'} onClose={handleCloseGuide} title="📖 Welcome to Prediction Mode!">
        <div style={{ padding: '16px' }}>
          <div style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '16px' }}>⚽</div>
          <h3 style={{ color: 'var(--neon-green)', textAlign: 'center', marginBottom: '16px' }}>How to Predict</h3>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', paddingLeft: '20px', marginBottom: '24px' }}>
            <li style={{ marginBottom: '8px' }}>Tap the <strong>Predict</strong> tab below and select an upcoming match.</li>
            <li style={{ marginBottom: '8px' }}>Predict the <strong>Winner</strong> (Team A, Draw, or Team B).</li>
            <li style={{ marginBottom: '8px' }}>You can also predict the <strong>Correct Score</strong> for higher rewards! (Tap a score to select, tap again to deselect).</li>
            <li>Wait for the match to end. If you win, come back to Claim your Votes!</li>
          </ul>
          <button className="btn btn-primary btn-full btn-lg" onClick={handleCloseGuide}>
            GOT IT!
          </button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'announcement'} onClose={handleCloseAnnouncement} title="📢 Latest Announcement">
        {announcement && (
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '16px' }}>
              {announcement.type === 'feature' ? '🚀' : announcement.type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <h3 style={{ color: 'var(--neon-blue)', textAlign: 'center', marginBottom: '16px' }}>{announcement.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
              {announcement.content}
            </p>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleCloseAnnouncement}>
              CLOSE
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Rank Modal ──────────────────────────────────────
function RankModalContent() {
  const [leaders, setLeaders] = useState([]);
  
  useEffect(() => {
    api.getLeaderboard('nft', 10).then(setLeaders).catch(console.error);
  }, []);

  const TON_REWARDS = [10, 5, 3, 2, 1, 0.5, 0.4, 0.3, 0.2, 0.1];

  return (
    <div className="flex-col mt-md">
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.85rem' }}>
        Top users with the highest multiplier by owning NFTs.
      </div>
      <div style={{ textAlign: 'center', color: 'var(--gold)', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 'bold' }}>
        🎁 Rewards will be distributed when World Cup 2026 ends!
      </div>
      <div className="leaderboard-list">
        {Array.from({ length: 10 }).map((_, i) => {
          const rank = i + 1;
          const u = leaders[i];
          const reward = TON_REWARDS[i] || 0;
          return (
            <div key={u ? u.telegram_id : `empty-${rank}`} className="leaderboard-item">
              <div className="leaderboard-rank" style={{ color: rank <= 3 ? 'var(--gold)' : 'inherit' }}>{rank}</div>
              <div className="leaderboard-info" style={{ flex: 1, opacity: u ? 1 : 0.4 }}>
                <div className="leaderboard-name">{u ? (u.username || 'Player') : '---'}</div>
                {u && <div className="leaderboard-score">Multiplier: x{u.nft_multiplier?.toFixed(2) || '1.00'}</div>}
              </div>
              {reward > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,215,0,0.15)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--gold)' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.85rem' }}>+{reward}</span>
                  <span style={{ fontSize: '0.9rem' }}>💎</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Spin Modal ──────────────────────────────────────
function SpinModalContent() {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);
  const [spinInfo, setSpinInfo] = useState({ tickets: 0, daily_free_spin_available: false });
  
  const segments = useGameStore(s => s.spinSegments) || [];
  const segCount = segments.length;

  useEffect(() => {
    loadSpinInfo();
  }, []);

  const loadSpinInfo = async () => {
    try {
      const res = await api.getSpinInfo();
      setSpinInfo(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSpin = async () => {
    if (spinning || segCount === 0) return;
    if (!spinInfo.daily_free_spin_available && spinInfo.tickets <= 0) {
      alert("You don't have any spin tickets! Buy some in the Shop.");
      return;
    }
    
    setSpinning(true);
    setWonPrize(null);

    let target;
    try {
      const res = await api.spin('start_spin', null, segCount);
      if (!res.success) throw new Error(res.error || 'Failed to start spin');
      target = res.targetIndex;
      loadSpinInfo(); // Update UI tickets immediately
    } catch (e) {
      console.error(e);
      alert(e.message);
      setSpinning(false);
      return;
    }
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
        useGameStore.setState(s => ({ energy: s.energy + reward.reward }));
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
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px', fontSize: '0.9rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px' }}>
          🎟️ Tickets: <strong>{spinInfo.tickets}</strong>
        </div>
        <div style={{ background: spinInfo.daily_free_spin_available ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px', color: spinInfo.daily_free_spin_available ? 'var(--neon-green)' : 'inherit' }}>
          🎁 Free Spin: <strong>{spinInfo.daily_free_spin_available ? '1' : '0'}</strong>
        </div>
      </div>

      <button 
        className="btn btn-gold btn-lg mt-sm btn-full" 
        onClick={handleSpin} 
        disabled={spinning || (!spinInfo.daily_free_spin_available && spinInfo.tickets <= 0)}
        style={{ opacity: (spinning || (!spinInfo.daily_free_spin_available && spinInfo.tickets <= 0)) ? 0.5 : 1 }}
      >
        {spinning ? 'SPINNING...' : 'SPIN NOW'}
      </button>
    </div>
  );
}

// ── Exchange Modal ──────────────────────────────────
function ExchangeModalContent() {
  const { availableVotes, tonBalance, adsWatched, exchangeRateVotes, exchangeRateTon, exchangeAdsRequired } = useGameStore();
  const [loading, setLoading] = useState(false);

  const handleWatchAd = async () => {
    if (loading) return;
    if (!window.Adsgram) {
      alert("Adsgram is not initialized.");
      return;
    }

    setLoading(true);
    const AdController = window.Adsgram.init({ blockId: "33999" });
    
    let adWatched = false;
    try {
      await AdController.show();
      adWatched = true;
    } catch (err) {
      console.error('Adsgram error:', err);
      if (err?.error === 'skip' || err?.done === false) {
        alert('Please watch the ad to the end.');
        setLoading(false);
        return;
      } else {
        // No ad inventory or adblocker
        adWatched = true;
        alert('No video ad available right now, but we counted it anyway!');
      }
    }

    if (adWatched) {
      try {
        const res = await api.watchAd();
        if (res.success) {
          useGameStore.setState({ adsWatched: res.adsWatched });
          telegram.haptic.notification('success');
          alert(`✅ Ad counted! You have watched ${res.adsWatched} / ${exchangeAdsRequired} ads.`);
        }
      } catch (apiErr) {
        console.error('API Error:', apiErr);
        alert('Failed to save ad progress to server.');
      }
    }
    
    setLoading(false);
  };

  const handleExchange = async () => {
    if (loading) return;
    if (adsWatched < exchangeAdsRequired) return;
    if (availableVotes < exchangeRateVotes) {
      alert("Not enough votes.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.exchange();
      if (res.success) {
        useGameStore.setState({ 
          availableVotes: res.availableVotes,
          adsWatched: res.adsWatched,
          tonBalance: res.tonBalance
        });
        telegram.haptic.notification('success');
        alert(`Successfully exchanged! You received ${exchangeRateTon} TON.`);
      }
    } catch (err) {
      alert(err.message || "Exchange failed.");
    } finally {
      setLoading(false);
    }
  };

  const canExchange = adsWatched >= exchangeAdsRequired && availableVotes >= exchangeRateVotes;

  return (
    <div className="flex-col mt-md">
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--neon-blue)', fontWeight: 'bold' }}>💎 {tonBalance.toFixed(2)} TON</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Exchange Rate: {formatNumberFull(exchangeRateVotes)} Votes = {exchangeRateTon} TON
        </p>
      </div>

      <div className="card mb-lg" style={{ textAlign: 'center', padding: '16px' }}>
        <h3 className="mb-sm">Ads Requirement</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Watch {exchangeAdsRequired} ads to unlock the exchange button.
        </p>
        
        <div style={{ background: 'rgba(255,255,255,0.1)', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ 
            height: '100%', 
            background: 'var(--neon-blue)', 
            width: `${Math.min(100, (adsWatched / exchangeAdsRequired) * 100)}%`,
            transition: 'width 0.3s'
          }} />
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '16px', color: adsWatched >= exchangeAdsRequired ? 'var(--neon-green)' : 'inherit' }}>
          {adsWatched} / {exchangeAdsRequired} Ads Watched
        </div>

        <button 
          className="btn btn-outline btn-full mb-sm" 
          onClick={handleWatchAd}
          disabled={loading || adsWatched >= exchangeAdsRequired}
        >
          {loading ? 'LOADING AD...' : (adsWatched >= exchangeAdsRequired ? 'REQUIREMENT MET' : '📺 WATCH AD')}
        </button>
      </div>

      <button 
        className={`btn btn-full btn-lg ${canExchange ? 'btn-primary' : 'btn-secondary'}`}
        onClick={handleExchange}
        disabled={!canExchange || loading}
        style={canExchange ? { background: 'var(--neon-blue)', color: '#fff', boxShadow: 'var(--glow-blue)' } : {}}
      >
        {loading ? 'EXCHANGING...' : 'EXCHANGE TO TON'}
      </button>
    </div>
  );
}

