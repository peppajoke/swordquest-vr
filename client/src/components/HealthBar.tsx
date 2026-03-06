import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface HealthBarProps {
  health: number;
  maxHealth: number;
  enemyType?: string;
}

export default function HealthBar({ health, maxHealth }: HealthBarProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const healthPercentage = Math.max(0, health / maxHealth);

  useFrame(() => {
    if (!groupRef.current) return;
    // Billboard: always face the camera
    groupRef.current.lookAt(camera.position);
  });

  // Don't show if full health or dead
  if (healthPercentage >= 1 || healthPercentage <= 0) {
    return null;
  }

  // Color based on health percentage
  const getHealthColor = (pct: number) => {
    if (pct > 0.6) return '#22DD22'; // Green
    if (pct > 0.3) return '#FFCC00'; // Yellow
    return '#FF2222';                 // Red
  };

  const healthColor = getHealthColor(healthPercentage);
  const BAR_W = 1.0;
  const BAR_H = 0.12;

  // Fill bar: anchor to left edge, scale inward
  const fillWidth = BAR_W * healthPercentage;
  const fillOffsetX = -(BAR_W - fillWidth) / 2;

  return (
    {/* GruntMesh wrapper is at [0,-0.41,0] and head top ~2.0 above wrapper = ~1.6 in group space */}
    {/* Put bar clearly above head with a small z-push so it's never edge-on */}
    <group ref={groupRef} position={[0, 2.1, 0]}>
      {/* White background */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[BAR_W + 0.04, BAR_H + 0.04]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} depthTest={false} />
      </mesh>

      {/* Dark background track */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[BAR_W, BAR_H]} />
        <meshBasicMaterial color="#1A1A1A" transparent opacity={0.9} depthTest={false} />
      </mesh>

      {/* Health fill */}
      <mesh position={[fillOffsetX, 0, 0.002]}>
        <planeGeometry args={[fillWidth, BAR_H]} />
        <meshBasicMaterial color={healthColor} transparent opacity={1} depthTest={false} />
      </mesh>
    </group>
  );
}
