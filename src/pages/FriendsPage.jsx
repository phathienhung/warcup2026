import React from 'react';
import useUserStore from '../store/userStore';
import telegram from '../lib/telegram';

export default function FriendsPage() {
  const { referralCode, friendCount, telegramId } = useUserStore();
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
      
      {friendCount === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-text">You haven't invited anyone yet. Invite friends to boost your mining power!</div>
        </div>
      ) : (
        <div className="card">
          <div className="flex-between">
            <span>Total Bonus Earned:</span>
            <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>+{friendCount} Speed</span>
          </div>
        </div>
      )}
    </div>
  );
}
