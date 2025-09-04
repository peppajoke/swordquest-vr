import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

const SWORD_GEOMETRY = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
const SWORD_HANDLE_GEOMETRY = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8);
const SWORD_MATERIAL = new THREE.MeshLambertMaterial({ color: '#c0392b' });
const HANDLE_MATERIAL = new THREE.MeshLambertMaterial({ color: '#8b4513' });

export default function VRControllers() {
  const { gl, scene, camera } = useThree();
  const leftSwordRef = useRef<THREE.Group>();
  const rightSwordRef = useRef<THREE.Group>();
  const leftGrabbing = useRef(false);
  const rightGrabbing = useRef(false);
  const controller0Ref = useRef<THREE.Group>();
  const controller1Ref = useRef<THREE.Group>();
  const { addSwordCollider, removeSwordCollider, targets, destroyTarget, addHitEffect, handleSwordClash, canSwordClash, updateMovement, spawnNewTargets, cleanupOldTargets, gameSpeed } = useVRGame();
  const previousPositions = useRef<{ [key: string]: THREE.Vector3 }>({});
  const bullets = useRef<{ id: string, mesh: THREE.Mesh, velocity: THREE.Vector3, controllerId: string }[]>([]);
  const lastBulletTime = useRef<{ [key: string]: number }>({});
  const leftTriggerPressed = useRef(false);
  const rightTriggerPressed = useRef(false);
  
  // Sword animation tracking
  const leftSwordScale = useRef(0.5); // Start smaller
  const rightSwordScale = useRef(0.5);
  const targetLeftScale = useRef(0.5);
  const targetRightScale = useRef(0.5);

  // Create bullet mesh
  const createBullet = () => {
    const bulletGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#ffff00' });
    return new THREE.Mesh(bulletGeometry, bulletMaterial);
  };

  // Fire bullet function
  const fireBullet = (controller: THREE.Group, controllerId: string) => {
    const now = Date.now();
    const lastTime = lastBulletTime.current[controllerId] || 0;
    
    // Rate limiting: 100ms between bullets (10 bullets per second max)
    if (now - lastTime < 100) return;
    
    lastBulletTime.current[controllerId] = now;
    
    const bullet = createBullet();
    const bulletId = `bullet_${controllerId}_${now}`;
    
    // Get controller position and direction
    const controllerPos = new THREE.Vector3();
    const controllerDirection = new THREE.Vector3(0, 0, -1);
    
    controller.getWorldPosition(controllerPos);
    controller.getWorldDirection(controllerDirection);
    
    // Position bullet at controller location
    bullet.position.copy(controllerPos);
    
    // Calculate bullet velocity (forward from controller)
    const bulletVelocity = controllerDirection.multiplyScalar(10); // Speed: 10 units per frame
    
    // Add to scene
    scene.add(bullet);
    
    // Store bullet data
    bullets.current.push({
      id: bulletId,
      mesh: bullet,
      velocity: bulletVelocity,
      controllerId
    });
    
    console.log(`VRControllers: Bullet fired from ${controllerId}`);
  };

  // Create sword mesh
  const createSword = () => {
    const swordGroup = new THREE.Group();
    
    // Blade
    const blade = new THREE.Mesh(SWORD_GEOMETRY, SWORD_MATERIAL);
    blade.position.y = 0.4;
    blade.castShadow = true;
    swordGroup.add(blade);
    
    // Handle
    const handle = new THREE.Mesh(SWORD_HANDLE_GEOMETRY, HANDLE_MATERIAL);
    handle.position.y = -0.1;
    handle.castShadow = true;
    swordGroup.add(handle);
    
    // Guard
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.02, 0.05),
      new THREE.MeshLambertMaterial({ color: '#34495e' })
    );
    guard.position.y = 0.1;
    guard.castShadow = true;
    swordGroup.add(guard);

    // Rotate sword 45 degrees away from player (forward)
    swordGroup.rotation.x = -Math.PI / 4; // 45 degrees forward
    
    return swordGroup;
  };

  useEffect(() => {
    if (!gl.xr) return;
    
    console.log('VRControllers: Setting up grip-based movement system');
    
    // Get controllers from renderer
    const controller0 = gl.xr.getController(0);
    const controller1 = gl.xr.getController(1);
    
    controller0Ref.current = controller0;
    controller1Ref.current = controller1;
    
    // Setup event handlers
    const handleSqueezeStart0 = () => {
      console.log('Left controller squeeze start');
      leftGrabbing.current = true;
    };
    
    const handleSqueezeEnd0 = () => {
      console.log('Left controller squeeze end');
      leftGrabbing.current = false;
    };
    
    const handleSqueezeStart1 = () => {
      console.log('Right controller squeeze start');
      rightGrabbing.current = true;
    };
    
    const handleSqueezeEnd1 = () => {
      console.log('Right controller squeeze end');
      rightGrabbing.current = false;
    };
    
    // Comprehensive trigger event handlers for different event types
    const handleSelectStart0 = () => {
      console.log('🔫 LEFT TRIGGER FIRED - selectstart');
      leftTriggerPressed.current = true;
    };
    
    const handleSelectEnd0 = () => {
      console.log('🔫 LEFT TRIGGER RELEASED - selectend');
      leftTriggerPressed.current = false;
    };
    
    const handleSelectStart1 = () => {
      console.log('🔫 RIGHT TRIGGER FIRED - selectstart');
      rightTriggerPressed.current = true;
    };
    
    const handleSelectEnd1 = () => {
      console.log('🔫 RIGHT TRIGGER RELEASED - selectend');
      rightTriggerPressed.current = false;
    };
    
    // Alternative event handlers for different button types
    const handleClick0 = () => {
      console.log('🔫 LEFT CLICK EVENT');
      leftTriggerPressed.current = true;
      setTimeout(() => { leftTriggerPressed.current = false; }, 100);
    };
    
    const handleClick1 = () => {
      console.log('🔫 RIGHT CLICK EVENT');
      rightTriggerPressed.current = true;
      setTimeout(() => { rightTriggerPressed.current = false; }, 100);
    };
    
    // Enhanced squeeze handlers for sword animation
    const originalSqueezeStart0 = handleSqueezeStart0;
    const originalSqueezeEnd0 = handleSqueezeEnd0;
    const originalSqueezeStart1 = handleSqueezeStart1;
    const originalSqueezeEnd1 = handleSqueezeEnd1;
    
    const handleSqueezeStart0Extended = () => {
      originalSqueezeStart0();
      leftGrabbing.current = true; // FIX: Actually update grip state
      targetLeftScale.current = 1.5; // Expand when squeezing
      console.log('⚔️ LEFT SWORD GRIPPED - Movement enabled!');
      // Send to Quest 3 debug display
      if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
        (window as any).vrDebugLog('LEFT SWORD GRIPPED!');
      }
    };
    
    const handleSqueezeEnd0Extended = () => {
      originalSqueezeEnd0();
      leftGrabbing.current = false; // FIX: Actually update grip state
      targetLeftScale.current = 0.5; // Shrink when releasing
      console.log('✋ Left sword released - Movement may stop');
    };
    
    const handleSqueezeStart1Extended = () => {
      originalSqueezeStart1();
      rightGrabbing.current = true; // FIX: Actually update grip state
      targetRightScale.current = 1.5; // Expand when squeezing
      console.log('⚔️ RIGHT SWORD GRIPPED - Movement enabled!');
      // Send to Quest 3 debug display
      if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
        (window as any).vrDebugLog('RIGHT SWORD GRIPPED!');
      }
    };
    
    const handleSqueezeEnd1Extended = () => {
      originalSqueezeEnd1();
      rightGrabbing.current = false; // FIX: Actually update grip state
      targetRightScale.current = 0.5; // Shrink when releasing
      console.log('✋ Right sword released - Movement may stop');
    };
    
    controller0.addEventListener('squeezestart', handleSqueezeStart0Extended);
    controller0.addEventListener('squeezeend', handleSqueezeEnd0Extended);
    controller1.addEventListener('squeezestart', handleSqueezeStart1Extended);
    controller1.addEventListener('squeezeend', handleSqueezeEnd1Extended);
    
    // Add multiple types of trigger/select event listeners
    console.log('🎮 Adding ALL possible trigger event listeners...');
    
    // Primary trigger events (selectstart/selectend)
    controller0.addEventListener('selectstart', handleSelectStart0);
    controller0.addEventListener('selectend', handleSelectEnd0);
    controller1.addEventListener('selectstart', handleSelectStart1);
    controller1.addEventListener('selectend', handleSelectEnd1);
    
    // Alternative button events
    controller0.addEventListener('click', handleClick0);
    controller1.addEventListener('click', handleClick1);
    
    // Try inputsourceschange events
    controller0.addEventListener('connected', () => console.log('🎮 Controller 0 connected'));
    controller1.addEventListener('connected', () => console.log('🎮 Controller 1 connected'));
    
    // Add any available input events
    ['select', 'selectstart', 'selectend', 'click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach(eventType => {
      try {
        controller0.addEventListener(eventType, (e) => {
          console.log(`🎮 Controller 0 ${eventType} event:`, e);
          if (eventType.includes('start') || eventType.includes('down') || eventType === 'click') {
            leftTriggerPressed.current = true;
            setTimeout(() => { leftTriggerPressed.current = false; }, 100);
          }
        });
        controller1.addEventListener(eventType, (e) => {
          console.log(`🎮 Controller 1 ${eventType} event:`, e);
          if (eventType.includes('start') || eventType.includes('down') || eventType === 'click') {
            rightTriggerPressed.current = true;
            setTimeout(() => { rightTriggerPressed.current = false; }, 100);
          }
        });
      } catch (error) {
        console.warn(`Event ${eventType} not supported:`, error);
      }
    });
    
    return () => {
      try {
        controller0.removeEventListener('squeezestart', handleSqueezeStart0Extended);
        controller0.removeEventListener('squeezeend', handleSqueezeEnd0Extended);
        controller1.removeEventListener('squeezestart', handleSqueezeStart1Extended);
        controller1.removeEventListener('squeezeend', handleSqueezeEnd1Extended);
        
        controller0.removeEventListener('selectstart', handleSelectStart0);
        controller0.removeEventListener('selectend', handleSelectEnd0);
        controller1.removeEventListener('selectstart', handleSelectStart1);
        controller1.removeEventListener('selectend', handleSelectEnd1);
        
        controller0.removeEventListener('click', handleClick0);
        controller1.removeEventListener('click', handleClick1);
      } catch (error) {
        console.warn('Error removing controller event listeners:', error);
      }
    };
  }, [gl]);

  useFrame((state, deltaTime) => {
    const controller0 = controller0Ref.current;
    const controller1 = controller1Ref.current;
    
    // Debug controller detection and send to Quest 3 display
    if (Math.random() < 0.01) { // Log 1% of frames
      const isVRActive = !!gl.xr.getSession();
      console.log('🎮 Controller Detection - Left:', !!controller0, 'Right:', !!controller1);
      console.log('🎮 VR Session Active:', isVRActive);
      
      // Send debug data to Quest 3 display
      if (typeof window !== 'undefined') {
        (window as any).vrDebugData = {
          controllersDetected: { left: !!controller0, right: !!controller1 },
          vrSessionActive: isVRActive,
          gripStates: { 
            leftGripping: leftGrabbing.current, 
            rightGripping: rightGrabbing.current 
          },
          timestamp: Date.now()
        };
      }
    }
    
    if (!controller0 || !controller1) return;
    
    // Update endless runner movement
    updateMovement(deltaTime);
    
    // Move camera forward only when gripping swords
    const leftGripping = leftGrabbing.current;
    const rightGripping = rightGrabbing.current;
    let swordsHeld = 0;
    
    if (leftGripping) swordsHeld++;
    if (rightGripping) swordsHeld++;
    
    // Only move forward if holding at least one sword, speed increases with both swords
    if (swordsHeld > 0) {
      const speedMultiplier = swordsHeld; // 1x speed for one sword, 2x for both
      const actualSpeed = gameSpeed * speedMultiplier;
      
      // FIX: WebXR movement - need to move the world, not the camera
      if (gl.xr.getSession()) {
        // In VR - move the entire scene towards the player instead
        // This creates the illusion of forward movement
        scene.position.z -= actualSpeed; // Move world backward = player moves forward
        
        // Also move the camera for consistency with target cleanup
        camera.position.z += actualSpeed;
        
        if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
          (window as any).vrDebugLog(`VR MOVEMENT: ${actualSpeed.toFixed(3)} speed`);
        }
      } else {
        // In 2D preview - move camera directly
        camera.position.z += actualSpeed;
      }
      
      if (Math.random() < 0.005) { // Occasionally log grip status
        console.log(`⚔️ Gripping ${swordsHeld} sword(s) - Speed: ${actualSpeed.toFixed(3)}`);
      }
    } else {
      if (Math.random() < 0.005) { // Log when stopped
        console.log('✋ Not gripping swords - STOPPED');
      }
    }
    
    // Only spawn new targets when moving (gripping swords)
    if (swordsHeld > 0 && Math.random() < 0.008) { // Spawn targets when moving
      spawnNewTargets();
    }
    
    // Clean up old targets
    cleanupOldTargets(camera.position.z);
    
    // Get controller gamepads using multiple robust methods
    let gamepad0: any = null;
    let gamepad1: any = null;
    
    // Method 1: Try userData.gamepad
    gamepad0 = controller0.userData?.gamepad;
    gamepad1 = controller1.userData?.gamepad;
    
    // Method 2: Try direct gamepad property
    gamepad0 = gamepad0 || (controller0 as any).gamepad;
    gamepad1 = gamepad1 || (controller1 as any).gamepad;
    
    // Method 3: Try WebXR session input sources
    const session = gl.xr.getSession();
    if (session?.inputSources) {
      for (const inputSource of session.inputSources) {
        if (inputSource.gamepad) {
          if (inputSource.handedness === 'left') {
            gamepad0 = gamepad0 || inputSource.gamepad;
          } else if (inputSource.handedness === 'right') {
            gamepad1 = gamepad1 || inputSource.gamepad;
          }
        }
      }
    }
    
    // Method 4: Try navigator.getGamepads() as fallback
    if (!gamepad0 || !gamepad1) {
      const navigatorGamepads = navigator.getGamepads?.();
      if (navigatorGamepads) {
        for (let i = 0; i < navigatorGamepads.length; i++) {
          const gamepad = navigatorGamepads[i];
          if (gamepad) {
            // Assign based on index or ID
            if (!gamepad0 && i === 0) gamepad0 = gamepad;
            if (!gamepad1 && i === 1) gamepad1 = gamepad;
          }
        }
      }
    }
    
    // Debug gamepad detection (reduce spam)
    if (Math.random() < 0.002) { // Log 0.2% of frames
      if (gamepad0 || gamepad1) {
        console.log('🎮 GAMEPADS DETECTED! Left:', !!gamepad0, 'Right:', !!gamepad1);
        if (gamepad0?.axes?.length >= 4) {
          console.log('  Left joystick - X:', gamepad0.axes[2]?.toFixed(2), 'Y:', gamepad0.axes[3]?.toFixed(2));
        }
      }
    }
    
    // Handle movement with left controller's joystick (try multiple axis mappings)
    if (gamepad0?.axes && gamepad0.axes.length >= 2) {
      // Try different joystick axis mappings for Quest 3
      let joystickX = 0;
      let joystickY = 0;
      
      // Primary mapping: axes[2] and axes[3] (typical for left joystick)
      if (gamepad0.axes.length >= 4) {
        joystickX = gamepad0.axes[2] || 0;
        joystickY = gamepad0.axes[3] || 0;
      }
      
      // Fallback mapping: axes[0] and axes[1] (in case they're mapped differently)
      if (Math.abs(joystickX) < 0.05 && Math.abs(joystickY) < 0.05) {
        joystickX = gamepad0.axes[0] || 0;
        joystickY = gamepad0.axes[1] || 0;
      }
      
      if (Math.abs(joystickX) > 0.1 || Math.abs(joystickY) > 0.1) { // Dead zone
        const moveSpeed = 0.08; // Slightly faster movement
        
        // Get camera's forward and right vectors
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        // Apply camera rotation to movement vectors (for head-relative movement)
        forward.applyQuaternion(camera.quaternion);
        right.applyQuaternion(camera.quaternion);
        
        // Flatten movement vectors to prevent flying
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();
        
        // Calculate movement direction
        const moveDirection = new THREE.Vector3();
        moveDirection.add(forward.multiplyScalar(-joystickY)); // Forward/backward
        moveDirection.add(right.multiplyScalar(joystickX));    // Left/right
        
        // Apply movement to camera position
        camera.position.add(moveDirection.multiplyScalar(moveSpeed));
        
        console.log(`\ud83c\udfae MOVING! X: ${joystickX.toFixed(2)}, Y: ${joystickY.toFixed(2)}`);
      }
    }
    
    // Handle trigger input for bullet firing
    // Debug: Log gamepad state
    if (gamepad0?.buttons) {
      gamepad0.buttons.forEach((button: any, index: number) => {
        if (button.pressed) {
          console.log(`Left controller button ${index} pressed:`, button.value);
        }
      });
    }
    
    if (gamepad1?.buttons) {
      gamepad1.buttons.forEach((button: any, index: number) => {
        if (button.pressed) {
          console.log(`Right controller button ${index} pressed:`, button.value);
        }
      });
    }
    
    // Use event-based trigger detection AND fallback to gamepad polling
    if (leftTriggerPressed.current) {
      console.log('🚀 FIRING LEFT BULLET (event-based)');
      fireBullet(controller0, 'left');
    }
    
    if (rightTriggerPressed.current) {
      console.log('🚀 FIRING RIGHT BULLET (event-based)');
      fireBullet(controller1, 'right');
    }
    
    // FALLBACK: Also try gamepad button polling as backup
    if (gamepad0?.buttons) {
      // Try all possible button mappings for Quest 3
      for (let i = 0; i < gamepad0.buttons.length; i++) {
        if (gamepad0.buttons[i]?.pressed) {
          console.log(`🎮 Left controller button ${i} pressed - FIRING!`);
          fireBullet(controller0, 'left');
          break; // Only fire once per frame
        }
      }
    }
    
    if (gamepad1?.buttons) {
      // Try all possible button mappings for Quest 3
      for (let i = 0; i < gamepad1.buttons.length; i++) {
        if (gamepad1.buttons[i]?.pressed) {
          console.log(`🎮 Right controller button ${i} pressed - FIRING!`);
          fireBullet(controller1, 'right');
          break; // Only fire once per frame
        }
      }
    }
    
    // Animate sword scales smoothly
    const scaleSpeed = 0.05; // Animation speed
    
    // Left sword scale animation
    if (Math.abs(leftSwordScale.current - targetLeftScale.current) > 0.01) {
      if (leftSwordScale.current < targetLeftScale.current) {
        leftSwordScale.current = Math.min(leftSwordScale.current + scaleSpeed, targetLeftScale.current);
      } else {
        leftSwordScale.current = Math.max(leftSwordScale.current - scaleSpeed, targetLeftScale.current);
      }
    }
    
    // Right sword scale animation
    if (Math.abs(rightSwordScale.current - targetRightScale.current) > 0.01) {
      if (rightSwordScale.current < targetRightScale.current) {
        rightSwordScale.current = Math.min(rightSwordScale.current + scaleSpeed, targetRightScale.current);
      } else {
        rightSwordScale.current = Math.max(rightSwordScale.current - scaleSpeed, targetRightScale.current);
      }
    }
    
    // Handle left controller sword
    if (leftGrabbing.current) {
      if (!leftSwordRef.current?.parent) {
        const sword = createSword();
        leftSwordRef.current = sword;
        controller0.add(sword);
        addSwordCollider('left', sword);
        console.log('VRControllers: Left sword spawned');
      }
      // Apply animated scale to left sword
      if (leftSwordRef.current) {
        leftSwordRef.current.scale.setScalar(leftSwordScale.current);
      }
    } else if (!leftGrabbing.current && leftSwordRef.current?.parent) {
      controller0.remove(leftSwordRef.current);
      removeSwordCollider('left');
      leftSwordRef.current = undefined;
      console.log('VRControllers: Left sword despawned');
    }

    // Handle right controller sword
    if (rightGrabbing.current) {
      if (!rightSwordRef.current?.parent) {
        const sword = createSword();
        rightSwordRef.current = sword;
        controller1.add(sword);
        addSwordCollider('right', sword);
        console.log('VRControllers: Right sword spawned');
      }
      // Apply animated scale to right sword
      if (rightSwordRef.current) {
        rightSwordRef.current.scale.setScalar(rightSwordScale.current);
      }
    } else if (!rightGrabbing.current && rightSwordRef.current?.parent) {
      controller1.remove(rightSwordRef.current);
      removeSwordCollider('right');
      rightSwordRef.current = undefined;
      console.log('VRControllers: Right sword despawned');
    }

    // Update bullets
    bullets.current = bullets.current.filter(bullet => {
      // Move bullet
      bullet.mesh.position.add(bullet.velocity);
      
      // Check collision with targets
      let hitTarget = false;
      targets.forEach(target => {
        if (target.destroyed) return;
        
        const targetPos = new THREE.Vector3(...target.position);
        const distance = bullet.mesh.position.distanceTo(targetPos);
        
        if (distance < 0.6) { // Bullet hit target
          console.log(`Bullet ${bullet.id} hit target ${target.id}!`);
          
          // Calculate hit direction for shattering
          const hitDirection = bullet.mesh.position.clone().sub(targetPos).normalize();
          
          destroyTarget(target.id);
          addHitEffect(target.position, hitDirection);
          hitTarget = true;
        }
      });
      
      // Remove bullet if it hit something or traveled too far
      if (hitTarget || bullet.mesh.position.length() > 50) {
        scene.remove(bullet.mesh);
        return false;
      }
      
      return true;
    });

    // Update collision detection
    [{ id: 'left', sword: leftSwordRef.current, controller: controller0 },
     { id: 'right', sword: rightSwordRef.current, controller: controller1 }].forEach(({ id, sword, controller }) => {
      if (!sword || !controller) return;

      const currentPos = new THREE.Vector3();
      controller.getWorldPosition(currentPos);
      
      const prevPos = previousPositions.current[id];
      if (prevPos) {
        const velocity = currentPos.clone().sub(prevPos);
        const speed = velocity.length();
        
        // Only check collisions if sword is moving fast enough (slashing)
        if (speed > 0.01) {
          targets.forEach(target => {
            if (target.destroyed) return;

            const targetPos = new THREE.Vector3(...target.position);
            const distance = currentPos.distanceTo(targetPos);
            
            // Simple distance-based collision
            if (distance < 1.0) {
              console.log(`VRControllers: Sword ${id} hit target ${target.id}!`);
              destroyTarget(target.id);
              addHitEffect(target.position);
            }
          });
        }
      }
      
      previousPositions.current[id] = currentPos.clone();
    });
    
    // Sword-to-sword collision detection
    if (controller0 && controller1 && leftSwordRef.current && rightSwordRef.current) {
      const leftPos = new THREE.Vector3();
      const rightPos = new THREE.Vector3();
      
      controller0.getWorldPosition(leftPos);
      controller1.getWorldPosition(rightPos);
      
      // Check distance between sword tips (accounting for sword length)
      const swordDistance = leftPos.distanceTo(rightPos);
      
      if (swordDistance < 0.8 && canSwordClash()) { // Swords are close enough to clash
        console.log('⚔️ Swords are clashing!');
        
        // Calculate collision point (midpoint between swords)
        const collisionPoint = leftPos.clone().lerp(rightPos, 0.5);
        
        // Get camera position and direction for projectile
        const cameraPosition = camera.position.clone();
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(camera.quaternion);
        
        // Fire actual projectile from sword clash point
        console.log('⚔️ SWORD CLASH - FIRING PROJECTILE!');
        // Send to Quest 3 debug display
        if (typeof window !== 'undefined' && (window as any).vrDebugLog) {
          (window as any).vrDebugLog('SWORD CLASH - PROJECTILE FIRED!');
        }
        fireBullet(controller0, 'left'); // Fire projectile from clash
        handleSwordClash(collisionPoint, cameraPosition, cameraDirection);
      }
    }
  });

  return (
    <>
      {controller0Ref.current && <primitive object={controller0Ref.current} />}
      {controller1Ref.current && <primitive object={controller1Ref.current} />}
    </>
  );
}