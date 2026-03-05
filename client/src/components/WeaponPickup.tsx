/**
 * WeaponPickup — a single floating weapon pickup in 3D space.
 * Walk close to pick it up (auto-proximity). If inventory is full, glows red briefly.
 * Renders inside worldGroup (local space) or world space — proximity uses getWorldPosition().
 */
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import type { MeleeWeaponId, RangedWeaponId } from '../lib/weapons';

export interface WeaponPickupProps {
  pickupId: string;
  weaponType: 'melee' | 'ranged';
  weaponId: MeleeWeaponId | RangedWeaponId;
  position: [number, number, number];
  onPicked?: (id: string) => void;
}

const PICKUP_RADIUS = 2.0;

// Distinct colors per weapon
const WEAPON_COLORS: Record<string, string> = {
  longsword:  '#c0a040',
  dagger:     '#40c080',
  shortsword: '#80c040',
  battleaxe:  '#c06030',
  greatsword: '#9040c0',
  warhammer:  '#c04040',
  pistols:    '#4a90e2',
  smg:        '#40d0d0',
  shotgun:    '#e08040',
  sniper:     '#60a0ff',
};

export default function WeaponPickup({
  pickupId,
  weaponType,
  weaponId,
  position,
  onPicked,
}: WeaponPickupProps) {
  const { camera } = useThree();
  const [picked, setPicked] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const pickedRef = useRef(false);
  const fullFlashRef = useRef(false);
  const t = useRef(0);
  const baseY = position[1];

  useFrame((_, delta) => {
    if (pickedRef.current) return;
    t.current += delta;

    if (groupRef.current) {
      groupRef.current.position.y = baseY + Math.sin(t.current * 1.4) * 0.12;
      groupRef.current.rotation.y = t.current * 0.6;
    }

    // World-space proximity check
    if (!groupRef.current) return;
    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);

    if (camera.position.distanceTo(worldPos) < PICKUP_RADIUS) {
      const store = useVRGame.getState();
      const success = store.pickupWeapon(weaponType, weaponId as MeleeWeaponId & RangedWeaponId);

      if (success) {
        // Set active weapon mode if not already set
        if (!store.activeWeapon) {
          store.setActiveWeapon(weaponType === 'melee' ? 'sword' : 'gun');
        }
        pickedRef.current = true;
        setPicked(true);
        onPicked?.(pickupId);
      } else {
        // Inventory full — brief red flash (debounced)
        if (!fullFlashRef.current) {
          fullFlashRef.current = true;
          setShowFull(true);
          setTimeout(() => {
            fullFlashRef.current = false;
            setShowFull(false);
          }, 1000);
        }
      }
    }
  });

  if (picked) return null;

  const isMelee = weaponType === 'melee';
  const glowColor = showFull ? '#ff3333' : (WEAPON_COLORS[weaponId] ?? '#ffffff');

  return (
    <group ref={groupRef} position={position}>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={showFull ? 0.18 : 0.08} />
      </mesh>

      {isMelee ? (
        /* ── Melee visual (sword/dagger shape) ── */
        <>
          {/* Blade */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.035, 0.55, 0.01]} />
            <meshLambertMaterial color="#c8c8d0" emissive={glowColor} emissiveIntensity={0.6} />
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
        </>
      ) : (
        /* ── Ranged visual (gun shape) ── */
        <>
          {/* Body */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 0.06, 0.25]} />
            <meshLambertMaterial color="#333333" emissive={glowColor} emissiveIntensity={0.5} />
          </mesh>
          {/* Barrel */}
          <mesh position={[0, 0.017, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.15, 8]} />
            <meshLambertMaterial color="#222222" emissive={glowColor} emissiveIntensity={0.4} />
          </mesh>
          {/* Grip */}
          <mesh position={[0, -0.07, 0.04]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.055, 0.1, 0.045]} />
            <meshLambertMaterial color="#444444" />
          </mesh>
        </>
      )}

      {/* Atmosphere point light */}
      <pointLight position={[0, 0, 0]} color={glowColor} intensity={1.2} distance={4} />
    </group>
  );
}
