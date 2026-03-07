import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { resolveWallCollision, WALLS } from '../lib/levelCollision';
import * as THREE from "three";
import { useVRGame } from "../lib/stores/useVRGame";
import { useAudio } from "../lib/stores/useAudio";
import { PLAYER_CONFIG, COMBAT_CONFIG, WORLD_CONFIG } from "../config/gameConfig";
import weaponConfig from "../data/weaponConfig.json";

const WEAPON_SLOTS = [
  { melee: "longsword", gun: "pistols" },
  { melee: "dagger",    gun: "smg"     },
  { melee: "greatsword",gun: "shotgun" },
  { melee: "battleaxe", gun: "sniper"  },
  { melee: "shortsword",gun: "pistols" },
  { melee: "warhammer", gun: "smg"     },
] as const;

interface VRControllersProps {
  onFuelChange?: (fuel: number) => void;
  onAmmoChange?: (ammo: number) => void;
  onLeftClipChange?: (leftClip: number) => void;
  onRightClipChange?: (rightClip: number) => void;
  onJetpackChange?: (enabled: boolean) => void;
}

export default function VRControllers({
  onFuelChange,
  onAmmoChange,
  onLeftClipChange,
  onRightClipChange,
  onJetpackChange,
}: VRControllersProps) {
  const { playGunShoot } = useAudio();
  const { addHitEffect, explodePillar } = useVRGame();
  const { camera, scene } = useThree();

  const controller0Ref = useRef<THREE.XRTargetRaySpace>();
  const controller1Ref = useRef<THREE.XRTargetRaySpace>();
  const controllerGrip0Ref = useRef<THREE.XRGripSpace>();
  const controllerGrip1Ref = useRef<THREE.XRGripSpace>();
  const leftSwordRef = useRef<THREE.Group>();
  const rightSwordRef = useRef<THREE.Group>();
  const leftGunRef = useRef<THREE.Group>();
  const rightGunRef = useRef<THREE.Group>();

  const leftGrabbing = useRef(false);
  const rightGrabbing = useRef(false);
  const leftTrigger = useRef(false);
  const rightTrigger = useRef(false);
  const lastLeftTrigger = useRef(false);
  const lastRightTrigger = useRef(false);
  const jetpackEnabled = useRef(false);
  const lastBButtonPressed = useRef(false);
  const vrInitialized = useRef(false);
  const lastAButtonPressed = useRef(false);
  const lastXButtonPressed = useRef(false);
  const lastYButtonPressed = useRef(false);
  const rightSwordRotation = useRef(0);
  const leftSwordRotation = useRef(0);
  const leftWeaponSlot = useRef(0);
  const rightWeaponSlot = useRef(0);
  const hiddenXRDefaultsRef = useRef(false);
  // Controller sync status tracking
  const controllerSyncStatus = useRef({
    scanning: true,
    leftDetected: false,
    rightDetected: false,
    leftIndex: -1,
    rightIndex: -1,
    lastUpdate: Date.now(),
  });

  /*
   * ========================================================================
   * CRITICAL: VR CONTROLLER HANDEDNESS DETECTION SYSTEM
   * ========================================================================
   *
   * PROBLEM SOLVED:
   * Three.js WebXR controller indices (0, 1) are NOT guaranteed to map to
   * specific hands. They can change when:
   * - Headset goes to sleep/standby mode
   * - Controllers disconnect/reconnect
   * - System restarts or reloads
   *
   * SOLUTION:
   * We use event-based handedness detection to dynamically determine which
   * Three.js controller index corresponds to which physical hand:
   *
   * 1. Create both Three.js controllers (0 and 1) without assumptions
   * 2. Listen for 'connected' events on each controller
   * 3. Read the handedness from the event data ('left' or 'right')
   * 4. Store the mapping: handToIndexMap[handedness] = controllerIndex
   * 5. Use this mapping throughout the code for all interactions
   *
   * NEVER ASSUME:
   * - controller0 = left hand  ❌ WRONG
   * - controller1 = right hand ❌ WRONG
   *
   * ALWAYS USE:
   * - handToIndexMap.current.left = actual left controller index ✅ CORRECT
   * - handToIndexMap.current.right = actual right controller index ✅ CORRECT
   */

  // Track which Three.js controller index corresponds to which hand
  const handToIndexMap = useRef<{ left?: number; right?: number }>({});
  const controllersSetup = useRef(false);

  // Movement and fuel system refs
  const velocity = useRef(new THREE.Vector3());
  const acceleration = useRef(new THREE.Vector3());
  const lastDirection = useRef(new THREE.Vector3(0, 0, -1));
  const isAccelerating = useRef(false);
  const lockedDirection = useRef<THREE.Vector3 | null>(null);
  const lastSwordsHeld = useRef(0);

  // Movement parameters
  const maxSpeed = useRef(PLAYER_CONFIG.movement.maxSpeed);
  const accelerationRate = useRef(PLAYER_CONFIG.movement.accelerationRate);
  const turnRate = useRef(PLAYER_CONFIG.movement.turnRate);

  // Gun system
  const bullets = useRef<
    Array<{
      id: string;
      mesh: THREE.Object3D;
      velocity: THREE.Vector3;
      startTime: number;
    }>
  >([]);
  // Individual gun clips with 12 rounds each
  const leftClip = useRef(12); // Left gun clip
  const rightClip = useRef(12); // Right gun clip
  const maxClipSize = useRef(PLAYER_CONFIG.weapons.maxClipSize);

  // Reload state tracking
  const leftReloading = useRef(false);
  const rightReloading = useRef(false);
  const tempVector = new THREE.Vector3(); // Reusable vector for position checks

  // Fuel system
  const fuel = useRef(100.0);
  const maxFuel = useRef(100.0);
  const fuelDrainRate = useRef(PLAYER_CONFIG.jetpack.fuelDrainRate);
  const fuelRechargeRate = useRef(PLAYER_CONFIG.jetpack.fuelRechargeRate);
  const fuelPenaltyRecovery = useRef(PLAYER_CONFIG.jetpack.fuelPenaltyRecovery);
  const wasEmpty = useRef(false);
  const emptyPenaltyTime = useRef(0);
  const wasAccelerating = useRef(false);

  // add near top
  const rehide = () => hideDefaultXRVisuals();

  // Store event listener functions for cleanup
  const eventListenersRef = useRef<{
    controller0Connected?: (event: any) => void;
    controller1Connected?: (event: any) => void;
    rehideConnected?: (event: any) => void;
    rehideDisconnected?: (event: any) => void;
  }>({});

  // Cleanup event listeners when component unmounts
  useEffect(() => {
    return () => {
      // Remove all controller event listeners
      if (controller0Ref.current && eventListenersRef.current.controller0Connected) {
        controller0Ref.current.removeEventListener("connected", eventListenersRef.current.controller0Connected);
      }
      if (controller1Ref.current && eventListenersRef.current.controller1Connected) {
        controller1Ref.current.removeEventListener("connected", eventListenersRef.current.controller1Connected);
      }
      
      // Remove rehide event listeners from all controllers
      [controller0Ref, controller1Ref, controllerGrip0Ref, controllerGrip1Ref].forEach((r) => {
        if (r.current && eventListenersRef.current.rehideConnected) {
          r.current.removeEventListener("connected", eventListenersRef.current.rehideConnected);
        }
        if (r.current && eventListenersRef.current.rehideDisconnected) {
          r.current.removeEventListener("disconnected", eventListenersRef.current.rehideDisconnected);
        }
      });
    };
  }, []);

  // VR teleport event — reposition worldGroup so headset tracking puts player at target spawn
  useEffect(() => {
    const handleVRTeleport = (e: Event) => {
      const { x, y, z } = (e as CustomEvent).detail;
      const wg = scene.getObjectByName('worldGroup') as THREE.Group | null;
      if (!wg) return;
      // Position worldGroup so player appears at the target spawn position
      wg.position.x = camera.position.x - x;
      wg.position.y = camera.position.y - y;
      wg.position.z = camera.position.z - z;
    };
    window.addEventListener('vrTeleport', handleVRTeleport);
    return () => window.removeEventListener('vrTeleport', handleVRTeleport);
  }, [camera, scene]);

  function hideDefaultXRVisuals() {
    // Only hide CHILDREN of each controller root — never hide the root itself,
    // because setting root.visible=false would also hide our custom weapons.
    const killChildren = (obj?: THREE.Object3D | null) => {
      if (!obj) return;
      obj.children.forEach((child: any) => {
        // Skip anything we attached (custom models)
        if (child?.userData?.isCustomModel) return;
        child.traverse((node: any) => {
          if (node?.userData?.isCustomModel) return;
          if (
            node.isLine ||
            node.type === "Line" ||
            node.type === "LineSegments" ||
            node.type === "LineLoop" ||
            node.isMesh ||
            node.isSkinnedMesh ||
            node.isGroup ||
            node.isObject3D ||
            node.name?.toLowerCase().includes("controller") ||
            node.name?.toLowerCase().includes("profile")
          )
            node.visible = false;
        });
        if (!child?.userData?.isCustomModel) child.visible = false;
      });
    };
    killChildren(controller0Ref.current);
    killChildren(controller1Ref.current);
    killChildren(controllerGrip0Ref.current);
    killChildren(controllerGrip1Ref.current);
  }

  // Burst speed system
  const burstSpeedMultiplier = useRef(1.0);
  const burstSpeedDecay = useRef(0);
  const lastStoppedAccelerating = useRef(0);
  const wasAcceleratingPreviously = useRef(false);

  // Momentum system
  const momentumTransferBonus = useRef(0);

  function createInstantHit(
    startPosition: THREE.Vector3,
    direction: THREE.Vector3,
    scene: THREE.Scene,
  ) {
    // Create instant visual beam effect
    const beamGroup = new THREE.Group();

    // Create a line geometry for the laser beam
    const maxDistance = 100;
    const endPosition = startPosition
      .clone()
      .add(direction.normalize().multiplyScalar(maxDistance));

    // Raycast to find actual hit point
    const raycaster = new THREE.Raycaster(
      startPosition,
      direction.normalize(),
      0,
      maxDistance,
    );
    const intersects: THREE.Intersection[] = [];

    // Check hits on world objects
    const worldGroup = scene.getObjectByName("worldGroup") as THREE.Group;
    if (worldGroup) {
      worldGroup.traverse((child) => {
        if (
          (child.userData.isPillar && !child.userData.destroyed) ||
          (child.userData.isTurret && child.userData.health > 0)
        ) {
          const intersection = raycaster.intersectObject(child, false);
          intersects.push(...intersection);
        }
      });
    }

    // Find closest hit
    let hitDistance = maxDistance;
    let hitTarget = null;

    if (intersects.length > 0) {
      intersects.sort((a, b) => a.distance - b.distance);
      hitDistance = intersects[0].distance;
      hitTarget = intersects[0].object;
      endPosition.copy(intersects[0].point!);
    }

    // Create visible laser beam
    const beamLength = hitDistance;
    const beamGeometry = new THREE.CylinderGeometry(
      0.005,
      0.005,
      beamLength,
      8,
    );
    const beamMaterial = new THREE.MeshLambertMaterial({
      color: "#00ff00",
      emissive: "#88ff00",
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.8,
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);

    // Position beam correctly
    const beamCenter = startPosition
      .clone()
      .add(direction.clone().multiplyScalar(beamLength / 2));
    beam.position.copy(beamCenter);

    // Align beam with direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    beam.quaternion.copy(quaternion);

    beamGroup.add(beam);
    scene.add(beamGroup);

    // Process hit if we hit something
    if (hitTarget) {
      if (hitTarget.userData.isPillar && !hitTarget.userData.destroyed) {
        // Hit pillar - destroy it
        const pillarPos = new THREE.Vector3();
        hitTarget.getWorldPosition(pillarPos);

        import("../lib/stores/useVRGame").then(({ useVRGame }) => {
          useVRGame.getState().explodePillar(hitTarget.uuid);
        });
        hitTarget.userData.destroyed = true;

        // Create explosion effect
        import("../lib/stores/useVRGame").then(({ useVRGame }) => {
          useVRGame
            .getState()
            .addHitEffect([pillarPos.x, pillarPos.y, pillarPos.z]);
        });

        // Play sword hit sound when pillar gets destroyed
        try {
          const audioStore = require('../lib/stores/useAudio').useAudio;
          audioStore.getState().playSwordHit();
          console.log('🔊 Playing sword hit sound for pillar destruction');
        } catch (error) {
          console.log('🔊 Sword hit sound error:', error);
        }

        // Launch pillar flying in the air with EXTREME physics
        const initialPos = new THREE.Vector3();
        hitTarget.getWorldPosition(initialPos);
        
        // ULTRA MASSIVE flying direction - EXPLOSIVE LAUNCH!
        const flyDirection = new THREE.Vector3(
          (Math.random() - 0.5) * 120, // ENORMOUS random X velocity
          50 + Math.random() * 70,     // EXPLOSIVE upward velocity (50-120)
          (Math.random() - 0.5) * 120  // ENORMOUS random Z velocity
        );
        
        // Add initial explosive scale effect
        const originalScale = hitTarget.scale.clone();
        hitTarget.scale.multiplyScalar(1.5); // Initial explosion scale
        
        let velocity = flyDirection.clone();
        const gravity = new THREE.Vector3(0, -35, 0); // Much stronger gravity
        const angularVelocity = new THREE.Vector3(
          (Math.random() - 0.5) * 2.5,  // EXTREME spinning
          (Math.random() - 0.5) * 2.5,
          (Math.random() - 0.5) * 2.5
        );
        
        const startTime = Date.now();
        const flyAnimation = () => {
          const deltaTime = 0.016; // ~60fps
          const elapsed = (Date.now() - startTime) / 1000;
          
          // Apply gravity to velocity
          velocity.add(gravity.clone().multiplyScalar(deltaTime));
          
          // Update position with MASSIVE movement
          hitTarget.position.add(velocity.clone().multiplyScalar(deltaTime));
          
          // Add EXTREME spinning rotation
          hitTarget.rotation.x += angularVelocity.x * deltaTime * 60;
          hitTarget.rotation.y += angularVelocity.y * deltaTime * 60;
          hitTarget.rotation.z += angularVelocity.z * deltaTime * 60;
          
          // Scale effect - expand then contract during flight
          if (elapsed < 0.3) {
            const scaleMultiplier = 1.5 + Math.sin(elapsed * 20) * 0.5; // Wobble effect
            hitTarget.scale.copy(originalScale.clone().multiplyScalar(scaleMultiplier));
          } else {
            // Gradually return to normal scale
            const scaleProgress = Math.min((elapsed - 0.3) / 0.5, 1.0);
            const currentScale = 1.5 - (0.5 * scaleProgress);
            hitTarget.scale.copy(originalScale.clone().multiplyScalar(currentScale));
          }
          
          // Fade out after 1.5 seconds
          if (elapsed > 1.5) {
            const fadeProgress = Math.min((elapsed - 1.5) / 1.0, 1.0); // 1 second fade
            const opacity = 1.0 - fadeProgress;
            
            if (hitTarget.material && 'opacity' in hitTarget.material) {
              hitTarget.material.transparent = true;
              hitTarget.material.opacity = opacity;
            }
          }
          
          // Remove after 5 seconds total (longer flight time for dramatic effect)
          if (elapsed < 5.0) {
            requestAnimationFrame(flyAnimation);
          } else {
            hitTarget.parent?.remove(hitTarget);
          }
        };
        flyAnimation();
      } else if (hitTarget.userData.isTurret && hitTarget.userData.health > 0) {
        // Hit turret - damage it
        hitTarget.userData.health -= 25;
        console.log(`🎯 Turret hit! Health: ${hitTarget.userData.health}/100`);

        // Play gun hit sound
        import("../lib/stores/useAudio").then(({ useAudio }) => {
          useAudio.getState().playGunHit();
        });

        // Create hit effect
        const turretPos = new THREE.Vector3();
        hitTarget.getWorldPosition(turretPos);
        import("../lib/stores/useVRGame").then(({ useVRGame }) => {
          useVRGame
            .getState()
            .addHitEffect([turretPos.x, turretPos.y + 1, turretPos.z]);
        });
      } else if (hitTarget.userData.isEnemy && !hitTarget.userData.isDead) {
        // Hit enemy with gun - damage it
        const gunDamage = 4;
        if (hitTarget.userData.takeDamage) {
          hitTarget.userData.takeDamage(gunDamage);
        }
        console.log(`🎯 ${hitTarget.userData.enemyType} shot! ${gunDamage} damage`);

        // Play gun hit sound
        import("../lib/stores/useAudio").then(({ useAudio }) => {
          useAudio.getState().playGunHit();
        });

        // Create hit effect
        const enemyPos = new THREE.Vector3();
        hitTarget.getWorldPosition(enemyPos);
        import("../lib/stores/useVRGame").then(({ useVRGame }) => {
          useVRGame
            .getState()
            .addHitEffect([enemyPos.x, enemyPos.y + 1, enemyPos.z]);
        });
      }
    }

    // Remove beam after short duration
    setTimeout(() => {
      scene.remove(beamGroup);
    }, 100); // Brief flash

    return true;
  }

  function fireInstantBullet(
    controller: THREE.XRTargetRaySpace,
    hand: "left" | "right",
    scene: THREE.Scene,
  ) {
    const currentClip = hand === "left" ? leftClip : rightClip;
    if (!controller || currentClip.current <= 0) return; // Check clip ammo

    const controllerPos = new THREE.Vector3();
    const controllerDir = new THREE.Vector3();

    // Find the gun sight and use its direction for accurate aiming
    const gun = controller.getObjectByName("gunSight");
    if (gun) {
      gun.getWorldPosition(controllerPos);
      gun.getWorldDirection(controllerDir);
      // Sight points in the negative Z direction by default, so negate to get forward direction
      controllerDir.negate();
    } else {
      // Fallback to controller direction if sight not found
      controller.getWorldPosition(controllerPos);
      controller.getWorldDirection(controllerDir);
      controllerDir.negate();
      controllerDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 4);
    }

    // Adjust gun position to barrel tip
    controllerPos.add(controllerDir.clone().multiplyScalar(0.25));

    // Fire instant hit
    createInstantHit(controllerPos, controllerDir, scene);

    // Play gun shoot sound
    playGunShoot();

    // Consume ammo from current clip
    currentClip.current--;
    console.log(
      `⚡ ${hand} gun fired! Clip: ${currentClip.current}/${maxClipSize.current}`,
    );
  }

  function createMeleeWeapon(id: string): THREE.Group {
    const cfg = (weaponConfig.melee as any)[id];
    if (!cfg) {
      console.warn(`Unknown melee weapon: ${id}, falling back to longsword`);
      return createMeleeWeapon("longsword");
    }
    const v = cfg.visual;

    const weapon = new THREE.Group();
    weapon.userData.isCustomModel = true;
    weapon.userData.isSword = true;

    // Handle
    const handleGeometry = new THREE.CylinderGeometry(
      v.handleRadius * 0.8,
      v.handleRadius,
      v.handleLength,
      8,
    );
    const handleMaterial = new THREE.MeshLambertMaterial({ color: v.handleColor });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.userData.isCustomModel = true;
    handle.position.y = -v.handleLength / 2;
    weapon.add(handle);

    // Guard (only if it has dimensions)
    if (v.guardWidth > 0 && v.guardHeight > 0) {
      const guardGeometry = new THREE.BoxGeometry(v.guardWidth, v.guardHeight, v.guardDepth);
      const guardMaterial = new THREE.MeshLambertMaterial({ color: v.guardColor });
      const guard = new THREE.Mesh(guardGeometry, guardMaterial);
      guard.userData.isCustomModel = true;
      guard.position.y = 0;
      weapon.add(guard);
    }

    if (v.axeHead) {
      // Axe head at top of handle
      const axeGeometry = new THREE.BoxGeometry(v.axeHeadWidth, v.axeHeadHeight, v.axeHeadDepth);
      const axeMaterial = new THREE.MeshLambertMaterial({
        color: v.bladeColor,
        emissive: v.emissive,
        emissiveIntensity: v.emissiveIntensity,
      });
      const axeHead = new THREE.Mesh(axeGeometry, axeMaterial);
      axeHead.userData.isCustomModel = true;
      axeHead.position.y = v.handleLength / 2;
      weapon.add(axeHead);
    } else if (v.hammerHead) {
      // Hammer head at top of handle
      const hammerGeometry = new THREE.BoxGeometry(
        v.hammerHeadWidth,
        v.hammerHeadHeight,
        v.hammerHeadDepth,
      );
      const hammerMaterial = new THREE.MeshLambertMaterial({
        color: v.bladeColor,
        emissive: v.emissive,
        emissiveIntensity: v.emissiveIntensity,
      });
      const hammerHead = new THREE.Mesh(hammerGeometry, hammerMaterial);
      hammerHead.userData.isCustomModel = true;
      hammerHead.position.y = v.handleLength / 2;
      weapon.add(hammerHead);
    } else if (v.bladeLength > 0) {
      // Sword blade
      const bladeGeometry = new THREE.BoxGeometry(v.bladeWidth, v.bladeLength, v.bladeDepth);
      const bladeMaterial = new THREE.MeshLambertMaterial({
        color: v.bladeColor,
        emissive: v.emissive,
        emissiveIntensity: v.emissiveIntensity,
      });
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.userData.isCustomModel = true;
      blade.position.y = v.bladeLength / 2;
      weapon.add(blade);
    }

    // Rotate to point forward (same orientation as original sword)
    weapon.rotation.z = Math.PI / 2;

    return weapon;
  }

  function createRangedWeapon(id: string): THREE.Group {
    const cfg = (weaponConfig.ranged as any)[id];
    if (!cfg) {
      console.warn(`Unknown ranged weapon: ${id}, falling back to pistols`);
      return createRangedWeapon("pistols");
    }
    const v = cfg.visual;

    const gun = new THREE.Group();
    gun.userData.isCustomModel = true;

    // Body
    const bodyGeometry = new THREE.BoxGeometry(v.bodyWidth, v.bodyHeight, v.bodyLength);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: v.color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.userData.isCustomModel = true;
    body.position.y = 0.02;
    gun.add(body);

    // Barrel (rotated 90° to point forward along -Z)
    const barrelGeometry = new THREE.CylinderGeometry(v.barrelRadius, v.barrelRadius, v.barrelLength, 8);
    const barrelMaterial = new THREE.MeshLambertMaterial({ color: v.barrelColor });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.userData.isCustomModel = true;
    barrel.rotation.x = Math.PI / 2;
    barrel.position.y = 0.02;
    barrel.position.z = -(v.bodyLength / 2 + v.barrelLength / 2);
    gun.add(barrel);

    // Grip (below body)
    const gripGeometry = new THREE.BoxGeometry(v.gripWidth, v.gripLength, v.gripDepth);
    const gripMaterial = new THREE.MeshLambertMaterial({ color: v.gripColor });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.userData.isCustomModel = true;
    grip.position.y = -(v.bodyHeight / 2 + v.gripLength / 2);
    gun.add(grip);

    // Front sight ring at barrel tip — primary aiming reference
    const frontSightGeometry = new THREE.RingGeometry(0.008, 0.012, 16);
    const frontSightMaterial = new THREE.MeshLambertMaterial({ color: "#000000" });
    const frontSight = new THREE.Mesh(frontSightGeometry, frontSightMaterial);
    frontSight.userData.isCustomModel = true;
    frontSight.name = "gunSight";
    frontSight.position.y = 0.05;
    frontSight.position.z = -(v.bodyLength / 2 + v.barrelLength);
    frontSight.rotation.x = 0;
    gun.add(frontSight);

    // Rotate gun to point forward and upward (same as original)
    gun.rotation.x = -Math.PI / 2 + Math.PI / 4;

    return gun;
  }

  useFrame((state) => {
    const { gl, camera, scene } = state;
    const session = gl.xr.getSession();

    if (!session) return;

    /*
     * ========================================================================
     * STEP 1: CREATE THREE.JS CONTROLLERS WITHOUT HAND ASSUMPTIONS
     * ========================================================================
     *
     * We create both controllers (0 and 1) but DO NOT assume which is which.
     * The actual handedness will be determined by the 'connected' events below.
     */

    // Set up Three.js controllers - indices 0 and 1 (handedness unknown at this point)
    if (!controller0Ref.current) {
      controller0Ref.current = gl.xr.getController(0);
      scene.add(controller0Ref.current);
    }
    if (!controllerGrip0Ref.current) {
      controllerGrip0Ref.current = gl.xr.getControllerGrip(0);
      scene.add(controllerGrip0Ref.current);
    }
    if (!controller1Ref.current) {
      controller1Ref.current = gl.xr.getController(1);
      scene.add(controller1Ref.current);
    }
    if (!controllerGrip1Ref.current) {
      controllerGrip1Ref.current = gl.xr.getControllerGrip(1);
      scene.add(controllerGrip1Ref.current);
    }

    /*
     * ========================================================================
     * STEP 2: DETECT ACTUAL HANDEDNESS VIA 'CONNECTED' EVENTS
     * ========================================================================
     *
     * This is THE CRITICAL PART that solves the handedness problem.
     * When each controller connects, we read its actual handedness and store
     * the mapping between Three.js index and physical hand.
     *
     * NEVER MODIFY THIS LOGIC WITHOUT UNDERSTANDING THE PROBLEM IT SOLVES.
     */

    // Show controller sync status in VR overlay
    if (controllerSyncStatus.current.scanning) {
      if (typeof window !== "undefined" && (window as any).vrDebugLog) {
        (window as any).vrDebugLog(`🔍 SCANNING FOR VR CONTROLLERS...`);
        const connected = [
          controller0Ref.current,
          controller1Ref.current,
        ].filter((c) => c && gl.xr.getSession()).length;
        (window as any).vrDebugLog(`Controllers connected: ${connected}/2`);
        if (connected > 0) {
          (window as any).vrDebugLog(`🔧 Setting up hand detection...`);
        }
      }
    }

    // after creating controllers/grips (once)
    if (!controllersSetup.current) {
      controllersSetup.current = true;
      
      // Store rehide functions for cleanup
      eventListenersRef.current.rehideConnected = rehide as any;
      eventListenersRef.current.rehideDisconnected = rehide as any;
      
      [
        controller0Ref,
        controller1Ref,
        controllerGrip0Ref,
        controllerGrip1Ref,
      ].forEach((r) => {
        r.current?.addEventListener("connected", eventListenersRef.current.rehideConnected!);
        r.current?.addEventListener("disconnected", eventListenersRef.current.rehideDisconnected!);
      });

      // Store controller 0 connected function for cleanup
      eventListenersRef.current.controller0Connected = (event) => {
        const handedness = event.data.handedness;
        if (handedness === "left" || handedness === "right") {
          handToIndexMap.current[handedness] = 0;
          controllerSyncStatus.current[`${handedness}Detected`] = true;
          controllerSyncStatus.current[`${handedness}Index`] = 0;

          console.log(
            `🎮 HANDEDNESS DETECTED: Controller 0 = ${handedness} hand`,
          );
          if (typeof window !== "undefined" && (window as any).vrDebugLog) {
            (window as any).vrDebugLog(
              `✅ ${handedness.toUpperCase()} hand detected (controller 0)`,
            );
          }
        }
      };
      
      // Listen for controller 0 connection to determine its handedness
      controller0Ref.current.addEventListener("connected", eventListenersRef.current.controller0Connected);

      // Store controller 1 connected function for cleanup
      eventListenersRef.current.controller1Connected = (event) => {
        const handedness = event.data.handedness;
        if (handedness === "left" || handedness === "right") {
          handToIndexMap.current[handedness] = 1;
          controllerSyncStatus.current[`${handedness}Detected`] = true;
          controllerSyncStatus.current[`${handedness}Index`] = 1;

          console.log(
            `🎮 HANDEDNESS DETECTED: Controller 1 = ${handedness} hand`,
          );
          if (typeof window !== "undefined" && (window as any).vrDebugLog) {
            (window as any).vrDebugLog(
              `✅ ${handedness.toUpperCase()} hand detected (controller 1)`,
            );
          }
        }
      };

      // Listen for controller 1 connection to determine its handedness
      controller1Ref.current.addEventListener("connected", eventListenersRef.current.controller1Connected);
    }

    /*
     * ========================================================================
     * STEP 3: WAIT FOR HANDEDNESS DETECTION TO COMPLETE
     * ========================================================================
     *
     * We cannot proceed until we know which controller index corresponds to
     * which physical hand. This prevents any incorrect hand assignments.
     */

    // Wait until we know which controller is which
    const leftIndex = handToIndexMap.current.left; // Could be 0 or 1
    const rightIndex = handToIndexMap.current.right; // Could be 0 or 1

    if (leftIndex === undefined || rightIndex === undefined) {
      // Still waiting for handedness detection - show status
      if (typeof window !== "undefined" && (window as any).vrDebugLog) {
        (window as any).vrDebugLog(`⏳ Waiting for hand detection...`);
        (window as any).vrDebugLog(
          `Left: ${leftIndex !== undefined ? "✅" : "❌"} Right: ${rightIndex !== undefined ? "✅" : "❌"}`,
        );
      }
      return;
    }

    // Mark controller sync as complete
    if (controllerSyncStatus.current.scanning) {
      controllerSyncStatus.current.scanning = false;
      if (typeof window !== "undefined" && (window as any).vrDebugLog) {
        (window as any).vrDebugLog(`🎮 CONTROLLER SYNC COMPLETE!`);
        (window as any).vrDebugLog(
          `Left: controller ${leftIndex}, Right: controller ${rightIndex}`,
        );
        (window as any).vrDebugLog(`🔧 Setting up guns and swords...`);
      }
    }

    if (!vrInitialized.current) {
      vrInitialized.current = true;
      console.log("✅ HANDEDNESS MAPPING COMPLETE!");
      console.log(`🤚 Left physical hand = Three.js Controller ${leftIndex}`);
      console.log(`🤚 Right physical hand = Three.js Controller ${rightIndex}`);
      console.log("📋 All subsequent interactions use this mapping");

      if (typeof window !== "undefined" && (window as any).vrDebugLog) {
        (window as any).vrDebugLog(`✅ VR SYSTEM READY!`);
        (window as any).vrDebugLog(`Squeeze RIGHT grip to spawn sword`);
        (window as any).vrDebugLog(`Point sword where you want it`);
        (window as any).vrDebugLog(`Press A/X to cycle weapon slots`);
        (window as any).vrDebugLog(
          `Tell me what that position should be called!`,
        );
      }
    }

    // initial hide
    if (
      (controllerGrip0Ref.current || controllerGrip1Ref.current) &&
      !hiddenXRDefaultsRef.current
    ) {
      hideDefaultXRVisuals();
      hiddenXRDefaultsRef.current = true;
    }

    /*
     * ========================================================================
     * STEP 4: GET GAMEPADS USING WEBXR HANDEDNESS (NOT THREE.JS INDICES)
     * ========================================================================
     *
     * We get the gamepads directly from WebXR inputSources by handedness.
     * This is reliable because WebXR handedness is always correct.
     *
     * DO NOT try to get gamepads from Three.js controllers - use WebXR directly.
     */

    // Get gamepads by WebXR handedness (always reliable)
    const inputSources = Array.from(session.inputSources);
    const leftInputSource = inputSources.find(
      (source) => source.handedness === "left",
    );
    const rightInputSource = inputSources.find(
      (source) => source.handedness === "right",
    );
    const leftGamepad = leftInputSource?.gamepad; // Left physical hand gamepad
    const rightGamepad = rightInputSource?.gamepad; // Right physical hand gamepad

    if (!leftGamepad || !rightGamepad) return;

    /*
     * ========================================================================
     * STEP 6: PROCESS INPUT FROM PHYSICAL HANDS
     * ========================================================================
     *
     * Now we process button input from each physical hand's gamepad.
     * The gamepads are correctly identified by WebXR handedness, so this
     * mapping is always accurate.
     *
     * BUTTON MAPPING (Quest controllers):
     * - Button 0: Trigger
     * - Button 1: Grip/Squeeze
     * - Button 3: X button (LEFT) / A button (RIGHT)
     * - Button 4: Y button (LEFT) / B button (RIGHT)
     * - Button 5: Menu button (LEFT) / Oculus button (RIGHT)
     */

    // LEFT PHYSICAL HAND INPUT PROCESSING
    if (leftGamepad.buttons.length > 1) {
      leftGrabbing.current = leftGamepad.buttons[1].pressed; // Left grip = spawn left sword
      leftTrigger.current = leftGamepad.buttons[0].pressed; // Left trigger = fire left gun
    }

    // RIGHT PHYSICAL HAND INPUT PROCESSING
    if (rightGamepad.buttons.length > 1) {
      rightGrabbing.current = rightGamepad.buttons[1].pressed; // Right grip = spawn right sword
      rightTrigger.current = rightGamepad.buttons[0].pressed; // Right trigger = fire right gun

      // B button on RIGHT physical hand toggles jetpack (button index 5 on right controller)
      const bButtonPressed = rightGamepad.buttons[5]?.pressed || false;
      if (bButtonPressed && !lastBButtonPressed.current) {
        jetpackEnabled.current = !jetpackEnabled.current;
        console.log(
          jetpackEnabled.current ? "🚀 Jetpack ENABLED" : "🚫 Jetpack DISABLED",
        );
        if (onJetpackChange) {
          onJetpackChange(jetpackEnabled.current);
        }
      }
      lastBButtonPressed.current = bButtonPressed;
    }

    // THUMBSTICK INPUT
    let leftStickX = 0;
    let leftStickY = 0;
    if (leftGamepad && leftGamepad.axes && leftGamepad.axes.length >= 4) {
      leftStickX = leftGamepad.axes[2] || 0;
      leftStickY = leftGamepad.axes[3] || 0;
    }

    let rightStickX = 0;
    let rightStickY = 0;
    if (rightGamepad && rightGamepad.axes && rightGamepad.axes.length >= 4) {
      rightStickX = rightGamepad.axes[2] || 0;
      rightStickY = rightGamepad.axes[3] || 0;
    }

    /*
     * ========================================================================
     * STEP 5: GET CONTROLLER OBJECTS USING OUR DETECTED MAPPING
     * ========================================================================
     *
     * Now we use our handedness mapping to get the correct Three.js controller
     * objects for weapon attachment and 3D positioning.
     *
     * This is where the magic happens - we use our detected mapping to ensure
     * weapons attach to the correct physical hands.
     */

    // Get Three.js controller objects using our detected handedness mapping
    const leftControllerObj =
      leftIndex === 0 ? controllerGrip0Ref.current : controllerGrip1Ref.current; // Left physical hand 3D object
    const rightControllerObj =
      rightIndex === 0
        ? controllerGrip0Ref.current
        : controllerGrip1Ref.current; // Right physical hand 3D object

    if (!leftControllerObj || !rightControllerObj) return;

    // A button (right gamepad buttons[4]): cycle RIGHT weapon slot
    const aButtonPressed = rightGamepad.buttons[4]?.pressed || false;
    if (aButtonPressed && !lastAButtonPressed.current) {
      rightWeaponSlot.current = (rightWeaponSlot.current + 1) % 6;
      const rSlot = WEAPON_SLOTS[rightWeaponSlot.current];
      const rMeleeName = (weaponConfig.melee as any)[rSlot.melee]?.name ?? rSlot.melee;
      const rGunName   = (weaponConfig.ranged as any)[rSlot.gun]?.name   ?? rSlot.gun;
      console.log(`🗡️ RIGHT weapon slot ${rightWeaponSlot.current}: ${rMeleeName} / ${rGunName}`);
      if (rightGunRef.current) {
        rightControllerObj.remove(rightGunRef.current);
        rightGunRef.current = undefined;
        const newGun = createRangedWeapon(rSlot.gun);
        rightGunRef.current = newGun;
        rightControllerObj.add(newGun);
      }
      if (typeof window !== "undefined" && (window as any).vrDebugLog) {
        (window as any).vrDebugLog(`🗡️ RIGHT: ${rMeleeName} / ${rGunName}`);
      }
    }
    lastAButtonPressed.current = aButtonPressed;

    // X button (left gamepad buttons[3]): cycle LEFT weapon slot
    const xButtonPressed = leftGamepad.buttons[3]?.pressed || false;
    if (xButtonPressed && !lastXButtonPressed.current) {
      leftWeaponSlot.current = (leftWeaponSlot.current + 1) % 6;
      const lSlot = WEAPON_SLOTS[leftWeaponSlot.current];
      const lMeleeName = (weaponConfig.melee as any)[lSlot.melee]?.name ?? lSlot.melee;
      const lGunName   = (weaponConfig.ranged as any)[lSlot.gun]?.name   ?? lSlot.gun;
      console.log(`🗡️ LEFT weapon slot ${leftWeaponSlot.current}: ${lMeleeName} / ${lGunName}`);
      if (leftGunRef.current) {
        leftControllerObj.remove(leftGunRef.current);
        leftGunRef.current = undefined;
        const newGun = createRangedWeapon(lSlot.gun);
        leftGunRef.current = newGun;
        leftControllerObj.add(newGun);
      }
      if (typeof window !== "undefined" && (window as any).vrDebugLog) {
        (window as any).vrDebugLog(`🗡️ LEFT: ${lMeleeName} / ${lGunName}`);
      }
    }
    lastXButtonPressed.current = xButtonPressed;

    /*
     * ========================================================================
     * STEP 7: ATTACH WEAPONS TO CORRECT PHYSICAL HANDS
     * ========================================================================
     *
     * We attach weapons to the Three.js controller objects that correspond
     * to the correct physical hands using our detected mapping.
     *
     * This ensures weapons always appear in the right hands regardless of
     * which Three.js controller index they ended up being assigned to.
     */

    // LEFT PHYSICAL HAND WEAPON MANAGEMENT
    if (!leftGunRef.current) {
      const gun = createRangedWeapon(WEAPON_SLOTS[leftWeaponSlot.current].gun);
      leftGunRef.current = gun;
      leftControllerObj.add(gun); // Attach to LEFT physical hand (whatever index it is)
    }

    // LEFT physical hand grip spawns LEFT sword
    if (leftGrabbing.current) {
      if (!leftSwordRef.current) {
        console.log(
          `⚔️ LEFT physical hand sword spawned (on Three.js controller ${leftIndex})`,
        );
        const sword = createMeleeWeapon(WEAPON_SLOTS[leftWeaponSlot.current].melee);
        sword.scale.x = -1; // Mirror for left hand dual-wielding
        leftSwordRef.current = sword;
        leftControllerObj.add(sword); // Attach to LEFT physical hand
      }
    } else {
      if (leftSwordRef.current) {
        leftControllerObj.remove(leftSwordRef.current);
        leftSwordRef.current = undefined;
      }
    }

    // RIGHT PHYSICAL HAND WEAPON MANAGEMENT
    if (!rightGunRef.current) {
      const gun = createRangedWeapon(WEAPON_SLOTS[rightWeaponSlot.current].gun);
      rightGunRef.current = gun;
      rightControllerObj.add(gun); // Attach to RIGHT physical hand (whatever index it is)
    }

    // RIGHT physical hand grip spawns RIGHT sword
    if (rightGrabbing.current) {
      if (!rightSwordRef.current) {
        const sword = createMeleeWeapon(WEAPON_SLOTS[rightWeaponSlot.current].melee);
        rightSwordRef.current = sword;
        rightControllerObj.add(sword);

        if (typeof window !== "undefined" && (window as any).vrDebugLog) {
          const slotName = (weaponConfig.melee as any)[WEAPON_SLOTS[rightWeaponSlot.current].melee]?.name ?? WEAPON_SLOTS[rightWeaponSlot.current].melee;
          (window as any).vrDebugLog(`🗡️ RIGHT ${slotName} spawned`);
        }
      }
    } else {
      if (rightSwordRef.current) {
        rightControllerObj.remove(rightSwordRef.current);
        rightSwordRef.current = undefined;

        if (typeof window !== "undefined" && (window as any).vrDebugLog) {
          (window as any).vrDebugLog(`🗡️ RIGHT sword removed`);
        }
      }
    }

    // Movement and timing system
    const swordsHeld =
      (leftSwordRef.current ? 1 : 0) + (rightSwordRef.current ? 1 : 0);
    const deltaTime = 1 / 60;
    const currentTime = Date.now();

    const allow3DFlight = jetpackEnabled.current;

    // ── Direction: average of both sword controllers when held, else camera ──
    const handDirection = new THREE.Vector3();
    if (leftControllerObj && leftSwordRef.current && rightControllerObj && rightSwordRef.current) {
      // Both swords held — steer with averaged controller direction
      const leftDir = new THREE.Vector3();
      const rightDir = new THREE.Vector3();
      leftControllerObj.getWorldDirection(leftDir);
      rightControllerObj.getWorldDirection(rightDir);
      handDirection.addVectors(leftDir, rightDir).normalize();
    } else if (leftControllerObj && leftSwordRef.current) {
      leftControllerObj.getWorldDirection(handDirection);
    } else if (rightControllerObj && rightSwordRef.current) {
      rightControllerObj.getWorldDirection(handDirection);
    } else {
      camera.getWorldDirection(handDirection);
    }
    if (!allow3DFlight) handDirection.y = 0;
    handDirection.normalize();

    // ── Turbo: both swords held, controllers close together, in front of face ──
    let isTurboActive = false;
    if (swordsHeld === 2 && leftControllerObj && rightControllerObj) {
      const leftPos = new THREE.Vector3();
      const rightPos = new THREE.Vector3();
      leftControllerObj.getWorldPosition(leftPos);
      rightControllerObj.getWorldPosition(rightPos);

      const controllerDist = leftPos.distanceTo(rightPos);

      // "In front of face": both controllers are roughly in front of camera
      const camFwd = new THREE.Vector3();
      camera.getWorldDirection(camFwd);
      const camPos = camera.position.clone();
      const leftRelative = leftPos.clone().sub(camPos);
      const rightRelative = rightPos.clone().sub(camPos);
      const leftInFront = leftRelative.dot(camFwd) > 0.1;
      const rightInFront = rightRelative.dot(camFwd) > 0.1;

      // Turbo when swords crossed/touching (< 0.25m apart) and both in front
      isTurboActive = controllerDist < 0.25 && leftInFront && rightInFront;

      if (isTurboActive && burstSpeedMultiplier.current < 2.5) {
        burstSpeedMultiplier.current = 2.5;
        if (!wasAcceleratingPreviously.current) {
          import("../lib/stores/useAudio").then(({ useAudio }) => {
            useAudio.getState().playBoost();
          });
        }
      }
    }

    if (!isTurboActive && burstSpeedMultiplier.current > 1.0) {
      // Decay turbo when condition no longer met
      burstSpeedMultiplier.current = Math.max(1.0, burstSpeedMultiplier.current - deltaTime * 1.5);
    }

    const currentlyAccelerating =
      swordsHeld > 0 && fuel.current > 0 && jetpackEnabled.current;
    wasAcceleratingPreviously.current = currentlyAccelerating;

    // Update fuel system (only if jetpack enabled)
    if (swordsHeld > 0 && fuel.current > 0 && jetpackEnabled.current) {
      // Calculate fuel drain rate based on altitude
      const isGrounded = camera.position.y <= 1.8; // Player height when standing
      const airborneMultiplier = isGrounded ? 1.0 : 4.0; // 4x faster fuel burn when airborne
      const actualDrainRate = fuelDrainRate.current * airborneMultiplier;
      
      fuel.current -= actualDrainRate * deltaTime;
      if (fuel.current <= 0) {
        fuel.current = 0;
        wasEmpty.current = true;
        emptyPenaltyTime.current = 0;
      }
      
      // Log fuel drain for debugging
      if (!isGrounded) {
        console.log(`⚡ AIRBORNE! Fuel draining ${airborneMultiplier}x faster: ${fuel.current.toFixed(1)}/100`);
      }
      // Track acceleration for sound
    } else {
      if (swordsHeld === 0) {
        const rechargeRate =
          wasEmpty.current && emptyPenaltyTime.current < 3.0
            ? fuelPenaltyRecovery.current
            : fuelRechargeRate.current;

        fuel.current += rechargeRate * deltaTime;
        if (fuel.current >= maxFuel.current) {
          fuel.current = maxFuel.current;
          wasEmpty.current = false;
        }

        if (wasEmpty.current) {
          emptyPenaltyTime.current += deltaTime;
          if (emptyPenaltyTime.current >= 3.0) {
            wasEmpty.current = false;
          }
        }
      }
      // Track deceleration for sound
    }

    if (onFuelChange) {
      onFuelChange(fuel.current);
    }

    // Update UI with total ammo across both clips
    if (onAmmoChange) {
      onAmmoChange(leftClip.current + rightClip.current);
    }
    
    // Update individual clip displays
    if (onLeftClipChange) {
      onLeftClipChange(leftClip.current);
    }
    if (onRightClipChange) {
      onRightClipChange(rightClip.current);
    }

    // No auto-recharge - reload when guns leave line of sight instead

    // Check for line-of-sight reload for left gun
    if (leftControllerObj && leftClip.current < maxClipSize.current) {
      leftControllerObj.getWorldPosition(tempVector);
      
      // Calculate if gun is in line of sight
      const cameraPosition = camera.position.clone();
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.quaternion);
      
      // Vector from camera to controller
      const controllerDirection = tempVector.clone().sub(cameraPosition).normalize();
      
      // Check if controller is within field of view (dot product > 0.3 means roughly 70° FOV)
      const dotProduct = cameraDirection.dot(controllerDirection);
      const inLineOfSight = dotProduct > 0.3;
      
      if (!inLineOfSight) {
        if (!leftReloading.current) {
          leftReloading.current = true;
          leftClip.current = maxClipSize.current; // Reload clip
          console.log(
            `🔄 LEFT gun reloaded! (out of sight) Clip: ${leftClip.current}/${maxClipSize.current}`,
          );
          
          // Play reload sound
          try {
            const audioStore = require('../lib/stores/useAudio').useAudio;
            audioStore.getState().playReload();
          } catch (error) {
            console.log('🔊 Reload sound error:', error);
          }
        }
      } else {
        leftReloading.current = false;
      }
    }

    // Check for line-of-sight reload for right gun
    if (rightControllerObj && rightClip.current < maxClipSize.current) {
      rightControllerObj.getWorldPosition(tempVector);
      
      // Calculate if gun is in line of sight
      const cameraPosition = camera.position.clone();
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.quaternion);
      
      // Vector from camera to controller
      const controllerDirection = tempVector.clone().sub(cameraPosition).normalize();
      
      // Check if controller is within field of view (dot product > 0.3 means roughly 70° FOV)
      const dotProduct = cameraDirection.dot(controllerDirection);
      const inLineOfSight = dotProduct > 0.3;
      
      if (!inLineOfSight) {
        if (!rightReloading.current) {
          rightReloading.current = true;
          rightClip.current = maxClipSize.current; // Reload clip
          console.log(
            `🔄 RIGHT gun reloaded! (out of sight) Clip: ${rightClip.current}/${maxClipSize.current}`,
          );
          
          // Play reload sound
          try {
            const audioStore = require('../lib/stores/useAudio').useAudio;
            audioStore.getState().playReload();
          } catch (error) {
            console.log('🔊 Reload sound error:', error);
          }
        }
      } else {
        rightReloading.current = false;
      }
    }

    // Allow continuous steering - no direction locking
    // Always use current hand direction for real-time steering
    lockedDirection.current = null;
    lastSwordsHeld.current = swordsHeld;

    // Movement system
    const wasAccelerating = isAccelerating.current;
    isAccelerating.current =
      swordsHeld > 0 && fuel.current > 0 && jetpackEnabled.current;

    if (isAccelerating.current) {
      // Start acceleration sound if not already playing
      if (!wasAccelerating) {
        import("../lib/stores/useAudio").then(({ useAudio }) => {
          useAudio.getState().playAcceleration();
        });
      }
      const speedMultiplier = swordsHeld;
      const fuelMultiplier = Math.max(0.3, fuel.current / maxFuel.current);
      const burstMultiplier = burstSpeedMultiplier.current;
      const desiredSpeed =
        maxSpeed.current * speedMultiplier * fuelMultiplier * burstMultiplier;

      const currentMovementDirection = handDirection; // Always use current direction for steering
      const targetDirection = currentMovementDirection
        .clone()
        .multiplyScalar(desiredSpeed);

      lastDirection.current.copy(currentMovementDirection);

      acceleration.current.lerp(targetDirection, turnRate.current);
      velocity.current.add(
        acceleration.current
          .clone()
          .multiplyScalar(deltaTime * accelerationRate.current),
      );

      if (velocity.current.length() > desiredSpeed) {
        velocity.current.normalize().multiplyScalar(desiredSpeed);
      }
    } else {
      {
        // Apply velocity decay when not accelerating
        const currentSpeed = velocity.current.length();
        const speedThreshold = 1.0;

        if (currentSpeed > speedThreshold) {
          velocity.current.multiplyScalar(Math.pow(0.98, deltaTime * 60));
        } else {
          const normalizedSpeed = currentSpeed / speedThreshold;
          const decayRate = 0.1 + 0.9 * Math.pow(normalizedSpeed, 2);
          velocity.current.multiplyScalar(Math.pow(decayRate, deltaTime * 60));
        }

        acceleration.current.multiplyScalar(Math.pow(0.85, deltaTime * 60));
      }

      // Stop acceleration sound if we were accelerating but now stopped
      if (wasAccelerating && !isAccelerating.current) {
        import("../lib/stores/useAudio").then(({ useAudio }) => {
          useAudio.getState().stopAcceleration();
        });
      }
    }

    // Right stick — yaw rotation in VR.
    // camera.rotation is owned by the headset, so we rotate worldGroup around the camera instead.
    if (Math.abs(rightStickX) > 0.1) {
      const yawDelta = -rightStickX * 0.025;
      const wg = scene.getObjectByName("worldGroup") as THREE.Group;
      if (wg) {
        // Orbit worldGroup around camera's Y axis so the world turns and the player pivots in place
        const pivot = camera.position.clone();
        wg.position.sub(pivot);
        wg.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawDelta);
        wg.position.add(pivot);
        wg.rotation.y += yawDelta;
      }
    }

    // Left stick free movement (slower speed)
    if (Math.abs(leftStickX) > 0.1 || Math.abs(leftStickY) > 0.1) {
      const worldGroup = scene.getObjectByName("worldGroup") as THREE.Group;
      if (worldGroup) {
        // Get camera direction for forward/backward movement
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Keep movement horizontal
        cameraDirection.normalize();

        // Get right direction from camera
        const rightDirection = new THREE.Vector3();
        rightDirection.crossVectors(
          cameraDirection,
          new THREE.Vector3(0, 1, 0),
        );
        rightDirection.normalize();

        // Calculate movement vector (slower speed: 0.05 vs grip movement 0.1) - inverted controls
        const stickMoveVector = new THREE.Vector3();
        stickMoveVector.add(rightDirection.multiplyScalar(-leftStickX * 0.05)); // Inverted left/right
        stickMoveVector.add(cameraDirection.multiplyScalar(leftStickY * 0.05)); // Inverted forward/back

        // No collision check - free movement
        worldGroup.position.add(stickMoveVector);
        // Resolve player against walls (VR: player local pos = camera.position - worldGroup.position)
        {
          const px = camera.position.x - worldGroup.position.x;
          const pz = camera.position.z - worldGroup.position.z;
          const resolved = resolveWallCollision(px, pz, 0.35, WALLS);
          worldGroup.position.x = camera.position.x - resolved.x;
          worldGroup.position.z = camera.position.z - resolved.z;
        }
        // Floor clamp — prevent falling through floor (y=0 in worldGroup space)
        {
          const minWorldGroupY = camera.position.y - 1.7;
          if (worldGroup.position.y > minWorldGroupY) {
            worldGroup.position.y = minWorldGroupY;
          }
        }
      }
    }

    // Apply grip-based movement to worldGroup with wall collision
    if (velocity.current.length() > 0.01) {
      const moveVector = velocity.current.clone().multiplyScalar(deltaTime);
      const worldGroup = scene.getObjectByName("worldGroup") as THREE.Group;
      if (worldGroup) {
        // No wall collision - free movement
        worldGroup.position.add(moveVector);
        // Resolve player against walls (VR: player local pos = camera.position - worldGroup.position)
        {
          const px = camera.position.x - worldGroup.position.x;
          const pz = camera.position.z - worldGroup.position.z;
          const resolved = resolveWallCollision(px, pz, 0.35, WALLS);
          worldGroup.position.x = camera.position.x - resolved.x;
          worldGroup.position.z = camera.position.z - resolved.z;
        }
        // Floor clamp — prevent falling through floor (y=0 in worldGroup space)
        {
          const minWorldGroupY = camera.position.y - 1.7;
          if (worldGroup.position.y > minWorldGroupY) {
            worldGroup.position.y = minWorldGroupY;
          }
        }
      }
    }

    // Apply gravity when jetpack is disabled
    const worldGroup = scene.getObjectByName("worldGroup") as THREE.Group;
    if (worldGroup && !jetpackEnabled.current) {
      const groundLevel = -1.8; // Ground level (player height is 1.8, so world at -1.8 means player at 0)
      const currentHeight = -worldGroup.position.y; // Convert world position to player height
      
      if (currentHeight > 0) { // If player is above ground
        const gravityStrength = 9.8; // Gravity acceleration
        const fallSpeed = gravityStrength * deltaTime;
        
        // Apply gravity by moving world group up (which moves player down)
        worldGroup.position.y += fallSpeed;
        
        // Prevent going below ground
        if (worldGroup.position.y > -groundLevel) {
          worldGroup.position.y = -groundLevel;
        }
        
        console.log(`⬇️ GRAVITY: Player falling, height: ${currentHeight.toFixed(1)}`);
      }
    }

    // Gun firing logic - always available

    /*
     * ========================================================================
     * STEP 8: FIRE GUNS FROM CORRECT PHYSICAL HANDS
     * ========================================================================
     *
     * Gun firing uses the correct controller objects based on our mapping.
     * Bullets always fire from the intended physical hand.
     */

    // LEFT PHYSICAL HAND GUN FIRING
    if (leftTrigger.current && !lastLeftTrigger.current) {
      console.log(
        `🔫 LEFT physical hand gun fired (Three.js controller ${leftIndex})`,
      );
      fireInstantBullet(leftControllerObj, "left", scene);
    }
    lastLeftTrigger.current = leftTrigger.current;

    // RIGHT PHYSICAL HAND GUN FIRING
    if (rightTrigger.current && !lastRightTrigger.current) {
      console.log(
        `🔫 RIGHT physical hand gun fired (Three.js controller ${rightIndex})`,
      );
      fireInstantBullet(rightControllerObj, "right", scene);
    }
    lastRightTrigger.current = rightTrigger.current;

    // No bullet movement needed - using instant hit system

    // Sword collision detection with pillars, turrets, and bullet slicing
    [leftSwordRef.current, rightSwordRef.current].forEach((sword) => {
      if (!sword) return;

      const swordPos = new THREE.Vector3();
      const bladeTip = new THREE.Vector3(0, 0.5, 0);
      sword.localToWorld(bladeTip);
      swordPos.copy(bladeTip);

      // Distance-based optimization for collision detection
      const playerPos = camera.position.clone();
      const COLLISION_CHECK_DISTANCE = COMBAT_CONFIG.collision.collisionCheckDistance;

      // Check collision with turret bullets (bullet slicing) - with safety check
      if (scene) {
        scene.traverse((child) => {
          if (child && child.userData && child.userData.isTurretBullet) {
            const bulletPos = new THREE.Vector3();
            child.getWorldPosition(bulletPos);

            const distance = swordPos.distanceTo(bulletPos);
            if (distance < 0.2) {
              // Slice bullet
              if (child.parent) {
                child.parent.remove(child);
              } else {
                scene.remove(child);
              }
              console.log("⚔️ Bullet sliced with sword!");

              // Play sword hit sound for bullet slice
              try {
                const audioStore = require('../lib/stores/useAudio').useAudio;
                audioStore.getState().playSwordHit();
              } catch (error) {
                console.log('🔊 Sword hit sound error:', error);
              }

              // Create slash effect
              addHitEffect([bulletPos.x, bulletPos.y, bulletPos.z]);
            }
          }
        });
      }

      // Find red pillars to hit
      const worldGroup = scene.getObjectByName("worldGroup") as THREE.Group;
      if (worldGroup) {
        worldGroup.traverse((child) => {
          if (!child || !child.userData) return;

          // Hit pillars
          if (child.userData.isPillar && !child.userData.destroyed) {
            const pillarPos = new THREE.Vector3();
            child.getWorldPosition(pillarPos);

            // Skip distant objects for performance
            if (playerPos.distanceTo(pillarPos) > COLLISION_CHECK_DISTANCE) return;

            const distance = swordPos.distanceTo(pillarPos);
            if (distance < COMBAT_CONFIG.collision.pillarHitDistance) {
              // Hit distance
              explodePillar(child.uuid);
              child.userData.destroyed = true;

              // Play sword hit sound for pillar collision
              import("../lib/stores/useAudio").then(({ useAudio }) => {
                useAudio.getState().playSwordHit();
              });

              // Create explosion effect
              addHitEffect([pillarPos.x, pillarPos.y, pillarPos.z]);

              // Remove pillar with explosion animation
              const explosionScale = { x: 1, y: 1, z: 1 };
              const animate = () => {
                explosionScale.x += 0.1;
                explosionScale.y += 0.1;
                explosionScale.z += 0.1;
                child.scale.set(
                  explosionScale.x,
                  explosionScale.y,
                  explosionScale.z,
                );
                child.rotation.x += 0.2;
                child.rotation.z += 0.2;

                if (explosionScale.x < 2) {
                  requestAnimationFrame(animate);
                } else {
                  if (child.parent) {
                    child.parent.remove(child);
                  }
                }
              };
              animate();
            }
          }

          // Hit turrets with sword
          if (child.userData.isTurret && child.userData.health > 0) {
            const turretPos = new THREE.Vector3();
            child.getWorldPosition(turretPos);

            // Skip distant objects for performance
            if (playerPos.distanceTo(turretPos) > COLLISION_CHECK_DISTANCE) return;

            const distance = swordPos.distanceTo(turretPos);
            if (distance < COMBAT_CONFIG.collision.turretHitDistance) {
              // Hit distance for turrets (larger than pillars)
              // Damage turret
              child.userData.health -= PLAYER_CONFIG.weapons.swordDamageVR;
              console.log(
                `⚔️ Turret slashed! Health: ${child.userData.health}/100`,
              );

              // Play sword hit sound
              try {
                const audioStore = require('../lib/stores/useAudio').useAudio;
                audioStore.getState().playSwordHit();
              } catch (error) {
                console.log('🔊 Sword hit sound error:', error);
              }

              // Create hit effect
              addHitEffect([turretPos.x, turretPos.y, turretPos.z]);

              // If turret is destroyed, mark it
              if (child.userData.health <= 0) {
                child.userData.health = 0;
                // Turret destruction is handled in GameObjects.tsx
              }
            }
          }

          // Hit enemies with sword
          if (child.userData.isEnemy && !child.userData.isDead) {
            const enemyPos = new THREE.Vector3();
            child.getWorldPosition(enemyPos);

            // Skip distant objects for performance
            if (playerPos.distanceTo(enemyPos) > COLLISION_CHECK_DISTANCE) return;

            const distance = swordPos.distanceTo(enemyPos);
            if (distance < COMBAT_CONFIG.collision.enemyHitDistance) {
              // Hit distance for enemies
              const swordDamage = PLAYER_CONFIG.weapons.swordDamageVR;
              if (child.userData.takeDamage) {
                child.userData.takeDamage(swordDamage);
              }
              console.log(
                `⚔️ ${child.userData.enemyType} slashed! ${swordDamage} damage`,
              );

              // Play sword hit sound
              import("../lib/stores/useAudio").then(({ useAudio }) => {
                useAudio.getState().playSwordHit();
              });

              // Create hit effect
              addHitEffect([enemyPos.x, enemyPos.y + 1, enemyPos.z]);
            }
          }

          // Hit Play Again box in death room
          if (child.userData.isPlayAgainBox) {
            const boxPos = new THREE.Vector3();
            child.getWorldPosition(boxPos);

            const distance = swordPos.distanceTo(boxPos);
            if (distance < COMBAT_CONFIG.collision.playAgainBoxDistance) {
              // Hit distance for the Play Again box
              console.log("⚔️ Slashed Play Again box - respawning!");

              // Play sword hit sound
              try {
                const audioStore = require('../lib/stores/useAudio').useAudio;
                audioStore.getState().playSwordHit();
              } catch (error) {
                console.log('🔊 Sword hit sound error:', error);
              }

              // Exit death room and respawn
              import("../lib/stores/useVRGame").then(({ useVRGame }) => {
                useVRGame.getState().exitDeathRoom();
              });
            }
          }
        });
      }
    });
  });

  return null; // Controllers are hidden, hands show swords/guns instead
}
