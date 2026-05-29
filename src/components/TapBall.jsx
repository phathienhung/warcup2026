import React, { useRef } from 'react';

export default function TapBall({ onTap }) {
  const ballRef = useRef(null);

  const handlePointerDown = (e) => {
    // Check if it's a valid pointer event
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    // Prevent default to stop duplicate touch events in some browsers
    e.preventDefault();
    
    if (onTap) {
      onTap([{
        clientX: e.clientX,
        clientY: e.clientY,
        timestamp: Date.now(),
      }]);
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
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }} // Crucial for preventing scroll/zoom on tap
      />
    </div>
  );
}
