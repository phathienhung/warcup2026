import React, { useEffect, useRef } from 'react';

export default function ParticleEngine({ particles }) {
  const canvasRef = useRef(null);
  const activeParticles = useRef([]);

  useEffect(() => {
    // Add new particles
    if (particles && particles.length > 0) {
      const newParticles = particles.map((p) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 2 + Math.random() * 5;
        const colors = ['#00ff88', '#00d4ff', '#ffd700'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return {
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 1.0,
          color,
          size: 2 + Math.random() * 4,
        };
      });
      activeParticles.current.push(...newParticles);
    }
  }, [particles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = activeParticles.current.length - 1; i >= 0; i--) {
        const p = activeParticles.current[i];
        
        // Update
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life -= 0.03; // fade out
        
        if (p.life <= 0) {
          activeParticles.current.splice(i, 1);
          continue;
        }
        
        // Draw
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      }
      
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}
