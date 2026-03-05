/**
 * WeaponPickup — two glowing 3D weapons floating in the room at game start.
 * Walk close to one and it auto-picks up, locking your weapon class for the run.
 */
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface WeaponPickupProps {
  onPicked: (weapon: 'sword' | 'gun') => void;
}

const PICKUP_RADIUS = 2.0;

export default function WeaponPickup({ onPicked }: WeaponPickupProps) {
  const { camera } = useThree();
  const { setActiveWeapon, setPlayerStats } = useVRGame();
  const [picked, setPicked] = useState(false);
  const swordRef = useRef<THREE.Group>(null);
  const gunRef = useRef<THREE.Group>(null);
  const t = useRef(0);

  // Positions in LOCAL space of worldGroup (which is at z=10)
  // World z = local z + 10. Camera at world z=-5, so local z=-25 = world z=-15 (in front)
  const swordLocalPos = new THREE.Vector3(-5, 1.4, -25);
  const gunLocalPos   = new THREE.Vector3( 5, 1.4, -25);
  // World positions for proximity check (camera.position is world space)
  const swordWorldPos = new THREE.Vector3(-5, 1.4, -25 + 10); // z=-15
  const gunWorldPos   = new THREE.Vector3( 5, 1.4, -25 + 10); // z=-15

  useFrame((_, delta) => {
    if (picked) return;
    t.current += delta;

    // Float animation
    if (swordRef.current) {
      swordRef.current.position.y = swordLocalPos.y + Math.sin(t.current * 1.4) * 0.12;
      swordRef.current.rotation.y = t.current * 0.6;
    }
    if (gunRef.current) {
      gunRef.current.position.y = gunLocalPos.y + Math.sin(t.current * 1.4 + Math.PI) * 0.12;
      gunRef.current.rotation.y = -t.current * 0.6;
    }

    // Proximity check — compare world positions (camera is in world space)
    const camPos = camera.position.clone();
    if (camPos.distanceTo(swordWorldPos) < PICKUP_RADIUS) {
      setPicked(true);
      setActiveWeapon('sword');
      setPlayerStats({ str: 2, agi: 0, vit: 0 });
      onPicked('sword');
    } else if (camPos.distanceTo(gunWorldPos) < PICKUP_RADIUS) {
      setPicked(true);
      setActiveWeapon('gun');
      setPlayerStats({ str: 0, agi: 2, vit: 0 });
      onPicked('gun');
    }
  });

  if (picked) return null;

  return (
    <group>
      {/* ── Sword ── */}
      <group ref={swordRef} position={swordLocalPos.toArray() as [number,number,number]}>
        {/* Glow halo */}
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color="#c0a040" transparent opacity={0.08} />
        </mesh>
        {/* Blade */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.035, 0.55, 0.01]} />
          <meshLambertMaterial color="#c8c8d0" emissive="#c0a040" emissiveIntensity={0.6} />
        </mesh>
        {/* Guard */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.22, 0.025, 0.045]} />
          <meshLambertMaterial color="#888888" emissive="#806030" emissiveIntensity={0.4} />
        </mesh>
        {/* Handle */}
        <mesh position={[0, -0.17, 0]}>
          <cylinderGeometry args={[0.022, 0.028, 0.25, 8]} />
          <meshLambertMaterial color="#5c3820" />
        </mesh>
        {/* Label */}
        <mesh position={[0, -0.72, 0]}>
          <boxGeometry args={[0.001, 0.001, 0.001]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>

      {/* Sword label — simple sprite plane */}
      <mesh position={[swordLocalPos.x, swordLocalPos.y - 0.75, swordLocalPos.z]}>
        <planeGeometry args={[1.4, 0.35]} />
        <meshBasicMaterial color="#c0a040" transparent opacity={0.0} />
      </mesh>

      {/* ── Gun ── */}
      <group ref={gunRef} position={gunLocalPos.toArray() as [number,number,number]}>
        {/* Glow halo */}
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color="#4a90e2" transparent opacity={0.08} />
        </mesh>
        {/* Body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.08, 0.06, 0.25]} />
          <meshLambertMaterial color="#333333" emissive="#2244aa" emissiveIntensity={0.5} />
        </mesh>
        {/* Barrel */}
        <mesh position={[0, 0.017, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.15, 8]} />
          <meshLambertMaterial color="#222222" emissive="#1133aa" emissiveIntensity={0.4} />
        </mesh>
        {/* Grip */}
        <mesh position={[0, -0.07, 0.04]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.055, 0.1, 0.045]} />
          <meshLambertMaterial color="#444444" />
        </mesh>
      </group>

      {/* Point lights for atmosphere */}
      <pointLight position={swordLocalPos.toArray() as [number,number,number]} color="#c0a040" intensity={1.2} distance={4} />
      <pointLight position={gunLocalPos.toArray() as [number,number,number]} color="#4a90e2" intensity={1.2} distance={4} />
    </group>
  );
}
