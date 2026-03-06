import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ShatterEffectProps {
  origin: [number, number, number];
  color: string;
  onComplete: () => void;
}

interface ShardData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationVelocity: THREE.Vector3;
  rotation: THREE.Euler;
  size: [number, number, number];
}

export default function ShatterEffect({ origin, color, onComplete }: ShatterEffectProps) {
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);
  const materialsRef = useRef<THREE.MeshLambertMaterial[]>([]);

  const shards = useMemo<ShardData[]>(() => {
    const count = 12 + Math.floor(Math.random() * 7); // 12–18
    const result: ShardData[] = [];

    for (let i = 0; i < count; i++) {
      // Random outward direction spread across a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2.5 + Math.random() * 4.5;

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.abs(Math.sin(phi) * Math.sin(theta)) * speed * 0.6 + 1.0; // bias upward initially
      const vz = Math.cos(phi) * speed;

      result.push({
        position: new THREE.Vector3(origin[0], origin[1] + 0.5, origin[2]),
        velocity: new THREE.Vector3(vx, vy, vz),
        rotationVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        size: [
          0.05 + Math.random() * 0.20,
          0.05 + Math.random() * 0.20,
          0.05 + Math.random() * 0.20,
        ],
      });
    }
    return result;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build brighter emissive color from the enemy color
  const emissiveColor = useMemo(() => {
    try {
      const c = new THREE.Color(color);
      c.multiplyScalar(1.6);
      return `#${c.getHexString()}`;
    } catch {
      return "#ffffff";
    }
  }, [color]);

  // Build material refs for opacity animation
  useEffect(() => {
    materialsRef.current = shards.map(() =>
      new THREE.MeshLambertMaterial({
        color,
        emissive: emissiveColor,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 1.0,
      })
    );
    return () => {
      materialsRef.current.forEach(m => m.dispose());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    if (completedRef.current) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
    const totalLife = 0.8; // 800ms

    if (elapsed >= totalLife) {
      completedRef.current = true;
      onComplete();
      return;
    }

    const opacity = Math.max(0, 1.0 - elapsed / totalLife);
    const dt = Math.min(delta, 0.05); // cap delta for stability

    shards.forEach((shard, i) => {
      // Apply gravity
      shard.velocity.y -= 9.8 * dt;
      // Dampen velocity
      shard.velocity.multiplyScalar(0.92 ** (dt * 60));
      // Move shard
      shard.position.addScaledVector(shard.velocity, dt);
      // Rotate shard
      shard.rotation.x += shard.rotationVelocity.x * dt;
      shard.rotation.y += shard.rotationVelocity.y * dt;
      shard.rotation.z += shard.rotationVelocity.z * dt;

      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.copy(shard.position);
        mesh.rotation.copy(shard.rotation);
      }

      const mat = materialsRef.current[i];
      if (mat) {
        mat.opacity = opacity;
      }
    });
  });

  if (completedRef.current) return null;

  return (
    <>
      {shards.map((shard, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          position={[shard.position.x, shard.position.y, shard.position.z]}
          rotation={[shard.rotation.x, shard.rotation.y, shard.rotation.z]}
        >
          <boxGeometry args={shard.size} />
          {/* Material injected via ref in useEffect */}
          <primitive object={materialsRef.current[i] ?? new THREE.MeshLambertMaterial({ color, transparent: true })} attach="material" />
        </mesh>
      ))}
    </>
  );
}
