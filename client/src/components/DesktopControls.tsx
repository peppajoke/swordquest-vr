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
  onJetpackToggle?: (enabled: boolean) => void;
  onClipChange?: (leftClip: number, rightClip: number, currentGun: 'left' | 'right', isReloading: boolean) => void;
}

export default function DesktopControls({ onShoot, onSwordSwing, onJetpackToggle, onClipChange }: DesktopControlsProps) {
  const { camera, scene } = useThree();
  const { isPresenting: isVRPresented } = useXR();
  const { addHitEffect } = useVRGame();
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
    space: false
  });
  
  // Physics state
  const verticalVelocity = useRef(0);
  const isGrounded = useRef(true);
  const gravity = PLAYER_CONFIG.movement.gravity * 2; // Gravity acceleration (negative for downward)
  const jumpVelocity = PLAYER_CONFIG.movement.jumpVelocity; // Initial jump velocity
  const groundLevel = 1; // Ground Y position (accounting for player height)
  
  // Mouse state
  const mouseMovement = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  
  // Jetpack state
  const [jetpackEnabled, setJetpackEnabled] = useState(false);
  const [fuel, setFuel] = useState(100);
  const maxSpeed = PLAYER_CONFIG.movement.jetpackSpeed;
  const jetpackSpeed = PLAYER_CONFIG.movement.jetpackSpeed;
  
  // Sword swinging state
  const [currentSwordHand, setCurrentSwordHand] = useState<'left' | 'right'>('right');
  const [isSwinging, setIsSwinging] = useState(false);
  const [swingingHand, setSwingingHand] = useState<'left' | 'right'>('right');
  const lastSwordSwing = useRef(0);
  const swingCooldown = PLAYER_CONFIG.weapons.swingCooldown;
  const [swordSwinging, setSwordSwinging] = useState(false);
  const lastSwordDamage = useRef(0);
  const swordDamageCooldown = PLAYER_CONFIG.weapons.swordDamageCooldown;
  
  // Gun shooting state - dual clip system like VR
  const lastShot = useRef(0);
  const shotCooldown = PLAYER_CONFIG.weapons.shotCooldown;
  const [leftClip, setLeftClip] = useState(12); // Left gun clip
  const [rightClip, setRightClip] = useState(12); // Right gun clip
  const maxClipSize = 12; // Max rounds per clip
  const [currentGun, setCurrentGun] = useState<'left' | 'right'>('left'); // Which gun is active
  const [isReloading, setIsReloading] = useState(false);
  const [reloadTimeout, setReloadTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Desktop shooting function - alternates between clips for even usage
  const fireDesktopBullet = () => {
    // Don't fire if reloading
    if (isReloading) {
      console.log('🚫 Currently reloading!');
      return;
    }
    
    // Check if both clips are empty
    if (leftClip <= 0 && rightClip <= 0) {
      console.log('🚫 Both clips empty! Auto-reloading...');
      startAutoReload();
      return;
    }
    
    // Determine which gun to use for even distribution
    let gunToUse: 'left' | 'right';
    
    if (leftClip <= 0) {
      // Left empty, use right
      gunToUse = 'right';
    } else if (rightClip <= 0) {
      // Right empty, use left  
      gunToUse = 'left';
    } else {
      // Both have ammo, alternate based on which has more or use current
      if (leftClip > rightClip) {
        gunToUse = 'left';
      } else if (rightClip > leftClip) {
        gunToUse = 'right';
      } else {
        // Equal ammo, alternate
        gunToUse = currentGun === 'left' ? 'right' : 'left';
      }
    }
    
    setCurrentGun(gunToUse);
    fireWithGun(gunToUse);
  };
  
  const fireWithGun = (gun: 'left' | 'right') => {
    // Consume ammo from current gun
    if (gun === 'left') {
      setLeftClip(prev => {
        const newValue = Math.max(0, prev - 1);
        // Notify parent of clip change
        if (onClipChange) {
          onClipChange(newValue, rightClip, currentGun, isReloading);
        }
        return newValue;
      });
    } else {
      setRightClip(prev => {
        const newValue = Math.max(0, prev - 1);
        // Notify parent of clip change
        if (onClipChange) {
          onClipChange(leftClip, newValue, currentGun, isReloading);
        }
        return newValue;
      });
    }
    
    // Get camera position and direction for shooting
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    
    // Fire from slightly in front of camera
    const shootPos = cameraPos.clone().add(cameraDir.clone().multiplyScalar(0.5));
    
    // Create instant hit raycast - look in worldGroup like VR system does
    const raycaster = new THREE.Raycaster(shootPos, cameraDir);
    let intersects: THREE.Intersection[] = [];
    
    // Check hits on world objects (same approach as VR system)
    const worldGroup = scene.getObjectByName("worldGroup") as THREE.Group;
    if (worldGroup) {
      intersects = raycaster.intersectObjects(worldGroup.children, true);
    }
    
    // Fallback to full scene if worldGroup not found
    if (intersects.length === 0) {
      intersects = raycaster.intersectObjects(scene.children, true);
    }
    
    // Create visual bullet beam like VR system
    const maxDistance = 100;
    const actualEndPos = shootPos.clone().add(cameraDir.clone().multiplyScalar(maxDistance));
    
    // If we hit something, use the hit point as end position
    if (intersects.length > 0) {
      actualEndPos.copy(intersects[0].point);
    }
    
    // Create visible laser beam
    const beamLength = shootPos.distanceTo(actualEndPos);
    const beamGeometry = new THREE.CylinderGeometry(0.005, 0.005, beamLength, 8);
    const beamMaterial = new THREE.MeshLambertMaterial({
      color: "#00ff00",
      emissive: "#88ff00", 
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.8,
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    
    // Position beam correctly
    const beamCenter = shootPos.clone().add(cameraDir.clone().multiplyScalar(beamLength / 2));
    beam.position.copy(beamCenter);
    
    // Align beam with direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cameraDir.clone().normalize());
    beam.quaternion.copy(quaternion);
    
    // Add beam to scene temporarily
    scene.add(beam);
    
    // Remove beam after short duration
    setTimeout(() => {
      scene.remove(beam);
      beam.geometry.dispose();
      (beam.material as THREE.Material).dispose();
    }, 100);
    
    // Create muzzle flash effect
    addHitEffect([shootPos.x, shootPos.y, shootPos.z]);
    
    // Play gun sound
    playGunShoot();
    
    let hitSomething = false;
    
    // Check for hits
    for (const intersect of intersects) {
      const hitObject = intersect.object;
      
      // Hit enemy
      if (hitObject.userData.isEnemy && !hitObject.userData.isDead) {
        const gunDamage = 4;
        if (hitObject.userData.takeDamage) {
          hitObject.userData.takeDamage(gunDamage);
        }
        console.log(`🎯 Desktop shot hit ${hitObject.userData.enemyType}! ${gunDamage} damage`);
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        hitSomething = true;
        break;
      }
      
      // Hit pillar or other objects
      if (hitObject.userData.isPillar && !hitObject.userData.destroyed) {
        hitObject.userData.destroyed = true;
        console.log('🎯 Desktop shot destroyed pillar!');
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        hitSomething = true;
        break;
      }
      
      // Hit any other object (terrain, walls, etc.)
      if (hitObject.userData.isEnvironment || (hitObject as any).material) {
        console.log('🎯 Desktop shot hit environment!');
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        hitSomething = true;
        break;
      }
    }
    
    const currentClipAmmo = gun === 'left' ? leftClip : rightClip;
    console.log(`🔫 Desktop ${gun} gun fired! Clip: ${currentClipAmmo - 1}/${maxClipSize}${hitSomething ? ' - HIT!' : ''}`);
    
    // Only start auto-reload if BOTH clips are empty
    const newLeftClip = gun === 'left' ? currentClipAmmo - 1 : leftClip;
    const newRightClip = gun === 'right' ? currentClipAmmo - 1 : rightClip;
    
    if (newLeftClip <= 0 && newRightClip <= 0) {
      startAutoReload();
    }
  };
  
  // Auto-reload after 1.5 seconds
  const startAutoReload = () => {
    if (reloadTimeout) {
      clearTimeout(reloadTimeout);
    }
    
    const timeout = setTimeout(() => {
      reloadGuns();
    }, PLAYER_CONFIG.weapons.reloadTimeout);
    
    setReloadTimeout(timeout);
  };
  
  // Manual reload function
  const reloadGuns = () => {
    setIsReloading(true);
    
    // Clear auto-reload timeout
    if (reloadTimeout) {
      clearTimeout(reloadTimeout);
      setReloadTimeout(null);
    }
    
    // Reload both clips
    setLeftClip(maxClipSize);
    setRightClip(maxClipSize);
    setCurrentGun('left'); // Reset to left gun
    
    console.log(`🔄 Both guns reloaded! Left: ${maxClipSize}/${maxClipSize}, Right: ${maxClipSize}/${maxClipSize}`);
    
    // Play reload sound
    try {
      const audioStore = require('../lib/stores/useAudio').useAudio;
      audioStore.getState().playReload();
    } catch (error) {
      console.log('🔊 Reload sound error:', error);
    }
    
    // Notify parent of clip change
    if (onClipChange) {
      onClipChange(maxClipSize, maxClipSize, 'left', true);
    }
    
    // Finish reloading
    setTimeout(() => {
      setIsReloading(false);
      // Notify parent that reloading is done
      if (onClipChange) {
        onClipChange(maxClipSize, maxClipSize, 'left', false);
      }
    }, 100);
  };
  
  // Continuous sword damage detection
  const checkSwordDamage = () => {
    // Get camera position and direction for sword swing area
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    
    // Sword swing area in front of player
    const swingPos = cameraPos.clone().add(cameraDir.clone().multiplyScalar(1.2));
    
    // Distance-based optimization for sword collision detection
    const MAX_SWORD_DISTANCE = COMBAT_CONFIG.collision.swordCheckDistance;
    
    // Check for enemies in swing range
    let hitAnyEnemy = false;
    scene.traverse((child) => {
      if (child.userData.isEnemy && !child.userData.isDead) {
        const enemyPos = new THREE.Vector3();
        child.getWorldPosition(enemyPos);
        
        // Skip distant enemies for performance
        if (cameraPos.distanceTo(enemyPos) > MAX_SWORD_DISTANCE) return;
        
        const distance = swingPos.distanceTo(enemyPos);
        if (distance < 1.8) { // Slightly larger range for continuous swinging
          const swordDamage = 25; // Lower damage for continuous hits
          if (child.userData.takeDamage) {
            child.userData.takeDamage(swordDamage);
          }
          console.log(`⚔️ Desktop ${currentSwordHand} sword hit ${child.userData.enemyType}! ${swordDamage} damage`);
          addHitEffect([enemyPos.x, enemyPos.y + 1, enemyPos.z]);
          hitAnyEnemy = true;
        }
      }
    });
    
    // Play sound if we hit something
    if (hitAnyEnemy) {
      playSwordHit();
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keys.current.w = true;
          break;
        case 'KeyA':
          keys.current.a = true;
          break;
        case 'KeyS':
          keys.current.s = true;
          break;
        case 'KeyD':
          keys.current.d = true;
          break;
        case 'ShiftLeft':
          if (!keys.current.shift) {
            keys.current.shift = true;
            const newJetpackState = !jetpackEnabled;
            setJetpackEnabled(newJetpackState);
            if (onJetpackToggle) {
              onJetpackToggle(newJetpackState);
            }
            console.log(`🚀 Jetpack ${newJetpackState ? 'ENABLED' : 'DISABLED'}`);
          }
          break;
        case 'Space':
          keys.current.space = true;
          if (isGrounded.current && !jetpackEnabled) {
            // Jump when grounded and not flying
            verticalVelocity.current = jumpVelocity;
            isGrounded.current = false;
            console.log('🦘 Jump!');
          }
          event.preventDefault();
          break;
        case 'KeyR':
          // Manual reload
          if (leftClip < maxClipSize || rightClip < maxClipSize) {
            reloadGuns();
          }
          break;
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keys.current.w = false;
          break;
        case 'KeyA':
          keys.current.a = false;
          break;
        case 'KeyS':
          keys.current.s = false;
          break;
        case 'KeyD':
          keys.current.d = false;
          break;
        case 'ShiftLeft':
          keys.current.shift = false;
          break;
        case 'Space':
          keys.current.space = false;
          break;
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
      
      if (event.button === 0) { // Left click - shoot
        if (currentTime > lastShot.current + shotCooldown) {
          fireDesktopBullet();
          lastShot.current = currentTime;
        }
      } else if (event.button === 2) { // Right click - trigger single swing
        if (currentTime > lastSwordSwing.current + swingCooldown && !isSwinging) {
          setIsSwinging(true);
          setSwingingHand(currentSwordHand);
          lastSwordSwing.current = currentTime;
          console.log('⚔️ Desktop sword swing started!');
          
          // Trigger sword swing callback
          if (onSwordSwing) {
            onSwordSwing(currentSwordHand);
          }
        }
      }
    };
    
    const handleMouseUp = (event: MouseEvent) => {
      // Mouse up no longer affects sword swinging - let animation complete naturally
    };
    
    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement !== null;
    };
    
    const handleClick = () => {
      if (!isPointerLocked.current) {
        document.body.requestPointerLock();
      }
    };
    
    // Prevent right-click context menu
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [jetpackEnabled, currentSwordHand, onShoot, onSwordSwing, onJetpackToggle]);
  
  useFrame((state, deltaTime) => {
    // Apply mouse look
    euler.current.setFromQuaternion(camera.quaternion);
    euler.current.y = mouseMovement.current.x;
    euler.current.x = mouseMovement.current.y;
    camera.quaternion.setFromEuler(euler.current);
    
    // Calculate movement direction
    direction.current.set(0, 0, 0);
    
    if (keys.current.w) direction.current.z -= 1;
    if (keys.current.s) direction.current.z += 1;
    if (keys.current.a) direction.current.x -= 1;
    if (keys.current.d) direction.current.x += 1;
    
    direction.current.normalize();
    direction.current.applyQuaternion(camera.quaternion);
    
    // Physics: Apply gravity when not using jetpack
    if (!jetpackEnabled) {
      verticalVelocity.current += gravity * deltaTime;
      
      // Check ground collision
      const newY = camera.position.y + verticalVelocity.current * deltaTime;
      if (newY <= groundLevel) {
        camera.position.y = groundLevel;
        verticalVelocity.current = 0;
        isGrounded.current = true;
      } else {
        camera.position.y = newY;
        isGrounded.current = false;
      }
    }
    
    // Handle jetpack mechanics
    if (jetpackEnabled && fuel > 0) {
      // Allow 3D movement with jetpack
      const speed = jetpackSpeed;
      
      // Jetpack fuel consumption
      const fuelDrain = isGrounded.current ? 15 : 60; // 4x faster when airborne
      setFuel(prev => Math.max(0, prev - fuelDrain * deltaTime));
      
      if (fuel <= 0) {
        setJetpackEnabled(false);
        if (onJetpackToggle) {
          onJetpackToggle(false);
        }
        console.log('⚡ Jetpack fuel depleted!');
      }
      
      // Jetpack movement: spacebar for upward thrust
      if (keys.current.space) {
        verticalVelocity.current = jetpackSpeed * 0.7; // Upward thrust when holding space
      } else {
        verticalVelocity.current *= 0.95; // Slow drift down when not thrusting
      }
      
      // Apply horizontal jetpack movement
      velocity.current.x = direction.current.x * speed;
      velocity.current.z = direction.current.z * speed;
      
      // Apply vertical movement from jetpack
      camera.position.y += verticalVelocity.current * deltaTime;
      
      // Log airborne status
      if (!isGrounded.current) {
        console.log(`⚡ AIRBORNE! Fuel: ${fuel.toFixed(1)}/100`);
      }
    } else {
      // Ground movement only
      direction.current.y = 0; // No vertical movement without jetpack
      const speed = maxSpeed;
      
      velocity.current.x = direction.current.x * speed;
      velocity.current.z = direction.current.z * speed;
      velocity.current.y = 0; // Horizontal movement only
      
      // Fuel recharge when not using jetpack
      setFuel(prev => Math.min(100, prev + 30 * deltaTime));
    }
    
    // Apply movement
    camera.position.add(velocity.current.clone().multiplyScalar(deltaTime));
    
    // Wall collision (basic bounds checking)
    const bounds = 95; // Room boundaries
    camera.position.x = Math.max(-bounds, Math.min(bounds, camera.position.x));
    camera.position.z = Math.max(-95, Math.min(5, camera.position.z));
    
    // Ceiling check
    camera.position.y = Math.min(18, camera.position.y);
    
    // Continuous sword damage detection while swinging
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
      {/* Always visible desktop sword - swings when right-click held */}
      <DesktopSwordVisual 
        isSwinging={isSwinging}
        hand={swingingHand}
        onSwingComplete={() => {
          setIsSwinging(false);
          console.log('⚔️ Desktop sword swing completed!');
        }}
        isVisible={!isVRPresented}
      />
    </>
  );
}