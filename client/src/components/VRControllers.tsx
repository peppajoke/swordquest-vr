import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

const SWORD_GEOMETRY = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 8);
const SWORD_HANDLE_GEOMETRY = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
const SWORD_MATERIAL = new THREE.MeshLambertMaterial({ color: '#c0392b' });
const HANDLE_MATERIAL = new THREE.MeshLambertMaterial({ color: '#8b4513' });

interface VRControllersProps {
  onFuelChange?: (fuel: number) => void;
}

export default function VRControllers({ onFuelChange }: VRControllersProps) {
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
  
  // Direction locking system
  const lockedDirection = useRef<THREE.Vector3 | null>(null);
  const lastSwordsHeld = useRef(0);
  
  // Burst speed system
  const lastStoppedAccelerating = useRef<number>(0);
  const burstSpeedMultiplier = useRef<number>(1.0);
  const burstSpeedDecay = useRef<number>(0);
  const wasAcceleratingPreviously = useRef(false);
  

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
    }
    
    // Setup event handlers
    const handleSqueezeStart0 = () => {
      leftGrabbing.current = true;
    };
    
    const handleSqueezeEnd0 = () => {
      leftGrabbing.current = false;
    };
    
    const handleSqueezeStart1 = () => {
      rightGrabbing.current = true;
    };
    
    const handleSqueezeEnd1 = () => {
      rightGrabbing.current = false;
    };
    
    // Comprehensive trigger event handlers for different event types
    const handleSelectStart0 = () => {
      leftTriggerPressed.current = true;
    };
    
    const handleSelectEnd0 = () => {
      leftTriggerPressed.current = false;
    };
    
    const handleSelectStart1 = () => {
      rightTriggerPressed.current = true;
    };
    
    const handleSelectEnd1 = () => {
      rightTriggerPressed.current = false;
    };
    
    // Alternative event handlers for different button types
    const handleClick0 = () => {
      leftTriggerPressed.current = true;
      setTimeout(() => { leftTriggerPressed.current = false; }, 100);
    };
    
    const handleClick1 = () => {
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
      // Send to Quest 3 debug display
      if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
        (window as any).vrDebugLog('LEFT SWORD GRIPPED!');
      }
    };
    
    const handleSqueezeEnd0Extended = () => {
      originalSqueezeEnd0();
      leftGrabbing.current = false;
    };
    
    const handleSqueezeStart1Extended = () => {
      originalSqueezeStart1();
      rightGrabbing.current = true;
      // Send to Quest 3 debug display
      if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
        (window as any).vrDebugLog('RIGHT SWORD GRIPPED!');
      }
    };
    
    const handleSqueezeEnd1Extended = () => {
      originalSqueezeEnd1();
      rightGrabbing.current = false;
    };
    
    controller0.addEventListener('squeezestart', handleSqueezeStart0Extended);
    controller0.addEventListener('squeezeend', handleSqueezeEnd0Extended);
    controller1.addEventListener('squeezestart', handleSqueezeStart1Extended);
    controller1.addEventListener('squeezeend', handleSqueezeEnd1Extended);
    
    // Add multiple types of trigger/select event listeners
    
    // Primary trigger events (selectstart/selectend)
    controller0.addEventListener('selectstart', handleSelectStart0);
    controller0.addEventListener('selectend', handleSelectEnd0);
    controller1.addEventListener('selectstart', handleSelectStart1);
    controller1.addEventListener('selectend', handleSelectEnd1);
    
    // Alternative button events (cast to any to bypass type checking)
    (controller0 as any).addEventListener('click', handleClick0);
    (controller1 as any).addEventListener('click', handleClick1);
    
    // Try inputsourceschange events
    controller0.addEventListener('connected', () => {});
    controller1.addEventListener('connected', () => {});
    
    // Add any available input events (cast to any to bypass type checking)
    ['select', 'selectstart', 'selectend', 'click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach(eventType => {
      try {
        (controller0 as any).addEventListener(eventType, (e: any) => {
          if (eventType.includes('start') || eventType.includes('down') || eventType === 'click') {
            leftTriggerPressed.current = true;
            setTimeout(() => { leftTriggerPressed.current = false; }, 100);
          }
        });
        (controller1 as any).addEventListener(eventType, (e: any) => {
          if (eventType.includes('start') || eventType.includes('down') || eventType === 'click') {
            rightTriggerPressed.current = true;
            setTimeout(() => { rightTriggerPressed.current = false; }, 100);
          }
        });
      } catch (error) {

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
        
        (controller0 as any).removeEventListener('click', handleClick0);
        (controller1 as any).removeEventListener('click', handleClick1);
      } catch (error) {

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
    
    // Camera direction already calculated above for burst speed system
    
    // Get the direction the player is facing first
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Lock to ground level - no up/down movement
    cameraDirection.normalize(); // Renormalize after removing Y component
    
    // Burst speed timing system
    const isAccelerating = swordsHeld > 0 && fuel.current > 0;
    const currentTime = Date.now();
    
    if (isAccelerating && !wasAcceleratingPreviously.current) {
      // Just started accelerating - check timing for burst speed
      const stopDuration = currentTime - lastStoppedAccelerating.current;
      if (lastStoppedAccelerating.current > 0 && stopDuration >= 400 && stopDuration <= 600) {
        // Calculate boost strength based on how close to perfect 500ms timing
        const perfectTiming = 500;
        const timingError = Math.abs(stopDuration - perfectTiming);
        const maxError = 100; // 100ms is max error (400ms or 600ms from perfect)
        const timingAccuracy = 1.0 - (timingError / maxError); // 1.0 = perfect, 0.0 = worst
        
        // Scale boost from 7.5x (worst) to 20.0x (perfect)
        const minBoost = 7.5;
        const maxBoost = 20.0;
        const boostStrength = minBoost + (maxBoost - minBoost) * timingAccuracy;
        
        console.log(`🚀 PERFECT TIMING! ${stopDuration}ms pause = ${boostStrength.toFixed(1)}x BOOST!`);
        burstSpeedMultiplier.current = boostStrength;
        burstSpeedDecay.current = currentTime + 3000; // 3 second duration
        
        // Transfer all momentum into new direction
        const currentSpeed = velocity.current.length();
        if (currentSpeed > 0) {
          const newDirection = lockedDirection.current || cameraDirection;
          velocity.current.copy(newDirection.clone().normalize().multiplyScalar(currentSpeed));
        }
      }
    } else if (!isAccelerating && wasAcceleratingPreviously.current) {
      // Just stopped accelerating - record the time, but only start decay after 600ms window
      lastStoppedAccelerating.current = currentTime;
      // Set decay to start after the 600ms timing window
      burstSpeedDecay.current = currentTime + 600;
    }
    
    wasAcceleratingPreviously.current = isAccelerating;
    
    // Update burst speed decay - only after 600ms window
    if (burstSpeedDecay.current > 0 && currentTime > burstSpeedDecay.current) {
      // Check if we're in the decay phase (more than 600ms since stopping)
      const timeSinceStopped = currentTime - lastStoppedAccelerating.current;
      if (timeSinceStopped > 600) {
        // Start decaying after 600ms window
        const decayTime = timeSinceStopped - 600; // Time spent decaying
        const decayDuration = 3000; // 3 second decay
        if (decayTime >= decayDuration) {
          burstSpeedMultiplier.current = 1.0;
          burstSpeedDecay.current = 0;
        } else {
          // Smoothly decay burst speed
          const decayProgress = (decayDuration - decayTime) / decayDuration;
          const originalBoost = burstSpeedMultiplier.current;
          const decayCurve = Math.sqrt(decayProgress);
          burstSpeedMultiplier.current = 1.0 + (originalBoost - 1.0) * decayCurve;
        }
      }
    }
    
    // Update fuel system
    if (swordsHeld > 0 && fuel.current > 0) {
      // Drain fuel when accelerating
      fuel.current -= fuelDrainRate.current * deltaTime;
      if (fuel.current <= 0) {
        fuel.current = 0;
        wasEmpty.current = true;
        emptyPenaltyTime.current = 0;
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
          }
        }
      }
      wasAccelerating.current = false;
    }
    
    // Update fuel in parent component
    if (onFuelChange) {
      onFuelChange(fuel.current);
    }
    
    // Handle direction locking when grabbing/releasing swords
    if (swordsHeld > lastSwordsHeld.current) {
      // Just grabbed sword(s) - lock current direction
      lockedDirection.current = cameraDirection.clone().normalize();
    } else if (swordsHeld < lastSwordsHeld.current) {
      // Just released sword(s) - unlock direction
      lockedDirection.current = null;
    }
    lastSwordsHeld.current = swordsHeld;

    // Calculate desired direction based on grip state, head direction, and fuel
    if (swordsHeld > 0 && fuel.current > 0) {
      const speedMultiplier = swordsHeld; // 1x for one sword, 2x for both
      const fuelMultiplier = Math.max(0.3, fuel.current / maxFuel.current); // 30% minimum speed when low fuel
      const burstMultiplier = burstSpeedMultiplier.current; // Apply burst speed
      const desiredSpeed = maxSpeed.current * speedMultiplier * fuelMultiplier * burstMultiplier + momentumTransferBonus.current;
      
      // Use locked direction instead of current camera direction
      const currentMovementDirection = lockedDirection.current || cameraDirection;
      
      // Advanced turning mechanics (only applies when direction changes due to re-grabbing)
      const directionChange = currentMovementDirection.angleTo(lastDirection.current);
      const isHarshTurn = directionChange > Math.PI / 6; // 30 degrees or more
      
      // Skip momentum loss if burst speed is active (momentum already transferred)
      if (wasAccelerating.current && isHarshTurn && burstSpeedMultiplier.current <= 1.0) {
        // Harsh turn while accelerating: reduce momentum (only when not in burst mode)
        const momentumLoss = 0.7; // lose 30% momentum
        velocity.current.multiplyScalar(momentumLoss);
        // Harsh turn while accelerating
      }
      
      const targetDirection = currentMovementDirection.clone().multiplyScalar(desiredSpeed);
      
      lastDirection.current.copy(currentMovementDirection);
      
      // Smoothly interpolate acceleration toward target direction
      acceleration.current.lerp(targetDirection, turnRate.current);
      
      // Apply acceleration to velocity
      velocity.current.add(acceleration.current.clone().multiplyScalar(deltaTime * accelerationRate.current));
      
      // Clamp velocity to max speed (including bonus)
      if (velocity.current.length() > desiredSpeed) {
        velocity.current.normalize().multiplyScalar(desiredSpeed);
      }
      
      // Direction updated above in acceleration section
      
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
        const currentMovementDirection = lockedDirection.current || cameraDirection;
        const directionChange = currentMovementDirection.angleTo(lastDirection.current);
        const isSignificantTurn = directionChange > Math.PI / 8; // 22.5 degrees
        
        if (isSignificantTurn && velocity.current.length() > 1.0) {
          // Good turning technique: released acceleration then turned
          const currentSpeed = velocity.current.length();
          const transferEfficiency = 1.0 + (currentSpeed / maxSpeed.current) * 0.3; // up to 30% bonus
          
          // Transfer momentum to new direction with bonus
          const newDirection = currentMovementDirection.clone().normalize();
          velocity.current = newDirection.multiplyScalar(currentSpeed * transferEfficiency);
          
          // Temporary speed boost
          momentumTransferBonus.current = Math.min(2.0, currentSpeed * 0.2);
          
          // Momentum transfer speed boost
        }
        
        lastDirection.current.copy(currentMovementDirection);
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
          // Removed momentum logging
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
      for (let i = 0; i < session.inputSources.length; i++) {
        const inputSource = session.inputSources[i];
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
    // Removed gamepad momentum logging
    
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
      // Firing left bullet
      fireBullet(controller0, 'left');
    }
    
    if (rightTriggerPressed.current) {
      // Firing right bullet
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
            // Left controller button pressed
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
            // Right controller button pressed
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
        // Left sword spawned
      }
    } else {
      // Remove sword when not squeezing
      if (leftSwordRef.current?.parent) {
        controller0.remove(leftSwordRef.current);
        removeSwordCollider('left');
        leftSwordRef.current = undefined;
        // Left sword removed
      }
    }

    // Handle right controller sword - only when squeezing
    if (rightGrabbing.current) {
      if (!rightSwordRef.current?.parent) {
        const sword = createSword();
        rightSwordRef.current = sword;
        controller1.add(sword);
        addSwordCollider('right', sword);
        // Right sword spawned
      }
    } else {
      // Remove sword when not squeezing
      if (rightSwordRef.current?.parent) {
        controller1.remove(rightSwordRef.current);
        removeSwordCollider('right');
        rightSwordRef.current = undefined;
        // Right sword removed
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
        return;
      }

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
              destroyTarget(target.id);
              addHitEffect(target.position);
            }
          });
          
          // Check collisions with static destructible objects
          if (staticObjects.current.length === 0) {
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
        
        // Calculate collision point (midpoint between swords)
        const collisionPoint = leftPos.clone().lerp(rightPos, 0.5);
        
        // Get camera position and direction for projectile
        const cameraPosition = camera.position.clone();
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(camera.quaternion);
        
        // Fire actual projectile from sword clash point
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