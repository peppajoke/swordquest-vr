import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DesktopSwordVisualProps {
  isSwinging: boolean;
  hand: 'left' | 'right';
  onSwingComplete: () => void;
}

export default function DesktopSwordVisual({ isSwinging, hand, onSwingComplete }: DesktopSwordVisualProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const swingProgress = useRef(0);

  useFrame((state, deltaTime) => {
    if (!groupRef.current || !isSwinging) return;

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

    // Animate swing
    swingProgress.current += deltaTime * 8; // Swing speed
    
    if (swingProgress.current >= 1) {
      swingProgress.current = 0;
      onSwingComplete();
      return;
    }

    // Calculate swing arc (from right to left for right hand, left to right for left hand)
    const swingAngle = hand === 'right' 
      ? Math.PI / 4 - (swingProgress.current * Math.PI / 2) // Right to left
      : -Math.PI / 4 + (swingProgress.current * Math.PI / 2); // Left to right

    // Apply rotation
    groupRef.current.rotation.y = swingAngle;
    groupRef.current.rotation.x = -Math.PI / 6; // Slight downward angle
    
    // Scale effect during swing
    const scale = 1 + Math.sin(swingProgress.current * Math.PI) * 0.2;
    groupRef.current.scale.setScalar(scale);
  });

  if (!isSwinging) return null;

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