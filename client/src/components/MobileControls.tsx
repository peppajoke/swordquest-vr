import { useEffect, useRef } from 'react';
import { mobileInput } from '../lib/mobileInput';

/** Renders on-screen touch controls and writes to mobileInput singleton */
export default function MobileControls() {
  const moveOrigin = useRef<{ x: number; y: number } | null>(null);
  const moveTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const lookLast = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    mobileInput.active = true;
    return () => { mobileInput.active = false; };
  }, []);

  // ── Movement joystick (left half of screen) ──────────────────────────
  const handleMoveStart = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < window.innerWidth / 2 && moveTouchId.current === null) {
        moveTouchId.current = t.identifier;
        moveOrigin.current = { x: t.clientX, y: t.clientY };
      }
    }
  };
  const handleMoveMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === moveTouchId.current && moveOrigin.current) {
        const dx = (t.clientX - moveOrigin.current.x) / 60;
        const dy = (t.clientY - moveOrigin.current.y) / 60;
        mobileInput.moveX = Math.max(-1, Math.min(1, dx));
        mobileInput.moveY = Math.max(-1, Math.min(1, dy));
      }
    }
  };
  const handleMoveEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === moveTouchId.current) {
        moveTouchId.current = null;
        moveOrigin.current = null;
        mobileInput.moveX = 0;
        mobileInput.moveY = 0;
      }
    }
  };

  // ── Look area (right half of screen) ─────────────────────────────────
  const handleLookStart = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX >= window.innerWidth / 2 && lookTouchId.current === null) {
        lookTouchId.current = t.identifier;
        lookLast.current = { x: t.clientX, y: t.clientY };
      }
    }
  };
  const handleLookMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lookTouchId.current && lookLast.current) {
        mobileInput.lookDX += (t.clientX - lookLast.current.x) * 0.004;
        mobileInput.lookDY += (t.clientY - lookLast.current.y) * 0.004;
        lookLast.current = { x: t.clientX, y: t.clientY };
      }
    }
  };
  const handleLookEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lookTouchId.current) {
        lookTouchId.current = null;
        lookLast.current = null;
      }
    }
  };

  const btn = (label: string, style: React.CSSProperties, onPress: () => void, onRelease?: () => void) => (
    <div
      style={{
        position: 'absolute',
        width: 64, height: 64,
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.5)',
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 11, fontWeight: 700, userSelect: 'none',
        backdropFilter: 'blur(4px)',
        ...style,
      }}
      onTouchStart={(e) => { e.stopPropagation(); onPress(); }}
      onTouchEnd={(e) => { e.stopPropagation(); if (onRelease) onRelease(); }}
    >
      {label}
    </div>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, pointerEvents: 'none' }}
      onTouchStart={(e) => { handleMoveStart(e); handleLookStart(e); }}
      onTouchMove={(e) => { handleMoveMove(e); handleLookMove(e); }}
      onTouchEnd={(e) => { handleMoveEnd(e); handleLookEnd(e); }}
      onTouchCancel={(e) => { handleMoveEnd(e); handleLookEnd(e); }}
    >
      {/* Joystick zone indicator */}
      <div style={{
        position: 'absolute', bottom: 100, left: 40,
        width: 110, height: 110, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.18)',
        background: 'rgba(0,0,0,0.15)',
        pointerEvents: 'auto',
      }} />

      {/* Look area (right half, invisible but interactive) */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '50%', height: '100%',
        pointerEvents: 'auto',
      }} />

      {/* Fire button */}
      {btn('FIRE', { bottom: 120, right: 40, pointerEvents: 'auto', background: 'rgba(255,60,0,0.4)', border: '2px solid rgba(255,100,0,0.7)' },
        () => { mobileInput.fire = true; mobileInput.fireJustPressed = true; },
        () => { mobileInput.fire = false; }
      )}

      {/* Jump / Boost button */}
      {btn('JUMP', { bottom: 120, right: 120, pointerEvents: 'auto' },
        () => { mobileInput.jumpJustPressed = true; mobileInput.boost = true; },
        () => { mobileInput.boost = false; }
      )}
    </div>
  );
}
