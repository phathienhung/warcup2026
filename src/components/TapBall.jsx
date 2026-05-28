import React, { useRef } from 'react';

export default function TapBall({ onTap }) {
  const ballRef = useRef(null);

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touchPoints = [];
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      touchPoints.push({
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      });
    }
    if (onTap) {
      onTap(touchPoints);
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const touchPoints = [{
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
    }];
    if (onTap) {
      onTap(touchPoints);
    }
  };

  return (
    <div className="tap-ball-container">
      <div className="tap-ball-ring" />
      <div className="tap-ball-ring" />
      <div className="tap-ball-ring" />
      <div
        ref={ballRef}
        className="tap-ball"
        onTouchStart={handleTouchStart}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
