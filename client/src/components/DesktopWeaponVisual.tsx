/**
 * DesktopWeaponVisual — renders the active melee or ranged weapon in first-person.
 * Visual shape, swing timing, and damage values are all driven by weaponConfig.json.
 * Stat scaling (AGI → speed, STR → damage) is applied via lib/weapons.ts.
 */
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import {
  getMeleeWeapon, getRangedWeapon,
  computeSwingDuration,
  type MeleeWeaponId, type RangedWeaponId,
} from '../lib/weapons';
import weaponConfig from '../data/weaponConfig.json';

interface DesktopWeaponVisualProps {
  isSwinging: boolean;
  hand: 'left' | 'right';
  activeWeapon: 'sword' | 'gun' | null;
  onSwingComplete: () => void;
  isVisible?: boolean;
  recoilSignal?: number;
  recoilHand?: 'left' | 'right' | null;
  isReloading?: boolean;
}

export default function DesktopWeaponVisual({
  isSwinging,
  hand,
  activeWeapon,
  onSwingComplete,
  isVisible = true,
  recoilSignal = 0,
  recoilHand = null,
  isReloading = false,
}: DesktopWeaponVisualProps) {
  const { camera } = useThree();
  const { weaponInventory, activeMeleeSlot, activeRangedSlot, playerStats } = useVRGame();
  const activeMeleeWeapon = weaponInventory.melee[activeMeleeSlot];
  const activeRangedWeapon = weaponInventory.ranged[activeRangedSlot];

  // Melee swing state
  const meleeGroupRef = useRef<THREE.Group>(null);
  const swingTime = useRef(0);
  const isSwingActive = useRef(false);
  const isWindup = useRef(false);
  const windupTime = useRef(0);
  const WINDUP_DURATION = 0.055; // 55ms pull-back before the arc
  const swingCount = useRef(0);
  const cameraRollRef = useRef(0); // current camera tilt from swing

  // Recovery lerp state
  const recoverTime = useRef(0);
  const recoverDuration = 0.14; // snappier return
  const isRecovering = useRef(false);
  const recoveryStartPos = useRef(new THREE.Vector3());
  const recoveryStartQuat = useRef(new THREE.Quaternion());

  // Gun refs
  const leftGunRef = useRef<THREE.Group>(null);
  const rightGunRef = useRef<THREE.Group>(null);
  // Reload spin angle (accumulates while reloading)
  const reloadSpinAngle = useRef(0);

  // Recoil
  const recoilRef = useRef(0);
  const recoilHandRef = useRef<'left' | 'right' | null>(null);
  useEffect(() => {
    if (recoilSignal > 0) recoilRef.current = 1;
  }, [recoilSignal]);
  useEffect(() => {
    recoilHandRef.current = recoilHand ?? null;
  }, [recoilHand]);

  useFrame((_, deltaTime) => {
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    recoilRef.current = Math.max(0, recoilRef.current - deltaTime / 0.12);

    // ---- MELEE ----
    if (meleeGroupRef.current) {
      const meleeId = (activeMeleeWeapon ?? 'longsword') as MeleeWeaponId;
      const mCfg = getMeleeWeapon(meleeId) ?? getMeleeWeapon('longsword');
      const swingDuration = computeSwingDuration(mCfg.swingDuration, playerStats.agi);

      // Asymmetric ease: slow enter (0-25%), FAST kill zone (25-75%), medium follow (75-100%)
      // 50% of time covers 70% of arc in the kill zone = very snappy feel
      const snapEase = (p: number): number => {
        if (p < 0.25) {
          // Slow wind-in: quadratic, reaches 0.08 at p=0.25
          return (p / 0.25) * (p / 0.25) * 0.08;
        } else if (p < 0.75) {
          // Fast kill zone: linear from 0.08 → 0.92 (84% of arc in 50% of time)
          return 0.08 + ((p - 0.25) / 0.5) * 0.84;
        } else {
          // Follow-through: ease-out from 0.92 → 1.0
          const t = (p - 0.75) / 0.25;
          return 0.92 + (1 - (1 - t) * (1 - t)) * 0.08;
        }
      };

      // Trigger: enter windup phase first
      if (isSwinging && !isSwingActive.current && !isWindup.current) {
        isWindup.current = true;
        windupTime.current = 0;
        swingCount.current += 1;
        isRecovering.current = false;
      }

      const dir = swingCount.current % 2 === 0 ? 1 : -1;

      // ── WINDUP: weapon dips back-and-inward before the arc ──
      if (isWindup.current) {
        windupTime.current += deltaTime;
        const wp = Math.min(windupTime.current / WINDUP_DURATION, 1);
        const dip = Math.sin(wp * Math.PI * 0.5); // ease-in to pulled-back position

        const idleX = (hand === 'left' ? -0.45 : 0.45) + dir * -0.15 * dip;
        meleeGroupRef.current.position.copy(
          cameraPos.clone()
            .add(cameraDir.clone().multiplyScalar(0.9 - 0.12 * dip))
            .add(rightDir.clone().multiplyScalar(idleX))
            .add(upDir.clone().multiplyScalar(-0.35 - 0.12 * dip))
        );
        meleeGroupRef.current.quaternion.copy(camera.quaternion);
        meleeGroupRef.current.quaternion.multiply(
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(-Math.PI / 10 - 0.2 * dip, hand === 'left' ? Math.PI / 8 : -Math.PI / 8, dir * -0.1 * dip, 'YXZ')
          )
        );
        // Slight camera tilt begins during windup
        cameraRollRef.current = dir * 0.025 * dip;

        if (windupTime.current >= WINDUP_DURATION) {
          isWindup.current = false;
          isSwingActive.current = true;
          swingTime.current = 0;
        }
      }

      // ── SWING ARC ──
      if (isSwingActive.current) {
        swingTime.current += deltaTime;
        const progress = Math.min(swingTime.current / swingDuration, 1);
        const smoothProgress = snapEase(progress);

        const arcSpan = mCfg.arcSpan;
        const arcAngle = dir * (arcSpan * 0.5 - smoothProgress * arcSpan);
        const armLength = mCfg.armLength;

        // Diagonal slash: sweeps right-to-left AND top-to-bottom
        const handX = Math.sin(arcAngle) * armLength;
        const handZ = Math.cos(arcAngle) * armLength * 0.25;
        const diagonalDrop = dir * (smoothProgress - 0.5) * 0.22; // top → bottom as arc progresses
        const handY = -0.3 + diagonalDrop - Math.abs(Math.sin(arcAngle)) * 0.08;

        // Forward nudge at peak speed (progress 0.5) — weapon lunges toward enemy
        const peakPush = Math.sin(smoothProgress * Math.PI) * 0.06;

        meleeGroupRef.current.position.copy(
          cameraPos.clone()
            .add(cameraDir.clone().multiplyScalar(0.9 + handZ + peakPush))
            .add(rightDir.clone().multiplyScalar(handX))
            .add(upDir.clone().multiplyScalar(handY))
        );

        meleeGroupRef.current.quaternion.copy(camera.quaternion);
        meleeGroupRef.current.quaternion.multiply(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(
            -Math.PI / 8 + diagonalDrop * 0.5,   // pitch follows diagonal
            dir * arcAngle * 0.28,                 // yaw leads into swing
            dir * -arcAngle * 0.65,                // Z-roll: edge-leads, most visible part
            'YXZ',
          ))
        );

        // Camera roll peaks at midpoint (bell curve), gives swing real weight
        cameraRollRef.current = dir * Math.sin(smoothProgress * Math.PI) * 0.07;

        if (progress >= 1) {
          recoveryStartPos.current.copy(meleeGroupRef.current.position);
          recoveryStartQuat.current.copy(meleeGroupRef.current.quaternion);
          isSwingActive.current = false;
          isRecovering.current = true;
          recoverTime.current = 0;
          swingTime.current = 0;
          onSwingComplete();
        }
      }

      // ── IDLE / RECOVERY ──
      if (!isSwingActive.current && !isWindup.current) {
        // Camera roll fades to zero
        cameraRollRef.current *= (1 - Math.min(deltaTime / 0.08, 1));

        const idleX = hand === 'left' ? -0.45 : 0.45;
        const idlePos = cameraPos.clone()
          .add(cameraDir.clone().multiplyScalar(0.9))
          .add(rightDir.clone().multiplyScalar(idleX))
          .add(upDir.clone().multiplyScalar(-0.35));
        const idleQuat = camera.quaternion.clone().multiply(
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(-Math.PI / 10, hand === 'left' ? Math.PI / 8 : -Math.PI / 8, 0, 'YXZ')
          )
        );

        if (isRecovering.current) {
          recoverTime.current += deltaTime;
          const t = Math.min(recoverTime.current / recoverDuration, 1);
          // Ease-out with slight overshoot then snap (makes recovery feel whippy)
          const smooth = t < 0.7
            ? 1 - Math.pow(1 - (t / 0.7), 3) // fast ease-out
            : 1 + Math.sin((t - 0.7) / 0.3 * Math.PI) * 0.06; // tiny bounce
          const clampSmooth = Math.min(smooth, 1);
          meleeGroupRef.current.position.lerpVectors(recoveryStartPos.current, idlePos, clampSmooth);
          meleeGroupRef.current.quaternion.slerpQuaternions(recoveryStartQuat.current, idleQuat, clampSmooth);
          if (t >= 1) isRecovering.current = false;
        } else {
          meleeGroupRef.current.position.copy(idlePos);
          meleeGroupRef.current.quaternion.copy(idleQuat);
        }
      }

      // Apply camera roll — runs after DesktopControls resets Z to 0, so this stacks on top
      if (Math.abs(cameraRollRef.current) > 0.001) {
        camera.quaternion.multiply(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, cameraRollRef.current, 'YXZ'))
        );
      }
    }

    // ---- GUNS ----
    // Accumulate reload spin angle
    if (isReloading) {
      reloadSpinAngle.current += deltaTime * Math.PI * 4; // 2 full rotations/sec
    } else {
      // Snap back to 0 quickly when done
      reloadSpinAngle.current = reloadSpinAngle.current % (Math.PI * 2);
      if (Math.abs(reloadSpinAngle.current) > 0.05) {
        reloadSpinAngle.current *= Math.pow(0.05, deltaTime); // fast decay
      } else {
        reloadSpinAngle.current = 0;
      }
    }

    const updateGun = (ref: React.RefObject<THREE.Group | null>, side: 'left' | 'right') => {
      if (!ref.current) return;
      const isThisGunRecoiling = recoilHandRef.current === side;
      const recoilPush = (activeWeapon === 'gun' && isThisGunRecoiling) ? recoilRef.current * 0.08 : 0;
      const sideOffset = side === 'left' ? -0.3 : 0.3;

      // During reload: bring guns in closer to center and spin them
      const reloadPull = isReloading ? 0.12 : 0;
      const reloadRaise = isReloading ? 0.08 : 0;

      ref.current.position.copy(
        cameraPos.clone()
          .add(cameraDir.clone().multiplyScalar(0.55 - recoilPush))
          .add(rightDir.clone().multiplyScalar(sideOffset * (1 - reloadPull)))
          .add(upDir.clone().multiplyScalar(-0.28 + reloadRaise))
      );

      // Base orientation
      ref.current.quaternion.copy(camera.quaternion);
      ref.current.quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), side === 'left' ? 0.1 : -0.1)
      );

      // Spin around the gun's forward axis (Z) while reloading
      if (reloadSpinAngle.current !== 0) {
        const spinDir = side === 'left' ? 1 : -1;
        ref.current.quaternion.multiply(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), reloadSpinAngle.current * spinDir)
        );
      }
    };
    updateGun(leftGunRef, 'left');
    updateGun(rightGunRef, 'right');
  });

  if (!isVisible) return null;

  const showMelee = activeWeapon === 'sword' && activeMeleeWeapon !== null;
  const showGuns = activeWeapon === 'gun' && activeRangedWeapon !== null;
  const meleeId = (activeMeleeWeapon ?? 'longsword') as MeleeWeaponId;
  const mCfg = (weaponConfig.melee[meleeId] ?? weaponConfig.melee.longsword) as typeof weaponConfig.melee.longsword & {
    axeHead?: boolean; axeHeadWidth?: number; axeHeadHeight?: number; axeHeadDepth?: number;
  };
  const v = mCfg.visual as typeof mCfg.visual & {
    axeHead?: boolean; axeHeadWidth?: number; axeHeadHeight?: number; axeHeadDepth?: number;
  };
  const rangedId = (activeRangedWeapon ?? 'pistols') as RangedWeaponId;
  const gCfg = (weaponConfig.ranged[rangedId] ?? weaponConfig.ranged.pistols).visual;

  const trailOpacity = isSwingActive.current
    ? Math.max(0, Math.sin(swingTime.current / (computeSwingDuration(mCfg.swingDuration, playerStats.agi)) * Math.PI))
    : 0;

  return (
    <>
      {/* ====== MELEE ====== */}
      {showMelee && (
        <group ref={meleeGroupRef}>
          {/* Handle */}
          <mesh position={[0, -(v.bladeLength + v.handleLength * 0.5 + v.guardHeight * 0.5), 0]}>
            <cylinderGeometry args={[v.handleRadius * 0.85, v.handleRadius, v.handleLength]} />
            <meshLambertMaterial color={v.handleColor} />
          </mesh>
          {/* Pommel gem — glowing cube at butt of handle */}
          <mesh position={[0, -(v.bladeLength + v.handleLength + v.guardHeight * 0.5 + v.handleRadius), 0]}>
            <boxGeometry args={[v.handleRadius * 1.8, v.handleRadius * 1.8, v.handleRadius * 1.8]} />
            <meshLambertMaterial color={v.bladeColor} emissive={v.emissive} emissiveIntensity={v.emissiveIntensity * 1.5} />
          </mesh>

          {/* Guard — only if width defined */}
          {v.guardWidth > 0 && (
            <mesh position={[0, -(v.bladeLength + v.guardHeight * 0.5), 0]}>
              <boxGeometry args={[v.guardWidth, v.guardHeight, v.guardDepth]} />
              <meshLambertMaterial color={v.guardColor} />
            </mesh>
          )}

          {/* Blade — tapered (3 segments) or flat */}
          {v.bladeLength > 0 && !(v as any).tapered && (
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[v.bladeWidth, v.bladeLength, v.bladeDepth]} />
              <meshLambertMaterial color={v.bladeColor} emissive={v.emissive} emissiveIntensity={v.emissiveIntensity} />
            </mesh>
          )}
          {v.bladeLength > 0 && (v as any).tapered && (() => {
            const L = v.bladeLength;
            const W = v.bladeWidth;
            const D = v.bladeDepth;
            const s1H = L * 0.55; const s2H = L * 0.30; const s3H = L * 0.15;
            const base = -L / 2;
            const s1Y = base + s1H / 2;
            const s2Y = base + s1H + s2H / 2;
            const s3Y = base + s1H + s2H + s3H / 2;
            const ei = v.emissiveIntensity;
            return (
              <>
                {/* Base — full width */}
                <mesh position={[0, s1Y, 0]}>
                  <boxGeometry args={[W, s1H, D]} />
                  <meshLambertMaterial color={v.bladeColor} emissive={v.emissive} emissiveIntensity={ei} />
                </mesh>
                {/* Mid — 52% width */}
                <mesh position={[0, s2Y, 0]}>
                  <boxGeometry args={[W * 0.52, s2H, D * 0.8]} />
                  <meshLambertMaterial color={v.bladeColor} emissive={v.emissive} emissiveIntensity={ei * 1.1} />
                </mesh>
                {/* Tip — 16% width, very thin */}
                <mesh position={[0, s3Y, 0]}>
                  <boxGeometry args={[W * 0.16, s3H, D * 0.5]} />
                  <meshLambertMaterial color={v.bladeColor} emissive={v.emissive} emissiveIntensity={ei * 1.4} />
                </mesh>
                {/* Fuller — dark ridge running down center */}
                <mesh position={[0, s1Y - s1H * 0.1, 0]}>
                  <boxGeometry args={[W * 0.12, s1H * 0.7, D * 1.1]} />
                  <meshLambertMaterial color="#111122" emissive={v.emissive} emissiveIntensity={ei * 0.5} />
                </mesh>
              </>
            );
          })()}

          {/* Hammer head */}
          {(v as any).hammerHead && (
            <mesh position={[0, (v as any).hammerHeadHeight * 0.5, 0]}>
              <boxGeometry args={[(v as any).hammerHeadWidth, (v as any).hammerHeadHeight, (v as any).hammerHeadDepth]} />
              <meshLambertMaterial color={v.bladeColor} emissive={v.emissive} emissiveIntensity={v.emissiveIntensity} />
            </mesh>
          )}

          {/* Axe head */}
          {(v as any).axeHead && (
            <group position={[0, (v as any).axeHeadHeight * 0.3, 0]}>
              {/* Main blade */}
              <mesh position={[-(v as any).axeHeadWidth * 0.3, 0, 0]}>
                <boxGeometry args={[(v as any).axeHeadWidth, (v as any).axeHeadHeight, (v as any).axeHeadDepth]} />
                <meshLambertMaterial color={v.bladeColor} emissive={v.emissive} emissiveIntensity={v.emissiveIntensity} />
              </mesh>
              {/* Back spike */}
              <mesh position={[(v as any).axeHeadWidth * 0.18, 0, 0]}>
                <boxGeometry args={[(v as any).axeHeadWidth * 0.3, (v as any).axeHeadHeight * 0.35, (v as any).axeHeadDepth * 0.7]} />
                <meshLambertMaterial color={v.guardColor} />
              </mesh>
            </group>
          )}

          {/* Swing trail */}
          {isSwingActive.current && trailOpacity > 0.05 && v.bladeLength > 0 && (
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[v.bladeWidth * 3, v.bladeLength * 1.1, 0.001]} />
              <meshLambertMaterial
                color="#FFFFFF" transparent opacity={trailOpacity * 0.6}
                emissive="#88CCFF" emissiveIntensity={trailOpacity * 1.2}
              />
            </mesh>
          )}
        </group>
      )}

      {/* ====== GUNS ====== */}
      {showGuns && (
        <>
          {(['left', 'right'] as const).map((side) => (
            <group key={side} ref={side === 'left' ? leftGunRef : rightGunRef}>
              {/* Body */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[gCfg.bodyWidth, gCfg.bodyHeight, gCfg.bodyLength]} />
                <meshLambertMaterial color={gCfg.color} />
              </mesh>
              {/* Barrel */}
              <mesh position={[0, gCfg.bodyHeight * 0.17, -(gCfg.bodyLength * 0.5 + gCfg.barrelLength * 0.5)]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[gCfg.barrelRadius, gCfg.barrelRadius, gCfg.barrelLength, 8]} />
                <meshLambertMaterial color={gCfg.barrelColor} />
              </mesh>
              {/* Grip */}
              <mesh position={[0, -(gCfg.bodyHeight * 0.5 + gCfg.gripLength * 0.4), gCfg.bodyLength * 0.1]} rotation={[0.3, 0, 0]}>
                <boxGeometry args={[gCfg.gripWidth, gCfg.gripLength, gCfg.gripDepth]} />
                <meshLambertMaterial color={gCfg.gripColor} />
              </mesh>
            </group>
          ))}
        </>
      )}
    </>
  );
}
