import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface EnemyMeshProps {
  type: string;
  color: string;
  isAttacking?: boolean;
  rageMode?: boolean;
}

// ─── GRUNT ───────────────────────────────────────────────────────────────────
// Blocky Robot Guard: angular dark-steel chassis, glowing orange visor strip,
// chunky segmented limbs, warning stripe on chest. No organic shapes — all boxes.
// Wrapper offset -0.41 keeps boot bottoms at world y=0.
function GruntMesh({ color: _color }: { color: string }) {
  // Fixed robot palette — ignore the inherited color (was red guard uniform)
  const steel      = "#2c2f3a"; // primary chassis
  const panel      = "#3d4150"; // secondary panel faces
  const dark       = "#191b22"; // joints / recesses
  const visor      = "#ff5500"; // emissive eye strip
  const chestLight = "#ff2200"; // emissive chest sensor
  const warningYel = "#ffaa00"; // warning stripe

  return (
    <group position={[0, -0.41, 0]}>

      {/* ── HEAD ── */}
      {/* Main skull block */}
      <mesh position={[0, 1.74, 0]} castShadow>
        <boxGeometry args={[0.38, 0.32, 0.34]} />
        <meshLambertMaterial color={steel} />
      </mesh>
      {/* Visor eye strip — full-width emissive orange bar */}
      <mesh position={[0, 1.74, -0.172]}>
        <boxGeometry args={[0.32, 0.08, 0.02]} />
        <meshLambertMaterial color={visor} emissive={visor} emissiveIntensity={1.2} />
      </mesh>
      {/* Top antenna nub */}
      <mesh position={[0, 1.92, 0]} castShadow>
        <boxGeometry args={[0.06, 0.1, 0.06]} />
        <meshLambertMaterial color={dark} />
      </mesh>
      {/* Chin/jaw plate */}
      <mesh position={[0, 1.60, -0.14]} castShadow>
        <boxGeometry args={[0.28, 0.08, 0.06]} />
        <meshLambertMaterial color={panel} />
      </mesh>

      {/* ── NECK ── */}
      <mesh position={[0, 1.50, 0]} castShadow>
        <boxGeometry args={[0.18, 0.1, 0.18]} />
        <meshLambertMaterial color={dark} />
      </mesh>

      {/* ── TORSO ── */}
      {/* Main body block */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.58, 0.62, 0.34]} />
        <meshLambertMaterial color={steel} />
      </mesh>
      {/* Chest armour plate */}
      <mesh position={[0, 1.22, -0.172]} castShadow>
        <boxGeometry args={[0.40, 0.36, 0.04]} />
        <meshLambertMaterial color={panel} />
      </mesh>
      {/* Warning stripe on chest */}
      <mesh position={[0, 1.10, -0.192]}>
        <boxGeometry args={[0.38, 0.08, 0.02]} />
        <meshLambertMaterial color={warningYel} emissive={warningYel} emissiveIntensity={0.5} />
      </mesh>
      {/* Chest sensor dot */}
      <mesh position={[0, 1.30, -0.192]}>
        <boxGeometry args={[0.07, 0.07, 0.02]} />
        <meshLambertMaterial color={chestLight} emissive={chestLight} emissiveIntensity={1.0} />
      </mesh>

      {/* ── SHOULDERS (wide pads) ── */}
      <mesh position={[-0.42, 1.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.18, 0.30]} />
        <meshLambertMaterial color={panel} />
      </mesh>
      <mesh position={[0.42, 1.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.18, 0.30]} />
        <meshLambertMaterial color={panel} />
      </mesh>

      {/* ── UPPER ARMS ── */}
      <mesh position={[-0.46, 1.08, 0]} castShadow>
        <boxGeometry args={[0.16, 0.32, 0.16]} />
        <meshLambertMaterial color={steel} />
      </mesh>
      <mesh position={[0.46, 1.08, 0]} castShadow>
        <boxGeometry args={[0.16, 0.32, 0.16]} />
        <meshLambertMaterial color={steel} />
      </mesh>

      {/* ── ELBOW JOINTS ── */}
      <mesh position={[-0.46, 0.90, 0]} castShadow>
        <boxGeometry args={[0.18, 0.1, 0.18]} />
        <meshLambertMaterial color={dark} />
      </mesh>
      <mesh position={[0.46, 0.90, 0]} castShadow>
        <boxGeometry args={[0.18, 0.1, 0.18]} />
        <meshLambertMaterial color={dark} />
      </mesh>

      {/* ── FOREARMS ── */}
      <mesh position={[-0.46, 0.70, 0]} castShadow>
        <boxGeometry args={[0.14, 0.28, 0.14]} />
        <meshLambertMaterial color={panel} />
      </mesh>
      <mesh position={[0.46, 0.70, 0]} castShadow>
        <boxGeometry args={[0.14, 0.28, 0.14]} />
        <meshLambertMaterial color={panel} />
      </mesh>

      {/* ── FISTS ── */}
      <mesh position={[-0.46, 0.54, 0]} castShadow>
        <boxGeometry args={[0.16, 0.14, 0.16]} />
        <meshLambertMaterial color={dark} />
      </mesh>
      <mesh position={[0.46, 0.54, 0]} castShadow>
        <boxGeometry args={[0.16, 0.14, 0.16]} />
        <meshLambertMaterial color={dark} />
      </mesh>

      {/* ── HIP BLOCK ── */}
      <mesh position={[0, 0.76, 0]} castShadow>
        <boxGeometry args={[0.50, 0.18, 0.30]} />
        <meshLambertMaterial color={panel} />
      </mesh>

      {/* ── THIGHS ── */}
      <mesh position={[-0.16, 0.56, 0]} castShadow>
        <boxGeometry args={[0.20, 0.26, 0.22]} />
        <meshLambertMaterial color={steel} />
      </mesh>
      <mesh position={[0.16, 0.56, 0]} castShadow>
        <boxGeometry args={[0.20, 0.26, 0.22]} />
        <meshLambertMaterial color={steel} />
      </mesh>

      {/* ── KNEE JOINTS ── */}
      <mesh position={[-0.16, 0.42, 0]} castShadow>
        <boxGeometry args={[0.22, 0.10, 0.24]} />
        <meshLambertMaterial color={dark} />
      </mesh>
      <mesh position={[0.16, 0.42, 0]} castShadow>
        <boxGeometry args={[0.22, 0.10, 0.24]} />
        <meshLambertMaterial color={dark} />
      </mesh>

      {/* ── SHINS ── */}
      <mesh position={[-0.16, 0.26, 0]} castShadow>
        <boxGeometry args={[0.18, 0.22, 0.20]} />
        <meshLambertMaterial color={panel} />
      </mesh>
      <mesh position={[0.16, 0.26, 0]} castShadow>
        <boxGeometry args={[0.18, 0.22, 0.20]} />
        <meshLambertMaterial color={panel} />
      </mesh>

      {/* ── FEET (wide, flat boots) ── */}
      <mesh position={[-0.16, 0.47, 0.04]} castShadow>
        <boxGeometry args={[0.24, 0.12, 0.36]} />
        <meshLambertMaterial color={steel} />
      </mesh>
      <mesh position={[0.16, 0.47, 0.04]} castShadow>
        <boxGeometry args={[0.24, 0.12, 0.36]} />
        <meshLambertMaterial color={steel} />
      </mesh>

    </group>
  );
}

// ─── WASP ─────────────────────────────────────────────────────────────────────
// Elongated cone body + 2 flat box wings angled outward
function WaspMesh({ color }: { color: string }) {
  return (
    <group>
      {/* Body — cone, tip pointing down */}
      <mesh castShadow position={[0, 0.45, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.15, 0.6, 8]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Stinger tip */}
      <mesh castShadow position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.04, 0.18, 6]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Left wing */}
      <mesh castShadow position={[-0.32, 0.6, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.4, 0.04, 0.18]} />
        <meshLambertMaterial color="#eeddaa" transparent opacity={0.55} />
      </mesh>
      {/* Right wing */}
      <mesh castShadow position={[0.32, 0.6, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.4, 0.04, 0.18]} />
        <meshLambertMaterial color="#eeddaa" transparent opacity={0.55} />
      </mesh>
      {/* Head sphere */}
      <mesh castShadow position={[0, 0.82, 0]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

// ─── DRONE ────────────────────────────────────────────────────────────────────
// Sphere core + 4 cylinder arms in cross + disc at each arm end
function DroneMesh({ color }: { color: string }) {
  const arms = [
    { pos: [0.55, 0, 0] as [number,number,number], rot: [0, 0, Math.PI / 2] as [number,number,number] },
    { pos: [-0.55, 0, 0] as [number,number,number], rot: [0, 0, Math.PI / 2] as [number,number,number] },
    { pos: [0, 0, 0.55] as [number,number,number], rot: [Math.PI / 2, 0, 0] as [number,number,number] },
    { pos: [0, 0, -0.55] as [number,number,number], rot: [Math.PI / 2, 0, 0] as [number,number,number] },
  ];

  const discOffsets: [number,number,number][] = [
    [0.95, 0, 0],
    [-0.95, 0, 0],
    [0, 0, 0.95],
    [0, 0, -0.95],
  ];

  return (
    <group position={[0, 0.4, 0]}>
      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[0.3, 10, 10]} />
        <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      {/* Arms */}
      {arms.map((arm, i) => (
        <mesh castShadow key={`arm-${i}`} position={arm.pos} rotation={arm.rot}>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
          <meshLambertMaterial color={color} />
        </mesh>
      ))}
      {/* Propeller discs */}
      {discOffsets.map((dpos, i) => (
        <mesh castShadow key={`disc-${i}`} position={dpos} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.04, 8]} />
          <meshLambertMaterial color="#88bbee" emissive="#4488cc" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ─── PHOENIX ──────────────────────────────────────────────────────────────────
// OctahedronGeometry body + 2 swept wing planes (large flat boxes, angled)
function PhoenixMesh({ color }: { color: string }) {
  return (
    <group>
      {/* Body */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <octahedronGeometry args={[0.4]} />
        <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      {/* Left wing */}
      <mesh castShadow position={[-0.65, 0.65, 0.1]} rotation={[0.2, 0.1, 0.6]}>
        <boxGeometry args={[0.7, 0.06, 0.35]} />
        <meshLambertMaterial color="#ff8822" emissive="#ff4400" emissiveIntensity={0.6} />
      </mesh>
      {/* Right wing */}
      <mesh castShadow position={[0.65, 0.65, 0.1]} rotation={[0.2, -0.1, -0.6]}>
        <boxGeometry args={[0.7, 0.06, 0.35]} />
        <meshLambertMaterial color="#ff8822" emissive="#ff4400" emissiveIntensity={0.6} />
      </mesh>
      {/* Tail feathers */}
      <mesh castShadow position={[0, 0.4, 0.3]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.25, 0.05, 0.4]} />
        <meshLambertMaterial color="#ffaa00" emissive="#ff6600" emissiveIntensity={0.5} />
      </mesh>
      {/* Head crest */}
      <mesh castShadow position={[0, 0.95, -0.1]} rotation={[-0.3, 0, 0]}>
        <coneGeometry args={[0.08, 0.22, 5]} />
        <meshLambertMaterial color="#ffcc00" emissive="#ff8800" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

// ─── BERSERKER ────────────────────────────────────────────────────────────────
// Wide box torso + angled spike shoulder boxes + forward lean
function BerserkerMesh({ color }: { color: string }) {
  return (
    // Forward lean via group rotation
    <group rotation={[0.18, 0, 0]}>
      {/* Wide torso */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.35]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[0.3, 0.28, 0.28]} />
        <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {/* Left shoulder spike */}
      <mesh castShadow position={[-0.45, 0.72, 0]} rotation={[0, 0, 0.6]}>
        <boxGeometry args={[0.22, 0.12, 0.18]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh castShadow position={[-0.58, 0.82, 0]} rotation={[0, 0, 1.1]}>
        <coneGeometry args={[0.07, 0.28, 4]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Right shoulder spike */}
      <mesh castShadow position={[0.45, 0.72, 0]} rotation={[0, 0, -0.6]}>
        <boxGeometry args={[0.22, 0.12, 0.18]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0.58, 0.82, 0]} rotation={[0, 0, -1.1]}>
        <coneGeometry args={[0.07, 0.28, 4]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Legs */}
      <mesh castShadow position={[-0.15, 0.16, 0]}>
        <boxGeometry args={[0.18, 0.35, 0.18]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0.15, 0.16, 0]}>
        <boxGeometry args={[0.18, 0.35, 0.18]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─── HEAVY ────────────────────────────────────────────────────────────────────
// Large flat box body + visor slit + shoulder slab boxes
function HeavyMesh({ color }: { color: string }) {
  return (
    <group>
      {/* Main body slab */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.5]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Helmet */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[0.65, 0.38, 0.48]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Visor slit */}
      <mesh castShadow position={[0, 1.02, 0.26]}>
        <boxGeometry args={[0.42, 0.08, 0.04]} />
        <meshLambertMaterial color="#004488" emissive="#0066cc" emissiveIntensity={0.9} />
      </mesh>
      {/* Left shoulder slab */}
      <mesh castShadow position={[-0.58, 0.78, 0]}>
        <boxGeometry args={[0.24, 0.22, 0.46]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Right shoulder slab */}
      <mesh castShadow position={[0.58, 0.78, 0]}>
        <boxGeometry args={[0.24, 0.22, 0.46]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Legs */}
      <mesh castShadow position={[-0.2, 0.08, 0]}>
        <boxGeometry args={[0.28, 0.2, 0.38]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0.2, 0.08, 0]}>
        <boxGeometry args={[0.28, 0.2, 0.38]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─── BOSS ─────────────────────────────────────────────────────────────────────
// Central octahedron core + 3 orbiting thin box shards that rotate via useFrame
function BossMesh({ color }: { color: string }) {
  const shardsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (shardsRef.current) {
      shardsRef.current.rotation.y = state.clock.elapsedTime * 1.8;
    }
  });

  const shardAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

  return (
    <group>
      {/* Core */}
      <mesh castShadow position={[0, 0.85, 0]}>
        <octahedronGeometry args={[0.6]} />
        <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
      {/* Inner ring glow */}
      <mesh castShadow position={[0, 0.85, 0]}>
        <torusGeometry args={[0.7, 0.04, 6, 24]} />
        <meshLambertMaterial color="#aa44ff" emissive="#6600cc" emissiveIntensity={1.0} transparent opacity={0.8} />
      </mesh>
      {/* Orbiting shards */}
      <group ref={shardsRef} position={[0, 0.85, 0]}>
        {shardAngles.map((angle, i) => (
          <mesh castShadow
            key={`shard-${i}`}
            position={[Math.cos(angle) * 1.05, (i - 1) * 0.22, Math.sin(angle) * 1.05]}
            rotation={[0.3, angle, 0.5]}
          >
            <boxGeometry args={[0.08, 0.5, 0.12]} />
            <meshLambertMaterial color="#cc88ff" emissive="#8800ff" emissiveIntensity={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function EnemyMesh({ type, color, isAttacking = false }: EnemyMeshProps) {
  // During attack flash, override color to red
  const displayColor = isAttacking ? "#FF0000" : color;

  switch (type) {
    case "grunt":
      return <GruntMesh color={displayColor} />;
    case "wasp":
      return <WaspMesh color={displayColor} />;
    case "drone":
      return <DroneMesh color={displayColor} />;
    case "phoenix":
      return <PhoenixMesh color={displayColor} />;
    case "berserker":
      return <BerserkerMesh color={displayColor} />;
    case "heavy":
      return <HeavyMesh color={displayColor} />;
    case "boss":
      return <BossMesh color={displayColor} />;
    default:
      // Fallback for any unhandled types (rifleman, assassin, etc.) — simple box
      return (
        <mesh castShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[0.4, 0.8, 0.4]} />
          <meshLambertMaterial color={displayColor} />
        </mesh>
      );
  }
}
