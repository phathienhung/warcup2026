import React, { useState, useEffect } from 'react';
import useUserStore from '../store/userStore';
import telegram from '../lib/telegram';
import api from '../lib/api';
import { formatNumber } from '../data/constants';

export default function FriendsPage() {
  const { referralCode, friendCount, telegramId } = useUserStore();
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

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

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Invite Friends</h1>
        <div className="page-subtitle">Earn +1 Mining Speed per friend</div>
      </div>

      <div className="card mb-lg text-center">
        <div style={{ fontSize: '3rem', margin: '16px 0' }}>🤝</div>
        <h3 style={{ marginBottom: '8px' }}>Invite & Earn Together</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
          For every friend who joins using your link, you both receive 5,000 votes and you permanently get +1 to your mining speed!
        </p>
        
        <div className="referral-code-box mb-md">
          <div className="referral-code" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inviteLink}</div>
          <button className="copy-btn" onClick={handleCopy}>COPY</button>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleInvite}>
          SEND INVITE LINK
        </button>
      </div>

      <h3 className="section-title">My Referrals ({friendCount || 0})</h3>
      
      {loadingFriends ? (
        <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : friendsList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-text">You haven't invited anyone yet. Invite friends to boost your mining power!</div>
        </div>
      ) : (
        <div className="flex-col gap-sm">
          <div className="card mb-sm">
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
  );
}
