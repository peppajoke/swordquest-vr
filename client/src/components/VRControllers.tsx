import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface VRControllersProps {
  onFuelChange?: (fuel: number) => void;
  onAmmoChange?: (ammo: number) => void;
}

export default function VRControllers({ onFuelChange, onAmmoChange }: VRControllersProps) {
  const { 
    addHitEffect, 
    explodePillar 
  } = useVRGame();

  const controller0Ref = useRef<THREE.XRTargetRaySpace>();
  const controller1Ref = useRef<THREE.XRTargetRaySpace>();
  const controllerGrip0Ref = useRef<THREE.XRGripSpace>();
  const controllerGrip1Ref = useRef<THREE.XRGripSpace>();
  const leftSwordRef = useRef<THREE.Group>();
  const rightSwordRef = useRef<THREE.Group>();
  const leftGunRef = useRef<THREE.Group>();
  const rightGunRef = useRef<THREE.Group>();

  const leftGrabbing = useRef(false);
  const rightGrabbing = useRef(false);
  const leftTrigger = useRef(false);
  const rightTrigger = useRef(false);
  const lastLeftTrigger = useRef(false);
  const lastRightTrigger = useRef(false);

  // Movement and fuel system refs
  const velocity = useRef(new THREE.Vector3());
  const acceleration = useRef(new THREE.Vector3());
  const lastDirection = useRef(new THREE.Vector3(0, 0, -1));
  const isAccelerating = useRef(false);
  const lockedDirection = useRef<THREE.Vector3 | null>(null);
  const lastSwordsHeld = useRef(0);

  // Movement parameters
  const maxSpeed = useRef(3.2); // Reduced by 60% (8.0 * 0.4)
  const accelerationRate = useRef(12.0);
  const turnRate = useRef(0.3);
  
  // Gun system
  const bullets = useRef<Array<{
    id: string;
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    startTime: number;
  }>>([]);
  const ammo = useRef(30); // Start with 30 bullets
  const maxAmmo = useRef(100);

  // Fuel system
  const fuel = useRef(100.0);
  const maxFuel = useRef(100.0);
  const fuelDrainRate = useRef(3.0); // Much slower drain
  const fuelRechargeRate = useRef(35.0);
  const fuelPenaltyRecovery = useRef(15.0);
  const wasEmpty = useRef(false);
  const emptyPenaltyTime = useRef(0);
  const wasAccelerating = useRef(false);

  // Burst speed system
  const burstSpeedMultiplier = useRef(1.0);
  const burstSpeedDecay = useRef(0);
  const lastStoppedAccelerating = useRef(0);
  const wasAcceleratingPreviously = useRef(false);

  // Momentum system
  const momentumTransferBonus = useRef(0);

  function createInstantHit(startPosition: THREE.Vector3, direction: THREE.Vector3, scene: THREE.Scene) {
    // Create instant visual beam effect
    const beamGroup = new THREE.Group();
    
    // Create a line geometry for the laser beam
    const maxDistance = 100;
    const endPosition = startPosition.clone().add(direction.normalize().multiplyScalar(maxDistance));
    
    // Raycast to find actual hit point
    const raycaster = new THREE.Raycaster(startPosition, direction.normalize(), 0, maxDistance);
    const intersects: THREE.Intersection[] = [];
    
    // Check hits on world objects
    const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
    if (worldGroup) {
      worldGroup.traverse((child) => {
        if ((child.userData.isPillar && !child.userData.destroyed) || 
            (child.userData.isTurret && child.userData.health > 0)) {
          const intersection = raycaster.intersectObject(child, false);
          intersects.push(...intersection);
        }
      });
    }
    
    // Find closest hit
    let hitDistance = maxDistance;
    let hitTarget = null;
    
    if (intersects.length > 0) {
      intersects.sort((a, b) => a.distance - b.distance);
      hitDistance = intersects[0].distance;
      hitTarget = intersects[0].object;
      endPosition.copy(intersects[0].point!);
    }
    
    // Create visible laser beam
    const beamLength = hitDistance;
    const beamGeometry = new THREE.CylinderGeometry(0.005, 0.005, beamLength, 8);
    const beamMaterial = new THREE.MeshLambertMaterial({
      color: '#00ff00',
      emissive: '#88ff00',
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.8
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    
    // Position beam correctly
    const beamCenter = startPosition.clone().add(direction.clone().multiplyScalar(beamLength / 2));
    beam.position.copy(beamCenter);
    
    // Align beam with direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    beam.quaternion.copy(quaternion);
    
    beamGroup.add(beam);
    scene.add(beamGroup);
    
    // Process hit if we hit something
    if (hitTarget) {
      if (hitTarget.userData.isPillar && !hitTarget.userData.destroyed) {
        // Hit pillar - destroy it
        const pillarPos = new THREE.Vector3();
        hitTarget.getWorldPosition(pillarPos);
        
        import('../lib/stores/useVRGame').then(({ useVRGame }) => {
          useVRGame.getState().explodePillar(hitTarget.uuid);
        });
        hitTarget.userData.destroyed = true;
        
        // Create explosion effect
        import('../lib/stores/useVRGame').then(({ useVRGame }) => {
          useVRGame.getState().addHitEffect([pillarPos.x, pillarPos.y, pillarPos.z]);
        });
        
        // Remove pillar with explosion animation
        const explosionScale = { x: 1, y: 1, z: 1 };
        const animate = () => {
          explosionScale.x += 0.1;
          explosionScale.y += 0.1;
          explosionScale.z += 0.1;
          hitTarget.scale.set(explosionScale.x, explosionScale.y, explosionScale.z);
          hitTarget.rotation.x += 0.2;
          hitTarget.rotation.z += 0.2;
          
          if (explosionScale.x < 2) {
            requestAnimationFrame(animate);
          } else {
            hitTarget.parent?.remove(hitTarget);
          }
        };
        animate();
      } else if (hitTarget.userData.isTurret && hitTarget.userData.health > 0) {
        // Hit turret - damage it
        hitTarget.userData.health -= 25;
        console.log(`🎯 Turret hit! Health: ${hitTarget.userData.health}/100`);
        
        // Play gun hit sound
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playGunHit();
        });
        
        // Create hit effect
        const turretPos = new THREE.Vector3();
        hitTarget.getWorldPosition(turretPos);
        import('../lib/stores/useVRGame').then(({ useVRGame }) => {
          useVRGame.getState().addHitEffect([turretPos.x, turretPos.y + 1, turretPos.z]);
        });
      }
    }
    
    // Remove beam after short duration
    setTimeout(() => {
      scene.remove(beamGroup);
    }, 100); // Brief flash
    
    return true;
  }
  
  function fireInstantBullet(controller: THREE.XRTargetRaySpace, hand: 'left' | 'right', scene: THREE.Scene) {
    if (!controller || ammo.current <= 0) return; // Check ammo
    
    const controllerPos = new THREE.Vector3();
    const controllerDir = new THREE.Vector3();
    
    controller.getWorldPosition(controllerPos);
    controller.getWorldDirection(controllerDir);
    
    // Invert the direction - VR controllers point backwards by default
    controllerDir.negate();
    
    // Adjust gun position to barrel tip
    controllerPos.add(controllerDir.clone().multiplyScalar(0.25));
    
    // Fire instant hit
    createInstantHit(controllerPos, controllerDir, scene);
    
    // Play gun shoot sound
    import('../lib/stores/useAudio').then(({ useAudio }) => {
      useAudio.getState().playGunShoot();
    });
    
    // Consume ammo
    ammo.current--;
    console.log(`⚡ ${hand} gun fired instantly! Ammo: ${ammo.current}/${maxAmmo.current}`);
  }
  
  function createSword() {
    const sword = new THREE.Group();
    sword.userData.isCustomModel = true; // Mark as custom model
    sword.userData.isSword = true; // Mark as sword for collision detection
    
    // Handle (bigger)
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.25);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: '#4a4a4a' });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.userData.isCustomModel = true; // Mark as custom
    handle.position.y = -0.08;
    sword.add(handle);
    
    // Guard (bigger)
    const guardGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.035);
    const guardMaterial = new THREE.MeshLambertMaterial({ color: '#666' });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.userData.isCustomModel = true; // Mark as custom
    guard.position.y = 0.04;
    sword.add(guard);
    
    // Blade (much bigger)
    const bladeGeometry = new THREE.BoxGeometry(0.018, 0.5, 0.008);
    const bladeMaterial = new THREE.MeshLambertMaterial({ color: '#c0c0c0' });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.userData.isCustomModel = true; // Mark as custom
    blade.position.y = 0.32;
    sword.add(blade);
    
    // Rotate sword to point forward properly
    sword.rotation.z = Math.PI / 2; // 90 degrees to point forward
    
    return sword;
  }
  
  function createGun() {
    const gun = new THREE.Group();
    gun.userData.isCustomModel = true; // Mark as custom model
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.02, 0.08, 0.03);
    const gripMaterial = new THREE.MeshLambertMaterial({ color: '#2a2a2a' });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.userData.isCustomModel = true; // Mark as custom
    grip.position.y = -0.04;
    gun.add(grip);
    
    // Barrel (shorter, thicker, rotated and positioned closer to player)
    const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.125); // Made thicker: 0.008 -> 0.015
    const barrelMaterial = new THREE.MeshLambertMaterial({ color: '#1a1a1a' });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.userData.isCustomModel = true; // Mark as custom
    barrel.rotation.x = Math.PI / 2; // Rotate 90 degrees to point forward
    barrel.position.y = 0.02;
    barrel.position.z = -0.05; // Move further back toward player
    gun.add(barrel);
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.025, 0.04, 0.08);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: '#333' });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.userData.isCustomModel = true; // Mark as custom
    body.position.y = 0.02;
    gun.add(body);
    
    // Rotate entire gun 90 degrees downward
    gun.rotation.x = Math.PI / 2; // 90 degrees downward
    
    return gun;
  }

  useFrame((state) => {
    const { gl, camera, scene } = state;
    const session = gl.xr.getSession();
    
    if (!session) return;

    const inputSources = Array.from(session.inputSources);
    
    // ⚠️ CRITICAL: DO NOT CHANGE THESE HAND ASSIGNMENTS! ⚠️
    // These mappings are CORRECT and have been verified multiple times:
    const controller0 = inputSources.find(input => input.handedness === 'right'); // Controller 0 = RIGHT hand ✓
    const controller1 = inputSources.find(input => input.handedness === 'left');  // Controller 1 = LEFT hand ✓
    // ⚠️ NEVER swap these - they work correctly as-is! ⚠️
    
    // 🚨 TRIGGER ASSIGNMENT FIX: The triggers are intentionally CROSSED/SWAPPED! 🚨
    // This is INTENTIONAL and REQUIRED for correct hand mapping in VR!
    // RIGHT controller (0) -> LEFT trigger variable (swapped on purpose!)
    // LEFT controller (1) -> RIGHT trigger variable (swapped on purpose!)
    // DO NOT "FIX" THIS - IT'S THE CORRECT CROSS-MAPPING! 🚨

    if (!controller0 || !controller1) return;

    // Store controller refs - keep them visible so our custom objects show
    if (!controller0Ref.current) {
      controller0Ref.current = gl.xr.getController(0);
      scene.add(controller0Ref.current);
    }
    if (!controller1Ref.current) {
      controller1Ref.current = gl.xr.getController(1);
      scene.add(controller1Ref.current);
    }
    
    // Set up grip controllers for weapon attachment
    if (!controllerGrip0Ref.current) {
      controllerGrip0Ref.current = gl.xr.getControllerGrip(0);
      scene.add(controllerGrip0Ref.current);
    }
    if (!controllerGrip1Ref.current) {
      controllerGrip1Ref.current = gl.xr.getControllerGrip(1);
      scene.add(controllerGrip1Ref.current);
    }
    
    // Hide default controller models but keep our custom weapons visible
    setTimeout(() => {
      if (controllerGrip0Ref.current) {
        controllerGrip0Ref.current.traverse((child) => {
          if (child.type === 'Mesh' && !child.userData.isCustomModel) {
            child.visible = false;
          }
        });
      }
      if (controllerGrip1Ref.current) {
        controllerGrip1Ref.current.traverse((child) => {
          if (child.type === 'Mesh' && !child.userData.isCustomModel) {
            child.visible = false;
          }
        });
      }
    }, 100);

    // Handle controller input
    const gamepad0 = controller0.gamepad;
    const gamepad1 = controller1.gamepad;
    
    if (gamepad0 && gamepad0.buttons.length > 1) {
      rightGrabbing.current = gamepad0.buttons[1].pressed; // Right hand (controller0) grip
      leftTrigger.current = gamepad0.buttons[0].pressed;    // Right controller (0) fires LEFT gun - SWAPPED!
    }
    if (gamepad1 && gamepad1.buttons.length > 1) {
      leftGrabbing.current = gamepad1.buttons[1].pressed; // Left hand (controller1) grip
      rightTrigger.current = gamepad1.buttons[0].pressed;   // Left controller (1) fires RIGHT gun - SWAPPED!
    }

    // Use grip controllers for weapon attachment (they track hand pose better)
    const controller0Obj = controllerGrip0Ref.current;
    const controller1Obj = controllerGrip1Ref.current;
    
    if (!controller0Obj || !controller1Obj) return;

    // ✓ RIGHT HAND ITEMS (controller0 = RIGHT hand - CORRECT!)
    // Always show gun
    if (!rightGunRef.current) {
      const gun = createGun();
      rightGunRef.current = gun;
      controller0Obj.add(gun);
    }
    
    // Show/hide sword based on grip
    if (rightGrabbing.current) {
      // Show sword
      if (!rightSwordRef.current) {
        const sword = createSword();
        // Flip right-hand sword horizontally
        sword.rotation.y = Math.PI; // 180 degrees horizontal flip
        rightSwordRef.current = sword;
        controller0Obj.add(sword);
      }
    } else {
      // Hide sword
      if (rightSwordRef.current) {
        controller0Obj.remove(rightSwordRef.current);
        rightSwordRef.current = undefined;
      }
    }

    // ✓ LEFT HAND ITEMS (controller1 = LEFT hand - CORRECT!)
    // Always show gun
    if (!leftGunRef.current) {
      const gun = createGun();
      leftGunRef.current = gun;
      controller1Obj.add(gun);
    }
    
    // Show/hide sword based on grip
    if (leftGrabbing.current) {
      // Show sword
      if (!leftSwordRef.current) {
        const sword = createSword();
        leftSwordRef.current = sword;
        controller1Obj.add(sword);
      }
    } else {
      // Hide sword
      if (leftSwordRef.current) {
        controller1Obj.remove(leftSwordRef.current);
        leftSwordRef.current = undefined;
      }
    }

    // Movement and timing system
    const swordsHeld = (leftSwordRef.current ? 1 : 0) + (rightSwordRef.current ? 1 : 0);
    const deltaTime = 1 / 60;
    const currentTime = Date.now();

    // Get the direction from controller hands instead of camera
    let handDirection = new THREE.Vector3();
    let validDirections = 0;
    
    // Get direction from right controller if available
    if (controller0Obj && rightSwordRef.current) {
      const rightDirection = new THREE.Vector3();
      controller0Obj.getWorldDirection(rightDirection);
      rightDirection.y = 0;
      rightDirection.normalize();
      handDirection.add(rightDirection);
      validDirections++;
    }
    
    // Get direction from left controller if available
    if (controller1Obj && leftSwordRef.current) {
      const leftDirection = new THREE.Vector3();
      controller1Obj.getWorldDirection(leftDirection);
      leftDirection.y = 0;
      leftDirection.normalize();
      handDirection.add(leftDirection);
      validDirections++;
    }
    
    // Average the directions and fallback to camera if no swords
    if (validDirections > 0) {
      handDirection.divideScalar(validDirections);
      handDirection.normalize();
    } else {
      // Fallback to camera direction if no swords are held
      camera.getWorldDirection(handDirection);
      handDirection.y = 0;
      handDirection.normalize();
    }
    
    // Burst speed timing system
    const currentlyAccelerating = swordsHeld > 0 && fuel.current > 0;
    
    if (currentlyAccelerating && !wasAcceleratingPreviously.current) {
      const stopDuration = currentTime - lastStoppedAccelerating.current;
      if (lastStoppedAccelerating.current > 0 && stopDuration >= 400 && stopDuration <= 600) {
        const perfectTiming = 500;
        const timingError = Math.abs(stopDuration - perfectTiming);
        const maxError = 100;
        const timingAccuracy = 1.0 - (timingError / maxError);
        
        const minBoost = 1.5;  // Much lower minimum boost
        const maxBoost = 3.0;  // Much lower maximum boost
        const boostStrength = minBoost + (maxBoost - minBoost) * timingAccuracy;
        
        console.log(`🚀 PERFECT TIMING! ${stopDuration}ms pause = ${boostStrength.toFixed(1)}x BOOST!`);
        burstSpeedMultiplier.current = boostStrength;
        burstSpeedDecay.current = currentTime + 3000;
        
        // Play boost sound
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playBoost();
        });
        
        const currentSpeed = velocity.current.length();
        if (currentSpeed > 0) {
          const newDirection = lockedDirection.current || handDirection;
          velocity.current.copy(newDirection.clone().normalize().multiplyScalar(currentSpeed));
        }
      }
    } else if (!currentlyAccelerating && wasAcceleratingPreviously.current) {
      lastStoppedAccelerating.current = currentTime;
    }
    
    wasAcceleratingPreviously.current = currentlyAccelerating;

    // Update burst speed decay
    if (burstSpeedDecay.current > 0 && currentTime > burstSpeedDecay.current) {
      burstSpeedMultiplier.current = 1.0;
      burstSpeedDecay.current = 0;
    } else if (burstSpeedDecay.current > 0) {
      const timeRemaining = burstSpeedDecay.current - currentTime;
      const decayProgress = timeRemaining / 3000;
      const originalBoost = burstSpeedMultiplier.current;
      const decayCurve = Math.sqrt(decayProgress);
      burstSpeedMultiplier.current = 1.0 + (originalBoost - 1.0) * decayCurve;
    }
    
    // Update fuel system
    if (swordsHeld > 0 && fuel.current > 0) {
      fuel.current -= fuelDrainRate.current * deltaTime;
      if (fuel.current <= 0) {
        fuel.current = 0;
        wasEmpty.current = true;
        emptyPenaltyTime.current = 0;
      }
      // Track acceleration for sound
    } else {
      if (swordsHeld === 0) {
        const rechargeRate = wasEmpty.current && emptyPenaltyTime.current < 3.0 
          ? fuelPenaltyRecovery.current
          : fuelRechargeRate.current;
        
        fuel.current += rechargeRate * deltaTime;
        if (fuel.current >= maxFuel.current) {
          fuel.current = maxFuel.current;
          wasEmpty.current = false;
        }
        
        if (wasEmpty.current) {
          emptyPenaltyTime.current += deltaTime;
          if (emptyPenaltyTime.current >= 3.0) {
            wasEmpty.current = false;
          }
        }
      }
      // Track deceleration for sound
    }
    
    if (onFuelChange) {
      onFuelChange(fuel.current);
    }
    
    if (onAmmoChange) {
      onAmmoChange(ammo.current);
    }
    
    // Auto-recharge ammo slowly
    if (ammo.current < maxAmmo.current) {
      ammo.current += 15 * deltaTime; // Recharge 15 ammo per second
      if (ammo.current > maxAmmo.current) {
        ammo.current = maxAmmo.current;
      }
    }

    // Handle direction locking
    if (swordsHeld > lastSwordsHeld.current) {
      lockedDirection.current = handDirection.clone().normalize();
    } else if (swordsHeld < lastSwordsHeld.current) {
      lockedDirection.current = null;
    }
    lastSwordsHeld.current = swordsHeld;

    // Movement system
    const wasAccelerating = isAccelerating.current;
    isAccelerating.current = swordsHeld > 0 && fuel.current > 0;
    
    if (isAccelerating.current) {
      // Start acceleration sound if not already playing
      if (!wasAccelerating) {
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playAcceleration();
        });
      }
      const speedMultiplier = swordsHeld;
      const fuelMultiplier = Math.max(0.3, fuel.current / maxFuel.current);
      const burstMultiplier = burstSpeedMultiplier.current;
      const desiredSpeed = maxSpeed.current * speedMultiplier * fuelMultiplier * burstMultiplier;
      
      const currentMovementDirection = lockedDirection.current || handDirection;
      const targetDirection = currentMovementDirection.clone().multiplyScalar(desiredSpeed);
      
      lastDirection.current.copy(currentMovementDirection);
      
      acceleration.current.lerp(targetDirection, turnRate.current);
      velocity.current.add(acceleration.current.clone().multiplyScalar(deltaTime * accelerationRate.current));
      
      if (velocity.current.length() > desiredSpeed) {
        velocity.current.normalize().multiplyScalar(desiredSpeed);
      }
    } else {
      // Check if we're in boost timing window
      const inBoostTimingWindow = lastStoppedAccelerating.current > 0 && 
                                 (currentTime - lastStoppedAccelerating.current) <= 600;
      
      if (inBoostTimingWindow) {
        // Maintain velocity during timing window
      } else {
        // Apply decay
        const currentSpeed = velocity.current.length();
        const speedThreshold = 1.0;
        
        if (currentSpeed > speedThreshold) {
          const highSpeedDecay = 0.98;
          velocity.current.multiplyScalar(Math.pow(highSpeedDecay, deltaTime * 60));
        } else {
          const normalizedSpeed = currentSpeed / speedThreshold;
          const exponentialFactor = Math.pow(normalizedSpeed, 2);
          const decayRate = 0.1 + (0.9 * exponentialFactor);
          velocity.current.multiplyScalar(Math.pow(decayRate, deltaTime * 60));
        }
        
        acceleration.current.multiplyScalar(Math.pow(0.85, deltaTime * 60));
      
      }
      
      // Stop acceleration sound if we were accelerating but now stopped
      if (wasAccelerating && !isAccelerating.current) {
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().stopAcceleration();
        });
      }
    }

    // Apply movement to worldGroup
    if (velocity.current.length() > 0.01) {
      const moveVector = velocity.current.clone().multiplyScalar(deltaTime);
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        worldGroup.position.add(moveVector);
      }
    }

    // Gun firing logic - always available
    
    // ✓ RIGHT GUN FIRING (controller0 = RIGHT hand - CORRECT!)
    if (rightTrigger.current && !lastRightTrigger.current) {
      fireInstantBullet(controller0Obj, 'right', scene);
    }
    lastRightTrigger.current = rightTrigger.current;
    
    // ✓ LEFT GUN FIRING (controller1 = LEFT hand - CORRECT!)
    if (leftTrigger.current && !lastLeftTrigger.current) {
      fireInstantBullet(controller1Obj, 'left', scene);
    }
    lastLeftTrigger.current = leftTrigger.current;
    
    // No bullet movement needed - using instant hit system
    
    // Sword collision detection with pillars, turrets, and bullet slicing
    [leftSwordRef.current, rightSwordRef.current].forEach(sword => {
      if (!sword) return;
      
      const swordPos = new THREE.Vector3();
      const bladeTip = new THREE.Vector3(0, 0.5, 0);
      sword.localToWorld(bladeTip);
      swordPos.copy(bladeTip);
      
      // Check collision with turret bullets (bullet slicing) - with safety check
      if (scene) {
        scene.traverse((child) => {
          if (child && child.userData && child.userData.isTurretBullet) {
            const bulletPos = new THREE.Vector3();
            child.getWorldPosition(bulletPos);
            
            const distance = swordPos.distanceTo(bulletPos);
            if (distance < 0.2) { // Slice bullet
              if (child.parent) {
                child.parent.remove(child);
              } else {
                scene.remove(child);
              }
              console.log('⚔️ Bullet sliced with sword!');
              
              // Play sword hit sound for bullet slice
              import('../lib/stores/useAudio').then(({ useAudio }) => {
                useAudio.getState().playSwordHit();
              });
              
              // Create slash effect
              addHitEffect([bulletPos.x, bulletPos.y, bulletPos.z]);
            }
          }
        });
      }
      
      // Find red pillars to hit
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        worldGroup.traverse((child) => {
          if (!child || !child.userData) return;
          
          // Hit pillars
          if (child.userData.isPillar && !child.userData.destroyed) {
            const pillarPos = new THREE.Vector3();
            child.getWorldPosition(pillarPos);
            
            const distance = swordPos.distanceTo(pillarPos);
            if (distance < 1.0) { // Hit distance
              explodePillar(child.uuid);
              child.userData.destroyed = true;
              
              // Create explosion effect
              addHitEffect([pillarPos.x, pillarPos.y, pillarPos.z]);
              
              // Remove pillar with explosion animation
              const explosionScale = { x: 1, y: 1, z: 1 };
              const animate = () => {
                explosionScale.x += 0.1;
                explosionScale.y += 0.1;
                explosionScale.z += 0.1;
                child.scale.set(explosionScale.x, explosionScale.y, explosionScale.z);
                child.rotation.x += 0.2;
                child.rotation.z += 0.2;
                
                if (explosionScale.x < 2) {
                  requestAnimationFrame(animate);
                } else {
                  if (child.parent) {
                    child.parent.remove(child);
                  }
                }
              };
              animate();
            }
          }
          
          // Hit turrets with sword
          if (child.userData.isTurret && child.userData.health > 0) {
            const turretPos = new THREE.Vector3();
            child.getWorldPosition(turretPos);
            
            const distance = swordPos.distanceTo(turretPos);
            if (distance < 1.5) { // Hit distance for turrets (larger than pillars)
              // Damage turret
              child.userData.health -= 35; // More damage with sword
              console.log(`⚔️ Turret slashed! Health: ${child.userData.health}/100`);
              
              // Play sword hit sound
              import('../lib/stores/useAudio').then(({ useAudio }) => {
                useAudio.getState().playSwordHit();
              });
              
              // Create hit effect
              addHitEffect([turretPos.x, turretPos.y, turretPos.z]);
              
              // If turret is destroyed, mark it
              if (child.userData.health <= 0) {
                child.userData.health = 0;
                // Turret destruction is handled in GameObjects.tsx
              }
            }
          }
          
          // Hit Play Again box in death room
          if (child.userData.isPlayAgainBox) {
            const boxPos = new THREE.Vector3();
            child.getWorldPosition(boxPos);
            
            const distance = swordPos.distanceTo(boxPos);
            if (distance < 2.0) { // Hit distance for the Play Again box
              console.log('⚔️ Slashed Play Again box - respawning!');
              
              // Play sword hit sound
              import('../lib/stores/useAudio').then(({ useAudio }) => {
                useAudio.getState().playSwordHit();
              });
              
              // Exit death room and respawn
              import('../lib/stores/useVRGame').then(({ useVRGame }) => {
                useVRGame.getState().exitDeathRoom();
              });
            }
          }
        });
      }
    });
  });

  return null; // Controllers are hidden, hands show swords/guns instead
}