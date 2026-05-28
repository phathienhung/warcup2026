import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import useUserStore from './store/userStore';
import useGameStore from './store/gameStore';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import ShopPage from './pages/ShopPage';
import ProfilePage from './pages/ProfilePage';
import PredictionPage from './pages/PredictionPage';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-ball" />
      <div className="loading-text">Loading Arena...</div>
    </div>
  );
}

function NationSelectionScreen({ onSelect }) {
  const nations = useGameStore(s => s.nations) || [];
  
  return (
    <div className="page" style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'var(--bg-deep)' }}>
      <div className="page-header">
        <h1 className="page-title">Choose Your Nation</h1>
        <div className="page-subtitle">Select the team you want to support for World Cup 2026</div>
      </div>
      <div className="nation-grid" style={{ padding: '0 16px', overflowY: 'auto', maxHeight: '75vh' }}>
        {nations.map(nation => (
          <div key={nation.code} className="nation-item" onClick={() => onSelect(nation.code)}>
            <div className="nation-flag" style={{ fontSize: '2.5rem' }}>{nation.flag}</div>
            <div style={{ fontWeight: 'bold' }}>{nation.name}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--neon-green)' }}>x{nation.multiplier} Multiplier</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { isLoading, isAuthenticated, authenticate, favoriteNation, selectNation } = useUserStore();
  const { setGameState, startEnergyRegen, loadConfig, configLoaded } = useGameStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      await loadConfig();
      const data = await authenticate();
      if (data?.user) {
        setGameState(data.user);
      }
      startEnergyRegen();
      setAppReady(true);
    } catch (err) {
      console.error('[App] Init failed:', err);
      setAppReady(true); // Still show UI in dev mode
    }
  }

  const handleSelectNation = async (code) => {
    await selectNation(code);
  };

  if ((isLoading || !configLoaded) && !appReady) {
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
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <NavBar />
    </div>
  );
}
