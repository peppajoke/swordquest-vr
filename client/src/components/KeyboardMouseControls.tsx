import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

interface KeyboardMouseControlsProps {
  onFuelChange?: (fuel: number) => void;
}

export function KeyboardMouseControls({ onFuelChange }: KeyboardMouseControlsProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>();
  
  // Fuel system (same as VR)
  const fuel = useRef(2000);
  const maxFuel = useRef(2000);
  const fuelDrainRate = useRef(25);
  const fuelRechargeRate = useRef(15);
  const fuelPenaltyRecovery = useRef(5);
  const wasEmpty = useRef(false);
  const emptyPenaltyTime = useRef(0);
  
  // Movement system
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const acceleration = useRef(new THREE.Vector3(0, 0, 0));
  const maxSpeed = useRef(5.0);
  const accelerationRate = useRef(3.0);
  const decelerationRate = useRef(0.05);
  const turnRate = useRef(0.1);
  
  // Sword state
  const leftSwordActive = useRef(false);
  const rightSwordActive = useRef(false);
  
  // Direction locking (same as VR system)
  const lockedDirection = useRef<THREE.Vector3 | null>(null);
  const lastSwordsHeld = useRef(0);
  
  // Burst speed system
  const lastStoppedAccelerating = useRef<number>(0);
  const burstSpeedMultiplier = useRef<number>(1.0);
  const burstSpeedDecay = useRef<number>(0);
  const wasAcceleratingPreviously = useRef(false);
  
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) { // Left click
        leftSwordActive.current = true;
      } else if (event.button === 2) { // Right click
        rightSwordActive.current = true;
      }
    };
    
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) { // Left click
        leftSwordActive.current = false;
      } else if (event.button === 2) { // Right click
        rightSwordActive.current = false;
      }
    };
    
    const handleContextMenu = (event: Event) => {
      event.preventDefault(); // Prevent right-click menu
    };
    
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);
  
  useFrame((state, deltaTime) => {
    // Only run keyboard/mouse controls when not in VR
    const isVRActive = !!state.gl.xr.getSession();
    if (isVRActive) return;
    
    // Calculate how many "swords" are active (for fuel calculation)
    const swordsHeld = (leftSwordActive.current ? 1 : 0) + (rightSwordActive.current ? 1 : 0);
    
    // Get camera direction for forward movement
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    // Flatten direction to prevent flying
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
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
        
        // Scale boost from 15.0x (worst) to 40.0x (perfect)
        const minBoost = 15.0;
        const maxBoost = 40.0;
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
      // Just stopped accelerating - record the time
      lastStoppedAccelerating.current = currentTime;
    }
    
    wasAcceleratingPreviously.current = isAccelerating;
    
    // Update burst speed decay
    if (burstSpeedDecay.current > 0 && currentTime > burstSpeedDecay.current) {
      burstSpeedMultiplier.current = 1.0;
      burstSpeedDecay.current = 0;
    } else if (burstSpeedDecay.current > 0) {
      // Smoothly decay burst speed (preserve original boost strength)
      const timeRemaining = burstSpeedDecay.current - currentTime;
      const decayProgress = timeRemaining / 3000;
      const originalBoost = burstSpeedMultiplier.current; // Keep the original boost strength
      // Use a square root curve for slower initial decay
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
    }
    
    // Update fuel in parent component
    if (onFuelChange) {
      onFuelChange(fuel.current);
    }
    
    // Camera direction already calculated above
    
    // Handle direction locking when grabbing/releasing swords (same as VR)
    if (swordsHeld > lastSwordsHeld.current) {
      // Just grabbed sword(s) - lock current direction
      lockedDirection.current = cameraDirection.clone().normalize();
    } else if (swordsHeld < lastSwordsHeld.current) {
      // Just released sword(s) - unlock direction
      lockedDirection.current = null;
    }
    lastSwordsHeld.current = swordsHeld;
    
    // Apply movement when swords are active (same system as VR)
    if (swordsHeld > 0 && fuel.current > 0) {
      const speedMultiplier = swordsHeld; // 1x for one sword, 2x for both
      const fuelMultiplier = Math.max(0.3, fuel.current / maxFuel.current);
      const burstMultiplier = burstSpeedMultiplier.current; // Apply burst speed
      const desiredSpeed = maxSpeed.current * speedMultiplier * fuelMultiplier * burstMultiplier;
      
      // Use locked direction or current camera direction
      const movementDirection = lockedDirection.current || cameraDirection;
      const targetDirection = movementDirection.clone().multiplyScalar(desiredSpeed);
      
      // Smoothly interpolate acceleration toward target direction
      acceleration.current.lerp(targetDirection, turnRate.current);
      
      // Apply acceleration to velocity
      velocity.current.add(acceleration.current.clone().multiplyScalar(deltaTime * accelerationRate.current));
      
      // Clamp velocity to max speed
      if (velocity.current.length() > desiredSpeed) {
        velocity.current.normalize().multiplyScalar(desiredSpeed);
      }
    } else {
      // Apply exponential decay when not accelerating (same as VR)
      const decayFactor = Math.pow(0.15, deltaTime);
      const currentSpeed = velocity.current.length();
      
      if (currentSpeed > 0.05) {
        velocity.current.multiplyScalar(decayFactor);
      } else {
        velocity.current.multiplyScalar(Math.pow(decelerationRate.current, deltaTime * 60));
      }
      
      // Gentle acceleration decay
      acceleration.current.multiplyScalar(Math.pow(0.85, deltaTime * 60));
    }
    
    // Apply velocity to camera position
    if (velocity.current.length() > 0.001) {
      const movement = velocity.current.clone().multiplyScalar(deltaTime);
      camera.position.add(movement);
      
      // Also move the worldGroup to maintain collision consistency
      const worldGroup = state.scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        worldGroup.position.sub(movement);
      }
    }
  });
  
  return (
    <>
      {/* Pointer lock controls for mouse look */}
      <PointerLockControls 
        ref={controlsRef}
        camera={camera}
        domElement={document.body}
        pointerSpeed={0.5}
      />
    </>
  );
}