import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import useUserStore from './store/userStore';
import useGameStore from './store/gameStore';
import { NATIONS } from './data/countries';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import ShopPage from './pages/ShopPage';
import ProfilePage from './pages/ProfilePage';
import PredictionPage from './pages/PredictionPage';
import WalletPage from './pages/WalletPage';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-ball" />
      <div className="loading-text">Loading Arena...</div>
    </div>
  );
}

function NationSelectionScreen({ onSelect }) {
  // Use nations from gameStore (Supabase), fallback to local NATIONS data
  const storeNations = useGameStore(s => s.nations);
  const nations = storeNations && storeNations.length > 0 
    ? storeNations 
    : NATIONS.map(n => ({ ...n, multiplier: 1.0 }));
  
  const groups = [...new Set(nations.map(n => n.group))].sort();
  const [selectedGroup, setSelectedGroup] = useState('A');
  const filtered = nations.filter(n => n.group === selectedGroup);

  return (
    <div className="page" style={{ position: 'fixed', inset: 0, background: 'var(--bg-deep)', zIndex: 1000, overflow: 'auto' }}>
      <div className="page-header" style={{ paddingTop: '40px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '12px' }}>⚽</div>
        <h1 className="page-title">Choose Your Nation</h1>
        <div className="page-subtitle">Select the team you want to support for World Cup 2026</div>
      </div>

      <div className="tabs mb-md" style={{ flexWrap: 'wrap', padding: '0 12px', gap: '4px' }}>
        {groups.map(group => (
          <button 
            key={group} 
            className={`tab ${selectedGroup === group ? 'active' : ''}`}
            onClick={() => setSelectedGroup(group)}
            style={{ minWidth: '42px', padding: '6px 10px', fontSize: '0.75rem' }}
          >
            {group}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '0 16px 120px 16px' }}>
        {filtered.map(nation => (
          <button 
            key={nation.code} 
            className="card"
            onClick={() => onSelect(nation.code)}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', 
              padding: '16px 8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--bg-card)', transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{nation.flag}</div>
            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{nation.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--neon-green)' }}>x{nation.multiplier} Multiplier</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { isLoading, isAuthenticated, authenticate, favoriteNation, selectNation } = useUserStore();
  const { setGameState, startEnergyRegen, stopEnergyRegen, loadConfig } = useGameStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      // Load config first (regen rates, spin segments, etc.)
      await loadConfig().catch(() => {});
      
      // Then authenticate — setGameState overwrites energy/miningSpeed with real DB values
      const data = await authenticate();
      if (data?.user) {
        setGameState(data.user);
      }
      // Start regen AFTER setGameState so it uses the correct energy value
      stopEnergyRegen();
      startEnergyRegen();
    } catch (err) {
      console.error('[App] Init failed:', err);
    } finally {
      setAppReady(true);
    }
  }

  const handleSelectNation = async (code) => {
    await selectNation(code);
  };

  if (!appReady) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && !favoriteNation) {
    return <NationSelectionScreen onSelect={handleSelectNation} />;
  }

  return (
    <div className="app-layout">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <NavBar />
    </div>
  );
}
