import { useState, useEffect, useRef } from 'react';
import { useVRGame } from '../lib/stores/useVRGame';

function ReticlePulse() {
  const hitSignal = useVRGame(s => s.hitSignal);
  const [scale, setScale] = useState(1);
  const [color, setColor] = useState('white');
  const prevSignal = useRef(0);

  useEffect(() => {
    if (hitSignal === prevSignal.current) return;
    prevSignal.current = hitSignal;
    setScale(1.9);
    setColor('#ff4400');
    const t = setTimeout(() => { setScale(1); setColor('white'); }, 120);
    return () => clearTimeout(t);
  }, [hitSignal]);

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: `translate(-50%, -50%) scale(${scale})`,
      transition: 'transform 0.08s ease-out, color 0.12s ease-out',
      zIndex: 999, pointerEvents: 'none',
      color, fontSize: '20px',
      textShadow: `0 0 8px ${color === 'white' ? 'rgba(0,0,0,0.8)' : color}`,
    }}>
      ⊕
    </div>
  );
}

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
  const [comboPulse, setComboPulse] = useState(false);
  const [showRoomCleared, setShowRoomCleared] = useState(false);
  const [waveFlash, setWaveFlash] = useState<string | null>(null);
  const roomClearedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { activeWeapon, isBoostActive, desktopLeftClip, desktopRightClip, desktopCurrentGun, desktopIsReloading, desktopFuel, killCount, comboCount, playerStats, activeMeleeWeapon, activeRangedWeapon, weaponInventory, activeMeleeSlot, activeRangedSlot, roomCleared, health, maxHealth } = useVRGame();
  const isLowHealth = health < maxHealth * 0.25;

  // Always use store values — DesktopControls keeps them live via setDesktopAmmo
  const leftClipDisplay = desktopLeftClip;
  const rightClipDisplay = desktopRightClip;
  const currentGunDisplay = desktopCurrentGun;
  const isReloadingDisplay = desktopIsReloading;

  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, []);

  // Pulse effect for high combos
  useEffect(() => {
    if (comboCount > 3) {
      setComboPulse(true);
      const t = setTimeout(() => setComboPulse(false), 300);
      return () => clearTimeout(t);
    }
  }, [comboCount]);

  // Room cleared flash
  useEffect(() => {
    if (roomCleared) {
      setShowRoomCleared(true);
      if (roomClearedTimer.current) clearTimeout(roomClearedTimer.current);
      roomClearedTimer.current = setTimeout(() => setShowRoomCleared(false), 3000);
    }
  }, [roomCleared]);

  // Wave advance flash (fired via CustomEvent from GameObjects)
  useEffect(() => {
    const handler = (e: Event) => {
      const wave = (e as CustomEvent).detail?.wave;
      if (wave) {
        setWaveFlash(`WAVE ${wave}`);
        if (waveFlashTimer.current) clearTimeout(waveFlashTimer.current);
        waveFlashTimer.current = setTimeout(() => setWaveFlash(null), 3000);
      }
    };
    window.addEventListener('waveAdvance', handler);
    return () => window.removeEventListener('waveAdvance', handler);
  }, []);

  return (
    <>
      {/* Low health vignette */}
      {isLowHealth && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 500,
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(220,20,20,0.45) 100%)',
            animation: 'lowHealthPulse 1.2s ease-in-out infinite',
          }}
        />
      )}
      <style>{`
        @keyframes lowHealthPulse {
          0%   { opacity: 0.3; }
          50%  { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
      `}</style>

      {/* ROOM CLEARED overlay */}
      {showRoomCleared && (
        <div
          style={{
            position: 'fixed',
            top: '38%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2000,
            pointerEvents: 'none',
            color: '#00ff88',
            fontSize: '72px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textShadow: '0 0 30px #00ff88, 0 0 60px #00cc66, 3px 3px 8px rgba(0,0,0,0.9)',
            letterSpacing: '6px',
            animation: 'none',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          ROOM CLEARED
        </div>
      )}

      {/* WAVE flash overlay */}
      {waveFlash && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2000,
            pointerEvents: 'none',
            color: '#ffcc00',
            fontSize: '60px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textShadow: '0 0 25px #ffcc00, 0 0 50px #ff8800, 3px 3px 8px rgba(0,0,0,0.9)',
            letterSpacing: '8px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          ⚡ {waveFlash} ⚡
        </div>
      )}

      {/* Crosshair with hit pulse */}
      <ReticlePulse />

      {/* Kill Counter + Stats Panel (top-left) */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '13px',
          backgroundColor: 'rgba(0,0,0,0.65)',
          padding: '8px 12px',
          borderRadius: '5px',
          zIndex: 1000,
          pointerEvents: 'none',
          lineHeight: '1.7',
          minWidth: '140px',
        }}
      >
        {/* Kills */}
        <div style={{ color: '#cccccc' }}>
          ☠️ Kills: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{killCount}</span>
        </div>

        {/* Combo — only show if active */}
        {comboCount > 1 && (
          <div style={{
            color: comboCount > 3 ? (comboPulse ? '#ffff00' : '#ffcc00') : '#ffdd88',
            fontWeight: comboCount > 3 ? 'bold' : 'normal',
            textShadow: comboCount > 3 ? '0 0 8px #ffcc00' : 'none',
            transition: 'all 0.15s ease',
          }}>
            ⚡ Combo: x{comboCount}{comboCount > 3 ? ' 🔥' : ''}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', margin: '4px 0' }} />

        {/* Player Stats */}
        <div style={{ color: '#aaaaaa', fontSize: '12px' }}>
          STR <span style={{ color: '#ff8866' }}>{playerStats.str}</span>
          {' │ '}
          AGI <span style={{ color: '#88ff88' }}>{playerStats.agi}</span>
          {' │ '}
          VIT <span style={{ color: '#6699ff' }}>{playerStats.vit}</span>
        </div>

        {/* Active weapon name */}
        <div style={{ color: '#88ccff', fontSize: '12px' }}>
          {activeWeapon === 'sword'
            ? `⚔️ ${activeMeleeWeapon}`
            : `🔫 ${activeRangedWeapon}`}
        </div>
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


        {/* Health bar */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{
            fontSize: '13px',
            color: isLowHealth ? (Math.floor(Date.now() / 300) % 2 === 0 ? '#ff2222' : '#ff8888') : '#ff6666',
            fontWeight: isLowHealth ? 'bold' : 'normal',
            marginBottom: '2px',
            transition: 'color 0.15s',
          }}>
            ❤️ HP: {health}/{maxHealth}
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(health / maxHealth) * 100}%`,
              height: '100%',
              backgroundColor: isLowHealth ? '#dd1111' : health < maxHealth * 0.5 ? '#ff8800' : '#22cc55',
              borderRadius: '3px',
              transition: 'width 0.2s, background-color 0.3s',
            }} />
          </div>
        </div>

        {/* 4-slot weapon bar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          {[
            { key: '1', type: 'melee' as const, slot: 0, icon: '⚔️' },
            { key: '2', type: 'melee' as const, slot: 1, icon: '⚔️' },
            { key: '3', type: 'ranged' as const, slot: 0, icon: '🔫' },
            { key: '4', type: 'ranged' as const, slot: 1, icon: '🔫' },
          ].map(({ key, type, slot, icon }) => {
            const weaponId = type === 'melee' ? weaponInventory.melee[slot] : weaponInventory.ranged[slot];
            const isActive = type === 'melee'
              ? activeWeapon === 'sword' && activeMeleeSlot === slot
              : activeWeapon === 'gun' && activeRangedSlot === slot;
            return (
              <div key={key} style={{
                border: `1px solid ${isActive ? (type === 'melee' ? '#88ddff' : '#ffcc44') : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '4px',
                padding: '3px 6px',
                minWidth: '54px',
                backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.3)',
                opacity: weaponId ? 1 : 0.35,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '1px' }}>[{key}]</div>
                <div style={{ fontSize: '12px', color: isActive ? (type === 'melee' ? '#88ddff' : '#ffcc44') : '#ccc' }}>
                  {weaponId ? `${icon} ${weaponId.slice(0,6)}` : '—'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Boost indicator */}
        <div style={{
          color: isBoostActive ? '#ff4444' : '#88ff88',
          marginBottom: '4px',
        }}>
          🚀 FUEL: <span style={{ color: desktopFuel > 20 ? '#00ff88' : '#ff4444' }}>{desktopFuel}%</span>{isBoostActive ? ' ▲' : ''}
        </div>

        {/* Ammo (only relevant in gun mode) */}
        {activeWeapon === 'gun' && (
          <>
            <div>
              🔫 L:{' '}
              <span style={{ color: leftClipDisplay > 4 ? 'white' : leftClipDisplay > 0 ? 'orange' : 'red' }}>
                {leftClipDisplay}/12
              </span>
              {' '}R:{' '}
              <span style={{ color: rightClipDisplay > 4 ? 'white' : rightClipDisplay > 0 ? 'orange' : 'red' }}>
                {rightClipDisplay}/12
              </span>
              {' '}[{currentGunDisplay.toUpperCase()}]
            </div>
            {isReloadingDisplay && <div style={{ color: 'yellow' }}>🔄 Reloading...</div>}
          </>
        )}

        {/* Controls reference */}
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#aaaaaa' }}>
          WASD Move · Mouse Look · Space Jump
        </div>
        <div style={{ fontSize: '12px', color: '#aaaaaa' }}>
          Shift(hold) Boost · 1-4 Weapon Slots · Scroll Switch
        </div>
        <div style={{ fontSize: '12px', color: '#aaaaaa' }}>
          Left Click: {activeWeapon === 'sword' ? 'Swing' : 'Shoot'} · R Reload
        </div>

        {!isPointerLocked && (
          <div style={{ color: 'yellow', marginTop: '4px' }}>Click to capture mouse</div>
        )}
      </div>
    </>
  );
}
