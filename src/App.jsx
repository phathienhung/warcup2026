import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import useUserStore from './store/userStore';
import useGameStore from './store/gameStore';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import TasksPage from './pages/TasksPage';
import ShopPage from './pages/ShopPage';
import ProfilePage from './pages/ProfilePage';
import PredictionPage from './pages/PredictionPage';
import NFTGalleryPage from './pages/NFTGalleryPage';
import FriendsPage from './pages/FriendsPage';
import ClanPage from './pages/ClanPage';
import SpinPage from './pages/SpinPage';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-ball" />
      <div className="loading-text">Loading Arena...</div>
    </div>
  );
}

function ErrorScreen({ error, onRetry }) {
  return (
    <div className="loading-screen">
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <div className="loading-text" style={{ color: 'var(--energy-red)' }}>
        Connection Failed
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '0 32px' }}>
        {error || 'Unable to connect to the server. Please try again.'}
      </p>
      <button className="btn btn-primary" onClick={onRetry} style={{ marginTop: '16px' }}>
        Retry
      </button>
    </div>
  );
}

export default function App() {
  const { isLoading, isAuthenticated, error, authenticate } = useUserStore();
  const { setGameState, startEnergyRegen } = useGameStore();
  const [appReady, setAppReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
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

  if (isLoading && !appReady) {
    return <LoadingScreen />;
  }

  if (error && !isAuthenticated) {
    return <ErrorScreen error={error} onRetry={initApp} />;
  }

  return (
    <div className="app-layout">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="/nft" element={<NFTGalleryPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/clan" element={<ClanPage />} />
        <Route path="/spin" element={<SpinPage />} />
      </Routes>
      <NavBar />
    </div>
  );
}
