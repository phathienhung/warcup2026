import React, { useState, useEffect } from 'react';
import useUserStore from '../store/userStore';
import useGameStore from '../store/gameStore';
import Modal from './Modal';
import api from '../lib/api';
import telegram from '../lib/telegram';

export default function UnclaimedModal() {
  const { isAuthenticated } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [commissions, setCommissions] = useState([]);
  const [legacyAmount, setLegacyAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      checkUnclaimed();
    }
  }, [isAuthenticated]);

  const checkUnclaimed = async () => {
    try {
      const res = await api.get('/referral?action=unclaimed_commissions');
      if (res && res.success) {
        if ((res.commissions && res.commissions.length > 0) || res.legacyAmount > 0) {
          setCommissions(res.commissions || []);
          setLegacyAmount(res.legacyAmount || 0);
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to check unclaimed commissions', err);
    }
  };

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await api.claimTonCommissions();
      if (res.success) {
        telegram.haptic.notification('success');
        const data = await api.auth();
        if (data?.user) {
          useGameStore.getState().setGameState(data.user);
        }
        alert(`Successfully claimed ${res.claimed_amount.toFixed(2)} TON!`);
        setIsOpen(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to claim');
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  const totalNew = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const total = totalNew + legacyAmount;

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="🎉 You Have Unclaimed TON!">
      <div className="flex-col gap-sm" style={{ padding: '0 16px 16px', maxHeight: '60vh', overflowY: 'auto' }}>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          Your friends deposited TON and you earned commissions!
        </p>

        {commissions.map((c) => (
          <div key={c.id} className="card flex-between" style={{ padding: '12px', borderLeft: '3px solid var(--neon-blue)' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{c.users?.username || c.users?.first_name || 'Player'} <span style={{ fontSize: '0.7rem', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: '4px', padding: '1px 4px', marginLeft: '4px' }}>F{c.tier}</span></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Deposited: {c.deposit_amount} TON
              </div>
            </div>
            <div style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>
              +{c.commission_amount.toFixed(2)} TON
            </div>
          </div>
        ))}

        {legacyAmount > 0 && (
          <div className="card flex-between" style={{ padding: '12px', borderLeft: '3px solid #888' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>Legacy Commissions</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From older deposits</div>
            </div>
            <div style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>
              +{legacyAmount.toFixed(2)} TON
            </div>
          </div>
        )}

        <div className="card mt-sm text-center" style={{ background: 'rgba(0, 152, 234, 0.1)', borderColor: 'var(--neon-blue)' }}>
          <h3 style={{ color: 'var(--neon-blue)', marginBottom: '4px' }}>Total to Claim</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {total.toFixed(2)} TON
          </div>
        </div>

        <button 
          className="btn btn-primary btn-full mt-sm" 
          onClick={handleClaim}
          disabled={claiming}
          style={{ padding: '16px', fontSize: '1.1rem' }}
        >
          {claiming ? 'CLAIMING...' : 'CLAIM NOW'}
        </button>
      </div>
    </Modal>
  );
}
