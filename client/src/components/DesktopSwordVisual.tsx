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
  const swingDuration = 0.28; // snappy but readable
  const isSwingActive = useRef(false);
  const swingProgress = useRef(0);
  const swingCount = useRef(0); // increments each swing; even = left sweep, odd = right sweep

  // Recovery: after swing ends, lerp sword back to idle over this duration
  const recoverTime = useRef(0);
  const recoverDuration = 0.18;
  const isRecovering = useRef(false);
  // Store the position/quat at swing-end so we can lerp from it
  const recoveryStartPos = useRef(new THREE.Vector3());
  const recoveryStartQuat = useRef(new THREE.Quaternion());

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
      if (isSwinging && !isSwingActive.current) {
        isSwingActive.current = true;
        swingTime.current = 0;
        swingCount.current += 1;
      }

      if (isSwingActive.current) {
        swingTime.current += deltaTime;
        const progress = Math.min(swingTime.current / swingDuration, 1);

        // Velocity spike: cubic ease-in-out — blade is slow at start/end, snaps 3x fast through center
        const smoothProgress = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        // Alternate direction each swing: even = right-to-left, odd = left-to-right
        const dir = swingCount.current % 2 === 0 ? 1 : -1;

        // The sword hand travels in a wide arc across the screen.
        // arcAngle goes from one side to the other (-70° to +70°)
        const arcSpan = Math.PI * 0.85; // total sweep angle (153°) — wide dramatic slash
        const arcAngle = dir * (arcSpan * 0.5 - smoothProgress * arcSpan);

        // Hand position: orbiting around a point 0.5 units in front of the camera
        // at arm's length (0.55 units), sweeping left-to-right
        const armLength = 0.7;
        const handX = Math.sin(arcAngle) * armLength;
        const handZ = Math.cos(arcAngle) * armLength * 0.3;
        const handY = -0.35 - Math.abs(Math.sin(arcAngle)) * 0.1;

        const swordPos = cameraPos.clone()
          .add(cameraDir.clone().multiplyScalar(0.9 + handZ))
          .add(rightDir.clone().multiplyScalar(handX))
          .add(upDir.clone().multiplyScalar(handY));

        swordGroupRef.current.position.copy(swordPos);

        // Rotate blade:
        // - Blade stays mostly UPRIGHT (long axis vertical) so the sweep is a real slash
        // - Small Y nudge: cutting edge leads slightly into the swing direction
        // - Z roll: blade tilts right at start, left at end (follows the arc)
        swordGroupRef.current.quaternion.copy(camera.quaternion);
        const slashRot = new THREE.Euler(
          -Math.PI / 8,              // tilt blade slightly forward/down
          dir * arcAngle * 0.25,     // small Y follow — edge leads into the swing
          dir * -arcAngle * 0.6,     // Z roll: tilts into start position, follows through
          'YXZ',
        );
        const slashQuat = new THREE.Quaternion().setFromEuler(slashRot);
        swordGroupRef.current.quaternion.multiply(slashQuat);

        if (progress >= 1) {
          // Capture where the sword is RIGHT NOW before transitioning to idle
          recoveryStartPos.current.copy(swordGroupRef.current.position);
          recoveryStartQuat.current.copy(swordGroupRef.current.quaternion);
          isSwingActive.current = false;
          isRecovering.current = true;
          recoverTime.current = 0;
          swingTime.current = 0;
          onSwingComplete();
        }
      } else {
        // Compute idle target position/rotation
        const idleX = hand === 'left' ? -0.45 : 0.45;
        const idlePos = cameraPos.clone()
          .add(cameraDir.clone().multiplyScalar(0.9))
          .add(rightDir.clone().multiplyScalar(idleX))
          .add(upDir.clone().multiplyScalar(-0.35));
        const idleQuat = camera.quaternion.clone();
        const idleRot = new THREE.Euler(-Math.PI / 10, hand === 'left' ? Math.PI / 8 : -Math.PI / 8, 0, 'YXZ');
        idleQuat.multiply(new THREE.Quaternion().setFromEuler(idleRot));

        if (isRecovering.current) {
          // Lerp from swing-end back to idle
          recoverTime.current += deltaTime;
          const t = Math.min(recoverTime.current / recoverDuration, 1);
          const smooth = 0.5 - 0.5 * Math.cos(t * Math.PI); // ease in/out
          swordGroupRef.current.position.lerpVectors(recoveryStartPos.current, idlePos, smooth);
          swordGroupRef.current.quaternion.slerpQuaternions(recoveryStartQuat.current, idleQuat, smooth);
          if (t >= 1) isRecovering.current = false;
        } else {
          // Full idle
          swordGroupRef.current.position.copy(idlePos);
          swordGroupRef.current.quaternion.copy(idleQuat);
        }
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
