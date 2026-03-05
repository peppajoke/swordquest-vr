import { useState, useEffect } from 'react';
import { useVRGame } from '../lib/stores/useVRGame';

interface DesktopUIProps {
  leftClip?: number;
  rightClip?: number;
  currentGun?: 'left' | 'right';
  isReloading?: boolean;
}

export default function DesktopUI({
  leftClip = 12,
  rightClip = 12,
  currentGun = 'left',
  isReloading = false,
}: DesktopUIProps) {
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const { activeWeapon, isBoostActive } = useVRGame();

  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, []);

  return (
    <>
      {/* Crosshair */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 999,
          pointerEvents: 'none',
          color: 'white',
          fontSize: '20px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        }}
      >
        ⊕
      </div>

      {/* HUD Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '14px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '10px 14px',
          borderRadius: '5px',
          zIndex: 1000,
          pointerEvents: 'none',
          lineHeight: '1.6',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🎮 DESKTOP MODE</div>

        {/* Weapon indicator */}
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: activeWeapon === 'sword' ? '#88ddff' : '#ffcc44',
          marginBottom: '4px',
        }}>
          WEAPON: {activeWeapon === 'sword' ? '⚔️ SWORD' : '🔫 GUN'}
        </div>

        {/* Boost indicator */}
        <div style={{
          color: isBoostActive ? '#ff4444' : '#88ff88',
          marginBottom: '4px',
        }}>
          🚀 BOOST: {isBoostActive ? 'ACTIVE' : 'READY'}
        </div>

        {/* Ammo (only relevant in gun mode) */}
        {activeWeapon === 'gun' && (
          <>
            <div>
              🔫 L:{' '}
              <span style={{ color: leftClip > 4 ? 'white' : leftClip > 0 ? 'orange' : 'red' }}>
                {leftClip}/12
              </span>
              {' '}R:{' '}
              <span style={{ color: rightClip > 4 ? 'white' : rightClip > 0 ? 'orange' : 'red' }}>
                {rightClip}/12
              </span>
              {' '}[{currentGun.toUpperCase()}]
            </div>
            {isReloading && <div style={{ color: 'yellow' }}>🔄 Reloading...</div>}
          </>
        )}

        {/* Controls reference */}
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#aaaaaa' }}>
          WASD Move · Mouse Look · Space Jump
        </div>
        <div style={{ fontSize: '12px', color: '#aaaaaa' }}>
          Shift(hold) Boost · 1 Sword · 2 Gun · Scroll Switch
        </div>
        <div style={{ fontSize: '12px', color: '#aaaaaa' }}>
          {activeWeapon === 'sword' ? 'Right Click: Swing' : 'Left Click: Shoot'} · R Reload
        </div>

        {!isPointerLocked && (
          <div style={{ color: 'yellow', marginTop: '4px' }}>Click to capture mouse</div>
        )}
      </div>
    </>
  );
}
