import React, { useState } from 'react';
import Modal from '../components/Modal';
import telegram from '../lib/telegram';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import useGameStore from '../store/gameStore';

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState('boosts'); // 'boosts' | 'nfts'
  const [selectedItem, setSelectedItem] = useState(null);
  const [tonConnectUI] = useTonConnectUI();
  const { shopItems, nftTemplates } = useGameStore();

  const handleBuy = async () => {
    if (!selectedItem) return;
    
    if (selectedItem.priceType === 'ton') {
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
        telegram.haptic.notification('success');
        alert(`Successfully purchased ${selectedItem.name}!`);
      } catch (err) {
        console.error('Transaction failed', err);
        telegram.haptic.notification('error');
      }
    } else {
      telegram.haptic.notification('success');
      alert(`Successfully purchased ${selectedItem.name} using votes!`);
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
        <button className={`tab ${activeTab === 'nfts' ? 'active' : ''}`} onClick={() => setActiveTab('nfts')}>Chibi Collectibles</button>
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
            <div key={player.id} className={`nft-card nft-rarity-${player.rarity}`} onClick={() => setSelectedItem({ name: player.player_name, icon: '👤', image_url: player.image_url, description: `Chibi Collectible of ${player.player_name}`, price: player.price_votes, priceType: 'votes' })}>
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
                <button className="btn btn-primary btn-full btn-sm mt-md">{player.price_votes} Votes</button>
              </div>
            </div>
          ))}
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
