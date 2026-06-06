import React, { useState, useEffect } from 'react';
import useUserStore from '../store/userStore';
import useGameStore from '../store/gameStore';
import telegram from '../lib/telegram';
import api from '../lib/api';
import { formatNumber, formatNumberFull } from '../data/constants';

export default function FriendsPage() {
  const { referralCode, friendCount, telegramId } = useUserStore();
  const { referralSystem, claimedFriendMilestones } = useGameStore();
  
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const data = await api.getFriends();
        setFriendsList(data?.friends || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingFriends(false);
      }
    };
    loadFriends();
  }, []);

  const botLink = referralSystem?.bot_link || "https://t.me/warcup2026_bot/app";
  const inviteLink = `${botLink}?startapp=${referralCode || ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    telegram.haptic.notification('success');
    alert('Invite link copied!');
  };

  const handleInvite = () => {
    const text = `Join World Cup Mining War 2026 and win big! ⚽🏆`;
    telegram.shareUrl(inviteLink, text);
  };

  const handleClaimMilestone = async (count) => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await api.claimFriendMilestone(count);
      if (res.success) {
        telegram.haptic.notification('success');
        // Refresh stats
        const data = await api.auth();
        if (data?.user) {
          useGameStore.getState().setGameState(data.user);
        }
        alert(`🎉 Milestone Claimed! You got +${formatNumberFull(res.rewardValue)} ${res.rewardType.toUpperCase()}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to claim milestone');
    } finally {
      setClaiming(false);
    }
  };

  const f1 = referralSystem?.f1_percent || 10;
  const f2 = referralSystem?.f2_percent || 5;
  const f3 = referralSystem?.f3_percent || 2;
  const milestones = referralSystem?.milestones || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Invite Friends</h1>
        <div className="page-subtitle">Earn commissions & milestone rewards!</div>
      </div>

      <div className="card mb-lg text-center">
        <div style={{ fontSize: '3rem', margin: '16px 0' }}>🤝</div>
        <h3 style={{ marginBottom: '8px' }}>Multi-Tier Referral System</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
          Earn <strong style={{color:'var(--neon-green)'}}>{f1}%</strong> of F1 TON deposited, <strong style={{color:'var(--gold)'}}>{f2}%</strong> of F2 TON deposited, and <strong style={{color:'var(--neon-blue)'}}>{f3}%</strong> of F3 TON deposited! Plus milestone bonuses below!
        </p>
        
        <div className="referral-code-box mb-md">
          <div className="referral-code" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inviteLink}</div>
          <button className="copy-btn" onClick={handleCopy}>COPY</button>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleInvite}>
          SEND INVITE LINK
        </button>
      </div>

      {useUserStore.getState().unclaimedRefTon > 0 && (
        <div className="card mb-lg text-center" style={{ background: 'rgba(0, 152, 234, 0.1)', borderColor: 'var(--neon-blue)' }}>
          <h3 style={{ color: 'var(--neon-blue)', marginBottom: '8px' }}>Unclaimed TON Commissions</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '16px' }}>
            {useUserStore.getState().unclaimedRefTon.toFixed(2)} TON
          </div>
          <button 
            className="btn btn-primary btn-full" 
            onClick={async () => {
              if (claiming) return;
              setClaiming(true);
              try {
                const res = await api.claimTonCommissions();
                if (res.success) {
                  telegram.haptic.notification('success');
                  const data = await api.auth();
                  if (data?.user) useGameStore.getState().setGameState(data.user);
                  alert(`Successfully claimed ${res.claimed_amount} TON!`);
                }
              } catch (err) {
                alert(err.message || 'Failed to claim');
              } finally {
                setClaiming(false);
              }
            }}
            disabled={claiming}
          >
            {claiming ? 'CLAIMING...' : 'CLAIM COMMISSIONS'}
          </button>
        </div>
      )}

      {milestones.length > 0 && (
        <>
          <h3 className="section-title">Milestone Rewards</h3>
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
                <div key={i} className={`card flex-between ${isReady ? 'card-gold' : ''}`} style={{ padding: '12px', opacity: isClaimed ? 0.6 : 1 }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Invite {m.count} Friends</div>
                    <div style={{ fontSize: '0.8rem', color: isReady ? 'var(--gold)' : 'var(--text-secondary)' }}>
                      Reward: +{formatNumberFull(m.reward)} {m.reward_type.toUpperCase()} {rewardIcon}
                    </div>
                  </div>
                  
                  {isClaimed ? (
                    <div className="badge" style={{ background: '#333' }}>Claimed</div>
                  ) : isReady ? (
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => handleClaimMilestone(m.count)}
                      disabled={claiming}
                    >
                      {claiming ? '...' : 'CLAIM'}
                    </button>
                  ) : (
                    <div className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      {friendCount} / {m.count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <h3 className="section-title">My Referrals ({friendCount || 0})</h3>
      
      {loadingFriends ? (
        <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : friendsList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-text">You haven't invited anyone yet. Invite friends to unlock milestones!</div>
        </div>
      ) : (
        <div className="flex-col gap-sm pb-xl">
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
  );
}
