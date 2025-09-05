import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface KeyboardMouseControlsProps {
  onFuelChange?: (fuel: number) => void;
}

export function KeyboardMouseControls({ onFuelChange }: KeyboardMouseControlsProps) {
  const { camera, scene } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  const velocity = useRef(new THREE.Vector3());
  const fuel = useRef(100.0);
  const maxFuel = useRef(100.0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keys.current[event.code] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state) => {
    const { scene } = state;
    const deltaTime = 1 / 60;
    const moveSpeed = 0.1;
    
    // Force clean reload to fix cached errors

    // Get world group for movement
    const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
    if (!worldGroup) return;

    // Get camera direction
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Keep movement horizontal
    cameraDirection.normalize();

    // Get right direction from camera
    const rightDirection = new THREE.Vector3();
    rightDirection.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
    rightDirection.normalize();

    // Calculate movement direction
    const movementDirection = new THREE.Vector3();

    // WASD movement
    if (keys.current['KeyW']) {
      movementDirection.add(cameraDirection);
    }
    if (keys.current['KeyS']) {
      movementDirection.sub(cameraDirection);
    }
    if (keys.current['KeyA']) {
      movementDirection.sub(rightDirection);
    }
    if (keys.current['KeyD']) {
      movementDirection.add(rightDirection);
    }

    // Apply movement if there's input
    if (movementDirection.length() > 0) {
      movementDirection.normalize().multiplyScalar(moveSpeed);

      // Check boundaries before moving
      const newPosition = worldGroup.position.clone().add(movementDirection);
      if (!(newPosition.x < -19 || newPosition.x > 19 || newPosition.z < -9 || newPosition.z > 19)) {
        worldGroup.position.add(movementDirection);
      }
    }

    // Update fuel (not used in keyboard mode but keeping for consistency)
    if (onFuelChange) {
      onFuelChange(fuel.current);
    }
  });

  return null;
}