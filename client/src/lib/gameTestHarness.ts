/**
 * gameTestHarness.ts — Headless/programmatic test harness for SwordQuestVR.
 *
 * Exposes:
 *   window.__gameState  — full game snapshot, updated every frame by HeadlessMode
 *   window.__gameInput  — function(command, params) to inject inputs from browser console
 *
 * Initialize by calling initTestHarness() from HeadlessMode with live scene/camera refs.
 * Only intended for use in headless/dev contexts — safe to import anywhere.
 */
import * as THREE from 'three';
import { useVRGame } from './stores/useVRGame';

declare global {
  interface Window {
    __gameState: GameStateSnapshot;
    __gameInput: (command: string, params?: Record<string, unknown>) => unknown;
    __gameInputInitialized?: boolean;
  }
}

export interface GameStateSnapshot {
  player: {
    worldPosition: { x: number; y: number; z: number };
    health: number;
    maxHealth: number;
    fuel: number;
    ammo: { left: number; right: number };
    zone: string;
    leftWeaponSlot: string | null;
    rightWeaponSlot: string | null;
  };
  room: {
    zone: string;
    wave: number;
    cleared: boolean;
    enemiesAlive: number;
    enemiesTotal: number;
    checkpointBeacons: Array<{ label: string; distanceFromPlayer: number }>;
  };
  enemies: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    distanceFromPlayer: number;
    health: number;
    isDead: boolean;
  }>;
  walls: [number, number, number, number][];
  lastEvent?: string;
  frame: number;
  timestamp: number;
}

/** Refs that HeadlessMode keeps up to date each frame */
const live = {
  scene: null as THREE.Scene | null,
  camera: null as THREE.Camera | null,
  /** Virtual player position (XZ only — Y is managed by HeadlessMode for bird's eye) */
  playerPos: new THREE.Vector3(0, 1.7, -1),
  /** Virtual facing direction (radians, Y-up yaw) */
  yaw: 0,
};

/** Called once by HeadlessMode to wire live refs into the harness */
export function initTestHarness(
  sceneRef: THREE.Scene,
  cameraRef: THREE.Camera,
  initialPlayerPos?: THREE.Vector3,
) {
  live.scene = sceneRef;
  live.camera = cameraRef;
  // Seed playerPos from camera's actual XZ so move commands start from the right origin
  if (initialPlayerPos) {
    live.playerPos.copy(initialPlayerPos);
  } else {
    live.playerPos.set(cameraRef.position.x, 1.7, cameraRef.position.z);
  }

  if (window.__gameInputInitialized) return;
  window.__gameInputInitialized = true;

  window.__gameInput = (command: string, params: Record<string, unknown> = {}) => {
    const scene = live.scene;
    const camera = live.camera;
    const store = useVRGame.getState();

    switch (command) {
      // ── move ───────────────────────────────────────────────────────────
      case 'move': {
        const direction = (params.direction as string) ?? 'forward';
        const durationMs = (params.durationMs as number) ?? 500;
        if (!scene) return { error: 'scene not ready' };

        const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group | undefined;
        const speed = 0.08; // units per frame at 60fps
        const totalFrames = Math.max(1, Math.round((durationMs / 1000) * 60));
        let frame = 0;

        const tick = () => {
          if (frame >= totalFrames) return;
          frame++;

          const forward = new THREE.Vector3(-Math.sin(live.yaw), 0, -Math.cos(live.yaw));
          const right   = new THREE.Vector3( Math.cos(live.yaw), 0, -Math.sin(live.yaw));

          const delta = new THREE.Vector3();
          if      (direction === 'forward') delta.copy(forward).multiplyScalar(speed);
          else if (direction === 'back')    delta.copy(forward).multiplyScalar(-speed);
          else if (direction === 'left')    delta.copy(right).multiplyScalar(-speed);
          else if (direction === 'right')   delta.copy(right).multiplyScalar(speed);

          if (worldGroup) {
            worldGroup.position.sub(delta); // inverse: moving world = moving player forward
          }
          live.playerPos.x -= delta.x;
          live.playerPos.z -= delta.z;

          // Sync bird's-eye camera to follow player XZ (HeadlessMode locks Y=80)
          if (camera) {
            camera.position.x = live.playerPos.x;
            camera.position.z = live.playerPos.z;
          }

          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
        return { moving: direction, durationMs, frames: totalFrames };
      }

      // ── look ───────────────────────────────────────────────────────────
      case 'look': {
        const yawDelta = (params.yawDelta as number) ?? 0;
        live.yaw += THREE.MathUtils.degToRad(yawDelta);
        // In bird's-eye mode camera stays fixed pointing down; yaw only affects move direction
        if (camera) {
          camera.rotation.order = 'YXZ';
          camera.rotation.y = live.yaw;
        }
        return { newYawDeg: THREE.MathUtils.radToDeg(live.yaw) };
      }

      // ── teleport ───────────────────────────────────────────────────────
      case 'teleport': {
        const x = (params.x as number) ?? 0;
        const y = (params.y as number) ?? 1.7;
        const z = (params.z as number) ?? 0;
        live.playerPos.set(x, y, z);
        // Move worldGroup so player appears at target coords
        const worldGroup = scene?.getObjectByName('worldGroup') as THREE.Group | undefined;
        if (worldGroup) {
          worldGroup.position.x = -x;
          worldGroup.position.z = -z;
        }
        // Move camera XZ to match (Y stays at 80 for bird's-eye, set by HeadlessMode each frame)
        if (camera) {
          camera.position.x = x;
          camera.position.z = z;
        }
        return { teleported: { x, y, z } };
      }

      // ── setHealth ──────────────────────────────────────────────────────
      case 'setHealth': {
        const value = (params.value as number) ?? 100;
        const current = store.health;
        if (value <= 0) {
          // Route through takeDamage so death handler fires
          store.takeDamage(current + 1);
          return { health: 0, triggered: 'takeDamage' };
        }
        if (value < current) {
          store.takeDamage(current - value);
          return { health: value, triggered: 'takeDamage' };
        }
        store.setHealth(value);
        return { health: value, triggered: 'setHealth' };
      }

      // ── resetRoom ──────────────────────────────────────────────────────
      case 'resetRoom': {
        window.location.reload();
        return { reset: true };
      }

      // ── shoot ──────────────────────────────────────────────────────────
      case 'shoot': {
        if (!scene || !camera) return { error: 'scene/camera not ready' };

        const targetId = params.targetId as string | undefined;

        // Collect living enemies
        const candidates: THREE.Object3D[] = [];
        scene.traverse((obj) => {
          if (!obj.userData.isEnemy || obj.userData.isDead) return;
          if (obj.parent?.userData?.isEnemy) return; // skip child meshes
          if (targetId && obj.userData.enemyId !== targetId) return;
          candidates.push(obj);
        });

        if (candidates.length === 0) {
          return { error: targetId ? `enemy ${targetId} not found or dead` : 'no alive enemies' };
        }

        // Use live.playerPos (XZ at ground level) not camera.position (Y=80 in headless)
        const playerGroundPos = new THREE.Vector3(live.playerPos.x, 0, live.playerPos.z);

        // Pick nearest (or specific) target using XZ distance
        const target = candidates.reduce((best, e) => {
          const ep = new THREE.Vector3();
          const bp = new THREE.Vector3();
          e.getWorldPosition(ep); ep.y = 0;
          best.getWorldPosition(bp); bp.y = 0;
          return ep.distanceTo(playerGroundPos) < bp.distanceTo(playerGroundPos) ? e : best;
        });

        const enemyPos = new THREE.Vector3();
        target.getWorldPosition(enemyPos); enemyPos.y = 0;
        const distance   = playerGroundPos.distanceTo(enemyPos);
        const hitChance  = Math.max(0.05, 1 - distance / 20);
        const hit        = Math.random() < hitChance;
        const weaponDmg  = 25;
        const resultId   = (target.userData.enemyId as string) ?? 'unknown';

        if (hit) {
          if (typeof target.userData.takeDamage === 'function') {
            target.userData.takeDamage(weaponDmg);
          } else {
            target.userData.pendingDamage = (target.userData.pendingDamage ?? 0) + weaponDmg;
          }
        }

        const eventStr = hit
          ? `HIT ${resultId} for ${weaponDmg}dmg (${distance.toFixed(1)}m, ${Math.round(hitChance * 100)}%)`
          : `MISS ${resultId} (${distance.toFixed(1)}m, ${Math.round(hitChance * 100)}% chance)`;

        if (window.__gameState) window.__gameState.lastEvent = eventStr;
        console.log(`[HeadlessMode] shoot → ${eventStr}`);

        return { hit, distance, hitChance, targetId: resultId };
      }

      default:
        return { error: `unknown command: "${command}"` };
    }
  };

  console.log('%c[HeadlessMode] window.__gameInput ready', 'color:#40c0a0;font-weight:bold');
  console.log('  __gameInput("move",     {direction:"forward", durationMs:1000})');
  console.log('  __gameInput("look",     {yawDelta:90})');
  console.log('  __gameInput("teleport", {x:0, y:1.7, z:-38})');
  console.log('  __gameInput("setHealth",{value:50})');
  console.log('  __gameInput("shoot",    {targetId:"enemy_0"})');
  console.log('  __gameInput("resetRoom")');
}

/** Update live refs — called every frame by HeadlessMode */
export function updateHarnessRefs(scene: THREE.Scene, camera: THREE.Camera) {
  live.scene  = scene;
  live.camera = camera;
}
