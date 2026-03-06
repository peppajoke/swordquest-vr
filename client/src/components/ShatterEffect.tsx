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
  rotVel: THREE.Vector3;
  rotation: THREE.Euler;
  size: [number, number, number];
}

export default function ShatterEffect({ origin, color, onComplete }: ShatterEffectProps) {
  const startTime = useRef(Date.now());
  const done = useRef(false);
  const LIFE = 0.75; // seconds

  // ── Build shards + materials in the SAME useMemo so they exist on first render ──
  const { shards, materials } = useMemo(() => {
    const count = 10 + Math.floor(Math.random() * 6); // 10–15 shards
    const shards: ShardData[] = [];
    const emissive = (() => {
      try { const c = new THREE.Color(color); c.multiplyScalar(1.5); return `#${c.getHexString()}`; }
      catch { return "#ffffff"; }
    })();

    const materials: THREE.MeshLambertMaterial[] = [];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = 2.5 + Math.random() * 4.0;
      shards.push({
        position: new THREE.Vector3(origin[0], origin[1] + 0.5, origin[2]),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.abs(Math.sin(phi) * Math.sin(theta)) * spd * 0.6 + 1.0,
          Math.cos(phi) * spd,
        ),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        ),
        size: [
          0.05 + Math.random() * 0.18,
          0.05 + Math.random() * 0.18,
          0.05 + Math.random() * 0.18,
        ],
      });
      materials.push(new THREE.MeshLambertMaterial({
        color,
        emissive,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 1.0,
      }));
    }
    return { shards, materials };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dispose materials on unmount
  useEffect(() => () => { materials.forEach(m => m.dispose()); }, [materials]);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    if (done.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;
    if (elapsed >= LIFE) {
      done.current = true;
      onComplete();
      return;
    }

    const opacity = Math.max(0, 1 - elapsed / LIFE);
    const dt = Math.min(delta, 0.05);

    shards.forEach((s, i) => {
      s.velocity.y -= 9.8 * dt;
      s.velocity.multiplyScalar(Math.pow(0.92, dt * 60));
      s.position.addScaledVector(s.velocity, dt);
      s.rotation.x += s.rotVel.x * dt;
      s.rotation.y += s.rotVel.y * dt;
      s.rotation.z += s.rotVel.z * dt;
      const mesh = meshRefs.current[i];
      if (mesh) { mesh.position.copy(s.position); mesh.rotation.copy(s.rotation); }
      materials[i].opacity = opacity;
    });
  });

  if (done.current) return null;

  return (
    <>
      {shards.map((s, i) => (
        <mesh
          key={i}
          ref={el => { meshRefs.current[i] = el; }}
          position={[s.position.x, s.position.y, s.position.z]}
        >
          <boxGeometry args={s.size} />
          {/* material exists on first render — no ?? fallback needed */}
          <primitive object={materials[i]} attach="material" />
        </mesh>
      ))}
    </>
  );
}
