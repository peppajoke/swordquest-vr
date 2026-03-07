import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import { ZONES, ZoneId } from '../lib/zones';

interface CheckpointBeaconProps {
  /** Local worldGroup position */
  position: [number, number, number];
  /** Zone to transition to (ignored when comingSoon=true) */
  nextZone?: ZoneId;
  /** Override the floating label text */
  label?: string;
  /** If true: no zone transition, just shows "AREA COMING SOON" flash */
  comingSoon?: boolean;
}

export default function CheckpointBeacon({
  position,
  nextZone,
  label,
  comingSoon = false,
}: CheckpointBeaconProps) {
  const groupRef  = useRef<THREE.Group>(null);
  const pillarRef = useRef<THREE.Group>(null);
  const triggered = useRef(false);
  const { camera } = useThree();
  const { setZone, setRoomCleared, setShowUpgradeScreen } = useVRGame();
  const [pulseScale, setPulseScale] = useState(1);
  const [showComingSoonText, setShowComingSoonText] = useState(false);

  const isCyan   = !comingSoon;
  const beaconColor  = isCyan ? '#00ffcc' : '#ff8800';
  const emissiveCol  = isCyan ? '#00ffcc' : '#ff4400';
  const orbColor     = isCyan ? '#00ffff' : '#ffaa00';
  const displayLabel = label ?? (comingSoon ? 'AREA COMING SOON' : 'CHECKPOINT');

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Rotate the pillar slowly
    if (pillarRef.current) {
      pillarRef.current.rotation.y = t * 0.6;
    }

    // Pulse point light
    const light = groupRef.current?.getObjectByName('beaconLight') as THREE.PointLight | undefined;
    if (light) {
      light.intensity = 8 + Math.sin(t * 3.0) * 4;
    }

    if (triggered.current) return;

    // Proximity check — beacon world pos vs camera world pos
    if (!groupRef.current) return;
    const beaconWorld = new THREE.Vector3();
    groupRef.current.getWorldPosition(beaconWorld);

    if (camera.position.distanceTo(beaconWorld) < 2.5) {
      triggered.current = true;

      if (comingSoon) {
        setShowComingSoonText(true);
        window.dispatchEvent(
          new CustomEvent('zoneFlash', { detail: { name: 'AREA COMING SOON', color: '#ff8800' } })
        );
        return;
      }

      if (!nextZone) return;

      const zoneConfig = ZONES[nextZone];

      // 1. Teleport player to the new zone spawn (world coords)
      const [sx, sy, sz] = zoneConfig.playerSpawnWorld;
      camera.position.set(sx, sy, sz);
      // VR: camera.position.set() doesn't work with WebXR headset tracking.
      // Dispatch a teleport event so VRControllers can reposition worldGroup.
      window.dispatchEvent(new CustomEvent('vrTeleport', {
        detail: { x: sx, y: sy, z: sz }
      }));

      // 2. Transition zone in the store (increments gameResetKey → enemy reset)
      setZone(nextZone);

      // 3. Show "CHECKPOINT REACHED" overlay
      setRoomCleared(true);

      // 4. Show upgrade screen after 2s delay
      setTimeout(() => {
        setShowUpgradeScreen(true);
      }, 2000);

      // 5. Flash zone name in the HUD
      window.dispatchEvent(
        new CustomEvent('zoneFlash', {
          detail: { name: zoneConfig.displayName, color: '#00ffcc' },
        })
      );
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Pillar group — this rotates */}
      <group ref={pillarRef}>
        {/* Base ring */}
        <mesh position={[0, 0.05, 0]}>
          <torusGeometry args={[0.55, 0.07, 8, 32]} />
          <meshLambertMaterial
            color={beaconColor}
            emissive={emissiveCol}
            emissiveIntensity={1.5}
          />
        </mesh>

        {/* Pillar shaft */}
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.12, 3.0, 0.12]} />
          <meshLambertMaterial
            color={beaconColor}
            emissive={emissiveCol}
            emissiveIntensity={0.8}
          />
        </mesh>

        {/* Diagonal accent beams */}
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[0.06, 2.6, 0.06]} />
          <meshLambertMaterial
            color={beaconColor}
            emissive={emissiveCol}
            emissiveIntensity={0.5}
          />
        </mesh>
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[0.06, 2.6, 0.06]} />
          <meshLambertMaterial
            color={beaconColor}
            emissive={emissiveCol}
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>

      {/* Top orb — outside pillarRef so it doesn't rotate weirdly */}
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.28, 14, 14]} />
        <meshLambertMaterial
          color={orbColor}
          emissive={emissiveCol}
          emissiveIntensity={2.0}
        />
      </mesh>

      {/* Pulsing point light */}
      <pointLight
        name="beaconLight"
        color={beaconColor}
        intensity={10}
        distance={18}
        decay={2}
        position={[0, 3.1, 0]}
      />

      {/* Floating label */}
      <Text
        position={[0, 4.2, 0]}
        fontSize={0.3}
        color={beaconColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#000000"
      >
        {displayLabel}
      </Text>

      {/* "COMING SOON" popup when triggered */}
      {showComingSoonText && (
        <Text
          position={[0, 5.0, 0]}
          fontSize={0.45}
          color="#ffaa00"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          COMING SOON
        </Text>
      )}
    </group>
  );
}
