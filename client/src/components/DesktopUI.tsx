import { useState, useEffect } from 'react';

interface DesktopUIProps {
  fuel: number;
  jetpackEnabled: boolean;
  currentSwordHand: 'left' | 'right';
  leftClip?: number;
  rightClip?: number;
  currentGun?: 'left' | 'right';
  isReloading?: boolean;
}

export default function DesktopUI({ fuel, jetpackEnabled, currentSwordHand, leftClip = 12, rightClip = 12, currentGun = 'left', isReloading = false }: DesktopUIProps) {
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement !== null);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '14px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 1000,
      pointerEvents: 'none'
    }}>
      <div>🎮 DESKTOP MODE</div>
      <div>WASD: Move | Mouse: Look | Space: Jump</div>
      <div>Left Click: Shoot | Right Click: Sword | R: Reload</div>
      <div>Shift: Toggle Jetpack</div>
      <div>🔫 Left: <span style={{color: leftClip > 4 ? 'white' : leftClip > 0 ? 'orange' : 'red'}}>{leftClip}/12</span> | Right: <span style={{color: rightClip > 4 ? 'white' : rightClip > 0 ? 'orange' : 'red'}}>{rightClip}/12</span> | Active: {currentGun.toUpperCase()}</div>
      {isReloading && <div style={{color: 'yellow'}}>🔄 Reloading...</div>}
      <div>🚀 Jetpack: {jetpackEnabled ? 'ON' : 'OFF'}</div>
      <div>⚡ Fuel: {fuel.toFixed(0)}/100</div>
      <div>⚔️ Next Sword: {currentSwordHand}</div>
      {!isPointerLocked && (
        <div style={{ color: 'yellow' }}>Click to capture mouse</div>
      )}
    </div>
  );
}