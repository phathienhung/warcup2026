import React, { useState } from 'react';
import { SHOP_ITEMS, formatNumberFull } from '../data/constants';
import Modal from '../components/Modal';
import telegram from '../lib/telegram';

export default function ShopPage() {
  const [selectedItem, setSelectedItem] = useState(null);

  const handleBuy = async () => {
    if (!selectedItem) return;
    
    if (selectedItem.priceType === 'stars') {
      telegram.haptic.impact('medium');
      // Mock payment flow
      alert(`Initiating Telegram Stars payment for ${selectedItem.name}`);
      setSelectedItem(null);
    } else {
      telegram.haptic.notification('success');
      alert(`Successfully purchased ${selectedItem.name} using votes!`);
      setSelectedItem(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Shop</h1>
        <div className="page-subtitle">Get boosts, energy, and vote packs</div>
      </div>

      <div className="shop-grid">
        {SHOP_ITEMS.map((item) => (
          <div key={item.id} className="shop-item" onClick={() => setSelectedItem(item)}>
            <div className="shop-item-icon">{item.icon}</div>
            <div className="shop-item-name">{item.name}</div>
            <div className="shop-item-desc">{item.description}</div>
            <div className="shop-item-price mt-sm">
              {formatNumberFull(item.price)} {item.priceType === 'stars' ? '⭐' : '⚽'}
            </div>
          </div>
        ))}
      </div>

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
              Pay {formatNumberFull(selectedItem.price)} {selectedItem.priceType === 'stars' ? 'Stars ⭐' : 'Votes ⚽'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
