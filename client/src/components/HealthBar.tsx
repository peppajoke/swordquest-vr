import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface HealthBarProps {
  health: number;
  maxHealth: number;
  position: [number, number, number];
  enemyType?: string;
}

export default function HealthBar({ health, maxHealth, position, enemyType }: HealthBarProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const healthPercentage = Math.max(0, health / maxHealth);
  
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Position the health bar above the enemy
    groupRef.current.position.set(position[0], position[1] + 2.5, position[2]);
    
    // Make health bar always face the camera
    groupRef.current.lookAt(camera.position);
  });

  // Don't show health bar if enemy is at full health or dead
  if (healthPercentage >= 1 || healthPercentage <= 0) {
    return null;
  }

  // Color based on health percentage
  const getHealthColor = (percentage: number) => {
    if (percentage > 0.6) return '#00FF00'; // Green
    if (percentage > 0.3) return '#FFFF00'; // Yellow
    return '#FF0000'; // Red
  };

  const healthColor = getHealthColor(healthPercentage);

  return (
    <group ref={groupRef}>
      {/* Background bar (dark) */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[1.0, 0.1]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.8} />
      </mesh>
      
      {/* Health bar (colored) */}
      <mesh position={[-(1.0 - healthPercentage) / 2, 0, 0.002]} scale={[healthPercentage, 1, 1]}>
        <planeGeometry args={[1.0, 0.1]} />
        <meshBasicMaterial color={healthColor} transparent opacity={0.9} />
      </mesh>
      
      {/* Border */}
      <mesh position={[0, 0, 0.003]}>
        <ringGeometry args={[0.48, 0.52, 4]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}