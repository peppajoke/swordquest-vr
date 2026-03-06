import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface DropOrbProps {
  id: string;
  type: 'health' | 'xp' | 'ammo';
  position: [number, number, number];
  spawnTime: number;
}

const HEALTH_COLOR = '#00ff88';
const XP_COLOR = '#4488ff';
const AMMO_COLOR = '#ffcc00';
const COLLECT_RADIUS = 1.2;
const LIFETIME_MS = 15000;
const FADE_START_MS = 12000; // start fading at 12s

export default function DropOrb({ id, type, position, spawnTime }: DropOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [collected, setCollected] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const removedRef = useRef(false);

  const { removeDropOrb, heal, addXP } = useVRGame();

  const color = type === 'health' ? HEALTH_COLOR : type === 'ammo' ? AMMO_COLOR : XP_COLOR;

  // Cleanup after fade out
  useEffect(() => {
    return () => {
      // cleanup on unmount
    };
  }, []);

  useFrame((state) => {
    if (!meshRef.current || removedRef.current) return;

    const now = Date.now();
    const elapsed = now - spawnTime;

    // Expire after lifetime
    if (elapsed >= LIFETIME_MS) {
      if (!removedRef.current) {
        removedRef.current = true;
        removeDropOrb(id);
      }
      return;
    }

    // Bob animation: float up and down with sine wave
    const bobY = Math.sin(now * 0.002) * 0.12;
    meshRef.current.position.set(position[0], position[1] + 0.5 + bobY, position[2]);
    if (glowRef.current) {
      glowRef.current.position.set(position[0], position[1] + 0.5 + bobY, position[2]);
    }

    // Slow rotation
    meshRef.current.rotation.y += 0.02;

    // Pulsing scale
    const pulse = 1 + Math.sin(now * 0.004) * 0.1;
    meshRef.current.scale.setScalar(pulse);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(pulse * 1.5);
    }

    // Fade out near expiry
    let newOpacity = 1;
    if (elapsed > FADE_START_MS) {
      newOpacity = 1 - (elapsed - FADE_START_MS) / (LIFETIME_MS - FADE_START_MS);
      newOpacity = Math.max(0, newOpacity);
    }

    // Apply opacity
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat && mat.opacity !== newOpacity) {
      mat.opacity = newOpacity;
      if (glowRef.current) {
        const glowMat = glowRef.current.material as THREE.MeshStandardMaterial;
        if (glowMat) glowMat.opacity = newOpacity * 0.3;
      }
    }

    // Collection check: world distance to camera
    const cameraPos = state.camera.position;
    const orbWorldPos = meshRef.current.position; // already set in world space
    const dist = orbWorldPos.distanceTo(cameraPos);

    if (!collected && dist < COLLECT_RADIUS) {
      setCollected(true);
      removedRef.current = true;

      if (type === 'health') {
        heal(15);
      } else if (type === 'ammo') {
        // Reload both guns to full via the audio store's reload trigger
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playReload();
        });
        // Signal ammo pickup to DesktopControls via a custom event
        window.dispatchEvent(new CustomEvent('ammo-pickup', { detail: { amount: 12 } }));
      } else {
        addXP(10);
      }

      // Remove from store
      removeDropOrb(id);
    }
  });

  if (collected) return null;

  return (
    <>
      {/* Outer glow sphere */}
      <mesh ref={glowRef} position={[position[0], position[1] + 0.5, position[2]]}>
        <sphereGeometry args={[0.2 * 1.5, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent={true}
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Core orb */}
      <mesh ref={meshRef} position={[position[0], position[1] + 0.5, position[2]]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent={true}
          opacity={1}
        />
      </mesh>
    </>
  );
}
