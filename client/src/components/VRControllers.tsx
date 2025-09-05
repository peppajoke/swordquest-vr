import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface VRControllersProps {
  onFuelChange?: (fuel: number) => void;
  onAmmoChange?: (ammo: number) => void;
  onJetpackChange?: (enabled: boolean) => void;
}

export default function VRControllers({ onFuelChange, onAmmoChange, onJetpackChange }: VRControllersProps) {
  const { 
    addHitEffect, 
    explodePillar 
  } = useVRGame();

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
  const rightSwordRotation = useRef(0);
  const leftSwordRotation = useRef(0);
  const rightSwordMode = useRef<'side' | 'standard'>('side'); // Track sword mode for right hand
  
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
  const maxSpeed = useRef(3.2); // Reduced by 60% (8.0 * 0.4)
  const accelerationRate = useRef(12.0);
  const turnRate = useRef(0.3);
  
  // Gun system
  const bullets = useRef<Array<{
    id: string;
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    startTime: number;
  }>>([]);
  const ammo = useRef(30); // Start with 30 bullets
  const maxAmmo = useRef(100);

  // Fuel system
  const fuel = useRef(100.0);
  const maxFuel = useRef(100.0);
  const fuelDrainRate = useRef(3.0); // Much slower drain
  const fuelRechargeRate = useRef(8.0);
  const fuelPenaltyRecovery = useRef(15.0);
  const wasEmpty = useRef(false);
  const emptyPenaltyTime = useRef(0);
  const wasAccelerating = useRef(false);

  // Burst speed system
  const burstSpeedMultiplier = useRef(1.0);
  const burstSpeedDecay = useRef(0);
  const lastStoppedAccelerating = useRef(0);
  const wasAcceleratingPreviously = useRef(false);

  // Momentum system
  const momentumTransferBonus = useRef(0);

  function createInstantHit(startPosition: THREE.Vector3, direction: THREE.Vector3, scene: THREE.Scene) {
    // Create instant visual beam effect
    const beamGroup = new THREE.Group();
    
    // Create a line geometry for the laser beam
    const maxDistance = 100;
    const endPosition = startPosition.clone().add(direction.normalize().multiplyScalar(maxDistance));
    
    // Raycast to find actual hit point
    const raycaster = new THREE.Raycaster(startPosition, direction.normalize(), 0, maxDistance);
    const intersects: THREE.Intersection[] = [];
    
    // Check hits on world objects
    const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
    if (worldGroup) {
      worldGroup.traverse((child) => {
        if ((child.userData.isPillar && !child.userData.destroyed) || 
            (child.userData.isTurret && child.userData.health > 0)) {
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
    const beamGeometry = new THREE.CylinderGeometry(0.005, 0.005, beamLength, 8);
    const beamMaterial = new THREE.MeshLambertMaterial({
      color: '#00ff00',
      emissive: '#88ff00',
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.8
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    
    // Position beam correctly
    const beamCenter = startPosition.clone().add(direction.clone().multiplyScalar(beamLength / 2));
    beam.position.copy(beamCenter);
    
    // Align beam with direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    beam.quaternion.copy(quaternion);
    
    beamGroup.add(beam);
    scene.add(beamGroup);
    
    // Process hit if we hit something
    if (hitTarget) {
      if (hitTarget.userData.isPillar && !hitTarget.userData.destroyed) {
        // Hit pillar - destroy it
        const pillarPos = new THREE.Vector3();
        hitTarget.getWorldPosition(pillarPos);
        
        import('../lib/stores/useVRGame').then(({ useVRGame }) => {
          useVRGame.getState().explodePillar(hitTarget.uuid);
        });
        hitTarget.userData.destroyed = true;
        
        // Create explosion effect
        import('../lib/stores/useVRGame').then(({ useVRGame }) => {
          useVRGame.getState().addHitEffect([pillarPos.x, pillarPos.y, pillarPos.z]);
        });
        
        // Remove pillar with explosion animation
        const explosionScale = { x: 1, y: 1, z: 1 };
        const animate = () => {
          explosionScale.x += 0.1;
          explosionScale.y += 0.1;
          explosionScale.z += 0.1;
          hitTarget.scale.set(explosionScale.x, explosionScale.y, explosionScale.z);
          hitTarget.rotation.x += 0.2;
          hitTarget.rotation.z += 0.2;
          
          if (explosionScale.x < 2) {
            requestAnimationFrame(animate);
          } else {
            hitTarget.parent?.remove(hitTarget);
          }
        };
        animate();
      } else if (hitTarget.userData.isTurret && hitTarget.userData.health > 0) {
        // Hit turret - damage it
        hitTarget.userData.health -= 25;
        console.log(`🎯 Turret hit! Health: ${hitTarget.userData.health}/100`);
        
        // Play gun hit sound
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playGunHit();
        });
        
        // Create hit effect
        const turretPos = new THREE.Vector3();
        hitTarget.getWorldPosition(turretPos);
        import('../lib/stores/useVRGame').then(({ useVRGame }) => {
          useVRGame.getState().addHitEffect([turretPos.x, turretPos.y + 1, turretPos.z]);
        });
      }
    }
    
    // Remove beam after short duration
    setTimeout(() => {
      scene.remove(beamGroup);
    }, 100); // Brief flash
    
    return true;
  }
  
  function fireInstantBullet(controller: THREE.XRTargetRaySpace, hand: 'left' | 'right', scene: THREE.Scene) {
    if (!controller || ammo.current <= 0) return; // Check ammo
    
    const controllerPos = new THREE.Vector3();
    const controllerDir = new THREE.Vector3();
    
    controller.getWorldPosition(controllerPos);
    controller.getWorldDirection(controllerDir);
    
    // Invert the direction - VR controllers point backwards by default
    controllerDir.negate();
    
    // Adjust shooting direction 45 degrees down to compensate for gun being rotated up
    const downwardAdjustment = new THREE.Vector3(0, -Math.sin(Math.PI / 4), Math.cos(Math.PI / 4));
    controllerDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 4); // Rotate 45 degrees down around X-axis
    
    // Adjust gun position to barrel tip
    controllerPos.add(controllerDir.clone().multiplyScalar(0.25));
    
    // Fire instant hit
    createInstantHit(controllerPos, controllerDir, scene);
    
    // Play gun shoot sound
    import('../lib/stores/useAudio').then(({ useAudio }) => {
      useAudio.getState().playGunShoot();
    });
    
    // Consume ammo
    ammo.current--;
    console.log(`⚡ ${hand} gun fired instantly! Ammo: ${ammo.current}/${maxAmmo.current}`);
  }
  
  function createSword() {
    const sword = new THREE.Group();
    sword.userData.isCustomModel = true; // Mark as custom model
    sword.userData.isSword = true; // Mark as sword for collision detection
    
    // Handle (much shorter - 80% reduction)
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.05);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: '#4a4a4a' });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.userData.isCustomModel = true; // Mark as custom
    handle.position.y = -0.08;
    sword.add(handle);
    
    // Guard (bigger)
    const guardGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.035);
    const guardMaterial = new THREE.MeshLambertMaterial({ color: '#666' });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.userData.isCustomModel = true; // Mark as custom
    guard.position.y = 0.04;
    sword.add(guard);
    
    // Blade (much bigger)
    const bladeGeometry = new THREE.BoxGeometry(0.018, 0.5, 0.008);
    const bladeMaterial = new THREE.MeshLambertMaterial({ color: '#c0c0c0' });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.userData.isCustomModel = true; // Mark as custom
    blade.position.y = 0.32;
    sword.add(blade);
    
    // Rotate sword to point forward properly
    sword.rotation.z = Math.PI / 2; // 90 degrees to point forward
    
    return sword;
  }
  
  function createGun() {
    const gun = new THREE.Group();
    gun.userData.isCustomModel = true; // Mark as custom model
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.02, 0.08, 0.03);
    const gripMaterial = new THREE.MeshLambertMaterial({ color: '#2a2a2a' });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.userData.isCustomModel = true; // Mark as custom
    grip.position.y = -0.04;
    gun.add(grip);
    
    // Barrel (shorter, thicker, rotated and positioned closer to player)
    const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.125); // Made thicker: 0.008 -> 0.015
    const barrelMaterial = new THREE.MeshLambertMaterial({ color: '#1a1a1a' });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.userData.isCustomModel = true; // Mark as custom
    barrel.rotation.x = Math.PI / 2; // Rotate 90 degrees to point forward
    barrel.position.y = 0.02;
    barrel.position.z = -0.05; // Move further back toward player
    gun.add(barrel);
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.025, 0.04, 0.08);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: '#333' });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.userData.isCustomModel = true; // Mark as custom
    body.position.y = 0.02;
    gun.add(body);
    
    // Rotate gun to point forward properly
    gun.rotation.x = -Math.PI / 2; // Simple 90 degrees up to point forward
    
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
    
    // Set up event listeners to detect handedness (only once)
    if (!controllersSetup.current) {
      controllersSetup.current = true;
      
      // Listen for controller 0 connection to determine its handedness
      controller0Ref.current.addEventListener('connected', (event) => {
        const handedness = event.data.handedness;
        if (handedness === 'left' || handedness === 'right') {
          handToIndexMap.current[handedness] = 0;
          console.log(`🎮 HANDEDNESS DETECTED: Controller 0 = ${handedness} hand`);
        }
      });
      
      // Listen for controller 1 connection to determine its handedness
      controller1Ref.current.addEventListener('connected', (event) => {
        const handedness = event.data.handedness;
        if (handedness === 'left' || handedness === 'right') {
          handToIndexMap.current[handedness] = 1;
          console.log(`🎮 HANDEDNESS DETECTED: Controller 1 = ${handedness} hand`);
        }
      });
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
    const leftIndex = handToIndexMap.current.left;   // Could be 0 or 1
    const rightIndex = handToIndexMap.current.right; // Could be 0 or 1
    
    if (leftIndex === undefined || rightIndex === undefined) {
      // Still waiting for handedness detection - do nothing until complete
      return;
    }
    
    if (!vrInitialized.current) {
      vrInitialized.current = true;
      console.log('✅ HANDEDNESS MAPPING COMPLETE!');
      console.log(`🤚 Left physical hand = Three.js Controller ${leftIndex}`);
      console.log(`🤚 Right physical hand = Three.js Controller ${rightIndex}`);
      console.log('📋 All subsequent interactions use this mapping');
    }
    
    // Hide default controller models immediately once controllers are ready
    if (controllerGrip0Ref.current && controllerGrip1Ref.current) {
      controllerGrip0Ref.current.traverse((child) => {
        if (child.type === 'Mesh' && !child.userData.isCustomModel) {
          child.visible = false;
        }
      });
      controllerGrip1Ref.current.traverse((child) => {
        if (child.type === 'Mesh' && !child.userData.isCustomModel) {
          child.visible = false;
        }
      });
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
    const leftInputSource = inputSources.find(source => source.handedness === 'left');
    const rightInputSource = inputSources.find(source => source.handedness === 'right');
    const leftGamepad = leftInputSource?.gamepad;   // Left physical hand gamepad
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
      leftGrabbing.current = leftGamepad.buttons[1].pressed;  // Left grip = spawn left sword
      leftTrigger.current = leftGamepad.buttons[0].pressed;   // Left trigger = fire left gun
      
      // X button on LEFT physical hand rotates LEFT sword
      const xButtonPressed = leftGamepad.buttons[3]?.pressed || false;
      if (xButtonPressed && !lastXButtonPressed.current && leftSwordRef.current) {
        leftSwordRotation.current += Math.PI / 2;
        leftSwordRef.current.rotation.z = leftSwordRotation.current;
        console.log('🔄 LEFT physical hand sword rotated 90 degrees');
      }
      lastXButtonPressed.current = xButtonPressed;
    }
    
    // RIGHT PHYSICAL HAND INPUT PROCESSING  
    if (rightGamepad.buttons.length > 1) {
      rightGrabbing.current = rightGamepad.buttons[1].pressed; // Right grip = spawn right sword
      rightTrigger.current = rightGamepad.buttons[0].pressed;  // Right trigger = fire right gun
      
      // A button on RIGHT physical hand toggles between side/standard modes (button index 4 on right controller)
      const aButtonPressed = rightGamepad.buttons[4]?.pressed || false;
      if (aButtonPressed && !lastAButtonPressed.current && rightSwordRef.current) {
        // Toggle between side and standard modes
        if (rightSwordMode.current === 'side') {
          rightSwordMode.current = 'standard';
          // Standard mode: DRAMATICALLY DIFFERENT - point straight down
          rightSwordRef.current.rotation.y = 0; // Reset Y rotation
          rightSwordRef.current.rotation.z = Math.PI; // Point straight down
          console.log('🔄 RIGHT hand sword: STANDARD mode (POINTING STRAIGHT DOWN)');
        } else {
          rightSwordMode.current = 'side';
          // Side mode: flipped 180 degrees horizontally
          rightSwordRef.current.rotation.y = 0; // Reset Y rotation  
          rightSwordRef.current.rotation.z = Math.PI / 2 + Math.PI; // Flipped 180 degrees
          console.log('🔄 RIGHT hand sword: SIDE mode (flipped 180 degrees)');
        }
      }
      lastAButtonPressed.current = aButtonPressed;
      
      // B button on RIGHT physical hand toggles jetpack (button index 5 on right controller)
      const bButtonPressed = rightGamepad.buttons[5]?.pressed || false;
      if (bButtonPressed && !lastBButtonPressed.current) {
        jetpackEnabled.current = !jetpackEnabled.current;
        console.log(jetpackEnabled.current ? '🚀 Jetpack ENABLED' : '🚫 Jetpack DISABLED');
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
    const leftControllerObj = leftIndex === 0 ? controllerGrip0Ref.current : controllerGrip1Ref.current;   // Left physical hand 3D object
    const rightControllerObj = rightIndex === 0 ? controllerGrip0Ref.current : controllerGrip1Ref.current; // Right physical hand 3D object
    
    if (!leftControllerObj || !rightControllerObj) return;

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
      const gun = createGun();
      leftGunRef.current = gun;
      leftControllerObj.add(gun); // Attach to LEFT physical hand (whatever index it is)
    }
    
    // LEFT physical hand grip spawns LEFT sword
    if (leftGrabbing.current) {
      if (!leftSwordRef.current) {
        console.log(`⚔️ LEFT physical hand sword spawned (on Three.js controller ${leftIndex})`);
        const sword = createSword();
        sword.scale.x = -1; // Mirror for left hand dual-wielding
        sword.rotation.z = leftSwordRotation.current;
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
      const gun = createGun();
      rightGunRef.current = gun;
      rightControllerObj.add(gun); // Attach to RIGHT physical hand (whatever index it is)
    }
    
    // RIGHT physical hand grip spawns RIGHT sword
    if (rightGrabbing.current) {
      if (!rightSwordRef.current) {
        console.log(`⚔️ RIGHT physical hand sword spawned (on Three.js controller ${rightIndex})`);
        const sword = createSword();
        // Set initial rotation based on current mode (default is side mode)
        if (rightSwordMode.current === 'side') {
          sword.rotation.y = 0;
          sword.rotation.z = Math.PI / 2 + Math.PI; // Side mode: flipped 180 degrees
        } else {
          sword.rotation.y = 0;
          sword.rotation.z = Math.PI; // Standard mode: pointing straight down
        }
        rightSwordRef.current = sword;
        rightControllerObj.add(sword); // Attach to RIGHT physical hand
      }
    } else {
      if (rightSwordRef.current) {
        rightControllerObj.remove(rightSwordRef.current);
        rightSwordRef.current = undefined;
        // Reset mode when sword is removed
        rightSwordMode.current = 'side';
      }
    }

    // Movement and timing system
    const swordsHeld = (leftSwordRef.current ? 1 : 0) + (rightSwordRef.current ? 1 : 0);
    const deltaTime = 1 / 60;
    const currentTime = Date.now();

    // Get the direction from controller hands instead of camera
    let handDirection = new THREE.Vector3();
    let validDirections = 0;
    
    /*
     * ========================================================================
     * SWORD DIRECTION CALCULATION FOR JETPACK SYSTEM
     * ========================================================================
     * 
     * For jetpack/acceleration, we need the direction the player is "pointing" with swords.
     * We average the directions from both hands if both swords are active.
     */
    
    // Get direction from LEFT hand if left sword is active
    if (leftControllerObj && leftSwordRef.current) {
      const leftDirection = new THREE.Vector3();
      leftControllerObj.getWorldDirection(leftDirection);
      leftDirection.y = 0; // Remove vertical component for ground-based movement
      leftDirection.normalize();
      handDirection.add(leftDirection);
      validDirections++;
    }
    
    // Get direction from RIGHT hand if right sword is active  
    if (rightControllerObj && rightSwordRef.current) {
      const rightDirection = new THREE.Vector3();
      rightControllerObj.getWorldDirection(rightDirection);
      rightDirection.y = 0; // Remove vertical component for ground-based movement
      rightDirection.normalize();
      handDirection.add(rightDirection);
      validDirections++;
    }
    
    // Average the directions and fallback to camera if no swords
    if (validDirections > 0) {
      handDirection.divideScalar(validDirections);
      handDirection.normalize();
    } else {
      // Fallback to camera direction if no swords are held
      camera.getWorldDirection(handDirection);
      handDirection.y = 0;
      handDirection.normalize();
    }
    
    // Burst speed timing system (only if jetpack is enabled)
    const currentlyAccelerating = swordsHeld > 0 && fuel.current > 0 && jetpackEnabled.current;
    
    if (currentlyAccelerating && !wasAcceleratingPreviously.current) {
      const stopDuration = currentTime - lastStoppedAccelerating.current;
      if (lastStoppedAccelerating.current > 0 && stopDuration >= 400 && stopDuration <= 600) {
        const perfectTiming = 500;
        const timingError = Math.abs(stopDuration - perfectTiming);
        const maxError = 100;
        const timingAccuracy = 1.0 - (timingError / maxError);
        
        const minBoost = 1.5;  // Much lower minimum boost
        const maxBoost = 3.0;  // Much lower maximum boost
        const boostStrength = minBoost + (maxBoost - minBoost) * timingAccuracy;
        
        console.log(`🚀 PERFECT TIMING! ${stopDuration}ms pause = ${boostStrength.toFixed(1)}x BOOST!`);
        burstSpeedMultiplier.current = boostStrength;
        burstSpeedDecay.current = currentTime + 3000;
        
        // Play boost sound
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playBoost();
        });
        
        const currentSpeed = velocity.current.length();
        if (currentSpeed > 0) {
          const newDirection = lockedDirection.current || handDirection;
          velocity.current.copy(newDirection.clone().normalize().multiplyScalar(currentSpeed));
        }
      }
    } else if (!currentlyAccelerating && wasAcceleratingPreviously.current) {
      lastStoppedAccelerating.current = currentTime;
    }
    
    wasAcceleratingPreviously.current = currentlyAccelerating;

    // Update burst speed decay
    if (burstSpeedDecay.current > 0 && currentTime > burstSpeedDecay.current) {
      burstSpeedMultiplier.current = 1.0;
      burstSpeedDecay.current = 0;
    } else if (burstSpeedDecay.current > 0) {
      const timeRemaining = burstSpeedDecay.current - currentTime;
      const decayProgress = timeRemaining / 3000;
      const originalBoost = burstSpeedMultiplier.current;
      const decayCurve = Math.sqrt(decayProgress);
      burstSpeedMultiplier.current = 1.0 + (originalBoost - 1.0) * decayCurve;
    }
    
    // Update fuel system (only if jetpack enabled)
    if (swordsHeld > 0 && fuel.current > 0 && jetpackEnabled.current) {
      fuel.current -= fuelDrainRate.current * deltaTime;
      if (fuel.current <= 0) {
        fuel.current = 0;
        wasEmpty.current = true;
        emptyPenaltyTime.current = 0;
      }
      // Track acceleration for sound
    } else {
      if (swordsHeld === 0) {
        const rechargeRate = wasEmpty.current && emptyPenaltyTime.current < 3.0 
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
    
    if (onAmmoChange) {
      onAmmoChange(ammo.current);
    }
    
    // Auto-recharge ammo slowly
    if (ammo.current < maxAmmo.current) {
      ammo.current += 3 * deltaTime; // Recharge 3 ammo per second
      if (ammo.current > maxAmmo.current) {
        ammo.current = maxAmmo.current;
      }
    }

    // Handle direction locking
    if (swordsHeld > lastSwordsHeld.current) {
      lockedDirection.current = handDirection.clone().normalize();
    } else if (swordsHeld < lastSwordsHeld.current) {
      lockedDirection.current = null;
    }
    lastSwordsHeld.current = swordsHeld;

    // Movement system
    const wasAccelerating = isAccelerating.current;
    isAccelerating.current = swordsHeld > 0 && fuel.current > 0 && jetpackEnabled.current;
    
    if (isAccelerating.current) {
      // Start acceleration sound if not already playing
      if (!wasAccelerating) {
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playAcceleration();
        });
      }
      const speedMultiplier = swordsHeld;
      const fuelMultiplier = Math.max(0.3, fuel.current / maxFuel.current);
      const burstMultiplier = burstSpeedMultiplier.current;
      const desiredSpeed = maxSpeed.current * speedMultiplier * fuelMultiplier * burstMultiplier;
      
      const currentMovementDirection = lockedDirection.current || handDirection;
      const targetDirection = currentMovementDirection.clone().multiplyScalar(desiredSpeed);
      
      lastDirection.current.copy(currentMovementDirection);
      
      acceleration.current.lerp(targetDirection, turnRate.current);
      velocity.current.add(acceleration.current.clone().multiplyScalar(deltaTime * accelerationRate.current));
      
      if (velocity.current.length() > desiredSpeed) {
        velocity.current.normalize().multiplyScalar(desiredSpeed);
      }
    } else {
      // Check if we're in boost timing window
      const inBoostTimingWindow = lastStoppedAccelerating.current > 0 && 
                                 (currentTime - lastStoppedAccelerating.current) <= 600;
      
      if (inBoostTimingWindow) {
        // Maintain velocity during timing window
      } else {
        // Apply decay
        const currentSpeed = velocity.current.length();
        const speedThreshold = 1.0;
        
        if (currentSpeed > speedThreshold) {
          const highSpeedDecay = 0.98;
          velocity.current.multiplyScalar(Math.pow(highSpeedDecay, deltaTime * 60));
        } else {
          const normalizedSpeed = currentSpeed / speedThreshold;
          const exponentialFactor = Math.pow(normalizedSpeed, 2);
          const decayRate = 0.1 + (0.9 * exponentialFactor);
          velocity.current.multiplyScalar(Math.pow(decayRate, deltaTime * 60));
        }
        
        acceleration.current.multiplyScalar(Math.pow(0.85, deltaTime * 60));
      
      }
      
      // Stop acceleration sound if we were accelerating but now stopped
      if (wasAccelerating && !isAccelerating.current) {
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().stopAcceleration();
        });
      }
    }

    // Right stick camera rotation
    if (Math.abs(rightStickX) > 0.1 || Math.abs(rightStickY) > 0.1) {
      // Apply smooth camera rotation based on right stick input
      const rotationSpeed = 0.02;
      
      // Horizontal rotation (yaw)
      camera.rotation.y -= rightStickX * rotationSpeed;
      
      // Vertical rotation (pitch) with limits to prevent flipping
      camera.rotation.x -= rightStickY * rotationSpeed;
      camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camera.rotation.x)); // Limit to ±60 degrees
    }

    // Left stick free movement (slower speed)
    if (Math.abs(leftStickX) > 0.1 || Math.abs(leftStickY) > 0.1) {
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        // Get camera direction for forward/backward movement
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Keep movement horizontal
        cameraDirection.normalize();
        
        // Get right direction from camera
        const rightDirection = new THREE.Vector3();
        rightDirection.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
        rightDirection.normalize();
        
        // Calculate movement vector (slower speed: 0.05 vs grip movement 0.1) - inverted controls
        const stickMoveVector = new THREE.Vector3();
        stickMoveVector.add(rightDirection.multiplyScalar(-leftStickX * 0.05)); // Inverted left/right
        stickMoveVector.add(cameraDirection.multiplyScalar(leftStickY * 0.05)); // Inverted forward/back
        
        // Check collision
        const newPosition = worldGroup.position.clone().add(stickMoveVector);
        if (!(newPosition.x < -19 || newPosition.x > 19 || newPosition.z < -9 || newPosition.z > 19)) {
          worldGroup.position.add(stickMoveVector);
        }
      }
    }

    // Apply grip-based movement to worldGroup with wall collision
    if (velocity.current.length() > 0.01) {
      const moveVector = velocity.current.clone().multiplyScalar(deltaTime);
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        // Check for wall collisions before moving
        const newPosition = worldGroup.position.clone().add(moveVector);
        let canMove = true;
        
        // Room boundaries (40x20 room with world group starting at [0, 0, 10])
        // Player should stay within: x: -19 to +19, z: -9 to +19 (adjusted for spawn position)
        if (newPosition.x < -19 || newPosition.x > 19 || newPosition.z < -9 || newPosition.z > 19) {
          console.log(`🚫 Movement blocked! Position: ${newPosition.x.toFixed(2)}, ${newPosition.z.toFixed(2)} - Boundaries: x(-19 to 19), z(-9 to 19)`);
          canMove = false;
        } else {
          console.log(`✅ Movement allowed! Position: ${newPosition.x.toFixed(2)}, ${newPosition.z.toFixed(2)}`);
        }
        
        if (canMove) {
          worldGroup.position.add(moveVector);
        }
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
      console.log(`🔫 LEFT physical hand gun fired (Three.js controller ${leftIndex})`);
      fireInstantBullet(leftControllerObj, 'left', scene);
    }
    lastLeftTrigger.current = leftTrigger.current;
    
    // RIGHT PHYSICAL HAND GUN FIRING
    if (rightTrigger.current && !lastRightTrigger.current) {
      console.log(`🔫 RIGHT physical hand gun fired (Three.js controller ${rightIndex})`);
      fireInstantBullet(rightControllerObj, 'right', scene);
    }
    lastRightTrigger.current = rightTrigger.current;
    
    // No bullet movement needed - using instant hit system
    
    // Sword collision detection with pillars, turrets, and bullet slicing
    [leftSwordRef.current, rightSwordRef.current].forEach(sword => {
      if (!sword) return;
      
      const swordPos = new THREE.Vector3();
      const bladeTip = new THREE.Vector3(0, 0.5, 0);
      sword.localToWorld(bladeTip);
      swordPos.copy(bladeTip);
      
      // Check collision with turret bullets (bullet slicing) - with safety check
      if (scene) {
        scene.traverse((child) => {
          if (child && child.userData && child.userData.isTurretBullet) {
            const bulletPos = new THREE.Vector3();
            child.getWorldPosition(bulletPos);
            
            const distance = swordPos.distanceTo(bulletPos);
            if (distance < 0.2) { // Slice bullet
              if (child.parent) {
                child.parent.remove(child);
              } else {
                scene.remove(child);
              }
              console.log('⚔️ Bullet sliced with sword!');
              
              // Play sword hit sound for bullet slice
              import('../lib/stores/useAudio').then(({ useAudio }) => {
                useAudio.getState().playSwordHit();
              });
              
              // Create slash effect
              addHitEffect([bulletPos.x, bulletPos.y, bulletPos.z]);
            }
          }
        });
      }
      
      // Find red pillars to hit
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        worldGroup.traverse((child) => {
          if (!child || !child.userData) return;
          
          // Hit pillars
          if (child.userData.isPillar && !child.userData.destroyed) {
            const pillarPos = new THREE.Vector3();
            child.getWorldPosition(pillarPos);
            
            const distance = swordPos.distanceTo(pillarPos);
            if (distance < 1.0) { // Hit distance
              explodePillar(child.uuid);
              child.userData.destroyed = true;
              
              // Create explosion effect
              addHitEffect([pillarPos.x, pillarPos.y, pillarPos.z]);
              
              // Remove pillar with explosion animation
              const explosionScale = { x: 1, y: 1, z: 1 };
              const animate = () => {
                explosionScale.x += 0.1;
                explosionScale.y += 0.1;
                explosionScale.z += 0.1;
                child.scale.set(explosionScale.x, explosionScale.y, explosionScale.z);
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
            
            const distance = swordPos.distanceTo(turretPos);
            if (distance < 1.5) { // Hit distance for turrets (larger than pillars)
              // Damage turret
              child.userData.health -= 35; // More damage with sword
              console.log(`⚔️ Turret slashed! Health: ${child.userData.health}/100`);
              
              // Play sword hit sound
              import('../lib/stores/useAudio').then(({ useAudio }) => {
                useAudio.getState().playSwordHit();
              });
              
              // Create hit effect
              addHitEffect([turretPos.x, turretPos.y, turretPos.z]);
              
              // If turret is destroyed, mark it
              if (child.userData.health <= 0) {
                child.userData.health = 0;
                // Turret destruction is handled in GameObjects.tsx
              }
            }
          }
          
          // Hit Play Again box in death room
          if (child.userData.isPlayAgainBox) {
            const boxPos = new THREE.Vector3();
            child.getWorldPosition(boxPos);
            
            const distance = swordPos.distanceTo(boxPos);
            if (distance < 2.0) { // Hit distance for the Play Again box
              console.log('⚔️ Slashed Play Again box - respawning!');
              
              // Play sword hit sound
              import('../lib/stores/useAudio').then(({ useAudio }) => {
                useAudio.getState().playSwordHit();
              });
              
              // Exit death room and respawn
              import('../lib/stores/useVRGame').then(({ useVRGame }) => {
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