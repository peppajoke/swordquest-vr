import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';
import DesktopWeaponVisual from './DesktopWeaponVisual';
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
  const { addHitEffect, setActiveWeapon, setBoostActive, activeWeapon, setDesktopAmmo, activeMeleeWeapon, activeRangedWeapon, playerStats, setDesktopFuel, weaponLocked } = useVRGame();
  const { playGunShoot, playSwordHit } = useAudio();

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
  const [weaponState, setWeaponState] = useState<'sword' | 'gun'>('sword');
  const weaponRef = useRef<'sword' | 'gun'>('sword');

  // Sword swinging state
  const [currentSwordHand, setCurrentSwordHand] = useState<'left' | 'right'>('right');
  const [isSwinging, setIsSwinging] = useState(false);
  const [swingingHand, setSwingingHand] = useState<'left' | 'right'>('right');
  const lastSwordSwing = useRef(0);
  const swingCooldown = PLAYER_CONFIG.weapons.swingCooldown;
  const lastSwordDamage = useRef(0);
  const swordDamageCooldown = PLAYER_CONFIG.weapons.swordDamageCooldown;
  // Weapon config — read from store, fallback to defaults
  const getMeleeCfg = () => getMeleeWeapon(activeMeleeWeapon as MeleeWeaponId) ?? getMeleeWeapon('longsword');
  const getRangedCfg = () => getRangedWeapon(activeRangedWeapon as RangedWeaponId) ?? getRangedWeapon('pistols');

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

  // Recoil signal — increments each shot, passed to DesktopSwordVisual
  const [shotCount, setShotCount] = useState(0);

  // Jetpack state — mirrors VR physics exactly
  const boostActiveRef = useRef(false);
  const normalSpeed = PLAYER_CONFIG.movement.jetpackSpeed;
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

  const switchWeapon = (w: 'sword' | 'gun') => {
    if (weaponLocked) return; // locked after pickup — can't switch in a run
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

    // Recoil signal
    setShotCount(c => c + 1);
    if (onShoot) onShoot(gun);

    // --- Compute barrel origin ---
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0);
    rightDir.applyQuaternion(camera.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0);
    upDir.applyQuaternion(camera.quaternion);

    // Barrel tip: offset by gun position (left or right side) + forward
    const lateralOffset = gun === 'right' ? 0.35 : -0.35;
    const shootPos = cameraPos.clone()
      .add(cameraDir.clone().multiplyScalar(0.9))   // 0.6 + 0.3 forward to barrel tip
      .add(rightDir.clone().multiplyScalar(lateralOffset))
      .add(upDir.clone().multiplyScalar(-0.35));

    const raycaster = new THREE.Raycaster(shootPos, cameraDir);
    let intersects: THREE.Intersection[] = [];
    const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
    if (worldGroup) intersects = raycaster.intersectObjects(worldGroup.children, true);
    if (intersects.length === 0) intersects = raycaster.intersectObjects(scene.children, true);

    const maxDistance = 100;
    const actualEndPos = shootPos.clone().add(cameraDir.clone().multiplyScalar(maxDistance));
    if (intersects.length > 0) actualEndPos.copy(intersects[0].point);

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
    playGunShoot();

    for (const intersect of intersects) {
      // Walk up hierarchy — raycaster hits child geometry, but userData lives on the parent group
      let hitObject: THREE.Object3D | null = intersect.object;
      while (hitObject && !hitObject.userData.isEnemy && !hitObject.userData.isPillar) {
        hitObject = hitObject.parent;
      }
      if (!hitObject) {
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break;
      }
      if (hitObject.userData.isEnemy && !hitObject.userData.isDead) {
        const rangedDmg = getRangedCfg().baseDamage ?? 25;
        if (hitObject.userData.takeDamage) hitObject.userData.takeDamage(rangedDmg);
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break;
      }
      if (hitObject.userData.isPillar && !hitObject.userData.destroyed) {
        hitObject.userData.destroyed = true;
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break;
      }
      addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
      break;
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
          }
          break;
        case 'Space':
          keys.current.space = true;
          if (isGrounded.current) {
            verticalVelocity.current = jumpVelocity;
            isGrounded.current = false;
          }
          event.preventDefault();
          break;
        case 'Digit1':
          switchWeapon('sword');
          break;
        case 'Digit2':
          switchWeapon('gun');
          break;
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
        mouseMovement.current.x -= event.movementX * 0.002;
        mouseMovement.current.y -= event.movementY * 0.002;
        mouseMovement.current.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseMovement.current.y));
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const currentTime = Date.now();
      const currentWeapon = weaponRef.current; // ref avoids stale closure

      if (event.button === 0) {
        // Left click: active weapon action
        if (currentWeapon === 'sword') {
          // Swing sword
          if (currentTime > lastSwordSwing.current + swingCooldown && !isSwinging) {
            setIsSwinging(true);
            setSwingingHand(currentSwordHand);
            lastSwordSwing.current = currentTime;
            if (onSwordSwing) onSwordSwing(currentSwordHand);
          }
        } else if (currentWeapon === 'gun') {
          // Fire gun
          if (currentTime > lastShot.current + shotCooldown) {
            fireDesktopBullet();
            lastShot.current = currentTime;
          }
        }
      }
      // Right click: no action (context menu is already suppressed)
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        switchWeapon('sword');
      } else {
        switchWeapon('gun');
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
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('wheel', handleWheel, { passive: true });
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
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

    // Gravity
    verticalVelocity.current += gravity * deltaTime;
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
      jetpackAcceleration.current.multiplyScalar(Math.pow(0.85, deltaTime * 60));

      if (jetpackVelocity.current.length() > 0.1) {
        velocity.current.copy(jetpackVelocity.current);
      } else {
        velocity.current.x = direction.current.x * normalSpeed;
        velocity.current.z = direction.current.z * normalSpeed;
        velocity.current.y = 0;
      }
    }

    camera.position.add(velocity.current.clone().multiplyScalar(deltaTime));

    // Bounds
    const bounds = 95;
    camera.position.x = Math.max(-bounds, Math.min(bounds, camera.position.x));
    camera.position.z = Math.max(-95, Math.min(1, camera.position.z));
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

    // Report fuel to store for HUD
    if (!isVRPresented) setDesktopFuel(Math.round(jetpackFuel.current));
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
      />
    </>
  );
}
