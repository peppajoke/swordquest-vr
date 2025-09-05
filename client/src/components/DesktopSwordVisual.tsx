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
  const swingTime = useRef(0);
  const swingDuration = 0.5; // Total swing duration in seconds
  const isSwingActive = useRef(false);

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

    if (isSwinging && !isSwingActive.current) {
      // Start a new swing animation
      isSwingActive.current = true;
      swingTime.current = 0;
    }
    
    if (isSwingActive.current) {
      // Progress swing animation
      swingTime.current += deltaTime;
      
      // Calculate swing progress (0 to 1)
      const progress = Math.min(swingTime.current / swingDuration, 1);
      
      // Create a big, fast swing motion using easing
      const swingEase = Math.sin(progress * Math.PI); // Smooth start and end
      
      // Much wider and faster swing motion
      const horizontalSwing = swingEase * (hand === 'left' ? -1.8 : 1.8); // Much wider horizontal
      const verticalSwing = swingEase * 1.2; // Bigger vertical motion
      const twistSwing = swingEase * (hand === 'left' ? 1.0 : -1.0); // Strong twist
      
      // Apply dramatic swinging rotations anchored at handle base
      groupRef.current.rotation.x = -Math.PI / 8 + verticalSwing;
      groupRef.current.rotation.y = (hand === 'left' ? Math.PI / 6 : -Math.PI / 6) + horizontalSwing;
      groupRef.current.rotation.z = twistSwing;
      
      // Scale effect during swing
      const scale = 1 + swingEase * 0.2;
      groupRef.current.scale.setScalar(scale);
      
      // End swing when animation completes
      if (progress >= 1) {
        isSwingActive.current = false;
        swingTime.current = 0;
        // Call completion callback
        if (onSwingComplete) {
          onSwingComplete();
        }
      }
    } else if (!isSwinging && !isSwingActive.current) {
      // Reset to idle position when not swinging
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