import React, { useState } from 'react';
import { SHOP_ITEMS, formatNumberFull } from '../data/constants';
import { NFT_PLAYERS } from '../data/countries';
import Modal from '../components/Modal';
import telegram from '../lib/telegram';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState('boosts'); // 'boosts' | 'nfts'
  const [selectedItem, setSelectedItem] = useState(null);
  const [tonConnectUI] = useTonConnectUI();

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
          {SHOP_ITEMS.map((item) => (
            <div key={item.id} className="shop-item" onClick={() => setSelectedItem({ ...item, priceType: 'ton', price: 0.5 })}>
              <div className="shop-item-icon">{item.icon}</div>
              <div className="shop-item-name">{item.name}</div>
              <div className="shop-item-desc">{item.description}</div>
              <div className="shop-item-price mt-sm">
                0.5 TON
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'nfts' && (
        <div className="grid-2">
          {NFT_PLAYERS.map((player, idx) => (
            <div key={idx} className={`nft-card nft-rarity-${player.rarity}`} onClick={() => setSelectedItem({ name: player.name, icon: '👤', description: `Chibi Collectible of ${player.name}`, price: 2, priceType: 'ton' })}>
              <div className="nft-card-image" style={{ fontSize: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                👤
              </div>
              <div className="nft-card-body">
                <div className="nft-card-name">{player.name}</div>
                <div className="nft-card-rarity">{player.rarity}</div>
                <button className="btn btn-primary btn-full btn-sm mt-md">2 TON</button>
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
            <div style={{ fontSize: '4rem', margin: '20px 0' }}>{selectedItem.icon}</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{selectedItem.name}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{selectedItem.description}</p>
            
            <button className="btn btn-primary btn-full" onClick={handleBuy}>
              Pay {selectedItem.price} {selectedItem.priceType === 'ton' ? 'TON 💎' : 'Votes ⚽'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
