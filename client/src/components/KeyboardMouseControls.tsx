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
  
  // Movement state
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false,
  });
  
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
  const maxSpeed = useRef(5.0);
  const accelerationRate = useRef(3.0);
  const decelerationRate = useRef(0.05);
  
  // Mouse sensitivity
  const mouseSensitivity = useRef(0.002);
  
  // Sword state
  const leftSwordActive = useRef(false);
  const rightSwordActive = useRef(false);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = true;
      }
      
      // Spacebar for left sword, Shift for right sword
      if (key === ' ') {
        leftSwordActive.current = true;
        event.preventDefault();
      } else if (key === 'shift') {
        rightSwordActive.current = true;
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = false;
      }
      
      if (key === ' ') {
        leftSwordActive.current = false;
        event.preventDefault();
      } else if (key === 'shift') {
        rightSwordActive.current = false;
      }
    };
    
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
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
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
    
    // Movement calculation
    const moveVector = new THREE.Vector3(0, 0, 0);
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Calculate forward and right vectors (flattened to prevent flying)
    const forward = cameraDirection.clone();
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    right.normalize();
    
    // WASD movement
    if (keys.current.w) moveVector.add(forward);
    if (keys.current.s) moveVector.sub(forward);
    if (keys.current.a) moveVector.sub(right);
    if (keys.current.d) moveVector.add(right);
    
    // Apply movement only if we have fuel and swords active
    if (swordsHeld > 0 && fuel.current > 0 && moveVector.length() > 0) {
      const speedMultiplier = swordsHeld; // 1x for one sword, 2x for both
      const fuelMultiplier = Math.max(0.3, fuel.current / maxFuel.current);
      const desiredSpeed = maxSpeed.current * speedMultiplier * fuelMultiplier;
      
      moveVector.normalize();
      moveVector.multiplyScalar(desiredSpeed * deltaTime * accelerationRate.current);
      
      velocity.current.add(moveVector);
      
      // Clamp velocity to max speed
      if (velocity.current.length() > desiredSpeed) {
        velocity.current.normalize().multiplyScalar(desiredSpeed);
      }
    } else {
      // Apply deceleration when not moving
      velocity.current.multiplyScalar(Math.pow(decelerationRate.current, deltaTime * 60));
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