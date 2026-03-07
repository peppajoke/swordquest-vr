/**
 * HeadlessMode.tsx — Bird's-eye observer + programmatic control layer.
 *
 * Mount inside Canvas when ?mode=headless is in the URL.
 * - Repositions camera to y=80 (bird's-eye) while the real game runs below.
 * - Updates window.__gameState every frame.
 * - Renders a fixed HTML overlay showing zone/health/enemy info.
 * - Wires window.__gameInput via initTestHarness().
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import { WALLS } from '../lib/levelCollision';
import { initTestHarness, updateHarnessRefs } from '../lib/gameTestHarness';

// ── Overlay DOM helpers ────────────────────────────────────────────────────────

function createOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'headless-overlay';
  Object.assign(el.style, {
    position:        'fixed',
    top:             '0',
    left:            '0',
    width:           '100vw',
    height:          '100vh',
    pointerEvents:   'none',
    zIndex:          '9999',
    fontFamily:      'monospace',
    fontSize:        '13px',
    color:           '#00ff99',
    textShadow:      '0 0 4px #000, 1px 1px 2px #000',
  });

  // Sub-panels
  ['tl', 'tr', 'bl', 'bc', 'events'].forEach((id) => {
    const panel = document.createElement('div');
    panel.id = `hm-${id}`;
    Object.assign(panel.style, {
      position:   'absolute',
      background: 'rgba(0,0,0,0.55)',
      padding:    '6px 10px',
      borderRadius: '4px',
      lineHeight: '1.5',
      whiteSpace: 'pre',
    });
    el.appendChild(panel);
  });

  // Top-left: zone info
  const tl = el.querySelector<HTMLDivElement>('#hm-tl')!;
  Object.assign(tl.style, { top: '10px', left: '10px' });

  // Top-right: player vitals
  const tr = el.querySelector<HTMLDivElement>('#hm-tr')!;
  Object.assign(tr.style, { top: '10px', right: '10px', textAlign: 'right' });

  // Bottom-left: position + nearest enemy
  const bl = el.querySelector<HTMLDivElement>('#hm-bl')!;
  Object.assign(bl.style, { bottom: '10px', left: '10px' });

  // Bottom-center: mode tag
  const bc = el.querySelector<HTMLDivElement>('#hm-bc')!;
  Object.assign(bc.style, {
    bottom: '10px', left: '50%', transform: 'translateX(-50%)',
    color: '#ffaa00', fontSize: '11px',
  });
  bc.textContent = '🔭 HEADLESS MODE — window.__gameInput / window.__gameState';

  // Right-side event log
  const ev = el.querySelector<HTMLDivElement>('#hm-events')!;
  Object.assign(ev.style, {
    top: '50%', right: '10px', transform: 'translateY(-50%)',
    color: '#aaffcc', fontSize: '11px', maxWidth: '280px',
  });

  document.body.appendChild(el);
  return el;
}

function bar(value: number, max: number, width = 12, fillChar = '█', emptyChar = '░'): string {
  const filled = Math.round((value / Math.max(1, max)) * width);
  return fillChar.repeat(filled) + emptyChar.repeat(width - filled);
}

// ── HeadlessMode component ─────────────────────────────────────────────────────

export default function HeadlessMode() {
  const { camera, scene } = useThree();
  const frameRef   = useRef(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const eventsRef  = useRef<string[]>([]);
  const harnessInitRef = useRef(false);

  // Initial camera setup — bird's-eye, high above scene center
  useEffect(() => {
    camera.position.set(0, 80, -40);
    camera.rotation.order = 'YXZ';
    camera.rotation.x = -Math.PI / 2; // look straight down
    camera.rotation.y = 0;
    camera.rotation.z = 0;
  }, [camera]);

  // Create DOM overlay once
  useEffect(() => {
    overlayRef.current = createOverlay();
    return () => {
      const el = document.getElementById('headless-overlay');
      if (el) el.remove();
    };
  }, []);

  // ── Per-frame logic (priority 100 = runs last, after DesktopControls) ─────
  useFrame(() => {
    frameRef.current++;
    const frame = frameRef.current;

    // Initialize test harness once scene is ready
    if (!harnessInitRef.current && scene && camera) {
      harnessInitRef.current = true;
      initTestHarness(scene, camera);
    }
    if (scene && camera) {
      updateHarnessRefs(scene, camera);
    }

    // Bird's-eye camera lock (override any other component moving camera)
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    camera.position.set(playerX, 80, playerZ);
    camera.rotation.order = 'YXZ';
    camera.rotation.x = -Math.PI / 2;
    camera.rotation.y = 0;
    camera.rotation.z = 0;

    const store = useVRGame.getState();

    // ── Collect enemies ──────────────────────────────────────────────────
    const enemies: Array<{
      id: string; type: string;
      position: { x: number; y: number; z: number };
      distanceFromPlayer: number; health: number; isDead: boolean;
    }> = [];
    const seenEnemyIds = new Set<string>();

    const camXZ = new THREE.Vector3(playerX, 0, playerZ);
    scene.traverse((obj) => {
      if (!obj.userData.isEnemy) return;
      // Only count root enemy objects — skip if parent is also an enemy
      if (obj.parent?.userData?.isEnemy) return;
      const id = (obj.userData.enemyId as string) ?? 'unknown';
      if (seenEnemyIds.has(id)) return;
      seenEnemyIds.add(id);
      const wp = new THREE.Vector3();
      obj.getWorldPosition(wp);
      const distVec = new THREE.Vector3(wp.x, 0, wp.z);
      enemies.push({
        id,
        type:               (obj.userData.enemyType as string) ?? 'grunt',
        position:           { x: wp.x, y: wp.y, z: wp.z },
        distanceFromPlayer: distVec.distanceTo(camXZ),
        health:             (obj.userData.health as number)    ?? 0,
        isDead:             !!(obj.userData.isDead),
      });
    });

    // ── Collect checkpoint beacons ────────────────────────────────────────
    const beacons: Array<{ label: string; distanceFromPlayer: number }> = [];
    scene.traverse((obj) => {
      if (
        obj.name?.toLowerCase().includes('beacon') ||
        obj.parent?.name?.toLowerCase().includes('beacon')
      ) {
        const wp = new THREE.Vector3();
        obj.getWorldPosition(wp);
        beacons.push({
          label: obj.name || obj.parent?.name || 'beacon',
          distanceFromPlayer: new THREE.Vector3(wp.x, 0, wp.z).distanceTo(camXZ),
        });
      }
    });

    const aliveEnemies = enemies.filter((e) => !e.isDead);
    const nearest      = aliveEnemies.slice().sort((a, b) => a.distanceFromPlayer - b.distanceFromPlayer)[0];

    // ── Build gameState snapshot ──────────────────────────────────────────
    const prevLastEvent = window.__gameState?.lastEvent;

    const snapshot = {
      player: {
        worldPosition: { x: playerX, y: 1.7, z: playerZ },
        health:           store.health,
        maxHealth:        store.maxHealth,
        fuel:             store.desktopFuel,
        ammo: {
          left:  store.desktopLeftClip,
          right: store.desktopRightClip,
        },
        zone:             store.currentZone,
        leftWeaponSlot:   store.weaponInventory.melee[store.activeMeleeSlot]  ?? null,
        rightWeaponSlot:  store.weaponInventory.ranged[store.activeRangedSlot] ?? null,
      },
      room: {
        zone:          store.currentZone,
        wave:          1,
        cleared:       store.roomCleared,
        enemiesAlive:  aliveEnemies.length,
        enemiesTotal:  enemies.length,
        checkpointBeacons: beacons,
      },
      enemies,
      walls:     WALLS,
      lastEvent: prevLastEvent,
      frame,
      timestamp: Date.now(),
    };

    window.__gameState = snapshot;

    // ── Update overlay (every 6 frames ≈ 10Hz to avoid DOM thrash) ─────────
    if (frame % 6 === 0 && overlayRef.current) {
      const p   = snapshot.player;
      const r   = snapshot.room;

      // Track events
      if (prevLastEvent && eventsRef.current[0] !== prevLastEvent) {
        eventsRef.current.unshift(prevLastEvent);
        if (eventsRef.current.length > 5) eventsRef.current.pop();
      }

      const tl = overlayRef.current.querySelector<HTMLDivElement>('#hm-tl');
      if (tl) {
        tl.textContent = [
          `Zone:  ${r.zone.toUpperCase()}`,
          `Wave:  ${r.wave}`,
          `Enemies: ${r.enemiesAlive}/${r.enemiesTotal} alive`,
          `Cleared: ${r.cleared ? '✅ YES' : '❌ NO'}`,
        ].join('\n');
      }

      const tr = overlayRef.current.querySelector<HTMLDivElement>('#hm-tr');
      if (tr) {
        const hpBar   = bar(p.health,   p.maxHealth);
        const fuelBar = bar(p.fuel,     100);
        tr.textContent = [
          `HP   [${hpBar}] ${p.health}/${p.maxHealth}`,
          `Fuel [${fuelBar}] ${Math.round(p.fuel)}`,
          `Ammo L:${p.ammo.left}  R:${p.ammo.right}`,
          `Melee:  ${p.leftWeaponSlot  ?? '—'}`,
          `Ranged: ${p.rightWeaponSlot ?? '—'}`,
        ].join('\n');
      }

      const bl = overlayRef.current.querySelector<HTMLDivElement>('#hm-bl');
      if (bl) {
        const px = p.worldPosition.x.toFixed(1);
        const pz = p.worldPosition.z.toFixed(1);
        const nearStr = nearest
          ? `${nearest.type}#${nearest.id.slice(-4)} — ${nearest.distanceFromPlayer.toFixed(1)}m`
          : 'none';
        bl.textContent = [
          `Pos: (${px}, ${pz})`,
          `Nearest: ${nearStr}`,
        ].join('\n');
      }

      const ev = overlayRef.current.querySelector<HTMLDivElement>('#hm-events');
      if (ev) {
        ev.textContent = eventsRef.current.length
          ? '── Events ──\n' + eventsRef.current.join('\n')
          : '── Events ──\n(none yet)';
      }
    }
  }, 100); // priority 100 = after all other useFrame hooks

  // Nothing to render in Three.js scene
  return null;
}
