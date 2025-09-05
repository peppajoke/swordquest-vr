import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';
import DesktopSwordVisual from './DesktopSwordVisual';

interface DesktopControlsProps {
  onShoot?: (hand: 'left' | 'right') => void;
  onSwordSwing?: (hand: 'left' | 'right') => void;
  onJetpackToggle?: (enabled: boolean) => void;
}

export default function DesktopControls({ onShoot, onSwordSwing, onJetpackToggle }: DesktopControlsProps) {
  const { camera, scene } = useThree();
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
    shift: false
  });
  
  // Mouse state
  const mouseMovement = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  
  // Jetpack state
  const [jetpackEnabled, setJetpackEnabled] = useState(false);
  const [fuel, setFuel] = useState(100);
  const maxSpeed = 8.0;
  const jetpackSpeed = 12.0;
  
  // Sword swinging state
  const [currentSwordHand, setCurrentSwordHand] = useState<'left' | 'right'>('right');
  const [isSwinging, setIsSwinging] = useState(false);
  const [swingingHand, setSwingingHand] = useState<'left' | 'right'>('right');
  const lastSwordSwing = useRef(0);
  const swingCooldown = 500; // 0.5 seconds between swings
  
  // Gun shooting state
  const lastShot = useRef(0);
  const shotCooldown = 150; // Faster shooting for desktop
  
  // Desktop shooting function
  const fireDesktopBullet = () => {
    // Get camera position and direction for shooting
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    
    // Fire from slightly in front of camera
    const shootPos = cameraPos.clone().add(cameraDir.clone().multiplyScalar(0.5));
    
    // Create instant hit raycast
    const raycaster = new THREE.Raycaster(shootPos, cameraDir);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Create muzzle flash effect
    addHitEffect([shootPos.x, shootPos.y, shootPos.z]);
    
    // Play gun sound
    playGunShoot();
    
    // Check for hits
    for (const intersect of intersects) {
      const hitObject = intersect.object;
      
      // Hit enemy
      if (hitObject.userData.isEnemy && !hitObject.userData.isDead) {
        const gunDamage = 30;
        if (hitObject.userData.takeDamage) {
          hitObject.userData.takeDamage(gunDamage);
        }
        console.log(`🎯 Desktop shot hit ${hitObject.userData.enemyType}! ${gunDamage} damage`);
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break;
      }
      
      // Hit pillar
      if (hitObject.userData.isPillar && !hitObject.userData.destroyed) {
        hitObject.userData.destroyed = true;
        console.log('🎯 Desktop shot destroyed pillar!');
        addHitEffect([intersect.point.x, intersect.point.y, intersect.point.z]);
        break;
      }
    }
    
    console.log('🔫 Desktop gun fired!');
  };
  
  // Desktop sword swing function
  const performDesktopSwordSwing = () => {
    // Start visual swing animation
    setIsSwinging(true);
    setSwingingHand(currentSwordHand);
    
    // Get camera position and direction for sword swing
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    
    // Sword swing area in front of player
    const swingPos = cameraPos.clone().add(cameraDir.clone().multiplyScalar(1.2));
    
    // Create sword swing effect
    addHitEffect([swingPos.x, swingPos.y, swingPos.z]);
    
    // Play sword sound
    playSwordHit();
    
    // Check for enemies in swing range
    scene.traverse((child) => {
      if (child.userData.isEnemy && !child.userData.isDead) {
        const enemyPos = new THREE.Vector3();
        child.getWorldPosition(enemyPos);
        
        const distance = swingPos.distanceTo(enemyPos);
        if (distance < 1.5) {
          const swordDamage = 45;
          if (child.userData.takeDamage) {
            child.userData.takeDamage(swordDamage);
          }
          console.log(`⚔️ Desktop ${currentSwordHand} sword hit ${child.userData.enemyType}! ${swordDamage} damage`);
          addHitEffect([enemyPos.x, enemyPos.y + 1, enemyPos.z]);
        }
      }
    });
    
    console.log(`⚔️ Desktop ${currentSwordHand} sword swing!`);
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
      } else if (event.button === 2) { // Right click - sword swing
        if (currentTime > lastSwordSwing.current + swingCooldown) {
          performDesktopSwordSwing();
          lastSwordSwing.current = currentTime;
          
          // Alternate between swords
          setCurrentSwordHand(currentSwordHand === 'left' ? 'right' : 'left');
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
    
    // Prevent right-click context menu
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
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
    
    // Handle jetpack mechanics
    if (jetpackEnabled && fuel > 0) {
      // Allow 3D movement with jetpack
      const speed = jetpackSpeed;
      
      // Jetpack fuel consumption
      const isGrounded = camera.position.y <= 1.8;
      const fuelDrain = isGrounded ? 15 : 60; // 4x faster when airborne
      setFuel(prev => Math.max(0, prev - fuelDrain * deltaTime));
      
      if (fuel <= 0) {
        setJetpackEnabled(false);
        if (onJetpackToggle) {
          onJetpackToggle(false);
        }
        console.log('⚡ Jetpack fuel depleted!');
      }
      
      // Apply jetpack movement (including Y axis)
      velocity.current.x = direction.current.x * speed;
      velocity.current.y = direction.current.y * speed;
      velocity.current.z = direction.current.z * speed;
      
      // Log airborne status
      if (!isGrounded) {
        console.log(`⚡ AIRBORNE! Fuel: ${fuel.toFixed(1)}/100`);
      }
    } else {
      // Ground movement only
      direction.current.y = 0; // No vertical movement without jetpack
      const speed = maxSpeed;
      
      velocity.current.x = direction.current.x * speed;
      velocity.current.z = direction.current.z * speed;
      
      // Apply gravity
      velocity.current.y -= 9.8 * deltaTime;
      
      // Ground check
      if (camera.position.y <= 1.8) {
        camera.position.y = 1.8;
        velocity.current.y = 0;
      }
      
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
  });
  
  return (
    <>
      {/* Import and render sword visual */}
      {isSwinging && (
        <DesktopSwordVisual 
          isSwinging={isSwinging}
          hand={swingingHand}
          onSwingComplete={() => setIsSwinging(false)}
        />
      )}
    </>
  );
}