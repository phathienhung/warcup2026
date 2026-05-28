import React, { useState } from 'react';
import { NFT_PLAYERS, NATIONS } from '../data/countries';
import { NFT_RARITIES } from '../data/constants';

export default function NFTGalleryPage() {
  const [activeTab, setActiveTab] = useState('market');
  const [filter, setFilter] = useState('all');

  const filteredPlayers = NFT_PLAYERS.filter(p => filter === 'all' || p.rarity === filter);

  const getRarityColor = (rarity) => NFT_RARITIES[rarity]?.color || '#fff';
  const getFlag = (code) => NATIONS.find(n => n.code === code)?.flag || '🏴';

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">NFT Players</h1>
        <div className="page-subtitle">Collect stars to boost your mining speed</div>
      </div>

      <div className="tabs mb-md">
        <button className={`tab ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>Market</button>
        <button className={`tab ${activeTab === 'collection' ? 'active' : ''}`} onClick={() => setActiveTab('collection')}>My Collection</button>
      </div>

      <div className="tabs mb-lg" style={{ background: 'transparent' }}>
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        {Object.entries(NFT_RARITIES).map(([key, rarity]) => (
          <button 
            key={key} 
            className={`tab ${filter === key ? 'active' : ''}`} 
            onClick={() => setFilter(key)}
            style={filter === key ? { background: rarity.color } : { color: rarity.color }}
          >
            {rarity.label}
          </button>
        ))}
      </div>

      <div className="grid-2">
        {filteredPlayers.map((player, idx) => (
          <div key={idx} className={`nft-card nft-rarity-${player.rarity}`}>
            <div className="nft-card-image">
              👤
              <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '1.2rem' }}>
                {getFlag(player.nation)}
              </div>
            </div>
            <div className="nft-card-body">
              <div className="nft-card-name">{player.name}</div>
              <div className="nft-card-rarity" style={{ color: getRarityColor(player.rarity) }}>
                {NFT_RARITIES[player.rarity].label}
              </div>
              <div className="nft-card-stats">
                <div className="nft-card-stat">
                  <span>⛏️</span>
                  <span className="nft-card-stat-value">+{NFT_RARITIES[player.rarity].miningBonus[0]}</span>
                </div>
                <div className="nft-card-stat">
                  <span>⚡</span>
                  <span className="nft-card-stat-value">+{NFT_RARITIES[player.rarity].energyBonus[0]}</span>
                </div>
              </div>
              {activeTab === 'market' ? (
                <button className="btn btn-primary btn-full btn-sm mt-md">Buy Box</button>
              ) : (
                <button className="btn btn-outline btn-full btn-sm mt-md">Equip</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
