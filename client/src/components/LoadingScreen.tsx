import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  console.log('📱 LoadingScreen component rendering...');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing VR Systems...');

  useEffect(() => {
    const steps = [
      { duration: 800, text: 'Initializing VR Systems...' },
      { duration: 600, text: 'Loading Game Assets...' },
      { duration: 700, text: 'Preparing Combat Arena...' },
      { duration: 500, text: 'Calibrating Controllers...' },
      { duration: 400, text: 'Ready to Fight!' }
    ];

    let currentStep = 0;
    let currentProgress = 0;

    const updateProgress = () => {
      if (currentStep >= steps.length) {
        setTimeout(() => onComplete(), 200);
        return;
      }

      const step = steps[currentStep];
      const stepProgress = 100 / steps.length;
      const targetProgress = (currentStep + 1) * stepProgress;
      
      setStatus(step.text);
      
      const progressInterval = setInterval(() => {
        currentProgress += 2;
        setProgress(Math.min(currentProgress, targetProgress));
        
        if (currentProgress >= targetProgress) {
          clearInterval(progressInterval);
          currentStep++;
          setTimeout(updateProgress, 100);
        }
      }, step.duration / (stepProgress / 2));
    };

    const timer = setTimeout(updateProgress, 500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  console.log('📱 LoadingScreen rendering with progress:', progress, 'status:', status);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: 'black', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 9999 
    }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        {/* VR Sword Fighting Game Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>⚔️ VR SWORD FIGHTER ⚔️</h1>
          <p style={{ color: '#d1d5db', fontSize: '1.125rem' }}>Immersive Combat Experience</p>
        </div>
        
        {/* Loading Bar */}
        <div style={{ width: '24rem', height: '1rem', backgroundColor: '#374151', borderRadius: '9999px', marginBottom: '1rem' }}>
          <div 
            style={{ 
              width: `${progress}%`, 
              height: '1rem', 
              background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', 
              borderRadius: '9999px',
              transition: 'all 0.3s ease-out'
            }}
          />
        </div>
        
        {/* Status Text */}
        <p style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1.5rem' }}>{status}</p>
        <p style={{ color: '#9ca3af' }}>{Math.round(progress)}% Complete</p>
        
        {/* VR Instructions */}
        <div style={{ marginTop: '2rem', color: '#d1d5db', fontSize: '0.875rem', maxWidth: '28rem', margin: 'auto' }}>
          <p>🥽 Put on your VR headset</p>
          <p>🤏 Squeeze grips for swords</p>
          <p>🔫 Pull triggers for guns</p>
        </div>
      </div>
    </div>
  );
}