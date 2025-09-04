import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

export default function GameObjects() {
  const { pillars } = useVRGame();

  return (
    <>
      {/* Red Pillars scattered throughout the level */}
      {pillars.map((pillar) => (
        <RedPillar
          key={pillar.id}
          position={pillar.position}
          destroyed={pillar.destroyed}
        />
      ))}
    </>
  );
}

function RedPillar({ position, destroyed }: { position: [number, number, number], destroyed: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && !destroyed) {
      // Add the pillar marker for collision detection
      meshRef.current.userData.isPillar = true;
    }
  });

  if (destroyed) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[0.3, 0.3, 2, 8]} />
      <meshLambertMaterial color="#e74c3c" />
    </mesh>
  );
}