import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';
import DesktopSwordVisual from './DesktopSwordVisual';
import { PLAYER_CONFIG, COMBAT_CONFIG } from '../config/gameConfig';

interface DesktopControlsProps {
  onShoot?: (hand: 'left' | 'right') => void;
  onSwordSwing?: (hand: 'left' | 'right') => void;
  onClipChange?: (leftClip: number, rightClip: number, currentGun: 'left' | 'right', isReloading: boolean) => void;
}

export default function DesktopControls({ onShoot, onSwordSwing, onClipChange }: DesktopControlsProps) {
  const { camera, scene } = useThree();
  const { isPresenting: isVRPresented } = useXR();
  const { addHitEffect, setActiveWeapon, setBoostActive, activeWeapon, setDesktopAmmo } = useVRGame();
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

  // Gun shooting state
  const lastShot = useRef(0);
  const shotCooldown = PLAYER_CONFIG.weapons.shotCooldown;
  const [leftClip, setLeftClip] = useState(12);
  const [rightClip, setRightClip] = useState(12);
  const maxClipSize = 12;
  const [currentGun, setCurrentGun] = useState<'left' | 'right'>('left');
  const [isReloading, setIsReloading] = useState(false);
  const [reloadTimeout, setReloadTimeout] = useState<NodeJS.Timeout | null>(null);

  // Recoil signal — increments each shot, passed to DesktopSwordVisual
  const [shotCount, setShotCount] = useState(0);

  // Boost state refs (for use inside useFrame without stale closure)
  const boostActiveRef = useRef(false);
  const normalSpeed = PLAYER_CONFIG.movement.jetpackSpeed;
  const boostSpeed = 28;

  const switchWeapon = (w: 'sword' | 'gun') => {
    weaponRef.current = w;
    setWeaponState(w);
    setActiveWeapon(w);
  };

  // Gun firing — compute new values first to avoid stale closures
  const fireDesktopBullet = () => {
    if (isReloading) return;
    if (leftClip <= 0 && rightClip <= 0) {
      startAutoReload();
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
      const hitObject = intersect.object;
      if (hitObject.userData.isEnemy && !hitObject.userData.isDead) {
        if (hitObject.userData.takeDamage) hitObject.userData.takeDamage(4);
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break;
      }
      if (hitObject.userData.isPillar && !hitObject.userData.destroyed) {
        hitObject.userData.destroyed = true;
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break;
      }
      if (hitObject.userData.isEnvironment || (hitObject as any).material) {
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break;
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
    setIsReloading(true);
    if (reloadTimeout) { clearTimeout(reloadTimeout); setReloadTimeout(null); }
    setLeftClip(maxClipSize);
    setRightClip(maxClipSize);
    setCurrentGun('left');
    setDesktopAmmo(maxClipSize, maxClipSize, 'left', true);
    if (onClipChange) onClipChange(maxClipSize, maxClipSize, 'left', true);
    try {
      const audioStore = require('../lib/stores/useAudio').useAudio;
      audioStore.getState().playReload();
    } catch {}
    setTimeout(() => {
      setIsReloading(false);
      setDesktopAmmo(maxClipSize, maxClipSize, 'left', false);
      if (onClipChange) onClipChange(maxClipSize, maxClipSize, 'left', false);
    }, 100);
  };

  const checkSwordDamage = () => {
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    const swingPos = cameraPos.clone().add(cameraDir.clone().multiplyScalar(1.2));
    const MAX_SWORD_DISTANCE = COMBAT_CONFIG.collision.swordCheckDistance;

    let hitAnyEnemy = false;
    scene.traverse((child) => {
      if (child.userData.isEnemy && !child.userData.isDead) {
        const enemyPos = new THREE.Vector3();
        child.getWorldPosition(enemyPos);
        if (cameraPos.distanceTo(enemyPos) > MAX_SWORD_DISTANCE) return;
        const distance = swingPos.distanceTo(enemyPos);
        if (distance < 1.8) {
          if (child.userData.takeDamage) child.userData.takeDamage(25);
          addHitEffect([enemyPos.x, enemyPos.y + 1, enemyPos.z]);
          hitAnyEnemy = true;
        }
      }
    });
    if (hitAnyEnemy) playSwordHit();
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
    euler.current.setFromQuaternion(camera.quaternion);
    euler.current.y = mouseMovement.current.x;
    euler.current.x = mouseMovement.current.y;
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

    // Boost: fly forward at high speed while Shift held
    if (boostActiveRef.current) {
      const forwardDir = new THREE.Vector3(0, 0, -1);
      forwardDir.applyQuaternion(camera.quaternion);
      forwardDir.normalize();
      velocity.current.set(
        forwardDir.x * boostSpeed,
        forwardDir.y * boostSpeed,
        forwardDir.z * boostSpeed,
      );
    } else {
      velocity.current.x = direction.current.x * normalSpeed;
      velocity.current.z = direction.current.z * normalSpeed;
      velocity.current.y = 0;
    }

    camera.position.add(velocity.current.clone().multiplyScalar(deltaTime));

    // Bounds
    const bounds = 95;
    camera.position.x = Math.max(-bounds, Math.min(bounds, camera.position.x));
    camera.position.z = Math.max(-95, Math.min(1, camera.position.z));
    camera.position.y = Math.min(18, camera.position.y);

    // Sword damage while swinging
    if (isSwinging) {
      const currentTime = Date.now();
      if (currentTime > lastSwordDamage.current + swordDamageCooldown) {
        checkSwordDamage();
        lastSwordDamage.current = currentTime;
      }
    }
  });

  return (
    <>
      <DesktopSwordVisual
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
