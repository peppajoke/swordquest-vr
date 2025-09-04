import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface Target {
  id: string;
  position: [number, number, number];
  destroyed: boolean;
  mesh?: THREE.Mesh;
}

export default function GameObjects() {
  const { targets, destroyTarget, score } = useVRGame();
  const targetRefs = useRef<{ [key: string]: THREE.Mesh }>({});

  return (
    <>
      {/* Score Display */}
      <mesh position={[0, 3, -2]}>
        <boxGeometry args={[2, 0.5, 0.1]} />
        <meshLambertMaterial color="#2c3e50" />
      </mesh>

      {/* Destructible Targets */}
      {targets.map((target) => (
        <TargetBox
          key={target.id}
          target={target}
          onRef={(mesh) => {
            if (mesh) {
              targetRefs.current[target.id] = mesh;
            }
          }}
        />
      ))}

      {/* Static Environment Objects */}
      <mesh position={[-3, 1, -1]} castShadow>
        <boxGeometry args={[0.5, 2, 0.5]} />
        <meshLambertMaterial color="#8b4513" />
      </mesh>

      <mesh position={[3, 1, -1]} castShadow>
        <boxGeometry args={[0.5, 2, 0.5]} />
        <meshLambertMaterial color="#8b4513" />
      </mesh>

      <mesh position={[0, 0.5, -4]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color="#7f8c8d" />
      </mesh>
    </>
  );
}

function TargetBox({ target, onRef }: { target: any, onRef: (mesh: THREE.Mesh | null) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [destroyed, setDestroyed] = useState(false);
  const { registerTarget } = useVRGame();

  useFrame(() => {
    if (meshRef.current && !destroyed) {
      // Register target for collision detection
      registerTarget(target.id, meshRef.current);
      onRef(meshRef.current);
    }
  });

  if (target.destroyed || destroyed) {
    return null;
  }

  const colors = ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6'];
  const color = colors[Math.abs(target.id.charCodeAt(0)) % colors.length];

  return (
    <mesh
      ref={meshRef}
      position={target.position}
      castShadow
      receiveShadow
      onClick={() => {
      }}
    >
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}
