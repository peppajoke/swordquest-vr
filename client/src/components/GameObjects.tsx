import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

export default function GameObjects() {
  const { pillars } = useVRGame();
  
  // Generate 40 ammo pickups scattered around the level
  const ammoPickups = useMemo(() => {
    const pickups: Array<{ id: string; x: number; y: number; z: number }> = [];
    
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 140; // -70 to +70 (wider area)
      const z = -10 + Math.random() * -120;   // -10 to -130 (wider area)
      const y = 0.3; // Slightly above ground
      
      pickups.push({
        id: `ammo-${i}`,
        x, y, z
      });
    }
    
    return pickups;
  }, []);

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
      
      {/* Ammo Pickups */}
      {ammoPickups.map((pickup) => (
        <AmmoPickup
          key={pickup.id}
          position={[pickup.x, pickup.y, pickup.z]}
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

function AmmoPickup({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Add rotation animation
      meshRef.current.rotation.y += 0.02;
      // Add floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      
      // Mark for collision detection
      meshRef.current.userData.isAmmoPickup = true;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Ammo box */}
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.1, 0.25]} />
        <meshLambertMaterial color="#ffd700" />
      </mesh>
      
      {/* Ammo label */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.12, 0.02, 0.2]} />
        <meshLambertMaterial color="#333333" />
      </mesh>
    </group>
  );
}