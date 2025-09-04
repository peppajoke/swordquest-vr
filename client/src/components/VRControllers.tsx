import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
// Removed procedural generation import

const SWORD_GEOMETRY = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 8);
const SWORD_HANDLE_GEOMETRY = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
const SWORD_MATERIAL = new THREE.MeshLambertMaterial({ color: '#c0392b' });
const HANDLE_MATERIAL = new THREE.MeshLambertMaterial({ color: '#8b4513' });

export default function VRControllers() {
  const { gl, scene, camera } = useThree();
  const leftSwordRef = useRef<THREE.Group>();
  const rightSwordRef = useRef<THREE.Group>();
  const leftGrabbing = useRef(false);
  const rightGrabbing = useRef(false);
  const controller0Ref = useRef<THREE.Group>();
  const controller1Ref = useRef<THREE.Group>();
  const { addSwordCollider, removeSwordCollider, targets, destroyTarget, addHitEffect, handleSwordClash, canSwordClash, updateMovement, spawnNewTargets, cleanupOldTargets, gameSpeed } = useVRGame();
  const previousPositions = useRef<{ [key: string]: THREE.Vector3 }>({});
  const bullets = useRef<{ id: string, mesh: THREE.Mesh, velocity: THREE.Vector3, controllerId: string }[]>([]);
  const lastBulletTime = useRef<{ [key: string]: number }>({});
  const leftTriggerPressed = useRef(false);
  const rightTriggerPressed = useRef(false);
  const worldGenerator = useRef<any>(null);
  const staticObjects = useRef<THREE.Object3D[]>([]);
  const lastSwordClashTime = useRef(0);
  const lastAButtonTime = useRef<{ [key: string]: number }>({});
  
  // Fuel system
  const fuel = useRef(2000); // 0-2000 fuel (20x more)
  const maxFuel = useRef(2000); // 20x more fuel
  const fuelDrainRate = useRef(25); // fuel per second when accelerating
  const fuelRechargeRate = useRef(15); // fuel per second when not holding swords
  const fuelPenaltyRecovery = useRef(5); // slow recovery after running empty
  const wasEmpty = useRef(false); // track if fuel was completely empty
  const emptyPenaltyTime = useRef(0); // time since fuel was empty
  
  // Momentum-based movement system
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const acceleration = useRef(new THREE.Vector3(0, 0, 0));
  const maxSpeed = useRef(5.0); // INCREASED: Much higher max speed
  const accelerationRate = useRef(3.0);
  const decelerationRate = useRef(0.05); // MUCH SLOWER: Extremely slow deceleration to maintain momentum much longer
  const turnRate = useRef(0.1);
  
  // Advanced turning mechanics
  const lastDirection = useRef(new THREE.Vector3(0, 0, -1));
  const wasAccelerating = useRef(false);
  const momentumTransferBonus = useRef(0); // temporary speed boost
  
  // Removed sword scaling variables

  // Create static level with floor and destructible objects
  const initializeStaticLevel = (worldGroup: THREE.Group) => {
  // Create large floor
  const floorGeometry = new THREE.PlaneGeometry(200, 200);
  const floorMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x4a4a4a,
    transparent: true,
    opacity: 0.8 
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  worldGroup.add(floor);
  
  // Create lots of destructible objects scattered around
  const objects: THREE.Object3D[] = [];
  
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    const y = 0.5;
    
    // Random object type
    const type = Math.floor(Math.random() * 6);
    let object: THREE.Object3D;
    
    switch (type) {
      case 0: // Wooden Crates
        object = new THREE.Mesh(
          new THREE.BoxGeometry(0.8 + Math.random() * 0.6, 0.8 + Math.random() * 0.6, 0.8 + Math.random() * 0.6),
          new THREE.MeshLambertMaterial({ color: 0x8B4513 + Math.random() * 0x333333 })
        );
        break;
      case 1: // Crystal Formations
        object = new THREE.Mesh(
          new THREE.ConeGeometry(0.3 + Math.random() * 0.4, 1.0 + Math.random() * 0.8, 6),
          new THREE.MeshLambertMaterial({ color: 0x00FFFF + Math.random() * 0x004444, transparent: true, opacity: 0.8 })
        );
        break;
      case 2: // Pottery/Vases
        object = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3 + Math.random() * 0.3, 0.4 + Math.random() * 0.3, 1.0 + Math.random() * 0.5, 8),
          new THREE.MeshLambertMaterial({ color: 0xCD853F + Math.random() * 0x222222 })
        );
        break;
      case 3: // Ice Blocks
        object = new THREE.Mesh(
          new THREE.BoxGeometry(0.6 + Math.random() * 0.8, 0.6 + Math.random() * 0.8, 0.6 + Math.random() * 0.8),
          new THREE.MeshLambertMaterial({ color: 0x87CEEB + Math.random() * 0x111111, transparent: true, opacity: 0.7 })
        );
        break;
      case 4: // Trees/Cylinders
        object = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15 + Math.random() * 0.4, 0.3 + Math.random() * 0.6, 1.5 + Math.random() * 2.5),
          new THREE.MeshLambertMaterial({ color: 0x4a4a2f + Math.random() * 0x202020 })
        );
        break;
      default: // Rocks/Spheres
        object = new THREE.Mesh(
          new THREE.SphereGeometry(0.4 + Math.random() * 0.9, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0x666666 + Math.random() * 0x333333 })
        );
        break;
    }
    
    object.position.set(x, y, z);
    object.castShadow = true;
    object.userData = { destroyable: true, health: 1, type: 'static' };
    
    objects.push(object);
    worldGroup.add(object);
  }
  
    console.log(`🏗️ Created static level with ${objects.length} destructible objects`);
    staticObjects.current = objects;
    return objects;
  };

  // Create bullet mesh
  const createBullet = () => {
    const bulletGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#ffff00' });
    return new THREE.Mesh(bulletGeometry, bulletMaterial);
  };

  // Fire bullet function
  const fireBullet = (controller: THREE.Group, controllerId: string) => {
    const now = Date.now();
    const lastTime = lastBulletTime.current[controllerId] || 0;
    
    // Rate limiting: 100ms between bullets (10 bullets per second max)
    if (now - lastTime < 100) return;
    
    lastBulletTime.current[controllerId] = now;
    
    const bullet = createBullet();
    const bulletId = `bullet_${controllerId}_${now}`;
    
    // Get controller position and direction
    const controllerPos = new THREE.Vector3();
    const controllerDirection = new THREE.Vector3(0, 0, -1);
    
    controller.getWorldPosition(controllerPos);
    controller.getWorldDirection(controllerDirection);
    
    // Position bullet at controller location
    bullet.position.copy(controllerPos);
    
    // Calculate bullet velocity (forward from controller)
    const bulletVelocity = controllerDirection.multiplyScalar(10); // Speed: 10 units per frame
    
    // Add to scene
    scene.add(bullet);
    
    // Store bullet data
    bullets.current.push({
      id: bulletId,
      mesh: bullet,
      velocity: bulletVelocity,
      controllerId
    });
    
    console.log(`VRControllers: Bullet fired from ${controllerId}`);
  };

  // Create sword mesh
  const createSword = () => {
    const swordGroup = new THREE.Group();
    
    // Blade (smaller)
    const blade = new THREE.Mesh(SWORD_GEOMETRY, SWORD_MATERIAL);
    blade.position.y = 0.25;
    blade.castShadow = true;
    swordGroup.add(blade);
    
    // Handle
    const handle = new THREE.Mesh(SWORD_HANDLE_GEOMETRY, HANDLE_MATERIAL);
    handle.position.y = -0.1;
    handle.castShadow = true;
    swordGroup.add(handle);
    
    // Guard (smaller)
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.015, 0.03),
      new THREE.MeshLambertMaterial({ color: '#34495e' })
    );
    guard.position.y = 0.05;
    guard.castShadow = true;
    swordGroup.add(guard);

    // Rotate sword 45 degrees away from player (forward)
    swordGroup.rotation.x = -Math.PI / 4; // 45 degrees forward
    
    return swordGroup;
  };

  useEffect(() => {
    if (!gl.xr) return;
    
    console.log('VRControllers: Setting up grip-based movement system');
    
    // Get controllers from renderer
    const controller0 = gl.xr.getController(0);
    const controller1 = gl.xr.getController(1);
    
    controller0Ref.current = controller0;
    controller1Ref.current = controller1;
    
    // Initialize static level
    const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
    if (worldGroup && !worldGenerator.current) {
      // Mark as initialized to prevent re-creation
      worldGenerator.current = { initialized: true } as any;
      initializeStaticLevel(worldGroup);
      console.log('🏗️ Static level initialized');
    }
    
    // Setup event handlers
    const handleSqueezeStart0 = () => {
      console.log('Left controller squeeze start');
      leftGrabbing.current = true;
    };
    
    const handleSqueezeEnd0 = () => {
      console.log('Left controller squeeze end');
      leftGrabbing.current = false;
    };
    
    const handleSqueezeStart1 = () => {
      console.log('Right controller squeeze start');
      rightGrabbing.current = true;
    };
    
    const handleSqueezeEnd1 = () => {
      console.log('Right controller squeeze end');
      rightGrabbing.current = false;
    };
    
    // Comprehensive trigger event handlers for different event types
    const handleSelectStart0 = () => {
      console.log('🔫 LEFT TRIGGER FIRED - selectstart');
      leftTriggerPressed.current = true;
    };
    
    const handleSelectEnd0 = () => {
      console.log('🔫 LEFT TRIGGER RELEASED - selectend');
      leftTriggerPressed.current = false;
    };
    
    const handleSelectStart1 = () => {
      console.log('🔫 RIGHT TRIGGER FIRED - selectstart');
      rightTriggerPressed.current = true;
    };
    
    const handleSelectEnd1 = () => {
      console.log('🔫 RIGHT TRIGGER RELEASED - selectend');
      rightTriggerPressed.current = false;
    };
    
    // Alternative event handlers for different button types
    const handleClick0 = () => {
      console.log('🔫 LEFT CLICK EVENT');
      leftTriggerPressed.current = true;
      setTimeout(() => { leftTriggerPressed.current = false; }, 100);
    };
    
    const handleClick1 = () => {
      console.log('🔫 RIGHT CLICK EVENT');
      rightTriggerPressed.current = true;
      setTimeout(() => { rightTriggerPressed.current = false; }, 100);
    };
    
    // Enhanced squeeze handlers for sword animation
    const originalSqueezeStart0 = handleSqueezeStart0;
    const originalSqueezeEnd0 = handleSqueezeEnd0;
    const originalSqueezeStart1 = handleSqueezeStart1;
    const originalSqueezeEnd1 = handleSqueezeEnd1;
    
    const handleSqueezeStart0Extended = () => {
      originalSqueezeStart0();
      leftGrabbing.current = true;
      console.log('⚔️ LEFT SWORD GRIPPED - Movement enabled!');
      // Send to Quest 3 debug display
      if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
        (window as any).vrDebugLog('LEFT SWORD GRIPPED!');
      }
    };
    
    const handleSqueezeEnd0Extended = () => {
      originalSqueezeEnd0();
      leftGrabbing.current = false;
      console.log('✋ Left sword released - Movement may stop');
    };
    
    const handleSqueezeStart1Extended = () => {
      originalSqueezeStart1();
      rightGrabbing.current = true;
      console.log('⚔️ RIGHT SWORD GRIPPED - Movement enabled!');
      // Send to Quest 3 debug display
      if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
        (window as any).vrDebugLog('RIGHT SWORD GRIPPED!');
      }
    };
    
    const handleSqueezeEnd1Extended = () => {
      originalSqueezeEnd1();
      rightGrabbing.current = false;
      console.log('✋ Right sword released - Movement may stop');
    };
    
    controller0.addEventListener('squeezestart', handleSqueezeStart0Extended);
    controller0.addEventListener('squeezeend', handleSqueezeEnd0Extended);
    controller1.addEventListener('squeezestart', handleSqueezeStart1Extended);
    controller1.addEventListener('squeezeend', handleSqueezeEnd1Extended);
    
    // Add multiple types of trigger/select event listeners
    console.log('🎮 Adding ALL possible trigger event listeners...');
    
    // Primary trigger events (selectstart/selectend)
    controller0.addEventListener('selectstart', handleSelectStart0);
    controller0.addEventListener('selectend', handleSelectEnd0);
    controller1.addEventListener('selectstart', handleSelectStart1);
    controller1.addEventListener('selectend', handleSelectEnd1);
    
    // Alternative button events
    controller0.addEventListener('click', handleClick0);
    controller1.addEventListener('click', handleClick1);
    
    // Try inputsourceschange events
    controller0.addEventListener('connected', () => console.log('🎮 Controller 0 connected'));
    controller1.addEventListener('connected', () => console.log('🎮 Controller 1 connected'));
    
    // Add any available input events
    ['select', 'selectstart', 'selectend', 'click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach(eventType => {
      try {
        controller0.addEventListener(eventType, (e) => {
          console.log(`🎮 Controller 0 ${eventType} event:`, e);
          if (eventType.includes('start') || eventType.includes('down') || eventType === 'click') {
            leftTriggerPressed.current = true;
            setTimeout(() => { leftTriggerPressed.current = false; }, 100);
          }
        });
        controller1.addEventListener(eventType, (e) => {
          console.log(`🎮 Controller 1 ${eventType} event:`, e);
          if (eventType.includes('start') || eventType.includes('down') || eventType === 'click') {
            rightTriggerPressed.current = true;
            setTimeout(() => { rightTriggerPressed.current = false; }, 100);
          }
        });
      } catch (error) {
        console.warn(`Event ${eventType} not supported:`, error);
      }
    });
    
    return () => {
      try {
        controller0.removeEventListener('squeezestart', handleSqueezeStart0Extended);
        controller0.removeEventListener('squeezeend', handleSqueezeEnd0Extended);
        controller1.removeEventListener('squeezestart', handleSqueezeStart1Extended);
        controller1.removeEventListener('squeezeend', handleSqueezeEnd1Extended);
        
        controller0.removeEventListener('selectstart', handleSelectStart0);
        controller0.removeEventListener('selectend', handleSelectEnd0);
        controller1.removeEventListener('selectstart', handleSelectStart1);
        controller1.removeEventListener('selectend', handleSelectEnd1);
        
        controller0.removeEventListener('click', handleClick0);
        controller1.removeEventListener('click', handleClick1);
      } catch (error) {
        console.warn('Error removing controller event listeners:', error);
      }
    };
  }, [gl]);

  useFrame((state, deltaTime) => {
    const controller0 = controller0Ref.current;
    const controller1 = controller1Ref.current;
    
    // Debug controller detection and send to Quest 3 display
    if (Math.random() < 0.01) { // Log 1% of frames
      const isVRActive = !!gl.xr.getSession();
      // Removed fuel debug logging
      
      // Send debug data to Quest 3 display
      if (typeof window !== 'undefined') {
        (window as any).vrDebugData = {
          controllersDetected: { left: !!controller0, right: !!controller1 },
          vrSessionActive: isVRActive,
          gripStates: { 
            leftGripping: leftGrabbing.current, 
            rightGripping: rightGrabbing.current 
          },
          timestamp: Date.now()
        };
      }
    }
    
    if (!controller0 || !controller1) return;
    
    // Update endless runner movement
    updateMovement(deltaTime);
    
    // Momentum-based movement system with acceleration
    const leftGripping = leftGrabbing.current;
    const rightGripping = rightGrabbing.current;
    let swordsHeld = 0;
    
    if (leftGripping) swordsHeld++;
    if (rightGripping) swordsHeld++;
    
    // Get the direction the player is facing - constrained to ground level (no vertical movement)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Lock to ground level - no up/down movement
    cameraDirection.normalize(); // Renormalize after removing Y component
    
    // Update fuel system
    if (swordsHeld > 0 && fuel.current > 0) {
      // Drain fuel when accelerating
      fuel.current -= fuelDrainRate.current * deltaTime;
      if (fuel.current <= 0) {
        fuel.current = 0;
        wasEmpty.current = true;
        emptyPenaltyTime.current = 0;
        // Fuel empty
      }
      wasAccelerating.current = true;
    } else {
      // Recharge fuel when not holding swords
      if (swordsHeld === 0) {
        const rechargeRate = wasEmpty.current && emptyPenaltyTime.current < 3.0 
          ? fuelPenaltyRecovery.current // slow recovery for 3 seconds after empty
          : fuelRechargeRate.current; // normal recovery
        
        fuel.current += rechargeRate * deltaTime;
        if (fuel.current >= maxFuel.current) {
          fuel.current = maxFuel.current;
          wasEmpty.current = false; // reset penalty
        }
        
        if (wasEmpty.current) {
          emptyPenaltyTime.current += deltaTime;
          if (emptyPenaltyTime.current >= 3.0) {
            wasEmpty.current = false;
            // Fuel penalty recovery complete
          }
        }
      }
      wasAccelerating.current = false;
    }
    
    // Calculate desired direction based on grip state, head direction, and fuel
    if (swordsHeld > 0 && fuel.current > 0) {
      const speedMultiplier = swordsHeld; // 1x for one sword, 2x for both
      const fuelMultiplier = Math.max(0.3, fuel.current / maxFuel.current); // 30% minimum speed when low fuel
      const desiredSpeed = maxSpeed.current * speedMultiplier * fuelMultiplier + momentumTransferBonus.current;
      
      // Advanced turning mechanics
      const directionChange = cameraDirection.angleTo(lastDirection.current);
      const isHarshTurn = directionChange > Math.PI / 6; // 30 degrees or more
      
      if (wasAccelerating.current && isHarshTurn) {
        // Harsh turn while accelerating: reduce momentum
        const momentumLoss = 0.7; // lose 30% momentum
        velocity.current.multiplyScalar(momentumLoss);
        // Harsh turn while accelerating
      }
      
      const targetDirection = cameraDirection.clone().multiplyScalar(desiredSpeed);
      
      // Smoothly interpolate acceleration toward target direction
      acceleration.current.lerp(targetDirection, turnRate.current);
      
      // Apply acceleration to velocity
      velocity.current.add(acceleration.current.clone().multiplyScalar(deltaTime * accelerationRate.current));
      
      // Clamp velocity to max speed (including bonus)
      if (velocity.current.length() > desiredSpeed) {
        velocity.current.normalize().multiplyScalar(desiredSpeed);
      }
      
      lastDirection.current.copy(cameraDirection);
      
      // Removed momentum logging
    } else {
      // Exponential speed decay - maintains high speeds, drops low speeds quickly
      const currentSpeed = velocity.current.length();
      const speedThreshold = 1.0; // Speed below which decay accelerates
      
      if (currentSpeed > speedThreshold) {
        // High speeds: gentle decay (maintain momentum)
        const highSpeedDecay = 0.98; // Very gentle decay for high speeds
        velocity.current.multiplyScalar(Math.pow(highSpeedDecay, deltaTime * 60));
      } else {
        // Low speeds: exponential decay (quick drop-off)
        const normalizedSpeed = currentSpeed / speedThreshold; // 0 to 1
        const exponentialFactor = Math.pow(normalizedSpeed, 2); // Square makes it more exponential
        const decayRate = 0.1 + (0.9 * exponentialFactor); // 0.1 to 1.0 decay rate
        velocity.current.multiplyScalar(Math.pow(decayRate, deltaTime * 60));
      }
      
      // Gentle acceleration decay
      acceleration.current.multiplyScalar(Math.pow(0.85, deltaTime * 60));
      
      // Check for momentum transfer opportunities
      if (!wasAccelerating.current) {
        const directionChange = cameraDirection.angleTo(lastDirection.current);
        const isSignificantTurn = directionChange > Math.PI / 8; // 22.5 degrees
        
        if (isSignificantTurn && velocity.current.length() > 1.0) {
          // Good turning technique: released acceleration then turned
          const currentSpeed = velocity.current.length();
          const transferEfficiency = 1.0 + (currentSpeed / maxSpeed.current) * 0.3; // up to 30% bonus
          
          // Transfer momentum to new direction with bonus
          const newDirection = cameraDirection.clone().normalize();
          velocity.current = newDirection.multiplyScalar(currentSpeed * transferEfficiency);
          
          // Temporary speed boost
          momentumTransferBonus.current = Math.min(2.0, currentSpeed * 0.2);
          
          // Momentum transfer speed boost
        }
        
        lastDirection.current.copy(cameraDirection);
      }
      
      // Decay momentum transfer bonus
      if (momentumTransferBonus.current > 0) {
        momentumTransferBonus.current -= deltaTime * 2.0; // decay over 1 second
        if (momentumTransferBonus.current < 0) momentumTransferBonus.current = 0;
      }
      
      // Removed decay logging
    }
    
    // Apply velocity to movement
    if (velocity.current.length() > 0.01) {
      const moveVector = velocity.current.clone().multiplyScalar(deltaTime);
      
      // FIX: WebXR movement - move world group, not entire scene
      if (gl.xr.getSession()) {
        // In VR - move only the world group (environment/targets), not controllers
        const worldGroup = scene.getObjectByName('worldGroup');
        if (worldGroup) {
          worldGroup.position.add(moveVector.clone().negate());
        }
        
        // Also move the camera position for consistency with target cleanup
        camera.position.add(moveVector);
        
        if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
          (window as any).vrDebugLog(`VR MOMENTUM: ${velocity.current.length().toFixed(3)} speed`);
        }
      } else {
        // In 2D preview - move camera directly
        camera.position.add(moveVector);
      }
    }
    
    // Only spawn new targets when moving (gripping swords)
    if (swordsHeld > 0 && Math.random() < 0.008) { // Spawn targets when moving
      spawnNewTargets();
    }
    
    // Clean up old targets
    cleanupOldTargets(camera.position.z);
    
    // Static level - no world generation needed
    
    // Get controller gamepads using multiple robust methods
    let gamepad0: any = null;
    let gamepad1: any = null;
    
    // Method 1: Try userData.gamepad
    gamepad0 = controller0.userData?.gamepad;
    gamepad1 = controller1.userData?.gamepad;
    
    // Method 2: Try direct gamepad property
    gamepad0 = gamepad0 || (controller0 as any).gamepad;
    gamepad1 = gamepad1 || (controller1 as any).gamepad;
    
    // Method 3: Try WebXR session input sources
    const session = gl.xr.getSession();
    if (session?.inputSources) {
      for (const inputSource of session.inputSources) {
        if (inputSource.gamepad) {
          if (inputSource.handedness === 'left') {
            gamepad0 = gamepad0 || inputSource.gamepad;
          } else if (inputSource.handedness === 'right') {
            gamepad1 = gamepad1 || inputSource.gamepad;
          }
        }
      }
    }
    
    // Method 4: Try navigator.getGamepads() as fallback
    if (!gamepad0 || !gamepad1) {
      const navigatorGamepads = navigator.getGamepads?.();
      if (navigatorGamepads) {
        for (let i = 0; i < navigatorGamepads.length; i++) {
          const gamepad = navigatorGamepads[i];
          if (gamepad) {
            // Assign based on index or ID
            if (!gamepad0 && i === 0) gamepad0 = gamepad;
            if (!gamepad1 && i === 1) gamepad1 = gamepad;
          }
        }
      }
    }
    
    // Debug gamepad detection (reduce spam)
    if (Math.random() < 0.002) { // Log 0.2% of frames
      if (gamepad0 || gamepad1) {
        console.log('🎮 GAMEPADS DETECTED! Left:', !!gamepad0, 'Right:', !!gamepad1);
        if (gamepad0?.axes?.length >= 4) {
          console.log('  Left joystick - X:', gamepad0.axes[2]?.toFixed(2), 'Y:', gamepad0.axes[3]?.toFixed(2));
        }
      }
    }
    
    // Handle movement with left controller's joystick (try multiple axis mappings)
    if (gamepad0?.axes && gamepad0.axes.length >= 2) {
      // Try different joystick axis mappings for Quest 3
      let joystickX = 0;
      let joystickY = 0;
      
      // Primary mapping: axes[2] and axes[3] (typical for left joystick)
      if (gamepad0.axes.length >= 4) {
        joystickX = gamepad0.axes[2] || 0;
        joystickY = gamepad0.axes[3] || 0;
      }
      
      // Fallback mapping: axes[0] and axes[1] (in case they're mapped differently)
      if (Math.abs(joystickX) < 0.05 && Math.abs(joystickY) < 0.05) {
        joystickX = gamepad0.axes[0] || 0;
        joystickY = gamepad0.axes[1] || 0;
      }
      
      if (Math.abs(joystickX) > 0.1 || Math.abs(joystickY) > 0.1) { // Dead zone
        const moveSpeed = 0.08; // Slightly faster movement
        
        // Get camera's forward and right vectors
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        // Apply camera rotation to movement vectors (for head-relative movement)
        forward.applyQuaternion(camera.quaternion);
        right.applyQuaternion(camera.quaternion);
        
        // Flatten movement vectors to prevent flying
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();
        
        // Calculate movement direction
        const moveDirection = new THREE.Vector3();
        moveDirection.add(forward.multiplyScalar(-joystickY)); // Forward/backward
        moveDirection.add(right.multiplyScalar(joystickX));    // Left/right
        
        // Apply movement to camera position
        camera.position.add(moveDirection.multiplyScalar(moveSpeed));
        
      }
    }
    
    // Handle trigger input for bullet firing
    // Removed gamepad debug logging
    
    // Handle A button for 180-degree flip
    const handleAButton = (controllerId: string) => {
      const now = Date.now();
      const lastTime = lastAButtonTime.current[controllerId] || 0;
      
      // Rate limiting: 500ms between flips
      if (now - lastTime < 500) return;
      
      lastAButtonTime.current[controllerId] = now;
      
      // A button flip
      
      // Rotate camera 180 degrees around Y axis (horizontal flip)
      camera.rotateY(Math.PI);
      
      // Also rotate the worldGroup to maintain proper spatial relationship
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        // Rotate around the camera position
        const cameraPos = camera.position.clone();
        worldGroup.position.sub(cameraPos);
        worldGroup.rotateY(Math.PI);
        worldGroup.position.add(cameraPos);
      }
    };

    // Use event-based trigger detection AND fallback to gamepad polling
    if (leftTriggerPressed.current) {
      console.log('🚀 FIRING LEFT BULLET (event-based)');
      fireBullet(controller0, 'left');
    }
    
    if (rightTriggerPressed.current) {
      console.log('🚀 FIRING RIGHT BULLET (event-based)');
      fireBullet(controller1, 'right');
    }
    
    // FALLBACK: Also try gamepad button polling as backup
    if (gamepad0?.buttons) {
      // Try all possible button mappings for Quest 3
      for (let i = 0; i < gamepad0.buttons.length; i++) {
        if (gamepad0.buttons[i]?.pressed) {
          // Button 4 is typically A button on Quest 3 controllers
          if (i === 4) {
            handleAButton('left');
          } else {
            console.log(`🎮 Left controller button ${i} pressed - FIRING!`);
            fireBullet(controller0, 'left');
          }
          break; // Only process one button per frame
        }
      }
    }
    
    if (gamepad1?.buttons) {
      // Try all possible button mappings for Quest 3
      for (let i = 0; i < gamepad1.buttons.length; i++) {
        if (gamepad1.buttons[i]?.pressed) {
          // Button 4 is typically A button on Quest 3 controllers
          if (i === 4) {
            handleAButton('right');
          } else {
            console.log(`🎮 Right controller button ${i} pressed - FIRING!`);
            fireBullet(controller1, 'right');
          }
          break; // Only process one button per frame
        }
      }
    }
    
    // Removed sword scaling animation - swords now disappear completely
    
    // Handle left controller sword - only when squeezing
    if (leftGrabbing.current) {
      if (!leftSwordRef.current?.parent) {
        const sword = createSword();
        leftSwordRef.current = sword;
        controller0.add(sword);
        addSwordCollider('left', sword);
        console.log('VRControllers: Left sword spawned');
      }
    } else {
      // Remove sword when not squeezing
      if (leftSwordRef.current?.parent) {
        controller0.remove(leftSwordRef.current);
        removeSwordCollider('left');
        leftSwordRef.current = undefined;
        console.log('VRControllers: Left sword removed');
      }
    }

    // Handle right controller sword - only when squeezing
    if (rightGrabbing.current) {
      if (!rightSwordRef.current?.parent) {
        const sword = createSword();
        rightSwordRef.current = sword;
        controller1.add(sword);
        addSwordCollider('right', sword);
        console.log('VRControllers: Right sword spawned');
      }
    } else {
      // Remove sword when not squeezing
      if (rightSwordRef.current?.parent) {
        controller1.remove(rightSwordRef.current);
        removeSwordCollider('right');
        rightSwordRef.current = undefined;
        console.log('VRControllers: Right sword removed');
      }
    }

    // Update bullets
    bullets.current = bullets.current.filter(bullet => {
      // Move bullet
      bullet.mesh.position.add(bullet.velocity);
      
      // Check collision with targets
      let hitTarget = false;
      targets.forEach(target => {
        if (target.destroyed) return;
        
        const targetPos = new THREE.Vector3(...target.position);
        const distance = bullet.mesh.position.distanceTo(targetPos);
        
        if (distance < 0.6) { // Bullet hit target
          console.log(`Bullet ${bullet.id} hit target ${target.id}!`);
          
          // Calculate hit direction for shattering
          const hitDirection = bullet.mesh.position.clone().sub(targetPos).normalize();
          
          destroyTarget(target.id);
          addHitEffect(target.position, hitDirection);
          hitTarget = true;
        }
      });
      
      // Remove bullet if it hit something or traveled too far
      if (hitTarget || bullet.mesh.position.length() > 50) {
        scene.remove(bullet.mesh);
        return false;
      }
      
      return true;
    });

    // Update collision detection
    [{ id: 'left', sword: leftSwordRef.current, controller: controller0 },
     { id: 'right', sword: rightSwordRef.current, controller: controller1 }].forEach(({ id, sword, controller }) => {
      if (!sword || !controller) {
        console.log(`⚠️ COLLISION DEBUG: Skipping ${id} - sword exists: ${!!sword}, controller exists: ${!!controller}`);
        return;
      }
      console.log(`🔍 COLLISION DEBUG: Running collision check for ${id} sword`);

      // Get sword tip position instead of controller position
      const currentPos = new THREE.Vector3();
      if (sword) {
        // Get the sword's blade tip position (blade is smaller now)
        const bladeTip = new THREE.Vector3(0, 0.5, 0); // Tip of the smaller blade
        sword.localToWorld(bladeTip);
        currentPos.copy(bladeTip);
      } else {
        controller.getWorldPosition(currentPos);
      }
      
      const prevPos = previousPositions.current[id];
      if (prevPos) {
        const velocity = currentPos.clone().sub(prevPos);
        const speed = velocity.length();
        
        // Check collisions always - no speed requirement for destruction
        if (true) {
          // Check collisions with game targets
          targets.forEach(target => {
            if (target.destroyed) return;

            const targetPos = new THREE.Vector3(...target.position);
            const distance = currentPos.distanceTo(targetPos);
            
            // Large collision radius - easy to hit
            if (distance < 2.5) {
              console.log(`VRControllers: Sword ${id} hit target ${target.id}!`);
              destroyTarget(target.id);
              addHitEffect(target.position);
            }
          });
          
          // Check collisions with static destructible objects
          if (staticObjects.current.length === 0) {
            console.log('⚠️ No static objects found for collision detection');
          }
          
          // Get world group position offset for coordinate space correction
          const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
          const worldOffset = worldGroup ? worldGroup.position.clone() : new THREE.Vector3(0, 0, 0);
          
          let closestDistance = Infinity;
          staticObjects.current.forEach(obj => {
            if (!obj.userData || obj.userData.destroyed) return;
            
            // Get object's world position (accounting for worldGroup movement)
            const objWorldPos = new THREE.Vector3();
            obj.getWorldPosition(objWorldPos);
            
            const distance = currentPos.distanceTo(objWorldPos);
            if (distance < closestDistance) {
              closestDistance = distance;
            }
            
            if (distance < 2.5) {
              console.log(`💥 COLLISION HIT: Sword ${id} destroyed ${obj.userData.type || 'object'} at distance ${distance.toFixed(2)}!`);
              console.log(`💥 COLLISION HIT: Object world pos: ${objWorldPos.x.toFixed(2)}, ${objWorldPos.y.toFixed(2)}, ${objWorldPos.z.toFixed(2)}`);
              console.log(`💥 COLLISION HIT: Sword tip pos: ${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}`);
              
              // Mark as destroyed
              obj.userData.destroyed = true;
              
              // Add hit effect using world position
              addHitEffect([objWorldPos.x, objWorldPos.y, objWorldPos.z]);
              
              // Animate destruction - scale down and fade out
              const originalScale = obj.scale.clone();
              const tl = { progress: 0 };
              
              const animate = () => {
                tl.progress += 0.05;
                if (tl.progress >= 1) {
                  // Remove from scene
                  obj.parent?.remove(obj);
                  if (obj instanceof THREE.Mesh) {
                    obj.geometry?.dispose();
                    if (Array.isArray(obj.material)) {
                      obj.material.forEach(mat => mat.dispose());
                    } else {
                      obj.material?.dispose();
                    }
                  }
                  return;
                }
                
                // Scale down and fade
                const scale = 1 - tl.progress;
                obj.scale.copy(originalScale.clone().multiplyScalar(scale));
                
                if (obj instanceof THREE.Mesh && obj.material) {
                  const material = Array.isArray(obj.material) ? obj.material[0] : obj.material;
                  if ('opacity' in material) {
                    material.opacity = scale;
                    material.transparent = true;
                  }
                }
                
                requestAnimationFrame(animate);
              };
              
              animate();
            }
          });
          
          // Enhanced collision debug logging
          if (closestDistance !== Infinity && closestDistance < 10) {
            console.log(`📏 COLLISION DEBUG: ${id} sword closest object at distance: ${closestDistance.toFixed(2)}`);
            console.log(`🌍 COLLISION DEBUG: WorldGroup offset: ${worldOffset.x.toFixed(2)}, ${worldOffset.y.toFixed(2)}, ${worldOffset.z.toFixed(2)}`);
            console.log(`⚔️ COLLISION DEBUG: Sword tip position: ${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}`);
            console.log(`📊 COLLISION DEBUG: Static objects count: ${staticObjects.current.length}, Active objects: ${staticObjects.current.filter(o => !o.userData?.destroyed).length}`);
          }
        }
      }
      
      previousPositions.current[id] = currentPos.clone();
    });
    
    // Sword-to-sword collision detection
    if (controller0 && controller1 && leftSwordRef.current && rightSwordRef.current) {
      const leftPos = new THREE.Vector3();
      const rightPos = new THREE.Vector3();
      
      // Get actual sword tip positions
      const leftTip = new THREE.Vector3(0, 0.5, 0);
      const rightTip = new THREE.Vector3(0, 0.5, 0);
      leftSwordRef.current.localToWorld(leftTip);
      rightSwordRef.current.localToWorld(rightTip);
      leftPos.copy(leftTip);
      rightPos.copy(rightTip);
      
      // Check distance between sword tips (accounting for sword length)
      const swordDistance = leftPos.distanceTo(rightPos);
      
      if (swordDistance < 0.8 && canSwordClash()) { // Swords are close enough to clash
        console.log(`💥 SWORD CLASH DETECTED: Distance ${swordDistance.toFixed(2)} between sword tips!`);
        console.log(`💥 SWORD CLASH: Left tip: ${leftPos.x.toFixed(2)}, ${leftPos.y.toFixed(2)}, ${leftPos.z.toFixed(2)}`);
        console.log(`💥 SWORD CLASH: Right tip: ${rightPos.x.toFixed(2)}, ${rightPos.y.toFixed(2)}, ${rightPos.z.toFixed(2)}`);
        
        // Calculate collision point (midpoint between swords)
        const collisionPoint = leftPos.clone().lerp(rightPos, 0.5);
        
        // Get camera position and direction for projectile
        const cameraPosition = camera.position.clone();
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(camera.quaternion);
        
        // Fire actual projectile from sword clash point
        console.log('⚔️ SWORD CLASH - FIRING PROJECTILE!');
        // Send to Quest 3 debug display
        if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
          (window as any).vrDebugLog('SWORD CLASH - PROJECTILE FIRED!');
        }
        fireBullet(controller0, 'left'); // Fire projectile from clash
        handleSwordClash(collisionPoint, cameraPosition, cameraDirection);
      }
    }
  });

  return (
    <>
      {controller0Ref.current && <primitive object={controller0Ref.current} />}
      {controller1Ref.current && <primitive object={controller1Ref.current} />}
    </>
  );
}