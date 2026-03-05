import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DesktopSwordVisualProps {
  isSwinging: boolean;
  hand: 'left' | 'right';
  activeWeapon: 'sword' | 'gun';
  onSwingComplete: () => void;
  isVisible?: boolean;
}

export default function DesktopSwordVisual({
  isSwinging,
  hand,
  activeWeapon,
  onSwingComplete,
  isVisible = true,
}: DesktopSwordVisualProps) {
  const { camera } = useThree();

  // Sword refs
  const swordGroupRef = useRef<THREE.Group>(null);
  const swingTime = useRef(0);
  const swingDuration = 0.2;
  const isSwingActive = useRef(false);
  const swingProgress = useRef(0);

  // Gun refs
  const leftGunRef = useRef<THREE.Group>(null);
  const rightGunRef = useRef<THREE.Group>(null);

  useFrame((_, deltaTime) => {
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(camera.quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0);
    rightDir.applyQuaternion(camera.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0);
    upDir.applyQuaternion(camera.quaternion);

    // ---- SWORD ----
    if (swordGroupRef.current) {
      const swordPos = cameraPos.clone()
        .add(cameraDir.clone().multiplyScalar(0.6))
        .add(rightDir.clone().multiplyScalar(hand === 'left' ? -0.35 : 0.35))
        .add(upDir.clone().multiplyScalar(-0.35));
      swordGroupRef.current.position.copy(swordPos);

      // Align sword base rotation to match camera
      swordGroupRef.current.quaternion.copy(camera.quaternion);

      if (isSwinging && !isSwingActive.current) {
        isSwingActive.current = true;
        swingTime.current = 0;
      }

      if (isSwingActive.current) {
        swingTime.current += deltaTime;
        const progress = Math.min(swingTime.current / swingDuration, 1);
        swingProgress.current = progress;

        const ease = Math.sin(progress * Math.PI); // 0 → 1 → 0 smooth arc
        const handMult = hand === 'left' ? -1 : 1;

        // Clean horizontal slash arc:
        // Start: rotated to right side (+45°), End: follows through to left (-45°)
        // The sweep angle goes from +45° to -45° as progress goes 0→1
        const sweepAngle = (0.785 - progress * 1.57) * handMult; // ~45° to -45°
        const forwardPeak = ease * 0.1; // slight forward push at peak

        // Apply rotations on top of camera quaternion (already set above)
        const swingRotation = new THREE.Euler(
          -Math.PI / 8,          // tilt forward (idle angle)
          sweepAngle,            // horizontal sweep
          0,
          'YXZ',
        );
        const swingQuat = new THREE.Quaternion();
        swingQuat.setFromEuler(swingRotation);
        swordGroupRef.current.quaternion.multiply(swingQuat);

        // Slight forward offset at peak of swing
        swordGroupRef.current.position.add(cameraDir.clone().multiplyScalar(forwardPeak));

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
      const gunPos = cameraPos.clone()
        .add(cameraDir.clone().multiplyScalar(0.55))
        .add(rightDir.clone().multiplyScalar(-0.3))
        .add(upDir.clone().multiplyScalar(-0.28));
      leftGunRef.current.position.copy(gunPos);
      leftGunRef.current.quaternion.copy(camera.quaternion);
      // Small toe-out angle
      const toeLeft = new THREE.Quaternion();
      toeLeft.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.1);
      leftGunRef.current.quaternion.multiply(toeLeft);
    }

    // Right gun
    if (rightGunRef.current) {
      const gunPos = cameraPos.clone()
        .add(cameraDir.clone().multiplyScalar(0.55))
        .add(rightDir.clone().multiplyScalar(0.3))
        .add(upDir.clone().multiplyScalar(-0.28));
      rightGunRef.current.position.copy(gunPos);
      rightGunRef.current.quaternion.copy(camera.quaternion);
      // Small toe-out angle
      const toeRight = new THREE.Quaternion();
      toeRight.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.1);
      rightGunRef.current.quaternion.multiply(toeRight);
    }
  });

  if (!isVisible) return null;

  const showSword = activeWeapon === 'sword';
  const showGuns = activeWeapon === 'gun';

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

          {/* Swing trail — visible only during swing */}
          {isSwingActive.current && (
            <mesh position={[0, 0.2, 0]} rotation={[0, 0, swingProgress.current * Math.PI / 4]}>
              <boxGeometry args={[0.05, 0.8, 0.001]} />
              <meshLambertMaterial
                color="#FFFFFF"
                transparent
                opacity={0.6 * (1 - swingProgress.current)}
                emissive="#FFFFFF"
                emissiveIntensity={0.8 * (1 - swingProgress.current)}
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
            {/* Barrel — sticks forward (negative Z in Three.js) */}
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
