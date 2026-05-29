import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import { formatNumberFull } from '../data/constants';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import api from '../lib/api';

export default function WalletPage() {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [history, setHistory] = useState([]);
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress(false);
  const friendlyAddress = useTonAddress();
  const { availableVotes, tonBalance } = useGameStore();

  const loadHistory = () => {
    api.getWalletHistory().then(setHistory).catch(console.error);
  };

  useEffect(() => {
    loadHistory();
  }, []);

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
    
    const inGameWallet = import.meta.env.VITE_IN_GAME_WALLET;
    if (!inGameWallet) {
      return alert('tonconnect intergration requires a valid receiving address configured by admin.');
    }

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 300, // 5 min
      messages: [
        {
          address: inGameWallet,
          amount: (Number(depositAmount) * 1e9).toString() // in nanoTON
        }
      ]
    };

    try {
      await tonConnectUI.sendTransaction(transaction);
      await api.depositWallet(Number(depositAmount));
      alert('Deposit transaction sent! It is pending confirmation.');
      setDepositAmount('');
      loadHistory();
    } catch (e) {
      console.error(e);
      alert('Transaction cancelled or failed');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return alert('Enter a valid withdraw amount');
    if (!address) {
      alert('Please connect your wallet first!');
      return handleConnect();
    }

    if (Number(withdrawAmount) > (tonBalance || 0)) {
      return alert('Insufficient TON balance!');
    }

    try {
      const res = await api.withdrawWallet(Number(withdrawAmount));
      if (res.success) {
        useGameStore.setState({ tonBalance: res.newBalance });
        alert(`Withdrawal of ${withdrawAmount} TON to ${friendlyAddress?.slice(0,8)}...${friendlyAddress?.slice(-6)} submitted! Pending admin approval.`);
        setWithdrawAmount('');
        loadHistory();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to request withdrawal. Try again later.');
    }
  };

  const shortAddr = friendlyAddress 
    ? `${friendlyAddress.slice(0, 6)}...${friendlyAddress.slice(-4)}` 
    : null;

  return (
    <div className="page" style={{ overflowY: 'auto', paddingBottom: '100px' }}>
      <div className="page-header">
        <h1 className="page-title">Wallet</h1>
        <div className="page-subtitle">Manage your TON and Votes</div>
      </div>

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
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Votes Balance</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--neon-green)', fontFamily: 'var(--font-display)' }}>
                {formatNumberFull(availableVotes)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>TON Balance</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00d4ff', fontFamily: 'var(--font-display)' }}>
                {tonBalance || 0}
              </div>
            </div>
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
        <div className="card mb-md">
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

        <h3 className="section-title">Transaction History</h3>
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-text">No recent transactions</div>
          </div>
        ) : (
          <div className="leaderboard-list">
            {history.map((tx) => (
              <div key={tx.id} className="leaderboard-item" style={{ padding: '12px', borderRadius: '12px', background: 'var(--glass-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: tx.tx_type === 'deposit' ? 'var(--neon-green)' : 'var(--energy-red)', textTransform: 'capitalize' }}>
                    {tx.tx_type}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>{tx.amount_ton} TON</div>
                  <div style={{ fontSize: '0.75rem', color: tx.status === 'completed' ? 'var(--neon-green)' : 'var(--gold)', textTransform: 'capitalize' }}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
