import React, { useEffect, useState } from 'react';

export default function CoinRain({ active, duration = 3000 }) {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    if (!active) return;

    const newCoins = Array.from({ length: 30 }).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100, // vw
      delay: Math.random() * 0.5,
      duration: 1 + Math.random(),
      size: 1 + Math.random() * 1.5,
      emoji: ['🪙', '💰', '⚽'][Math.floor(Math.random() * 3)],
    }));

    setCoins(newCoins);

    const timer = setTimeout(() => {
      setCoins([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [active, duration]);

  if (coins.length === 0) return null;

  return (
    <div className="coin-rain">
      {coins.map(coin => (
        <div
          key={coin.id}
          className="coin"
          style={{
            left: `${coin.x}vw`,
            animationDelay: `${coin.delay}s`,
            animationDuration: `${coin.duration}s`,
            fontSize: `${coin.size}rem`,
          }}
        >
          {coin.emoji}
        </div>
      ))}
    </div>
  );
}
