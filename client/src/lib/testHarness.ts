/**
 * testHarness.ts — dev-only test API exposed on window.__game
 * Lets Clea drive the game programmatically from browser evaluate()
 * without needing pointer lock or real mouse input.
 *
 * Only initialized when import.meta.env.DEV is true.
 */
import * as THREE from 'three';
import { useVRGame } from './stores/useVRGame';

let _camera: THREE.Camera | null = null;
let _scene: THREE.Scene | null = null;

export function registerTestHarness(camera: THREE.Camera, scene: THREE.Scene) {
  if (!import.meta.env.DEV) return;
  _camera = camera;
  _scene = scene;

  const store = useVRGame; // Zustand store — getState() works anywhere
  const w = window as any;

  w.__game = {
    // ── State inspection ──────────────────────────────────────────────
    getState: () => {
      
      return store.getState();
    },

    getEnemyCount: () => {
      let count = 0;
      _scene?.traverse((obj) => {
        if (obj.userData.isEnemy && !obj.userData.isDead) count++;
      });
      return count;
    },

    getEnemyData: () => {
      const enemies: any[] = [];
      _scene?.traverse((obj) => {
        if (obj.userData.isEnemy) {
          const pos = new THREE.Vector3();
          obj.getWorldPosition(pos);
          enemies.push({
            id: obj.userData.enemyId,
            hp: obj.userData.health,
            dead: obj.userData.isDead,
            pos: { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) },
          });
        }
      });
      return enemies;
    },

    // ── Camera control ────────────────────────────────────────────────
    teleport: (x: number, y: number, z: number) => {
      if (_camera) _camera.position.set(x, y, z);
      return `camera → (${x}, ${y}, ${z})`;
    },

    lookAt: (x: number, y: number, z: number) => {
      if (!_camera) return;
      _camera.lookAt(new THREE.Vector3(x, y, z));
      return `looking at (${x}, ${y}, ${z})`;
    },

    lookDir: (yawDeg: number, pitchDeg: number) => {
      if (!_camera) return;
      _camera.rotation.order = 'YXZ';
      _camera.rotation.y = THREE.MathUtils.degToRad(yawDeg);
      _camera.rotation.x = THREE.MathUtils.degToRad(pitchDeg);
      return `yaw=${yawDeg}° pitch=${pitchDeg}°`;
    },

    // ── Weapon / pickup control ───────────────────────────────────────
    pickWeapon: (weapon: 'sword' | 'gun') => {
      
      const { setActiveWeapon, setPickupPhase, setWeaponLocked, setPlayerStats } = store.getState();
      setActiveWeapon(weapon);
      setPickupPhase(false);
      setWeaponLocked(true);
      setPlayerStats(weapon === 'sword' ? { str: 2, agi: 0, vit: 0 } : { str: 0, agi: 2, vit: 0 });
      return `weapon locked: ${weapon}`;
    },

    // ── Combat simulation ─────────────────────────────────────────────
    simulateSwing: () => {
      // Dispatch synthetic mousedown (left click) — triggers swing in DesktopControls
      document.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      setTimeout(() => document.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true })), 80);
      return 'swing triggered';
    },

    simulateMove: (keys: { w?: boolean; a?: boolean; s?: boolean; d?: boolean }, ms = 500) => {
      const downEvents = Object.entries(keys)
        .filter(([, v]) => v)
        .map(([k]) => new KeyboardEvent('keydown', { code: `Key${k.toUpperCase()}`, key: k, bubbles: true }));
      const upEvents = downEvents.map((e) => new KeyboardEvent('keyup', { code: e.code, key: e.key, bubbles: true }));
      downEvents.forEach((e) => document.dispatchEvent(e));
      setTimeout(() => upEvents.forEach((e) => document.dispatchEvent(e)), ms);
      return `moving ${Object.keys(keys).join('+')} for ${ms}ms`;
    },

    simulateShoot: () => {
      document.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      setTimeout(() => document.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true })), 50);
      return 'shot triggered';
    },

    simulateReload: () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }));
      return 'reload triggered';
    },

    simulateLook: (dx: number, dy: number) => {
      // Direct camera rotation — bypasses pointer lock entirely
      if (!_camera) return;
      _camera.rotation.order = 'YXZ';
      _camera.rotation.y += THREE.MathUtils.degToRad(-dx * 0.3);
      _camera.rotation.x += THREE.MathUtils.degToRad(-dy * 0.3);
      _camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, _camera.rotation.x));
      return `rotated dx=${dx} dy=${dy}`;
    },

    // ── Health / damage simulation ────────────────────────────────────
    setHealth: (hp: number) => {
      
      store.setState({ health: hp });
      return `health → ${hp}`;
    },

    damageEnemy: (enemyId: string, amount: number) => {
      let hit = false;
      _scene?.traverse((obj) => {
        if (obj.userData.enemyId === enemyId && obj.userData.takeDamage) {
          obj.userData.takeDamage(amount);
          hit = true;
        }
      });
      return hit ? `damaged ${enemyId} for ${amount}` : `enemy ${enemyId} not found`;
    },

    killAllEnemies: () => {
      let count = 0;
      _scene?.traverse((obj) => {
        if (obj.userData.isEnemy && !obj.userData.isDead && obj.userData.takeDamage) {
          obj.userData.takeDamage(9999);
          count++;
        }
      });
      return `killed ${count} enemies`;
    },

    // ── Test scenarios ────────────────────────────────────────────────
    runPickupTest: async () => {
      const results: string[] = [];
      
      const state = store.getState();

      results.push(`pickupPhase=${state.pickupPhase} (expected true)`);
      results.push(`weaponLocked=${state.weaponLocked} (expected false)`);

      // Walk toward sword pickup world position (-5, 1.4, -15)
      if (_camera) _camera.position.set(-5, 1.6, -15);
      await new Promise(r => setTimeout(r, 200));

      const state2 = store.getState();
      results.push(`after teleport to sword: pickupPhase=${state2.pickupPhase}, weapon=${state2.activeWeapon}`);

      return results;
    },

    runCombatTest: async () => {
      const results: string[] = [];
      // Skip pickup
      w.__game.pickWeapon('sword');
      // Move to enemy zone
      w.__game.teleport(-8, 1.6, -14);
      w.__game.lookAt(-8, 0, -14);
      await new Promise(r => setTimeout(r, 300));

      const enemiesBefore = w.__game.getEnemyCount();
      results.push(`enemies in scene: ${enemiesBefore}`);
      results.push(`enemy data: ${JSON.stringify(w.__game.getEnemyData())}`);

      return results;
    },
  };

  // Expose internals for debugging
  w.__game._scene = scene;
  w.__game._camera = camera;

  console.log('%c[Clea TestHarness] __game API ready', 'color: #c0a040; font-weight: bold');
  console.log('  __game.getState()         → full store state');
  console.log('  __game.pickWeapon(sword)  → force pickup');
  console.log('  __game.teleport(x,y,z)    → move camera');
  console.log('  __game.simulateSwing()    → trigger swing');
  console.log('  __game.runPickupTest()    → automated pickup test');
  console.log('  __game.runCombatTest()    → automated combat test');
}
