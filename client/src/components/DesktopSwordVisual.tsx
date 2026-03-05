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
  const swingDuration = 0.15; // Much faster duration - 0.15 seconds
  const isSwingActive = useRef(false);
  const currentSwingType = useRef<number>(0);
  const swingCounter = useRef(0); // Used to cycle through swing types deterministically
  
  // Define 20 different swing types with deterministic patterns
  const getSwingPattern = (swingType: number, progress: number, hand: 'left' | 'right') => {
    const handMultiplier = hand === 'left' ? -1 : 1;
    const ease = Math.sin(progress * Math.PI); // Smooth easing
    
    switch (swingType) {
      case 1: // Horizontal slash
        return {
          x: ease * 0.8 * handMultiplier,
          y: ease * 2.5 * handMultiplier,
          z: ease * 1.2 * handMultiplier,
          scale: 1 + ease * 0.3
        };
      case 2: // Vertical chop
        return {
          x: ease * 2.0,
          y: ease * 0.4 * handMultiplier,
          z: ease * 0.6,
          scale: 1 + ease * 0.4
        };
      case 3: // Diagonal upper cut
        return {
          x: ease * 1.5,
          y: ease * 1.8 * handMultiplier,
          z: ease * 1.0 * handMultiplier,
          scale: 1 + ease * 0.35
        };
      case 4: // Spiral twist
        return {
          x: ease * 1.2 * Math.sin(progress * Math.PI * 2),
          y: ease * 2.0 * handMultiplier,
          z: ease * 2.5 * handMultiplier,
          scale: 1 + ease * 0.25
        };
      case 5: // Quick jab
        return {
          x: ease * 0.5,
          y: ease * 0.8 * handMultiplier,
          z: ease * 3.0,
          scale: 1 + ease * 0.5
        };
      case 6: // Wide arc
        return {
          x: ease * 1.0 * Math.cos(progress * Math.PI),
          y: ease * 3.5 * handMultiplier,
          z: ease * 0.8,
          scale: 1 + ease * 0.2
        };
      case 7: // Figure-8 motion
        return {
          x: ease * 1.5 * Math.sin(progress * Math.PI * 4),
          y: ease * 2.2 * handMultiplier,
          z: ease * 1.4 * Math.cos(progress * Math.PI * 2),
          scale: 1 + ease * 0.3
        };
      case 8: // Lightning fast horizontal
        return {
          x: ease * 0.6,
          y: ease * 4.0 * handMultiplier,
          z: ease * 0.4,
          scale: 1 + ease * 0.6
        };
      case 9: // Overhead smash
        return {
          x: ease * 2.5,
          y: ease * 1.0 * handMultiplier,
          z: ease * 0.5,
          scale: 1 + ease * 0.45
        };
      case 10: // Spinning slice
        return {
          x: ease * 1.8 * Math.sin(progress * Math.PI * 3),
          y: ease * 1.5 * handMultiplier,
          z: ease * 1.8 * handMultiplier,
          scale: 1 + ease * 0.25
        };
      case 11: // Cross cut
        return {
          x: ease * 1.4 * (progress > 0.5 ? -1 : 1),
          y: ease * 2.8 * handMultiplier,
          z: ease * 1.1,
          scale: 1 + ease * 0.35
        };
      case 12: // Whirlwind
        return {
          x: ease * 2.0 * Math.cos(progress * Math.PI * 6),
          y: ease * 2.0 * Math.sin(progress * Math.PI * 6) * handMultiplier,
          z: ease * 3.0 * handMultiplier,
          scale: 1 + ease * 0.4
        };
      case 13: // Rising uppercut
        return {
          x: ease * 2.2,
          y: ease * 1.2 * handMultiplier,
          z: ease * 1.6 * (1 - progress),
          scale: 1 + ease * 0.55
        };
      case 14: // Side sweep
        return {
          x: ease * 0.3,
          y: ease * 3.8 * handMultiplier,
          z: ease * 1.5 * Math.sin(progress * Math.PI),
          scale: 1 + ease * 0.3
        };
      case 15: // Double tap
        return {
          x: ease * 1.6 * (Math.sin(progress * Math.PI * 8) > 0 ? 1 : -1),
          y: ease * 2.4 * handMultiplier,
          z: ease * 0.9,
          scale: 1 + ease * 0.4
        };
      case 16: // Circular sweep
        return {
          x: ease * 1.8 * Math.cos(progress * Math.PI * 2),
          y: ease * 1.8 * Math.sin(progress * Math.PI * 2) * handMultiplier,
          z: ease * 2.2 * handMultiplier,
          scale: 1 + ease * 0.25
        };
      case 17: // Heavy slam
        return {
          x: ease * 3.0,
          y: ease * 0.8 * handMultiplier,
          z: ease * 0.6,
          scale: 1 + ease * 0.7
        };
      case 18: // Quick flick
        return {
          x: ease * 0.8 * Math.pow(progress, 3),
          y: ease * 3.2 * handMultiplier,
          z: ease * 2.8 * handMultiplier,
          scale: 1 + ease * 0.5
        };
      case 19: // Wild swing - deterministic using sine-based pseudo-random pattern
        return {
          x: ease * 2.4 * (0.5 + 0.5 * Math.sin(progress * 7.3 + 1.2)),
          y: ease * 2.6 * handMultiplier,
          z: ease * 1.9 * handMultiplier,
          scale: 1 + ease * 0.35
        };
      default: // case 0 or any other - basic swing
        return {
          x: ease * 1.2,
          y: ease * 1.8 * handMultiplier,
          z: ease * 1.0 * handMultiplier,
          scale: 1 + ease * 0.2
        };
    }
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

    if (isSwinging && !isSwingActive.current) {
      // Start a new swing animation, cycling through types deterministically
      isSwingActive.current = true;
      swingTime.current = 0;
      currentSwingType.current = swingCounter.current % 20; // 0-19 swing types, cycling
      swingCounter.current += 1;
    }
    
    if (isSwingActive.current) {
      // Progress swing animation
      swingTime.current += deltaTime;
      
      // Calculate swing progress (0 to 1)
      const progress = Math.min(swingTime.current / swingDuration, 1);
      
      // Get the swing pattern for current type
      const pattern = getSwingPattern(currentSwingType.current, progress, hand);
      
      // Apply the pattern to the sword
      groupRef.current.rotation.x = -Math.PI / 8 + pattern.x;
      groupRef.current.rotation.y = (hand === 'left' ? Math.PI / 6 : -Math.PI / 6) + pattern.y;
      groupRef.current.rotation.z = pattern.z;
      
      // Scale effect during swing
      groupRef.current.scale.setScalar(pattern.scale);
      
      // Store progress for trail effect
      swingProgress.current = progress;
      
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