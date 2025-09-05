import { useState, useEffect } from 'react';

interface DesktopUIProps {
  fuel: number;
  jetpackEnabled: boolean;
  currentSwordHand: 'left' | 'right';
  ammo?: number;
  maxAmmo?: number;
}

export default function DesktopUI({ fuel, jetpackEnabled, currentSwordHand, ammo = 120, maxAmmo = 120 }: DesktopUIProps) {
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
      <div>🔫 Ammo: <span style={{color: ammo > 20 ? 'white' : ammo > 0 ? 'orange' : 'red'}}>{ammo}/{maxAmmo}</span></div>
      <div>🚀 Jetpack: {jetpackEnabled ? 'ON' : 'OFF'}</div>
      <div>⚡ Fuel: {fuel.toFixed(0)}/100</div>
      <div>⚔️ Next Sword: {currentSwordHand}</div>
      {!isPointerLocked && (
        <div style={{ color: 'yellow' }}>Click to capture mouse</div>
      )}
    </div>
  );
}