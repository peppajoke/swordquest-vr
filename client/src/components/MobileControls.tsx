import { useEffect, useRef, useState } from 'react';
import { mobileInput } from '../lib/mobileInput';

const MOVE_RADIUS = 60;
const LOOK_RADIUS = 60;
const KNOB_SIZE = 50;

interface StickState {
  ox: number; // origin x (px from left edge of viewport)
  oy: number; // origin y (px from top edge)
  dx: number; // knob offset x (clamped to radius)
  dy: number; // knob offset y (clamped to radius)
}

/** Renders dual floating joysticks + action buttons. Writes to mobileInput singleton. */
export default function MobileControls() {
  // ── Left joystick (movement) ────────────────────────────────────────
  const moveTouchId = useRef<number | null>(null);
  const moveOrigin  = useRef<{ x: number; y: number } | null>(null);
  const [moveStick, setMoveStick] = useState<StickState | null>(null);

  // ── Right joystick (look/aim) ───────────────────────────────────────
  const lookTouchId = useRef<number | null>(null);
  const lookOrigin  = useRef<{ x: number; y: number } | null>(null);
  const [lookStick, setLookStick] = useState<StickState | null>(null);

  useEffect(() => {
    mobileInput.active = true;
    return () => {
      mobileInput.active = false;
      mobileInput.moveX = 0;
      mobileInput.moveY = 0;
      mobileInput.lookX = 0;
      mobileInput.lookY = 0;
    };
  }, []);

  // ── Touch event routing ─────────────────────────────────────────────
  // Left half → move joystick, right half → look joystick
  const handleTouchStart = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      const isLeft = t.clientX < window.innerWidth / 2;
      if (isLeft && moveTouchId.current === null) {
        moveTouchId.current = t.identifier;
        moveOrigin.current = { x: t.clientX, y: t.clientY };
        setMoveStick({ ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 });
      } else if (!isLeft && lookTouchId.current === null) {
        lookTouchId.current = t.identifier;
        lookOrigin.current = { x: t.clientX, y: t.clientY };
        setLookStick({ ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 });
        mobileInput.lookX = 0;
        mobileInput.lookY = 0;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      // Move joystick
      if (t.identifier === moveTouchId.current && moveOrigin.current) {
        const rawDx = t.clientX - moveOrigin.current.x;
        const rawDy = t.clientY - moveOrigin.current.y;
        const dist  = Math.hypot(rawDx, rawDy);
        const scale = dist > MOVE_RADIUS ? MOVE_RADIUS / dist : 1;
        mobileInput.moveX = Math.max(-1, Math.min(1, rawDx / MOVE_RADIUS));
        mobileInput.moveY = Math.max(-1, Math.min(1, rawDy / MOVE_RADIUS));
        setMoveStick(prev => prev
          ? { ...prev, dx: rawDx * scale, dy: rawDy * scale }
          : null
        );
      }
      // Look joystick
      if (t.identifier === lookTouchId.current && lookOrigin.current) {
        const rawDx = t.clientX - lookOrigin.current.x;
        const rawDy = t.clientY - lookOrigin.current.y;
        const dist  = Math.hypot(rawDx, rawDy);
        const scale = dist > LOOK_RADIUS ? LOOK_RADIUS / dist : 1;
        mobileInput.lookX = Math.max(-1, Math.min(1, rawDx / LOOK_RADIUS));
        mobileInput.lookY = Math.max(-1, Math.min(1, rawDy / LOOK_RADIUS));
        setLookStick(prev => prev
          ? { ...prev, dx: rawDx * scale, dy: rawDy * scale }
          : null
        );
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === moveTouchId.current) {
        moveTouchId.current = null;
        moveOrigin.current  = null;
        mobileInput.moveX   = 0;
        mobileInput.moveY   = 0;
        setMoveStick(null);
      }
      if (t.identifier === lookTouchId.current) {
        lookTouchId.current = null;
        lookOrigin.current  = null;
        mobileInput.lookX   = 0;
        mobileInput.lookY   = 0;
        setLookStick(null);
      }
    }
  };

  // ── Button helper ───────────────────────────────────────────────────
  const btn = (
    label: string,
    style: React.CSSProperties,
    onPress: () => void,
    onRelease?: () => void,
  ) => (
    <div
      key={label}
      style={{
        position: 'absolute',
        width: 64, height: 64,
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.5)',
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 11, fontWeight: 700,
        userSelect: 'none', WebkitUserSelect: 'none',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'auto',
        touchAction: 'none',
        ...style,
      }}
      onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); onPress(); }}
      onTouchEnd={(e)   => { e.stopPropagation(); e.preventDefault(); if (onRelease) onRelease(); }}
    >
      {label}
    </div>
  );

  // ── Joystick renderer ───────────────────────────────────────────────
  const renderStick = (stick: StickState | null, radius: number, hint?: { bottom: number; left?: number; right?: number }) => {
    // While idle, show a faint ghost indicator
    if (!stick) {
      if (!hint) return null;
      const hintStyle: React.CSSProperties = {
        position: 'absolute',
        width: radius * 2, height: radius * 2,
        borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.04)',
        pointerEvents: 'none',
        bottom: hint.bottom - radius,
        ...(hint.left  !== undefined ? { left:  hint.left  - radius } : {}),
        ...(hint.right !== undefined ? { right: hint.right - radius } : {}),
      };
      return <div style={hintStyle} />;
    }
    const halfKnob = KNOB_SIZE / 2;
    return (
      <>
        {/* Outer ring */}
        <div style={{
          position: 'fixed',
          left: stick.ox - radius,
          top:  stick.oy - radius,
          width: radius * 2, height: radius * 2,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.25)',
          background: 'rgba(0,0,0,0.20)',
          pointerEvents: 'none',
        }} />
        {/* Inner knob */}
        <div style={{
          position: 'fixed',
          left: stick.ox - halfKnob + stick.dx,
          top:  stick.oy - halfKnob + stick.dy,
          width: KNOB_SIZE, height: KNOB_SIZE,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.40)',
          border: '2px solid rgba(255,255,255,0.70)',
          pointerEvents: 'none',
        }} />
      </>
    );
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, pointerEvents: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* ── Left half: movement touch zone ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '50%', height: '100%',
        pointerEvents: 'auto',
        touchAction: 'none',
      }} />

      {/* ── Right half: look touch zone ── */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '50%', height: '100%',
        pointerEvents: 'auto',
        touchAction: 'none',
      }} />

      {/* ── Move joystick visuals ── */}
      {renderStick(moveStick, MOVE_RADIUS, { bottom: 100, left: 100 })}

      {/* ── Look joystick visuals ── */}
      {renderStick(lookStick, LOOK_RADIUS, { bottom: 100, right: 100 })}

      {/* ── Action buttons (above right joystick zone, right side) ── */}
      {btn(
        'FIRE',
        {
          bottom: 220, right: 30,
          background: 'rgba(255,60,0,0.45)',
          border: '2px solid rgba(255,100,0,0.75)',
        },
        () => { mobileInput.fire = true; mobileInput.fireJustPressed = true; },
        () => { mobileInput.fire = false; },
      )}
      {btn(
        'JUMP',
        { bottom: 220, right: 110 },
        () => { mobileInput.jumpJustPressed = true; mobileInput.boost = true; },
        () => { mobileInput.boost = false; },
      )}
    </div>
  );
}
