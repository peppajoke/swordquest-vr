/**
 * MobileControls — industry-standard dual-zone layout
 *
 * LEFT ZONE  (left 45% of screen): floating joystick for movement
 *   - Spawns at touch point, moves with finger
 *   - X axis = strafe, Y axis = forward/back
 *
 * RIGHT ZONE (right 55% of screen): swipe-to-look
 *   - No joystick visual — direct delta maps to camera rotation
 *   - Matches PUBG Mobile / CoD Mobile feel
 *
 * FIRE button: fixed bottom-right
 *
 * Uses native addEventListener (passive:false) so preventDefault() works
 * and touch events are never stolen by the browser or canvas.
 */

import { useEffect, useRef } from 'react';
import { mobileInput } from '../lib/mobileInput';

// ── tunables ──────────────────────────────────────────────────────────────────
const MOVE_ZONE_WIDTH  = 0.45;   // left 45% = move zone
const MOVE_RADIUS      = 55;     // px — virtual joystick radius
const LOOK_SENSITIVITY = 0.0025; // radians per pixel of swipe

// ── state (module-level, no re-renders needed) ───────────────────────────────
type JoystickState = { ox: number; oy: number; dx: number; dy: number } | null;

export default function MobileControls() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Visual-only refs — we write these and trigger a single RAF loop to update DOM
  const moveStickRef  = useRef<JoystickState>(null);
  const lookActiveRef = useRef(false);

  // DOM refs for visuals (updated imperatively, no React re-renders)
  const moveRingRef  = useRef<HTMLDivElement>(null);
  const moveKnobRef  = useRef<HTMLDivElement>(null);
  const moveGhostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mobileInput.active = true;

    // Per-touch tracking
    const moveTouchId = { current: -1 };
    const lookTouchId = { current: -1 };
    const lookPrev    = { x: 0, y: 0 };

    // ── visual updater ─────────────────────────────────────────────────────
    function updateMoveVisual(stick: JoystickState) {
      const ring  = moveRingRef.current;
      const knob  = moveKnobRef.current;
      const ghost = moveGhostRef.current;
      if (!ring || !knob || !ghost) return;

      if (!stick) {
        ring.style.display  = 'none';
        knob.style.display  = 'none';
        ghost.style.display = 'block';
      } else {
        ghost.style.display = 'none';
        ring.style.display  = 'block';
        knob.style.display  = 'block';
        ring.style.left  = `${stick.ox - MOVE_RADIUS}px`;
        ring.style.top   = `${stick.oy - MOVE_RADIUS}px`;
        knob.style.left  = `${stick.ox - 26 + stick.dx}px`;
        knob.style.top   = `${stick.oy - 26 + stick.dy}px`;
      }
    }

    // ── touch handlers ──────────────────────────────────────────────────────
    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        const isMove = t.clientX < window.innerWidth * MOVE_ZONE_WIDTH;

        if (isMove && moveTouchId.current === -1) {
          moveTouchId.current = t.identifier;
          const stick = { ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 };
          moveStickRef.current = stick;
          mobileInput.moveX = 0;
          mobileInput.moveY = 0;
          updateMoveVisual(stick);

        } else if (!isMove && lookTouchId.current === -1) {
          lookTouchId.current  = t.identifier;
          lookPrev.x = t.clientX;
          lookPrev.y = t.clientY;
          lookActiveRef.current = true;
          mobileInput.lookX = 0;
          mobileInput.lookY = 0;
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        // ── Move joystick ──────────────────────────────────────────────────
        if (t.identifier === moveTouchId.current) {
          const stick = moveStickRef.current;
          if (!stick) continue;
          const rawDx = t.clientX - stick.ox;
          const rawDy = t.clientY - stick.oy;
          const dist  = Math.hypot(rawDx, rawDy);
          const clamp = dist > MOVE_RADIUS ? MOVE_RADIUS / dist : 1;
          const dx    = rawDx * clamp;
          const dy    = rawDy * clamp;

          const newStick = { ...stick, dx, dy };
          moveStickRef.current = newStick;

          mobileInput.moveX = Math.max(-1, Math.min(1, rawDx / MOVE_RADIUS));
          // moveY negative = forward (joystick up = finger above origin = rawDy<0)
          mobileInput.moveY = Math.max(-1, Math.min(1, rawDy / MOVE_RADIUS));

          updateMoveVisual(newStick);
        }

        // ── Look swipe ─────────────────────────────────────────────────────
        if (t.identifier === lookTouchId.current) {
          const dx = t.clientX - lookPrev.x;
          const dy = t.clientY - lookPrev.y;
          lookPrev.x = t.clientX;
          lookPrev.y = t.clientY;
          // Accumulate as per-frame deltas — DesktopControls resets them each frame
          mobileInput.lookDX += dx * LOOK_SENSITIVITY;
          mobileInput.lookDY += dy * LOOK_SENSITIVITY;
        }
      }
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === moveTouchId.current) {
          moveTouchId.current  = -1;
          moveStickRef.current = null;
          mobileInput.moveX   = 0;
          mobileInput.moveY   = 0;
          updateMoveVisual(null);
        }
        if (t.identifier === lookTouchId.current) {
          lookTouchId.current   = -1;
          lookActiveRef.current = false;
          mobileInput.lookDX   = 0;
          mobileInput.lookDY   = 0;
        }
      }
    }

    const opts = { passive: false } as const;
    document.addEventListener('touchstart',  onTouchStart, opts);
    document.addEventListener('touchmove',   onTouchMove,  opts);
    document.addEventListener('touchend',    onTouchEnd,   opts);
    document.addEventListener('touchcancel', onTouchEnd,   opts);

    return () => {
      mobileInput.active = false;
      mobileInput.moveX = mobileInput.moveY = 0;
      mobileInput.lookX = mobileInput.lookY = 0;
      mobileInput.lookDX = mobileInput.lookDY = 0;
      document.removeEventListener('touchstart',  onTouchStart);
      document.removeEventListener('touchmove',   onTouchMove);
      document.removeEventListener('touchend',    onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  // ── fire button handlers (React events fine for buttons) ────────────────
  const onFireStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    mobileInput.fire = true;
    mobileInput.fireJustPressed = true;
  };
  const onFireEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    mobileInput.fire = false;
  };

  // ── shared button style ──────────────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    position:  'absolute',
    width:  72, height: 72,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: 12, fontWeight: 700,
    userSelect: 'none', WebkitUserSelect: 'none',
    touchAction: 'none',
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 500, pointerEvents: 'none' }}
    >
      {/* ── Ghost indicator: where to put thumb for movement ── */}
      <div
        ref={moveGhostRef}
        style={{
          position: 'absolute',
          width: MOVE_RADIUS * 2, height: MOVE_RADIUS * 2,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
          bottom: 90, left: 36,
          pointerEvents: 'none',
        }}
      />
      {/* Inner dot for ghost */}
      <div style={{
        position: 'absolute',
        width: 20, height: 20,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.10)',
        bottom: 90 + MOVE_RADIUS - 10, left: 36 + MOVE_RADIUS - 10,
        pointerEvents: 'none',
      }} />

      {/* ── Live joystick ring (hidden when idle) ── */}
      <div
        ref={moveRingRef}
        style={{
          display: 'none',
          position: 'fixed',
          width: MOVE_RADIUS * 2, height: MOVE_RADIUS * 2,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.30)',
          background: 'rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }}
      />
      {/* ── Live joystick knob (hidden when idle) ── */}
      <div
        ref={moveKnobRef}
        style={{
          display: 'none',
          position: 'fixed',
          width: 52, height: 52,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.45)',
          border: '2px solid rgba(255,255,255,0.75)',
          pointerEvents: 'none',
        }}
      />

      {/* ── FIRE button ── */}
      <div
        style={{
          ...btnBase,
          bottom: 100, right: 36,
          background: 'rgba(220,50,0,0.50)',
          border: '2px solid rgba(255,120,0,0.80)',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'auto',
        }}
        onTouchStart={onFireStart}
        onTouchEnd={onFireEnd}
      >
        FIRE
      </div>

      {/* ── Swipe hint label for right zone (fades in on first load) ── */}
      <div style={{
        position: 'absolute',
        bottom: 90, right: 36,
        color: 'rgba(255,255,255,0.15)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 600,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        SWIPE TO LOOK
      </div>
    </div>
  );
}
