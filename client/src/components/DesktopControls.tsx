import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';
import DesktopWeaponVisual from './DesktopWeaponVisual';
import { resolveWallCollision } from '../lib/levelCollision';
import { PLAYER_CONFIG, COMBAT_CONFIG } from '../config/gameConfig';
import { getMeleeWeapon, getRangedWeapon, computeMeleeDamage, computeReloadTime, type MeleeWeaponId, type RangedWeaponId } from '../lib/weapons';

interface DesktopControlsProps {
  onShoot?: (hand: 'left' | 'right') => void;
  onSwordSwing?: (hand: 'left' | 'right') => void;
  onClipChange?: (leftClip: number, rightClip: number, currentGun: 'left' | 'right', isReloading: boolean) => void;
}

export default function DesktopControls({ onShoot, onSwordSwing, onClipChange }: DesktopControlsProps) {
  const { camera, scene } = useThree();
  const isVRPresented = !!useXR((s) => s.session);
  const { addHitEffect, setActiveWeapon, setBoostActive, activeWeapon, setDesktopAmmo, weaponInventory, activeMeleeSlot, activeRangedSlot, setActiveMeleeSlot, setActiveRangedSlot, playerStats, setDesktopFuel, weaponLocked, pickupPhase, dropWeapon, addDroppedWeapon, registerHit } = useVRGame();
  const activeMeleeWeapon = weaponInventory.melee[activeMeleeSlot];
  const activeRangedWeapon = weaponInventory.ranged[activeRangedSlot];
  const { playGunShoot, playSwordHit, playSwordSwing, playFootstep, playJetpackBoost, playPlayerDamage } = useAudio();

  // Footstep tracking
  const lastStepPos = useRef(new THREE.Vector3());
  const distanceSinceStep = useRef(0);

  // Movement state
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
  });

  // Physics state
  const verticalVelocity = useRef(0);
  const isGrounded = useRef(true);
  const gravity = PLAYER_CONFIG.movement.gravity * 2;
  const jumpVelocity = PLAYER_CONFIG.movement.jumpVelocity;
  const groundLevel = 1;

  // Mouse state
  const mouseMovement = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  // Weapon state (local + synced to store)
  const [weaponState, setWeaponState] = useState<'sword' | 'gun' | null>(null);
  const weaponRef = useRef<'sword' | 'gun' | null>(null);

  // Sword swinging state
  const [currentSwordHand, setCurrentSwordHand] = useState<'left' | 'right'>('right');
  const [isSwinging, setIsSwinging] = useState(false);
  const [swingingHand, setSwingingHand] = useState<'left' | 'right'>('right');
  const lastSwordSwing = useRef(0);
  const swingCooldown = PLAYER_CONFIG.weapons.swingCooldown;
  const lastSwordDamage = useRef(0);
  const swordDamageCooldown = PLAYER_CONFIG.weapons.swordDamageCooldown;
  // Weapon config — read from inventory, fallback to defaults
  const getMeleeCfg = () => getMeleeWeapon((activeMeleeWeapon ?? 'longsword') as MeleeWeaponId) ?? getMeleeWeapon('longsword');
  const getRangedCfg = () => getRangedWeapon((activeRangedWeapon ?? 'pistols') as RangedWeaponId) ?? getRangedWeapon('pistols');

  // Gun shooting state
  const lastShot = useRef(0);
  const shotCooldown = PLAYER_CONFIG.weapons.shotCooldown;
  const [leftClip, setLeftClip] = useState(12);
  const [rightClip, setRightClip] = useState(12);
  // Derive clip size from active ranged weapon config
  const maxClipSize = getRangedCfg().clipSize;
  const [currentGun, setCurrentGun] = useState<'left' | 'right'>('left');
  const [isReloading, setIsReloading] = useState(false);
  const [reloadTimeout, setReloadTimeout] = useState<NodeJS.Timeout | null>(null);

  // Recoil signal — increments each shot, passed to DesktopWeaponVisual
  const [shotCount, setShotCount] = useState(0);
  // Which gun last fired — for per-gun recoil
  const [lastFiredGun, setLastFiredGun] = useState<'left' | 'right' | null>(null);
  // Auto-fire: track whether left mouse button is held
  const mouseHeld = useRef(false);
  // ADS (aim down sights): right mouse held
  const adsHeld = useRef(false);
  const ADS_FOV = 42;
  const NORMAL_FOV = 75;
  const ADS_SENS_MUL = 0.35; // 35% sensitivity while ADS

  // Jetpack state — mirrors VR physics exactly
  const boostActiveRef = useRef(false);
  const normalSpeed = PLAYER_CONFIG.movement.jetpackSpeed;
  const walkSpeed = PLAYER_CONFIG.movement.walkSpeed;
  const jetpackVelocity = useRef(new THREE.Vector3());
  const jetpackAcceleration = useRef(new THREE.Vector3());
  const jetpackFuel = useRef<number>(PLAYER_CONFIG.jetpack.maxFuel);
  const jetpackBurstMultiplier = useRef(1.0);
  const jetpackBurstDecayEnd = useRef(0);
  const lastStoppedBoosting = useRef(0);
  const wasBoostingPrev = useRef(false);
  const isJetpackAccelerating = useRef(false);
  // Double-tap Shift = burst boost (equivalent of VR squeeze-timing)
  const shiftTapCount = useRef(0);
  const shiftLastTap = useRef(0);

  // Sync local weaponState when the store's activeWeapon changes externally (e.g., after pickup)
  useEffect(() => {
    if (activeWeapon !== null && activeWeapon !== weaponRef.current) {
      weaponRef.current = activeWeapon;
      setWeaponState(activeWeapon);
    }
  }, [activeWeapon]);

  const switchWeapon = (w: 'sword' | 'gun') => {
    if (pickupPhase) return;  // can't switch before picking up any weapon
    weaponRef.current = w;
    setWeaponState(w);
    setActiveWeapon(w);
  };

  // Gun firing — compute new values first to avoid stale closures
  const fireDesktopBullet = () => {
    if (isReloading) return;
    if (leftClip <= 0 && rightClip <= 0) {
      reloadGuns(); // immediate reload on empty
      return;
    }

    let gunToUse: 'left' | 'right';
    if (leftClip <= 0) gunToUse = 'right';
    else if (rightClip <= 0) gunToUse = 'left';
    else if (leftClip > rightClip) gunToUse = 'left';
    else if (rightClip > leftClip) gunToUse = 'right';
    else gunToUse = currentGun === 'left' ? 'right' : 'left';

    setCurrentGun(gunToUse);
    fireWithGun(gunToUse);
  };

  const fireWithGun = (gun: 'left' | 'right') => {
    // Compute new clip values synchronously to avoid stale closures
    const newLeft = gun === 'left' ? Math.max(0, leftClip - 1) : leftClip;
    const newRight = gun === 'right' ? Math.max(0, rightClip - 1) : rightClip;

    // Update store (HUD reads from here)
    setDesktopAmmo(newLeft, newRight, gun, false);
    // Update local state
    setLeftClip(newLeft);
    setRightClip(newRight);
    // Notify parent if wired
    if (onClipChange) onClipChange(newLeft, newRight, gun, false);

    // Recoil signal — track which gun fired for per-gun recoil
    setShotCount(c => c + 1);
    setLastFiredGun(gun);
    if (onShoot) onShoot(gun);

    // Camera pitch kick upward on firing (feels like real recoil)
    const recoilPitch = (getRangedCfg() as any).recoil ?? 0.045;
    mouseMovement.current.y = Math.min(Math.PI / 2, mouseMovement.current.y + recoilPitch);

    // --- Compute barrel origin ---
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0);
    rightDir.applyQuaternion(camera.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0);
    upDir.applyQuaternion(camera.quaternion);

    // Raycast from dead-center camera (= crosshair) — bullets always hit where you aim
    const rayOrigin = cameraPos.clone().add(cameraDir.clone().multiplyScalar(0.1));
    const raycaster = new THREE.Raycaster(rayOrigin, cameraDir);
    let intersects: THREE.Intersection[] = [];
    const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
    if (worldGroup) intersects = raycaster.intersectObjects(worldGroup.children, true);
    if (intersects.length === 0) intersects = raycaster.intersectObjects(scene.children, true);

    const maxDistance = 100;
    const hitPoint = rayOrigin.clone().add(cameraDir.clone().multiplyScalar(maxDistance));
    if (intersects.length > 0) hitPoint.copy(intersects[0].point);

    // Visual beam starts from barrel (cosmetic offset) but ends at crosshair hit point
    const lateralOffset = gun === 'right' ? 0.25 : -0.25;
    const shootPos = cameraPos.clone()
      .add(cameraDir.clone().multiplyScalar(0.6))
      .add(rightDir.clone().multiplyScalar(lateralOffset))
      .add(upDir.clone().multiplyScalar(-0.28));
    const actualEndPos = hitPoint;

    const beamLength = shootPos.distanceTo(actualEndPos);
    const beamGeometry = new THREE.CylinderGeometry(0.005, 0.005, beamLength, 8);
    const beamMaterial = new THREE.MeshLambertMaterial({
      color: '#00ff00',
      emissive: '#88ff00',
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.8,
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    const beamCenter = shootPos.clone().add(cameraDir.clone().multiplyScalar(beamLength / 2));
    beam.position.copy(beamCenter);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cameraDir.clone().normalize());
    beam.quaternion.copy(quaternion);
    scene.add(beam);
    setTimeout(() => {
      scene.remove(beam);
      beam.geometry.dispose();
      (beam.material as THREE.Material).dispose();
    }, 100);

    // Muzzle flash from barrel position
    addHitEffect([shootPos.x, shootPos.y, shootPos.z]);
    const { weaponInventory: wi, activeRangedSlot: rs } = useVRGame.getState();
    playGunShoot(wi.ranged[rs] ?? 'pistols');

    // Piercing bullets — damage ALL enemies along the ray, stop only at solid walls
    const hitEnemies = new Set<THREE.Object3D>(); // avoid double-hitting same enemy
    for (const intersect of intersects) {
      let hitObject: THREE.Object3D | null = intersect.object;
      while (hitObject && !hitObject.userData.isEnemy && !hitObject.userData.isPillar && !hitObject.userData.isWall) {
        hitObject = hitObject.parent;
      }
      if (!hitObject) continue; // skip untagged geometry, keep piercing

      if (hitObject.userData.isEnemy && !hitObject.userData.isDead && !hitEnemies.has(hitObject)) {
        hitEnemies.add(hitObject);
        const rangedDmg = getRangedCfg().baseDamage ?? 25;
        if (hitObject.userData.takeDamage) hitObject.userData.takeDamage(rangedDmg);
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        registerHit();
        // Keep piercing — don't break
        continue;
      }
      if (hitObject.userData.isPillar && !hitObject.userData.destroyed) {
        hitObject.userData.destroyed = true;
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break; // pillars block bullets
      }
      if (hitObject.userData.isWall) {
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break; // walls stop bullets
      }
    }

    if (newLeft <= 0 && newRight <= 0) startAutoReload();
  };

  const startAutoReload = () => {
    if (reloadTimeout) clearTimeout(reloadTimeout);
    const timeout = setTimeout(() => reloadGuns(), PLAYER_CONFIG.weapons.reloadTimeout);
    setReloadTimeout(timeout);
  };

  const reloadGuns = () => {
    if (isReloading) return; // already reloading
    if (reloadTimeout) { clearTimeout(reloadTimeout); setReloadTimeout(null); }
    setIsReloading(true);
    setDesktopAmmo(0, 0, 'left', true);
    if (onClipChange) onClipChange(0, 0, 'left', true);
    // Play reload sound immediately
    try {
      const audioStore = require('../lib/stores/useAudio').useAudio;
      audioStore.getState().playReload();
    } catch {}
    // Reload time from weapon config, scaled by AGI
    const reloadMs = computeReloadTime(getRangedCfg().baseReloadTime, playerStats.agi);
    setTimeout(() => {
      setLeftClip(maxClipSize);
      setRightClip(maxClipSize);
      setCurrentGun('left');
      setIsReloading(false);
      setDesktopAmmo(maxClipSize, maxClipSize, 'left', false);
      if (onClipChange) onClipChange(maxClipSize, maxClipSize, 'left', false);
    }, reloadMs);
  };

  const checkSwordDamage = () => {
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    const swingPos = cameraPos.clone().add(cameraDir.clone().multiplyScalar(1.2));
    const MAX_SWORD_DISTANCE = COMBAT_CONFIG.collision.swordCheckDistance;

    let hitAnyEnemy = false;
    scene.traverse((child) => {
      // Hit enemies
      if (child.userData.isEnemy && !child.userData.isDead) {
        const enemyPos = new THREE.Vector3();
        child.getWorldPosition(enemyPos);
        enemyPos.y += 0.75; // offset to body center (group origin is at feet)
        if (cameraPos.distanceTo(enemyPos) > MAX_SWORD_DISTANCE) return;
        if (swingPos.distanceTo(enemyPos) < getMeleeCfg().hitRadius) {
          const dmg = computeMeleeDamage(getMeleeCfg().baseDamage, playerStats.str);
          if (child.userData.takeDamage) child.userData.takeDamage(dmg);
          addHitEffect([enemyPos.x, enemyPos.y + 1, enemyPos.z]);
          registerHit();
          hitAnyEnemy = true;
        }
      }
      // Hit turrets — same as VR sword collision
      if (child.userData.isTurret && child.userData.health > 0) {
        const turretPos = new THREE.Vector3();
        child.getWorldPosition(turretPos);
        if (cameraPos.distanceTo(turretPos) > MAX_SWORD_DISTANCE) return;
        if (swingPos.distanceTo(turretPos) < COMBAT_CONFIG.collision.turretHitDistance) {
          child.userData.health -= computeMeleeDamage(getMeleeCfg().baseDamage, playerStats.str);
          addHitEffect([turretPos.x, turretPos.y + 1, turretPos.z]);
          hitAnyEnemy = true;
        }
      }
    });
    if (hitAnyEnemy) playSwordHit();
  };

  // Turret bullet player-damage — runs every frame (desktop equivalent of VR bullet detection)
  const checkTurretBullets = (cameraPos: THREE.Vector3) => {
    scene.traverse((child) => {
      if (child.userData.isTurretBullet && child.userData.active) {
        const bulletPos = new THREE.Vector3();
        child.getWorldPosition(bulletPos);
        if (bulletPos.distanceTo(cameraPos) < 0.8) {
          const { takeDamage } = useVRGame.getState();
          takeDamage(child.userData.damage ?? 15);
          child.userData.active = false;
          child.visible = false;
        }
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': keys.current.w = true; break;
        case 'KeyA': keys.current.a = true; break;
        case 'KeyS': keys.current.s = true; break;
        case 'KeyD': keys.current.d = true; break;
        case 'ShiftLeft':
        case 'ShiftRight':
          if (!keys.current.shift) {
            keys.current.shift = true;
            boostActiveRef.current = true;
            setBoostActive(true);
            playJetpackBoost();
          }
          break;
        case 'Space':
          keys.current.space = true;
          // Only jump if NOT jetpacking; jetpack ascent handled in useFrame
          if (isGrounded.current && !boostActiveRef.current) {
            verticalVelocity.current = jumpVelocity;
            isGrounded.current = false;
          }
          event.preventDefault();
          break;
        case 'Digit1': {
          // Melee slot 0
          const { weaponInventory: wi } = useVRGame.getState();
          setActiveMeleeSlot(0);
          if (wi.melee[0]) setActiveWeapon('sword');
          break;
        }
        case 'Digit2': {
          // Melee slot 1
          const { weaponInventory: wi } = useVRGame.getState();
          setActiveMeleeSlot(1);
          if (wi.melee[1]) setActiveWeapon('sword');
          break;
        }
        case 'Digit3': {
          // Ranged slot 0
          const { weaponInventory: wi } = useVRGame.getState();
          setActiveRangedSlot(0);
          if (wi.ranged[0]) setActiveWeapon('gun');
          break;
        }
        case 'Digit4': {
          // Ranged slot 1
          const { weaponInventory: wi } = useVRGame.getState();
          setActiveRangedSlot(1);
          if (wi.ranged[1]) setActiveWeapon('gun');
          break;
        }
        case 'KeyG': {
          // Drop active weapon
          const state = useVRGame.getState();
          const type = state.activeWeapon === 'sword' ? 'melee' : 'ranged';
          if (!state.activeWeapon) break;
          const slot = type === 'melee' ? state.activeMeleeSlot : state.activeRangedSlot;
          const droppedId = dropWeapon(type, slot);
          if (droppedId) {
            const pos: [number, number, number] = [
              camera.position.x,
              camera.position.y - 0.5,
              camera.position.z - 1,
            ];
            addDroppedWeapon({
              id: `drop_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              type,
              weaponId: droppedId,
              position: pos,
            });
          }
          break;
        }
        case 'KeyR':
          if (leftClip < maxClipSize || rightClip < maxClipSize) reloadGuns();
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': keys.current.w = false; break;
        case 'KeyA': keys.current.a = false; break;
        case 'KeyS': keys.current.s = false; break;
        case 'KeyD': keys.current.d = false; break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = false;
          boostActiveRef.current = false;
          setBoostActive(false);
          break;
        case 'Space': keys.current.space = false; break;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isPointerLocked.current) {
        const sens = adsHeld.current ? 0.002 * ADS_SENS_MUL : 0.002;
        mouseMovement.current.x -= event.movementX * sens;
        mouseMovement.current.y -= event.movementY * sens;
        mouseMovement.current.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseMovement.current.y));
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) mouseHeld.current = true;
      if (event.button === 2) adsHeld.current = true;
      const currentTime = Date.now();
      const currentWeapon = weaponRef.current; // ref avoids stale closure

      if (event.button === 0) {
        // Left click: active weapon action
        if (currentWeapon === null) return; // no weapon equipped yet
        if (currentWeapon === 'sword') {
          // Swing sword — only if melee slot has a weapon
          const { weaponInventory: wi, activeMeleeSlot: ms } = useVRGame.getState();
          if (wi.melee[ms] === null) return; // empty melee slot
          if (currentTime > lastSwordSwing.current + swingCooldown && !isSwinging) {
            setIsSwinging(true);
            setSwingingHand(currentSwordHand);
            lastSwordSwing.current = currentTime;
            playSwordSwing();
            if (onSwordSwing) onSwordSwing(currentSwordHand);
          }
        } else if (currentWeapon === 'gun') {
          // Fire gun — only if ranged slot has a weapon
          const { weaponInventory: wi, activeRangedSlot: rs } = useVRGame.getState();
          if (wi.ranged[rs] === null) return; // empty ranged slot
          if (currentTime > lastShot.current + shotCooldown) {
            fireDesktopBullet();
            lastShot.current = currentTime;
          }
        }
      }
      // Right click: no action (context menu is already suppressed)
    };

    const handleWheel = (event: WheelEvent) => {
      // Cycle through all 4 slots: melee[0] → melee[1] → ranged[0] → ranged[1] → wrap
      const { weaponInventory: wi, activeWeapon: aw, activeMeleeSlot: ms, activeRangedSlot: rs } = useVRGame.getState();
      // Map current state to slot index 0-3
      let currentSlot = aw === 'sword' ? ms : 2 + rs;
      const dir = event.deltaY < 0 ? -1 : 1;
      // Try up to 4 steps to find an occupied slot
      for (let i = 1; i <= 4; i++) {
        const next = ((currentSlot + dir * i) + 4) % 4;
        if (next < 2) {
          if (wi.melee[next]) { setActiveMeleeSlot(next as 0|1); setActiveWeapon('sword'); break; }
        } else {
          const rs2 = next - 2 as 0|1;
          if (wi.ranged[rs2]) { setActiveRangedSlot(rs2); setActiveWeapon('gun'); break; }
        }
      }
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement !== null;
    };

    const handleClick = () => {
      if (!isPointerLocked.current) {
        document.body.requestPointerLock();
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) mouseHeld.current = false;
      if (event.button === 2) adsHeld.current = false;
    };

    const handleAmmoPickup = (e: Event) => {
      const { amount } = (e as CustomEvent).detail;
      const fill = Math.max(maxClipSize, (amount as number) || maxClipSize);
      setLeftClip(fill);
      setRightClip(fill);
      setDesktopAmmo(fill, fill, 'left', false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('ammo-pickup', handleAmmoPickup);
    document.addEventListener('wheel', handleWheel, { passive: true });
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('ammo-pickup', handleAmmoPickup);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [currentSwordHand, isSwinging, leftClip, rightClip, onSwordSwing]);

  useFrame((_, deltaTime) => {
    // Apply mouse look
    euler.current.set(mouseMovement.current.y, mouseMovement.current.x, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler.current);

    // Movement direction from keys
    direction.current.set(0, 0, 0);
    if (keys.current.w) direction.current.z -= 1;
    if (keys.current.s) direction.current.z += 1;
    if (keys.current.a) direction.current.x -= 1;
    if (keys.current.d) direction.current.x += 1;
    direction.current.normalize();
    direction.current.applyQuaternion(camera.quaternion);
    direction.current.y = 0; // Keep horizontal

    // Gravity — suppressed while jetpacking so player hovers freely
    const isActivelyJetpacking = boostActiveRef.current && jetpackFuel.current > 0;
    if (!isActivelyJetpacking) {
      verticalVelocity.current += gravity * deltaTime;
    } else {
      // Bleed off vertical velocity quickly when jetpack kicks in (no sudden stop)
      verticalVelocity.current *= Math.pow(0.05, deltaTime);
    }
    const newY = camera.position.y + verticalVelocity.current * deltaTime;
    if (newY <= groundLevel) {
      camera.position.y = groundLevel;
      verticalVelocity.current = 0;
      isGrounded.current = true;
    } else {
      camera.position.y = newY;
      isGrounded.current = false;
    }

    // ── Jetpack physics: mirrors VR mode exactly ──────────────────────────
    const currentTime = Date.now();
    const canJetpack = boostActiveRef.current && jetpackFuel.current > 0;

    // Burst timing: double-tap Shift within 400–600ms window = burst boost
    if (canJetpack && !wasBoostingPrev.current) {
      const pauseDuration = currentTime - lastStoppedBoosting.current;
      if (lastStoppedBoosting.current > 0 && pauseDuration >= 400 && pauseDuration <= 600) {
        const timingAccuracy = 1 - Math.abs(pauseDuration - 500) / 100;
        const boostStrength = 1.5 + 1.5 * timingAccuracy; // 1.5–3.0×
        jetpackBurstMultiplier.current = boostStrength;
        jetpackBurstDecayEnd.current = currentTime + 3000;
        import('../lib/stores/useAudio').then(({ useAudio }) => useAudio.getState().playBoost?.());
      }
    } else if (!canJetpack && wasBoostingPrev.current) {
      lastStoppedBoosting.current = currentTime;
    }
    wasBoostingPrev.current = canJetpack;

    // Burst decay (same √ curve as VR)
    if (jetpackBurstDecayEnd.current > 0) {
      if (currentTime > jetpackBurstDecayEnd.current) {
        jetpackBurstMultiplier.current = 1.0;
        jetpackBurstDecayEnd.current = 0;
      } else {
        const remaining = (jetpackBurstDecayEnd.current - currentTime) / 3000;
        const orig = jetpackBurstMultiplier.current;
        jetpackBurstMultiplier.current = 1.0 + (orig - 1.0) * Math.sqrt(remaining);
      }
    }

    // Fuel drain / recharge (same rates as VR)
    if (canJetpack) {
      isJetpackAccelerating.current = true;
      const grounded = camera.position.y <= 1.8;
      const drainRate = grounded ? PLAYER_CONFIG.jetpack.fuelDrainRate : PLAYER_CONFIG.jetpack.fuelDrainRate * 4;
      jetpackFuel.current = Math.max(0, jetpackFuel.current - drainRate * deltaTime);
    } else {
      if (isJetpackAccelerating.current && !canJetpack) isJetpackAccelerating.current = false;
      const maxFuel: number = PLAYER_CONFIG.jetpack.maxFuel;
      jetpackFuel.current = Math.min(
        maxFuel,
        jetpackFuel.current + PLAYER_CONFIG.jetpack.fuelRechargeRate * deltaTime
      );
    }

    if (canJetpack) {
      // Acceleration physics: lerp toward look direction (A/D steers)
      const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      const lateralDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
      const steer = (keys.current.d ? 1 : 0) - (keys.current.a ? 1 : 0);
      const targetDir = lookDir.clone().add(lateralDir.clone().multiplyScalar(steer * 0.4)).normalize();

      const fuelMul = Math.max(0.3, jetpackFuel.current / PLAYER_CONFIG.jetpack.maxFuel);
      const desiredSpeed = PLAYER_CONFIG.movement.maxSpeed * fuelMul * jetpackBurstMultiplier.current;
      const targetVel = targetDir.clone().multiplyScalar(desiredSpeed);

      jetpackAcceleration.current.lerp(targetVel, PLAYER_CONFIG.movement.turnRate);
      jetpackVelocity.current.add(
        jetpackAcceleration.current.clone().multiplyScalar(deltaTime * PLAYER_CONFIG.movement.accelerationRate)
      );
      if (jetpackVelocity.current.length() > desiredSpeed) {
        jetpackVelocity.current.setLength(desiredSpeed);
      }
      velocity.current.copy(jetpackVelocity.current);

      // Space held while jetpacking = ascend (independent of look direction)
      if (keys.current.space) {
        const ascentRate = 10.0; // units/s upward
        verticalVelocity.current = Math.min(
          verticalVelocity.current + ascentRate * deltaTime,
          ascentRate
        );
      }
    } else {
      // Velocity decay (same exponential as VR)
      const spd = jetpackVelocity.current.length();
      const threshold = 1.0;
      if (spd > threshold) {
        jetpackVelocity.current.multiplyScalar(Math.pow(0.98, deltaTime * 60));
      } else if (spd > 0.05) {
        const expFactor = Math.pow(spd / threshold, 2);
        jetpackVelocity.current.multiplyScalar(Math.pow(0.1 + 0.9 * expFactor, deltaTime * 60));
      } else {
        jetpackVelocity.current.set(0, 0, 0);
      }

      // WASD drag: while drifting, keyboard input steers the residual velocity
      // — lets the player "muscle out" of drift by holding a direction
      if (direction.current.lengthSq() > 0.01 && spd > 0.05) {
        const dragForce = direction.current.clone().multiplyScalar(walkSpeed * 4.5 * deltaTime);
        jetpackVelocity.current.add(dragForce);
        // Clamp so WASD can't re-accelerate beyond max
        if (jetpackVelocity.current.length() > PLAYER_CONFIG.movement.maxSpeed * 0.7) {
          jetpackVelocity.current.setLength(PLAYER_CONFIG.movement.maxSpeed * 0.7);
        }
      }

      jetpackAcceleration.current.multiplyScalar(Math.pow(0.85, deltaTime * 60));

      if (jetpackVelocity.current.length() > 0.1) {
        velocity.current.copy(jetpackVelocity.current);
      } else {
        velocity.current.x = direction.current.x * walkSpeed;
        velocity.current.z = direction.current.z * walkSpeed;
        velocity.current.y = 0;
      }
    }

    camera.position.add(velocity.current.clone().multiplyScalar(deltaTime));

    // Footsteps — trigger every ~1.8 units of horizontal travel while grounded
    if (isGrounded.current && !boostActiveRef.current) {
      const moved = camera.position.distanceTo(lastStepPos.current);
      distanceSinceStep.current += moved;
      if (distanceSinceStep.current >= 1.8) {
        distanceSinceStep.current = 0;
        playFootstep();
      }
      lastStepPos.current.copy(camera.position);
    } else {
      lastStepPos.current.copy(camera.position);
      distanceSinceStep.current = 0;
    }

    // Wall collision — push player out of any wall AABB
    const playerResolved = resolveWallCollision(camera.position.x, camera.position.z, 0.45);
    camera.position.x = playerResolved.x;
    camera.position.z = playerResolved.z;

    // Hard outer bounds (fallback safety net)
    camera.position.x = Math.max(-58, Math.min(58, camera.position.x));
    camera.position.z = Math.max(-82, Math.min(1, camera.position.z));
    camera.position.y = Math.min(18, camera.position.y);

    // Sword damage while swinging
    if (isSwinging) {
      const currentTime2 = Date.now();
      if (currentTime2 > lastSwordDamage.current + swordDamageCooldown) {
        checkSwordDamage();
        lastSwordDamage.current = currentTime2;
      }
    }

    // Turret bullet hit detection (desktop — VR handles its own in VRControllers)
    if (!isVRPresented) checkTurretBullets(camera.position.clone());

    // ADS: smoothly lerp FOV
    if (!isVRPresented && camera instanceof THREE.PerspectiveCamera) {
      const targetFov = adsHeld.current ? ADS_FOV : NORMAL_FOV;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(deltaTime / 0.08, 1));
      camera.updateProjectionMatrix();
    }

    // Report fuel to store for HUD
    if (!isVRPresented) setDesktopFuel(Math.round(jetpackFuel.current));

    // Auto-melee: continuous back-and-forth swing while mouse held for sword
    if (mouseHeld.current && weaponRef.current === 'sword' && isPointerLocked.current) {
      const { weaponInventory: wi2, activeMeleeSlot: ms2 } = useVRGame.getState();
      if (wi2.melee[ms2] !== null) {
        const now2 = Date.now();
        if (now2 > lastSwordSwing.current + swingCooldown && !isSwinging) {
          // Alternate hands for back-and-forth feel
          const nextHand: 'left' | 'right' = currentSwordHand === 'left' ? 'right' : 'left';
          setIsSwinging(true);
          setSwingingHand(nextHand);
          lastSwordSwing.current = now2;
          playSwordSwing();
          if (onSwordSwing) onSwordSwing(nextHand);
        }
      }
    }

    // Auto-fire: fire continuously while mouse held for auto weapons
    if (mouseHeld.current && weaponRef.current === 'gun' && isPointerLocked.current) {
      const { weaponInventory: wi, activeRangedSlot: rs } = useVRGame.getState();
      const rangedId = wi.ranged[rs];
      if (rangedId) {
        const cfg = getRangedCfg();
        const isAuto = (cfg as any).autoFire === true;
        if (isAuto) {
          const now = Date.now();
          const fireCooldown = cfg.fireRate ?? shotCooldown * 1000;
          if (now > lastShot.current + fireCooldown) {
            fireDesktopBullet();
            lastShot.current = now;
          }
        }
      }
    }
  });

  return (
    <>
      <DesktopWeaponVisual
        isSwinging={isSwinging}
        hand={swingingHand}
        activeWeapon={weaponState}
        onSwingComplete={() => setIsSwinging(false)}
        isVisible={!isVRPresented}
        recoilSignal={shotCount}
        recoilHand={lastFiredGun}
        isReloading={isReloading}
      />
    </>
  );
}
