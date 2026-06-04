import React, { useState, useEffect } from 'react';
import useUserStore from '../store/userStore';
import api from '../lib/api';
import useGameStore from '../store/gameStore';
import { formatNumber } from '../data/constants';
import { NATIONS } from '../data/countries';
import ShareCard from '../components/ShareCard';
import telegram from '../lib/telegram';
import Modal from '../components/Modal';

// ── Roadmap Data ──
const ROADMAP = [
  {
    phase: 1,
    title: 'Mining Votes',
    status: 'active',
    icon: '⛏️',
    description: 'Tap to mine Votes and prepare for Phase 2. Complete daily tasks, invite friends, and collect NFTs to boost your mining speed.',
    items: ['Tap-to-Mine system', 'Daily tasks & streak rewards', 'NFT collection & equip', 'Referral system', 'Lucky spin wheel']
  },
  {
    phase: 2,
    title: 'World Cup 2026 Predictions',
    status: 'upcoming',
    icon: '⚽',
    description: 'Use your mined Votes (or buy more in Shop) to predict match outcomes and win big from the Parimutuel pool!',
    items: ['Predict match winners', 'Predict correct scores', 'Dynamic odds (Parimutuel)', 'Claim rewards system', 'Live pool tracking']
  },
  {
    phase: 3,
    title: 'Play Football',
    status: 'locked',
    icon: '🎮',
    description: 'After World Cup 2026 ends, a new football mini-game mode will be unlocked!',
    items: ['PvE Mode: Human vs Bot', 'PvP Mode: Human vs Human', 'Tournament system', 'Leaderboard rankings']
  },
  {
    phase: 4,
    title: 'Coming Soon',
    status: 'locked',
    icon: '🚀',
    description: 'More exciting features are being developed. Stay tuned for updates!',
    items: ['TON blockchain integration', 'Marketplace', 'Governance voting', 'And more...']
  }
];

// ── Prediction Guide Steps ──
const GUIDE_STEPS = [
  {
    step: 1,
    icon: '👆',
    title: 'Open Predictions Tab',
    description: 'Tap the ⚽ Predict tab at the bottom navigation bar to see all World Cup 2026 matches.'
  },
  {
    step: 2,
    icon: '📋',
    title: 'Select a Match',
    description: 'Tap on any match card to open the prediction modal. You can only predict matches that haven\'t started yet.'
  },
  {
    step: 3,
    icon: '🏆',
    title: 'Choose Team Winner',
    description: 'Select which team you think will win (Team A, Draw, or Team B). The dynamic odds (multiplier) are shown below each option.'
  },
  {
    step: 4,
    icon: '🎯',
    title: 'Choose Correct Score (Optional)',
    description: 'For higher odds, you can also predict the exact score. Tap a score button to select it. Tap again to deselect if you only want to bet on the winner.'
  },
  {
    step: 5,
    icon: '💰',
    title: 'Set Your Stake',
    description: 'Use the slider to set how many Votes to stake (minimum 1,000). Higher stakes = higher potential rewards.'
  },
  {
    step: 6,
    icon: '📊',
    title: 'Understanding Parimutuel Odds',
    description: 'Odds change dynamically based on how much everyone bets. Your reward = Pool × 0.95 × (Your Stake / Winning Side Total). Platform takes 5% fee.'
  },
  {
    step: 7,
    icon: '🎉',
    title: 'Claim Your Rewards',
    description: 'After a match ends, if you predicted correctly, a CLAIM button appears. You can also claim from the popup when you open the app!'
  }
];

export default function ProfilePage() {
  const { user, username, firstName, level, xp, xpToNextLevel, favoriteNation, totalTaps, referralCode, friendCount, telegramId } = useUserStore();
  const { tapCount, referralSystem, claimedFriendMilestones } = useGameStore();
  const [claimingMilestone, setClaimingMilestone] = useState(false);
  const [activeTab, setActiveTab] = useState('stats');
  const [myNfts, setMyNfts] = useState([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  
  const nations = useGameStore(s => s.nations) || [];

  useEffect(() => {
    if (activeTab === 'nfts') {
      loadNfts();
    } else if (activeTab === 'friends') {
      loadFriends();
    } else if (activeTab === 'log') {
      loadAnnouncements();
    }
  }, [activeTab]);

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await api.getFriends();
      setFriendsList(data?.friends || []);
    } catch (err) {
      console.error('Failed to load friends', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadNfts = async () => {
    setLoadingNfts(true);
    try {
      const data = await api.getMyNFTs();
      setMyNfts(data || []);
    } catch (err) {
      console.error('Failed to load NFTs', err);
    } finally {
      setLoadingNfts(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to load announcements', err);
      // Fallback announcements
      setAnnouncements([
        { id: 1, title: '🎉 Welcome to World Cup Mining War 2026!', content: 'Start mining Votes now and prepare for the biggest football event!', created_at: new Date().toISOString(), type: 'info' },
        { id: 2, title: '⚽ Prediction System is LIVE!', content: 'You can now predict World Cup 2026 match outcomes and win from the Parimutuel pool!', created_at: new Date().toISOString(), type: 'feature' }
      ]);
    }
  };

  const nationData = nations.find(n => n.code === favoriteNation) || NATIONS.find(n => n.code === favoriteNation);
  const initial = (firstName || username || 'P').charAt(0).toUpperCase();
  const inviteLink = `https://t.me/warcup2026_bot/app?startapp=${referralCode || ''}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    telegram.haptic.notification('success');
    alert('Invite link copied!');
  };

  const handleInvite = () => {
    const text = `Join World Cup Mining War 2026 and get a 5,000 vote bonus! ⚽🏆`;
    telegram.shareUrl(inviteLink, text);
  };

  const handleClaimMilestone = async (count) => {
    if (claimingMilestone) return;
    setClaimingMilestone(true);
    try {
      const res = await api.claimFriendMilestone(count);
      if (res.success) {
        telegram.haptic.notification('success');
        const data = await api.auth();
        if (data?.user) {
          useGameStore.getState().setGameState(data.user);
        }
        alert(`🎉 Milestone Claimed! You got +${formatNumber(res.rewardValue)} ${res.rewardType.toUpperCase()}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to claim milestone');
    } finally {
      setClaimingMilestone(false);
    }
  };

  const liveTotalTaps = (totalTaps || 0) + (tapCount || 0);
  const f1 = referralSystem?.f1_percent || 10;
  const f2 = referralSystem?.f2_percent || 5;
  const f3 = referralSystem?.f3_percent || 2;
  const milestones = referralSystem?.milestones || [];

  return (
    <div className="page">
      <div className="profile-header">
        <div className="profile-avatar">
          {initial}
          <div className="profile-level-badge">{level}</div>
        </div>
        <div className="profile-name">{firstName || username || 'Player'}</div>
        
        {nationData && (
          <div className="badge badge-blue">
            {nationData.flag} Team {nationData.name} (x{nationData.multiplier} Bonus)
          </div>
        )}
      </div>

      <div className="tabs mb-md" style={{ flexWrap: 'wrap', gap: '4px' }}>
        <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Stats</button>
        <button className={`tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>Friends</button>
        <button className={`tab ${activeTab === 'nfts' ? 'active' : ''}`} onClick={() => setActiveTab('nfts')}>NFTs</button>
        <button className={`tab ${activeTab === 'guide' ? 'active' : ''}`} onClick={() => setActiveTab('guide')}>Guide</button>
        <button className={`tab ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>Log</button>
        <button className={`tab ${activeTab === 'roadmap' ? 'active' : ''}`} onClick={() => setActiveTab('roadmap')}>Roadmap</button>
      </div>

      {/* ── Stats Tab ── */}
      {activeTab === 'stats' && (
        <>
          <div className="card mb-lg">
            <div className="flex-between mb-sm">
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Level {level}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {formatNumber(Math.max(0, xp - (useGameStore.getState().configBaseXp || 1000) * (Math.pow(2, level - 1) - 1)))} / {formatNumber((useGameStore.getState().configBaseXp || 1000) * Math.pow(2, level - 1))} XP
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${Math.min(100, (Math.max(0, xp - (useGameStore.getState().configBaseXp || 1000) * (Math.pow(2, level - 1) - 1)) / ((useGameStore.getState().configBaseXp || 1000) * Math.pow(2, level - 1))) * 100)}%` 
                }} 
              />
            </div>
          </div>

          <div className="profile-stats mb-lg">
            <div className="profile-stat">
              <div className="profile-stat-value">{formatNumber(liveTotalTaps)}</div>
              <div className="profile-stat-label">Total Taps</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value" style={{ color: 'var(--neon-green)' }}>{formatNumber(useGameStore.getState().availableVotes)}</div>
              <div className="profile-stat-label">Votes</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value" style={{ color: '#00d4ff' }}>{(useGameStore.getState().tonBalance || 0).toFixed(3)}</div>
              <div className="profile-stat-label">TON</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{friendCount || 0}</div>
              <div className="profile-stat-label">Friends</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{useGameStore.getState().miningSpeed}</div>
              <div className="profile-stat-label">Speed</div>
              {useGameStore.getState().miningSpeedMultiply > 0 && (
                <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)', marginTop: '4px' }}>
                  (base={useGameStore.getState().miningSpeedBase} + multiply={useGameStore.getState().miningSpeedMultiply})
                </div>
              )}
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{useGameStore.getState().energyRegenAmount}</div>
              <div className="profile-stat-label">Regen</div>
              {useGameStore.getState().energyRegenMultiply > 0 && (
                <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)', marginTop: '4px' }}>
                  (base={useGameStore.getState().energyRegenBase} + multiply={useGameStore.getState().energyRegenMultiply})
                </div>
              )}
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">{useGameStore.getState().maxEnergy}</div>
              <div className="profile-stat-label">Max Energy</div>
              {useGameStore.getState().maxEnergyMultiply > 0 && (
                <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)', marginTop: '4px' }}>
                  (base={useGameStore.getState().maxEnergyBase} + multiply={useGameStore.getState().maxEnergyMultiply})
                </div>
              )}
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">x{useGameStore.getState().rewardMultiplier?.toFixed(1) || '1.0'}</div>
              <div className="profile-stat-label">Rewards</div>
            </div>
          </div>
        </>
      )}

      {/* ── Friends Tab ── */}
      {activeTab === 'friends' && (
        <div className="card text-center">
          <div style={{ fontSize: '3rem', margin: '16px 0' }}>🤝</div>
          <h3 style={{ marginBottom: '8px' }}>Invite & Earn</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Earn <strong style={{color:'var(--neon-green)'}}>{f1}%</strong> of F1 votes, <strong style={{color:'var(--gold)'}}>{f2}%</strong> of F2 votes, and <strong style={{color:'var(--neon-blue)'}}>{f3}%</strong> of F3 votes! Plus milestone bonuses below!
          </p>
          
          <div className="referral-code-box mb-md">
            <div className="referral-code" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inviteLink}</div>
            <button className="copy-btn" onClick={handleCopy}>COPY</button>
          </div>

          <button className="btn btn-primary btn-full mb-lg" onClick={handleInvite}>
            SEND INVITE LINK
          </button>

          {milestones.length > 0 && (
            <>
              <h3 className="section-title text-left mt-md">Milestone Rewards</h3>
              <div className="flex-col gap-sm mb-lg">
                {milestones.map((m, i) => {
                  const isClaimed = (claimedFriendMilestones || []).includes(m.count);
                  const isReady = !isClaimed && friendCount >= m.count;
                  
                  let rewardIcon = '⭐';
                  if (m.reward_type === 'votes') rewardIcon = '💎';
                  else if (m.reward_type === 'ton') rewardIcon = '🔹';
                  else if (m.reward_type === 'energy') rewardIcon = '⚡';
                  else if (m.reward_type === 'speed') rewardIcon = '⛏️';
                  else if (m.reward_type === 'regen') rewardIcon = '🔄';
                  else if (m.reward_type === 'max_energy') rewardIcon = '🔋';

                  return (
                    <div key={i} className={`card flex-between ${isReady ? 'card-gold' : ''}`} style={{ padding: '12px', opacity: isClaimed ? 0.6 : 1, textAlign: 'left' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>Invite {m.count} Friends</div>
                        <div style={{ fontSize: '0.8rem', color: isReady ? 'var(--gold)' : 'var(--text-secondary)' }}>
                          Reward: +{formatNumber(m.reward)} {m.reward_type.toUpperCase()} {rewardIcon}
                        </div>
                      </div>
                      
                      {isClaimed ? (
                        <div className="badge" style={{ background: '#333' }}>Claimed</div>
                      ) : isReady ? (
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => handleClaimMilestone(m.count)}
                          disabled={claimingMilestone}
                        >
                          {claimingMilestone ? '...' : 'CLAIM'}
                        </button>
                      ) : (
                        <div className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          {friendCount || 0} / {m.count}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <h3 className="section-title text-left">My Referrals ({friendCount || 0})</h3>
          {loadingFriends ? (
            <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : friendsList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">You haven't invited anyone yet.</div>
            </div>
          ) : (
            <div className="flex-col gap-sm">
              <div className="card text-left mb-sm">
                <div className="flex-between">
                  <span>Total Bonus Earned:</span>
                  <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>+{friendCount} Speed</span>
                </div>
              </div>
              {friendsList.map((f, i) => (
                <div key={f.referred_id || i} className="card flex-between" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(f.users?.username || 'P').charAt(0).toUpperCase()}
                    </div>
                    <span>{f.users?.username || 'Player'}</span>
                  </div>
                  <div style={{ color: 'var(--neon-green)', fontSize: '0.9rem' }}>
                    {formatNumber(f.users?.total_votes || 0)} votes
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NFTs Tab ── */}
      {activeTab === 'nfts' && (
        <div className="flex-col gap-sm">
          <h3 className="section-title text-left">My NFT Collection</h3>
          {loadingNfts ? (
            <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>Loading NFTs...</div>
          ) : myNfts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🖼️</div>
              <div className="empty-state-text">You don't have any NFTs yet. Go to Shop to collect some!</div>
            </div>
          ) : (
            <div className="grid-2">
              {myNfts.map((nft) => {
                const player = nft.nft_templates || {};
                return (
                  <div key={nft.id} className={`nft-card nft-rarity-${player.rarity}`}>
                    <div className="nft-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {player.image_url ? (
                        <img src={player.image_url} alt={player.player_name} style={{ width: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '3rem' }}>👤</span>
                      )}
                    </div>
                    <div className="nft-card-body">
                      <div className="nft-card-name">{player.player_name}</div>
                      <div className="nft-card-rarity">{player.rarity}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Mint #{nft.mint_number || '1'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Guide Tab ── */}
      {activeTab === 'guide' && (
        <div className="flex-col gap-sm">
          <div className="card mb-sm" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,100,255,0.1))', border: '1px solid var(--neon-green)' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '8px' }}>📖 How to Predict Matches</h3>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Follow these steps to start predicting World Cup 2026 matches and win Votes!
            </p>
          </div>

          {GUIDE_STEPS.map(step => (
            <div key={step.step} className="card" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ 
                minWidth: '40px', height: '40px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--neon-green), var(--neon-blue))', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '1.2rem', flexShrink: 0 
              }}>
                {step.icon}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>
                  Step {step.step}: {step.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Log (Announcements) Tab ── */}
      {activeTab === 'log' && (
        <div className="flex-col gap-sm">
          <h3 className="section-title text-left">📢 Game Announcements</h3>
          {announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">No announcements yet.</div>
            </div>
          ) : (
            announcements.map((ann, i) => (
              <div key={ann.id || i} className="card" style={{ borderLeft: `3px solid ${ann.type === 'feature' ? 'var(--neon-green)' : ann.type === 'warning' ? 'var(--gold)' : 'var(--neon-blue)'}` }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '6px' }}>{ann.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{ann.content}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>
                  {new Date(ann.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Roadmap Tab ── */}
      {activeTab === 'roadmap' && (
        <div className="flex-col gap-sm">
          <div className="card mb-sm" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,100,0,0.1))', border: '1px solid var(--gold)', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '4px' }}>🗺️ Project Roadmap</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Our journey to build the ultimate World Cup experience</p>
          </div>

          {ROADMAP.map(phase => (
            <div key={phase.phase} className="card" style={{ 
              opacity: phase.status === 'locked' ? 0.6 : 1,
              borderLeft: `3px solid ${phase.status === 'active' ? 'var(--neon-green)' : phase.status === 'upcoming' ? 'var(--gold)' : '#555'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '1.5rem' }}>{phase.icon}</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Phase {phase.phase}: {phase.title}</div>
                  <div style={{ fontSize: '0.7rem' }}>
                    {phase.status === 'active' && <span style={{ color: 'var(--neon-green)' }}>● ACTIVE NOW</span>}
                    {phase.status === 'upcoming' && <span style={{ color: 'var(--gold)' }}>◐ COMING SOON</span>}
                    {phase.status === 'locked' && <span style={{ color: '#888' }}>○ LOCKED</span>}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>{phase.description}</p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {phase.items.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.75rem', color: phase.status === 'active' ? 'var(--neon-green)' : 'var(--text-secondary)', marginBottom: '2px' }}>
                    {phase.status === 'active' ? '✅' : phase.status === 'upcoming' ? '🔜' : '🔒'} {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
