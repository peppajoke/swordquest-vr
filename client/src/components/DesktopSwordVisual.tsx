import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DesktopSwordVisualProps {
  isSwinging: boolean;
  hand: 'left' | 'right';
  activeWeapon: 'sword' | 'gun';
  onSwingComplete: () => void;
  isVisible?: boolean;
  recoilSignal?: number; // increments each shot — triggers recoil
}

export default function DesktopSwordVisual({
  isSwinging,
  hand,
  activeWeapon,
  onSwingComplete,
  isVisible = true,
  recoilSignal = 0,
}: DesktopSwordVisualProps) {
  const { camera } = useThree();

  // Sword refs
  const swordGroupRef = useRef<THREE.Group>(null);
  const swingTime = useRef(0);
  const swingDuration = 0.4; // slow, weighty
  const isSwingActive = useRef(false);
  const swingProgress = useRef(0);
  const swingCount = useRef(0); // increments each swing; even = left sweep, odd = right sweep

  // Gun refs
  const leftGunRef = useRef<THREE.Group>(null);
  const rightGunRef = useRef<THREE.Group>(null);

  // Recoil
  const recoilRef = useRef(0);

  // Trigger recoil when recoilSignal changes
  useEffect(() => {
    if (recoilSignal > 0) {
      recoilRef.current = 1;
    }
  }, [recoilSignal]);

  useFrame((_, deltaTime) => {
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0);
    rightDir.applyQuaternion(camera.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0);
    upDir.applyQuaternion(camera.quaternion);

    // Decay recoil
    recoilRef.current = Math.max(0, recoilRef.current - deltaTime / 0.12);

    // ---- SWORD ----
    if (swordGroupRef.current) {
      const swordPos = cameraPos.clone()
        .add(cameraDir.clone().multiplyScalar(0.6))
        .add(rightDir.clone().multiplyScalar(hand === 'left' ? -0.35 : 0.35))
        .add(upDir.clone().multiplyScalar(-0.35));
      swordGroupRef.current.position.copy(swordPos);

      // Align sword base rotation to camera
      swordGroupRef.current.quaternion.copy(camera.quaternion);

      if (isSwinging && !isSwingActive.current) {
        // New swing starting — record direction
        isSwingActive.current = true;
        swingTime.current = 0;
        swingCount.current += 1;
      }

      if (isSwingActive.current) {
        swingTime.current += deltaTime;
        const progress = Math.min(swingTime.current / swingDuration, 1);
        swingProgress.current = progress;

        // Smooth ease: natural acceleration + deceleration
        const smoothProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);

        // dir = 1 → leftward sweep (even swings), dir = -1 → rightward sweep (odd swings)
        const dir = swingCount.current % 2 === 0 ? 1 : -1;

        // Apply rotations on top of camera quaternion (already set)
        const swingRotation = new THREE.Euler(
          -Math.PI / 8,                               // slight downward tilt, constant
          dir * (1.2 - smoothProgress * 2.4),         // sweeps from +1.2 to -1.2 (or reverse)
          dir * (smoothProgress - 0.5) * 0.4,         // subtle roll
          'YXZ',
        );
        const swingQuat = new THREE.Quaternion();
        swingQuat.setFromEuler(swingRotation);
        swordGroupRef.current.quaternion.multiply(swingQuat);

        if (progress >= 1) {
          isSwingActive.current = false;
          swingTime.current = 0;
          swingProgress.current = 0;
          onSwingComplete();
        }
      } else if (!isSwinging && !isSwingActive.current) {
        // Idle: sword points forward-down at hand level
        const idleRotation = new THREE.Euler(-Math.PI / 8, hand === 'left' ? Math.PI / 6 : -Math.PI / 6, 0, 'YXZ');
        const idleQuat = new THREE.Quaternion();
        idleQuat.setFromEuler(idleRotation);
        swordGroupRef.current.quaternion.multiply(idleQuat);
        swingProgress.current = 0;
      }
    }

    // ---- GUNS ----
    // Left gun
    if (leftGunRef.current) {
      const recoilPush = activeWeapon === 'gun' ? recoilRef.current * 0.08 : 0;
      // Recoil pushes gun back (opposite of cameraDir)
      const gunPos = cameraPos.clone()
        .add(cameraDir.clone().multiplyScalar(0.55 - recoilPush))
        .add(rightDir.clone().multiplyScalar(-0.3))
        .add(upDir.clone().multiplyScalar(-0.28));
      leftGunRef.current.position.copy(gunPos);
      leftGunRef.current.quaternion.copy(camera.quaternion);
      const toeLeft = new THREE.Quaternion();
      toeLeft.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.1);
      leftGunRef.current.quaternion.multiply(toeLeft);
    }

    // Right gun
    if (rightGunRef.current) {
      const recoilPush = activeWeapon === 'gun' ? recoilRef.current * 0.08 : 0;
      const gunPos = cameraPos.clone()
        .add(cameraDir.clone().multiplyScalar(0.55 - recoilPush))
        .add(rightDir.clone().multiplyScalar(0.3))
        .add(upDir.clone().multiplyScalar(-0.28));
      rightGunRef.current.position.copy(gunPos);
      rightGunRef.current.quaternion.copy(camera.quaternion);
      const toeRight = new THREE.Quaternion();
      toeRight.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.1);
      rightGunRef.current.quaternion.multiply(toeRight);
    }
  });

  if (!isVisible) return null;

  const showSword = activeWeapon === 'sword';
  const showGuns = activeWeapon === 'gun';

  // Trail opacity: brightest at mid-swing, fades at start/end
  const trailOpacity = isSwingActive.current
    ? Math.max(0, 1 - Math.abs(swingProgress.current - 0.5) * 2)
    : 0;

  return (
    <>
      {/* ====== SWORD ====== */}
      {showSword && (
        <group ref={swordGroupRef}>
          {/* Handle */}
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.25]} />
            <meshLambertMaterial color="#654321" />
          </mesh>

          {/* Guard */}
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.2, 0.03, 0.05]} />
            <meshLambertMaterial color="#888888" />
          </mesh>

          {/* Blade */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.02, 0.6, 0.01]} />
            <meshLambertMaterial color="#C0C0C0" emissive="#404040" emissiveIntensity={0.3} />
          </mesh>

          {/* Swing trail — visible during swing, fades at start/end */}
          {isSwingActive.current && trailOpacity > 0 && (
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.06, 0.75, 0.001]} />
              <meshLambertMaterial
                color="#FFFFFF"
                transparent
                opacity={trailOpacity * 0.65}
                emissive="#88CCFF"
                emissiveIntensity={trailOpacity * 1.2}
              />
            </mesh>
          )}
        </group>
      )}

      {/* ====== GUNS ====== */}
      {showGuns && (
        <>
          {/* Left gun */}
          <group ref={leftGunRef}>
            {/* Body */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.08, 0.06, 0.25]} />
              <meshLambertMaterial color="#333333" />
            </mesh>
            {/* Barrel */}
            <mesh position={[0, 0.01, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
              <meshLambertMaterial color="#222222" />
            </mesh>
            {/* Grip */}
            <mesh position={[0, -0.06, 0.04]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.055, 0.1, 0.045]} />
              <meshLambertMaterial color="#444444" />
            </mesh>
          </group>

          {/* Right gun */}
          <group ref={rightGunRef}>
            {/* Body */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.08, 0.06, 0.25]} />
              <meshLambertMaterial color="#333333" />
            </mesh>
            {/* Barrel */}
            <mesh position={[0, 0.01, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
              <meshLambertMaterial color="#222222" />
            </mesh>
            {/* Grip */}
            <mesh position={[0, -0.06, 0.04]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.055, 0.1, 0.045]} />
              <meshLambertMaterial color="#444444" />
            </mesh>
          </group>
        </>
      )}
    </>
  );
}
