import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface VRControllersProps {
  onFuelChange?: (fuel: number) => void;
}

export default function VRControllers({ onFuelChange }: VRControllersProps) {
  const { 
    addHitEffect, 
    explodePillar 
  } = useVRGame();

  const controller0Ref = useRef<THREE.XRTargetRaySpace>();
  const controller1Ref = useRef<THREE.XRTargetRaySpace>();
  const leftSwordRef = useRef<THREE.Group>();
  const rightSwordRef = useRef<THREE.Group>();

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
  const lockedDirection = useRef<THREE.Vector3 | null>(null);
  const lastSwordsHeld = useRef(0);

  // Movement parameters
  const maxSpeed = useRef(3.2); // Reduced by 60% (8.0 * 0.4)
  const accelerationRate = useRef(12.0);
  const turnRate = useRef(0.3);
  
  // Gun system
  const bullets = useRef<Array<{
    id: string;
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    startTime: number;
  }>>([]);

  // Fuel system
  const fuel = useRef(100.0);
  const maxFuel = useRef(100.0);
  const fuelDrainRate = useRef(25.0);
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

  function createBullet(startPosition: THREE.Vector3, direction: THREE.Vector3) {
    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.02),
      new THREE.MeshLambertMaterial({ color: '#ffff00', emissive: '#ffaa00' })
    );
    bullet.position.copy(startPosition);
    
    return {
      id: `bullet_${Date.now()}_${Math.random()}`,
      mesh: bullet,
      velocity: direction.normalize().multiplyScalar(5.0), // Slow moving
      startTime: Date.now()
    };
  }
  
  function fireBullet(controller: THREE.XRTargetRaySpace, hand: 'left' | 'right', scene: THREE.Scene) {
    if (!controller) return;
    
    const controllerPos = new THREE.Vector3();
    const controllerDir = new THREE.Vector3();
    
    controller.getWorldPosition(controllerPos);
    controller.getWorldDirection(controllerDir);
    
    const bullet = createBullet(controllerPos, controllerDir);
    bullets.current.push(bullet);
    scene.add(bullet.mesh);
  }
  
  function createSword() {
    const sword = new THREE.Group();
    
    // Handle (shorter)
    const handleGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.15);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: '#4a4a4a' });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.05;
    sword.add(handle);
    
    // Guard (smaller)
    const guardGeometry = new THREE.BoxGeometry(0.1, 0.01, 0.02);
    const guardMaterial = new THREE.MeshLambertMaterial({ color: '#666' });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.y = 0.02;
    sword.add(guard);
    
    // Blade (much shorter)
    const bladeGeometry = new THREE.BoxGeometry(0.01, 0.3, 0.005);
    const bladeMaterial = new THREE.MeshLambertMaterial({ color: '#c0c0c0' });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.2;
    sword.add(blade);
    
    // Rotate sword 45 degrees away from player
    sword.rotation.x = Math.PI / 4; // 45 degrees in radians
    
    return sword;
  }

  useFrame((state) => {
    const { gl, camera, scene } = state;
    const session = gl.xr.getSession();
    
    if (!session) return;

    const inputSources = Array.from(session.inputSources);
    const controller0 = inputSources.find(input => input.handedness === 'left');
    const controller1 = inputSources.find(input => input.handedness === 'right');

    if (!controller0 || !controller1) return;

    // Store controller refs
    if (!controller0Ref.current) {
      controller0Ref.current = gl.xr.getController(0);
      scene.add(controller0Ref.current);
    }
    if (!controller1Ref.current) {
      controller1Ref.current = gl.xr.getController(1);
      scene.add(controller1Ref.current);
    }

    // Handle controller input
    const gamepad0 = controller0.gamepad;
    const gamepad1 = controller1.gamepad;
    
    if (gamepad0 && gamepad0.buttons.length > 1) {
      leftGrabbing.current = gamepad0.buttons[1].pressed; // Grip button for sword
      leftTrigger.current = gamepad0.buttons[0].pressed;   // Trigger for gun
    }
    if (gamepad1 && gamepad1.buttons.length > 1) {
      rightGrabbing.current = gamepad1.buttons[1].pressed; // Grip button for sword
      rightTrigger.current = gamepad1.buttons[0].pressed;   // Trigger for gun
    }

    const controller0Obj = controller0Ref.current;
    const controller1Obj = controller1Ref.current;
    
    if (!controller0Obj || !controller1Obj) return;

    // Handle left controller sword
    if (leftGrabbing.current) {
      if (!leftSwordRef.current?.parent) {
        const sword = createSword();
        leftSwordRef.current = sword;
        controller0Obj.add(sword);
      }
    } else {
      if (leftSwordRef.current?.parent) {
        controller0Obj.remove(leftSwordRef.current);
        leftSwordRef.current = undefined;
      }
    }

    // Handle right controller sword
    if (rightGrabbing.current) {
      if (!rightSwordRef.current?.parent) {
        const sword = createSword();
        rightSwordRef.current = sword;
        controller1Obj.add(sword);
      }
    } else {
      if (rightSwordRef.current?.parent) {
        controller1Obj.remove(rightSwordRef.current);
        rightSwordRef.current = undefined;
      }
    }

    // Movement and timing system
    const swordsHeld = (leftSwordRef.current ? 1 : 0) + (rightSwordRef.current ? 1 : 0);
    const deltaTime = 1 / 60;
    const currentTime = Date.now();

    // Get the direction the player is facing
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    // Burst speed timing system
    const isAccelerating = swordsHeld > 0 && fuel.current > 0;
    
    if (isAccelerating && !wasAcceleratingPreviously.current) {
      const stopDuration = currentTime - lastStoppedAccelerating.current;
      if (lastStoppedAccelerating.current > 0 && stopDuration >= 400 && stopDuration <= 600) {
        const perfectTiming = 500;
        const timingError = Math.abs(stopDuration - perfectTiming);
        const maxError = 100;
        const timingAccuracy = 1.0 - (timingError / maxError);
        
        const minBoost = 7.5;
        const maxBoost = 20.0;
        const boostStrength = minBoost + (maxBoost - minBoost) * timingAccuracy;
        
        console.log(`🚀 PERFECT TIMING! ${stopDuration}ms pause = ${boostStrength.toFixed(1)}x BOOST!`);
        burstSpeedMultiplier.current = boostStrength;
        burstSpeedDecay.current = currentTime + 3000;
        
        // Play boost success sound
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playSuccess();
        });
        
        const currentSpeed = velocity.current.length();
        if (currentSpeed > 0) {
          const newDirection = lockedDirection.current || cameraDirection;
          velocity.current.copy(newDirection.clone().normalize().multiplyScalar(currentSpeed));
        }
      }
    } else if (!isAccelerating && wasAcceleratingPreviously.current) {
      lastStoppedAccelerating.current = currentTime;
    }
    
    wasAcceleratingPreviously.current = isAccelerating;

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
      wasAccelerating.current = true;
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
      wasAccelerating.current = false;
    }
    
    if (onFuelChange) {
      onFuelChange(fuel.current);
    }

    // Handle direction locking
    if (swordsHeld > lastSwordsHeld.current) {
      lockedDirection.current = cameraDirection.clone().normalize();
    } else if (swordsHeld < lastSwordsHeld.current) {
      lockedDirection.current = null;
    }
    lastSwordsHeld.current = swordsHeld;

    // Movement system
    if (swordsHeld > 0 && fuel.current > 0) {
      const speedMultiplier = swordsHeld;
      const fuelMultiplier = Math.max(0.3, fuel.current / maxFuel.current);
      const burstMultiplier = burstSpeedMultiplier.current;
      const desiredSpeed = maxSpeed.current * speedMultiplier * fuelMultiplier * burstMultiplier;
      
      const currentMovementDirection = lockedDirection.current || cameraDirection;
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
    }

    // Apply movement to worldGroup
    if (velocity.current.length() > 0.01) {
      const moveVector = velocity.current.clone().multiplyScalar(deltaTime);
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        worldGroup.position.sub(moveVector);
      }
    }

    // Gun firing logic - only when not holding swords
    
    // Left gun
    if (!leftSwordRef.current && leftTrigger.current && !lastLeftTrigger.current) {
      fireBullet(controller0Obj, 'left', scene);
    }
    lastLeftTrigger.current = leftTrigger.current;
    
    // Right gun
    if (!rightSwordRef.current && rightTrigger.current && !lastRightTrigger.current) {
      fireBullet(controller1Obj, 'right', scene);
    }
    lastRightTrigger.current = rightTrigger.current;
    
    // Update bullets
    bullets.current = bullets.current.filter(bullet => {
      // Move bullet
      bullet.mesh.position.add(bullet.velocity.clone().multiplyScalar(deltaTime));
      
      // Check collision with red pillars
      let hitPillar = false;
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        worldGroup.traverse((child) => {
          if (child.userData.isPillar && !child.userData.destroyed) {
            const pillarPos = new THREE.Vector3();
            child.getWorldPosition(pillarPos);
            
            const distance = bullet.mesh.position.distanceTo(pillarPos);
            if (distance < 0.5) { // Bullet hit pillar
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
                  child.parent?.remove(child);
                }
              };
              animate();
              hitPillar = true;
            }
          }
        });
      }
      
      // Remove bullet if it hit something, is too old, or traveled too far
      if (hitPillar || 
          (currentTime - bullet.startTime) > 10000 || // 10 seconds max life
          bullet.mesh.position.length() > 100) {
        scene.remove(bullet.mesh);
        return false;
      }
      
      return true;
    });
    
    // Simple sword collision detection with red pillars
    [leftSwordRef.current, rightSwordRef.current].forEach(sword => {
      if (!sword) return;
      
      const swordPos = new THREE.Vector3();
      const bladeTip = new THREE.Vector3(0, 0.5, 0);
      sword.localToWorld(bladeTip);
      swordPos.copy(bladeTip);
      
      // Find red pillars to hit
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        worldGroup.traverse((child) => {
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
                  child.parent?.remove(child);
                }
              };
              animate();
            }
          }
        });
      }
    });
  });

  return (
    <>
      {controller0Ref.current && <primitive object={controller0Ref.current} />}
      {controller1Ref.current && <primitive object={controller1Ref.current} />}
    </>
  );
}