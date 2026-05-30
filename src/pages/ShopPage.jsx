import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import telegram from '../lib/telegram';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import useGameStore from '../store/gameStore';
import useUserStore from '../store/userStore';
import api from '../lib/api';

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState('boosts'); // 'boosts' | 'nfts' | 'history'
  const [selectedItem, setSelectedItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const { shopItems, nftTemplates } = useGameStore();

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getShopHistory();
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load shop history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const refreshUserStats = async () => {
    try {
      const data = await useUserStore.getState().authenticate();
      if (data?.user) {
        useGameStore.getState().setGameState(data.user);
      }
    } catch (e) {
      console.error('Failed to refresh user stats', e);
    }
  };

  const handleBuy = async () => {
    if (!selectedItem) return;
    
    if (selectedItem.price_type === 'ton' || selectedItem.priceType === 'ton') {
      try {
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 60, // 60 sec
          messages: [
            {
              address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', // Mock admin address
              amount: String(selectedItem.price * 1000000000), // convert TON to nanoTON
            }
          ]
        };
        await tonConnectUI.sendTransaction(transaction);
        
        // After TON transaction succeeds, tell backend to apply the purchase
        let res;
        if (selectedItem.type === 'nft') {
          res = await api.buyNFT(selectedItem.id);
        } else {
          res = await api.buyItem(selectedItem.id, 1);
        }
        
        if (res.success) {
          telegram.haptic.notification('success');
          await refreshUserStats();
          alert(`Successfully purchased ${selectedItem.name}!`);
        }
      } catch (err) {
        console.error('Transaction failed', err);
        telegram.haptic.notification('error');
        alert(err.message || 'Transaction failed');
      }
    } else {
      // Votes or Stars (fallback, currently all ton)
      try {
        let res;
        if (selectedItem.type === 'nft') {
          res = await api.buyNFT(selectedItem.id);
        } else {
          res = await api.buyItem(selectedItem.id, 1);
        }
        if (res.success) {
          telegram.haptic.notification('success');
          await refreshUserStats();
          alert(`Successfully purchased ${selectedItem.name}!`);
        }
      } catch (err) {
        telegram.haptic.notification('error');
        alert(err.message || 'Failed to purchase item');
      }
    }
    setSelectedItem(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Shop & Collectibles</h1>
        <div className="page-subtitle">Get boosts or buy Chibi Player Collectibles</div>
      </div>

      <div className="mb-md" style={{ display: 'flex', justifyContent: 'center' }}>
        <TonConnectButton />
      </div>

      <div className="tabs mb-md">
        <button className={`tab ${activeTab === 'boosts' ? 'active' : ''}`} onClick={() => setActiveTab('boosts')}>Boosts</button>
        <button className={`tab ${activeTab === 'nfts' ? 'active' : ''}`} onClick={() => setActiveTab('nfts')}>NFT Collectibles</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
      </div>

      {activeTab === 'boosts' && (
        <div className="shop-grid">
          {shopItems.map((item) => (
            <div key={item.id} className="shop-item" onClick={() => setSelectedItem(item)}>
              <div className="shop-item-icon">
                {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: '100%', borderRadius: '8px' }} /> : item.icon}
              </div>
              <div className="shop-item-name">{item.name}</div>
              <div className="shop-item-desc">{item.description}</div>
              <div className="shop-item-price mt-sm">
                {item.price} {item.price_type === 'ton' ? 'TON' : 'Votes'}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'nfts' && (
        <div className="grid-2">
          {nftTemplates.map((player) => (
            <div key={player.id} className={`nft-card nft-rarity-${player.rarity}`} onClick={() => setSelectedItem({ id: player.id, type: 'nft', name: player.player_name, icon: '👤', image_url: player.image_url, description: `NFT Collectible of ${player.player_name}`, price: player.price_votes || 1.5, priceType: 'ton' })}>
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
                <button className="btn btn-primary btn-full btn-sm mt-md">{player.price_votes || 1.5} TON</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex-col gap-sm">
          {loadingHistory ? (
            <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>No purchases yet.</div>
          ) : (
            history.map((record) => (
              <div key={record.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Item #{record.item_id} ({record.item_type})</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {new Date(record.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="badge badge-gold">
                  -{record.price_paid} {record.price_type}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal 
        isOpen={!!selectedItem} 
        onClose={() => setSelectedItem(null)}
        title="Confirm Purchase"
      >
        {selectedItem && (
          <div className="text-center">
            <div style={{ fontSize: '4rem', margin: '20px 0' }}>
              {selectedItem.image_url ? (
                <img src={selectedItem.image_url} alt={selectedItem.name} style={{ width: '120px' }} />
              ) : (
                selectedItem.icon
              )}
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{selectedItem.name}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{selectedItem.description}</p>
            
            <button className="btn btn-primary btn-full" onClick={handleBuy}>
              Pay {selectedItem.price} {selectedItem.price_type === 'ton' || selectedItem.priceType === 'ton' ? 'TON 💎' : 'Votes ⚽'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
