import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
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

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        {/* VR Sword Fighting Game Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">⚔️ VR SWORD FIGHTER ⚔️</h1>
          <p className="text-gray-300 text-lg">Immersive Combat Experience</p>
        </div>
        
        {/* Loading Bar */}
        <div className="w-96 bg-gray-700 rounded-full h-4 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Status Text */}
        <p className="text-white text-xl mb-6">{status}</p>
        <p className="text-gray-400">{Math.round(progress)}% Complete</p>
        
        {/* VR Instructions */}
        <div className="mt-8 text-gray-300 text-sm max-w-md mx-auto">
          <p>🥽 Put on your VR headset</p>
          <p>🤏 Squeeze grips for swords</p>
          <p>🔫 Pull triggers for guns</p>
        </div>
      </div>
    </div>
  );
}