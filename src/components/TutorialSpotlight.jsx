import React, { useState, useEffect } from 'react';

export default function TutorialSpotlight({ onComplete }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Step 1: Choose a Winner",
      content: "Tap on a team to bet they will win the match. If you think it will be a tie, choose Draw.",
      targetSelector: ".grid-3.mb-lg",
      align: "bottom"
    },
    {
      title: "Step 2: Correct Score (Optional)",
      content: "Want to win MORE? Guess the exact score! If you only want to bet on the winner, you can skip this.",
      targetSelector: ".grid-3.mb-lg + h3 + div", // The score grid
      align: "bottom"
    },
    {
      title: "Step 3: Unselect Score",
      content: "If you selected a score but changed your mind, just tap it again to unselect it.",
      targetSelector: ".grid-3.mb-lg + h3 + div",
      align: "top"
    }
  ];

  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    // Find the target element and get its position
    const timer = setTimeout(() => {
      const el = document.querySelector(steps[step].targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        
        // Scroll element into view if needed
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Fallback if element not found
        setTargetRect({ top: window.innerHeight / 2 - 50, left: window.innerWidth / 2 - 50, width: 100, height: 100 });
      }
    }, 300); // Wait for render/scroll
    return () => clearTimeout(timer);
  }, [step]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  if (!targetRect) return null;

  const currentStep = steps[step];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'auto' }}>
      {/* Dark Overlay with cutout */}
      <div 
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
          clipPath: `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
            ${targetRect.left - 10}px ${targetRect.top - 10}px,
            ${targetRect.left + targetRect.width + 10}px ${targetRect.top - 10}px,
            ${targetRect.left + targetRect.width + 10}px ${targetRect.top + targetRect.height + 10}px,
            ${targetRect.left - 10}px ${targetRect.top + targetRect.height + 10}px,
            ${targetRect.left - 10}px ${targetRect.top - 10}px
          )`
        }}
        onClick={handleNext}
      />
      
      {/* Highlight Box Ring */}
      <div style={{
        position: 'absolute',
        top: targetRect.top - 10,
        left: targetRect.left - 10,
        width: targetRect.width + 20,
        height: targetRect.height + 20,
        border: '3px solid var(--neon-green)',
        borderRadius: '12px',
        boxShadow: '0 0 15px var(--glow-green)',
        pointerEvents: 'none'
      }} />

      {/* Tooltip */}
      <div style={{
        position: 'absolute',
        top: currentStep.align === 'bottom' ? targetRect.top + targetRect.height + 24 : targetRect.top - 160,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '350px',
        background: 'var(--bg-deep)',
        border: '1px solid var(--neon-green)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <h4 style={{ color: 'var(--neon-green)', marginBottom: '8px' }}>{currentStep.title}</h4>
        <p style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '16px', lineHeight: '1.4' }}>{currentStep.content}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {steps.map((_, i) => (
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === step ? 'var(--neon-green)' : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>
          <button 
            className="btn btn-primary btn-sm"
            onClick={handleNext}
          >
            {step === steps.length - 1 ? "GOT IT!" : "NEXT ➔"}
          </button>
        </div>
      </div>
    </div>
  );
}
