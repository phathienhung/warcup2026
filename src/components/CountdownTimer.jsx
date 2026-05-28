import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft('MATCH STARTED');
        setIsUrgent(false);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const formatted = [];
      if (days > 0) formatted.push(`${days}d`);
      formatted.push(`${hours}h`);
      formatted.push(`${minutes}m`);
      formatted.push(`${seconds}s`);

      setTimeLeft(formatted.join(' '));
      setIsUrgent(distance < 1000 * 60 * 60); // Less than 1 hour
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="match-countdown" style={isUrgent ? { color: 'var(--energy-red)', textShadow: 'var(--glow-red)' } : {}}>
      {timeLeft}
    </div>
  );
}
