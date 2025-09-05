import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DesktopSwordVisualProps {
  isSwinging: boolean;
  hand: 'left' | 'right';
  onSwingComplete: () => void;
  isVisible?: boolean;
}

export default function DesktopSwordVisual({ isSwinging, hand, onSwingComplete, isVisible = true }: DesktopSwordVisualProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const swingProgress = useRef(0);
  const randomDirection = useRef(new THREE.Vector3());
  const baseRotation = useRef(new THREE.Euler());
  
  // Initialize random swing direction when swinging starts
  const initializeRandomSwing = () => {
    randomDirection.current.set(
      (Math.random() - 0.5) * 2, // Random X direction
      (Math.random() - 0.5) * 2, // Random Y direction  
      (Math.random() - 0.5) * 2  // Random Z direction
    ).normalize();
    
    baseRotation.current.set(
      Math.random() * Math.PI * 0.5, // Random base X rotation
      Math.random() * Math.PI * 0.5, // Random base Y rotation
      Math.random() * Math.PI * 0.5  // Random base Z rotation
    );
  };

  useFrame((state, deltaTime) => {
    if (!groupRef.current) return;

    // Get camera position and direction
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);

    // Position sword in front of camera
    const swordPos = cameraPos.clone().add(cameraDir.clone().multiplyScalar(1.0));
    
    // Offset to left or right based on hand
    const rightDir = new THREE.Vector3(1, 0, 0);
    rightDir.applyQuaternion(camera.quaternion);
    const handOffset = hand === 'left' ? -0.3 : 0.3;
    swordPos.add(rightDir.clone().multiplyScalar(handOffset));
    
    groupRef.current.position.copy(swordPos);

    if (isSwinging) {
      // Initialize random direction if starting new swing
      if (swingProgress.current === 0) {
        initializeRandomSwing();
      }
      
      // Animate swing with random directions
      swingProgress.current += deltaTime * 6; // Continuous swing speed
      
      if (swingProgress.current >= 1) {
        swingProgress.current = 0;
        // Generate new random direction for next swing cycle
        initializeRandomSwing();
      }

      // Apply random rotational swinging in all directions
      const swingIntensity = Math.sin(swingProgress.current * Math.PI) * 0.8;
      groupRef.current.rotation.x = baseRotation.current.x + randomDirection.current.x * swingIntensity;
      groupRef.current.rotation.y = baseRotation.current.y + randomDirection.current.y * swingIntensity;
      groupRef.current.rotation.z = baseRotation.current.z + randomDirection.current.z * swingIntensity;
      
      // Scale effect during swing
      const scale = 1 + Math.sin(swingProgress.current * Math.PI) * 0.3;
      groupRef.current.scale.setScalar(scale);
    } else {
      // Reset to idle position when not swinging
      swingProgress.current = 0;
      groupRef.current.rotation.x = -Math.PI / 8;
      groupRef.current.rotation.y = hand === 'left' ? Math.PI / 6 : -Math.PI / 6;
      groupRef.current.rotation.z = 0;
      groupRef.current.scale.setScalar(1);
    }
  });

  if (!isVisible) return null;

  return (
    <group ref={groupRef}>
      {/* Sword Handle */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.25]} />
        <meshLambertMaterial color="#654321" />
      </mesh>
      
      {/* Sword Guard */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.2, 0.03, 0.05]} />
        <meshLambertMaterial color="#888888" />
      </mesh>
      
      {/* Sword Blade */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.02, 0.6, 0.01]} />
        <meshLambertMaterial color="#C0C0C0" emissive="#404040" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Swing Trail Effect */}
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, swingProgress.current * Math.PI / 4]}>
        <boxGeometry args={[0.05, 0.8, 0.001]} />
        <meshLambertMaterial 
          color="#FFFFFF" 
          transparent 
          opacity={0.6 * (1 - swingProgress.current)} 
          emissive="#FFFFFF"
          emissiveIntensity={0.8 * (1 - swingProgress.current)}
        />
      </mesh>
    </group>
  );
}