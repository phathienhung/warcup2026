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
  const [buying, setBuying] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const { shopItems, nftTemplates, tonBalance } = useGameStore();
  const [myNfts, setMyNfts] = useState([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [purchasedBoostIds, setPurchasedBoostIds] = useState([]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'nfts') {
      loadMyNfts();
    }
  }, [activeTab]);

  const loadMyNfts = async () => {
    setLoadingNfts(true);
    try {
      const data = await api.getMyNFTs();
      setMyNfts(data || []);
    } catch (err) {
      console.error('Failed to load my NFTs', err);
    } finally {
      setLoadingNfts(false);
    }
  };

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
    if (!selectedItem || buying) return;
    setBuying(true);
    
    try {
      if (selectedItem.price_type === 'ton' || selectedItem.priceType === 'ton') {
        const requiredTon = Number(selectedItem.price);
        const currentTon = tonBalance || 0;
        const missingTon = requiredTon - currentTon;

        if (missingTon > 0) {
          const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 60,
            messages: [
              {
                address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
                amount: String(Math.floor(missingTon * 1000000000)),
              }
            ]
          };
          await tonConnectUI.sendTransaction(transaction);
        }
        
        let res;
        if (selectedItem.type === 'nft') {
          res = await api.buyNFT(selectedItem.id);
        } else {
          res = await api.buyItem(selectedItem.id, 1);
        }
        
        if (res.success) {
          telegram.haptic.notification('success');
          await refreshUserStats();
          if (selectedItem.type === 'nft') {
            await loadMyNfts();
          } else {
            setPurchasedBoostIds(prev => [...prev, selectedItem.id]);
          }
          setSelectedItem(null);
          alert(`Successfully purchased ${selectedItem.name}!`);
        }
      } else {
        let res;
        if (selectedItem.type === 'nft') {
          res = await api.buyNFT(selectedItem.id);
        } else {
          res = await api.buyItem(selectedItem.id, 1);
        }
        if (res.success) {
          telegram.haptic.notification('success');
          await refreshUserStats();
          if (selectedItem.type === 'nft') {
            await loadMyNfts();
          } else {
            setPurchasedBoostIds(prev => [...prev, selectedItem.id]);
          }
          setSelectedItem(null);
          alert(`Successfully purchased ${selectedItem.name}!`);
        }
      }
    } catch (err) {
      console.error('Transaction failed', err);
      telegram.haptic.notification('error');
      alert(err.message || 'Transaction failed');
    } finally {
      setBuying(false);
    }
  };

  const availableNfts = nftTemplates.filter(player => !myNfts.some(n => n.nft_template_id === player.id));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Shop & Collectibles</h1>
        <div className="page-subtitle">
          Balance: {(tonBalance || 0).toFixed(3)} TON 💎 | Owned NFTs: {myNfts.length}
        </div>
      </div>

      <div className="mb-md" style={{ display: 'flex', justifyContent: 'center' }}>
        <TonConnectButton />
      </div>

      <div className="tabs mb-md">
        <button className={`tab ${activeTab === 'boosts' ? 'active' : ''}`} onClick={() => setActiveTab('boosts')}>Boosts</button>
        <button className={`tab ${activeTab === 'nfts' ? 'active' : ''}`} onClick={() => setActiveTab('nfts')}>
          NFTs ({availableNfts.length} available)
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
      </div>

      {activeTab === 'boosts' && (
        <div className="shop-grid">
          {shopItems.filter(item => !purchasedBoostIds.includes(item.id)).map((item) => (
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
          {loadingNfts ? (
            <div className="text-center p-md" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : availableNfts.length === 0 ? (
            <div className="text-center p-md" style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
              You own all available NFTs! 🎉
            </div>
          ) : availableNfts.map((player) => (
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
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {player.minted_count || 0}/{player.total_supply || '∞'} minted
                </div>
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
        onClose={() => { if (!buying) setSelectedItem(null); }}
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
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{selectedItem.description}</p>
            <p style={{ color: '#00d4ff', fontSize: '0.85rem', marginBottom: '24px' }}>
              Your balance: {(tonBalance || 0).toFixed(3)} TON
            </p>
            
            <button 
              className="btn btn-primary btn-full" 
              onClick={handleBuy}
              disabled={buying}
              style={{ opacity: buying ? 0.5 : 1 }}
            >
              {buying ? 'PURCHASING...' : `Pay ${selectedItem.price} ${selectedItem.price_type === 'ton' || selectedItem.priceType === 'ton' ? 'TON 💎' : 'Votes ⚽'}`}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
