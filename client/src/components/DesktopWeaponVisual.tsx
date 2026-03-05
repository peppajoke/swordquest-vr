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
}

export default function DesktopWeaponVisual({
  isSwinging,
  hand,
  activeWeapon,
  onSwingComplete,
  isVisible = true,
  recoilSignal = 0,
}: DesktopWeaponVisualProps) {
  const { camera } = useThree();
  const { activeMeleeWeapon, activeRangedWeapon, playerStats } = useVRGame();

  // Melee swing state
  const meleeGroupRef = useRef<THREE.Group>(null);
  const swingTime = useRef(0);
  const isSwingActive = useRef(false);
  const swingCount = useRef(0);

  // Recovery lerp state
  const recoverTime = useRef(0);
  const recoverDuration = 0.18;
  const isRecovering = useRef(false);
  const recoveryStartPos = useRef(new THREE.Vector3());
  const recoveryStartQuat = useRef(new THREE.Quaternion());

  // Gun refs
  const leftGunRef = useRef<THREE.Group>(null);
  const rightGunRef = useRef<THREE.Group>(null);

  // Recoil
  const recoilRef = useRef(0);
  useEffect(() => {
    if (recoilSignal > 0) recoilRef.current = 1;
  }, [recoilSignal]);

  useFrame((_, deltaTime) => {
    const cameraPos = camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    recoilRef.current = Math.max(0, recoilRef.current - deltaTime / 0.12);

    // ---- MELEE ----
    if (meleeGroupRef.current) {
      const meleeId = activeMeleeWeapon as MeleeWeaponId;
      const mCfg = getMeleeWeapon(meleeId) ?? getMeleeWeapon('longsword');
      const swingDuration = computeSwingDuration(mCfg.swingDuration, playerStats.agi);

      if (isSwinging && !isSwingActive.current) {
        isSwingActive.current = true;
        swingTime.current = 0;
        swingCount.current += 1;
      }

      if (isSwingActive.current) {
        swingTime.current += deltaTime;
        const progress = Math.min(swingTime.current / swingDuration, 1);

        // Cubic ease-in-out: velocity spikes at center of arc
        const smoothProgress = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const dir = swingCount.current % 2 === 0 ? 1 : -1;
        const arcSpan = mCfg.arcSpan;
        const arcAngle = dir * (arcSpan * 0.5 - smoothProgress * arcSpan);
        const armLength = mCfg.armLength;

        const handX = Math.sin(arcAngle) * armLength;
        const handZ = Math.cos(arcAngle) * armLength * 0.3;
        const handY = -0.35 - Math.abs(Math.sin(arcAngle)) * 0.1;

        meleeGroupRef.current.position.copy(
          cameraPos.clone()
            .add(cameraDir.clone().multiplyScalar(0.9 + handZ))
            .add(rightDir.clone().multiplyScalar(handX))
            .add(upDir.clone().multiplyScalar(handY))
        );

        meleeGroupRef.current.quaternion.copy(camera.quaternion);
        meleeGroupRef.current.quaternion.multiply(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(
            -Math.PI / 8,
            dir * arcAngle * 0.25,
            dir * -arcAngle * 0.6,
            'YXZ',
          ))
        );

        if (progress >= 1) {
          recoveryStartPos.current.copy(meleeGroupRef.current.position);
          recoveryStartQuat.current.copy(meleeGroupRef.current.quaternion);
          isSwingActive.current = false;
          isRecovering.current = true;
          recoverTime.current = 0;
          swingTime.current = 0;
          onSwingComplete();
        }
      } else {
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
          const smooth = 0.5 - 0.5 * Math.cos(t * Math.PI);
          meleeGroupRef.current.position.lerpVectors(recoveryStartPos.current, idlePos, smooth);
          meleeGroupRef.current.quaternion.slerpQuaternions(recoveryStartQuat.current, idleQuat, smooth);
          if (t >= 1) isRecovering.current = false;
        } else {
          meleeGroupRef.current.position.copy(idlePos);
          meleeGroupRef.current.quaternion.copy(idleQuat);
        }
      }
    }

    // ---- GUNS ----
    const updateGun = (ref: React.RefObject<THREE.Group | null>, side: 'left' | 'right') => {
      if (!ref.current) return;
      const recoilPush = activeWeapon === 'gun' ? recoilRef.current * 0.08 : 0;
      const sideOffset = side === 'left' ? -0.3 : 0.3;
      ref.current.position.copy(
        cameraPos.clone()
          .add(cameraDir.clone().multiplyScalar(0.55 - recoilPush))
          .add(rightDir.clone().multiplyScalar(sideOffset))
          .add(upDir.clone().multiplyScalar(-0.28))
      );
      ref.current.quaternion.copy(camera.quaternion);
      ref.current.quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), side === 'left' ? 0.1 : -0.1)
      );
    };
    updateGun(leftGunRef, 'left');
    updateGun(rightGunRef, 'right');
  });

  if (!isVisible) return null;

  const showMelee = activeWeapon === 'sword';
  const showGuns = activeWeapon === 'gun';
  const meleeId = activeMeleeWeapon as MeleeWeaponId;
  const mCfg = (weaponConfig.melee[meleeId] ?? weaponConfig.melee.longsword) as typeof weaponConfig.melee.longsword & {
    axeHead?: boolean; axeHeadWidth?: number; axeHeadHeight?: number; axeHeadDepth?: number;
  };
  const v = mCfg.visual as typeof mCfg.visual & {
    axeHead?: boolean; axeHeadWidth?: number; axeHeadHeight?: number; axeHeadDepth?: number;
  };
  const rangedId = activeRangedWeapon as RangedWeaponId;
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

          {/* Guard — only if width defined */}
          {v.guardWidth > 0 && (
            <mesh position={[0, -(v.bladeLength + v.guardHeight * 0.5), 0]}>
              <boxGeometry args={[v.guardWidth, v.guardHeight, v.guardDepth]} />
              <meshLambertMaterial color={v.guardColor} />
            </mesh>
          )}

          {/* Blade — only for sword-type weapons */}
          {v.bladeLength > 0 && (
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[v.bladeWidth, v.bladeLength, v.bladeDepth]} />
              <meshLambertMaterial color={v.bladeColor} emissive={v.emissive} emissiveIntensity={v.emissiveIntensity} />
            </mesh>
          )}

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
