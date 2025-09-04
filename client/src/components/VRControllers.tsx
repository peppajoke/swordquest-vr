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
  const { addSwordCollider, removeSwordCollider, targets, destroyTarget, addHitEffect } = useVRGame();
  const previousPositions = useRef<{ [key: string]: THREE.Vector3 }>({});
  const bullets = useRef<{ id: string, mesh: THREE.Mesh, velocity: THREE.Vector3, controllerId: string }[]>([]);
  const lastBulletTime = useRef<{ [key: string]: number }>({});
  const leftTriggerPressed = useRef(false);
  const rightTriggerPressed = useRef(false);

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
    
    console.log('VRControllers: Setting up XR controller events');
    
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
    
    // Trigger event handlers
    const handleSelectStart0 = () => {
      console.log('Left controller select/trigger start');
      leftTriggerPressed.current = true;
    };
    
    const handleSelectEnd0 = () => {
      console.log('Left controller select/trigger end');
      leftTriggerPressed.current = false;
    };
    
    const handleSelectStart1 = () => {
      console.log('Right controller select/trigger start');
      rightTriggerPressed.current = true;
    };
    
    const handleSelectEnd1 = () => {
      console.log('Right controller select/trigger end');
      rightTriggerPressed.current = false;
    };
    
    controller0.addEventListener('squeezestart', handleSqueezeStart0);
    controller0.addEventListener('squeezeend', handleSqueezeEnd0);
    controller1.addEventListener('squeezestart', handleSqueezeStart1);
    controller1.addEventListener('squeezeend', handleSqueezeEnd1);
    
    // Add trigger/select event listeners
    controller0.addEventListener('selectstart', handleSelectStart0);
    controller0.addEventListener('selectend', handleSelectEnd0);
    controller1.addEventListener('selectstart', handleSelectStart1);
    controller1.addEventListener('selectend', handleSelectEnd1);
    
    return () => {
      try {
        controller0.removeEventListener('squeezestart', handleSqueezeStart0);
        controller0.removeEventListener('squeezeend', handleSqueezeEnd0);
        controller1.removeEventListener('squeezestart', handleSqueezeStart1);
        controller1.removeEventListener('squeezeend', handleSqueezeEnd1);
        
        controller0.removeEventListener('selectstart', handleSelectStart0);
        controller0.removeEventListener('selectend', handleSelectEnd0);
        controller1.removeEventListener('selectstart', handleSelectStart1);
        controller1.removeEventListener('selectend', handleSelectEnd1);
      } catch (error) {
        console.warn('Error removing controller event listeners:', error);
      }
    };
  }, [gl]);

  useFrame(() => {
    const controller0 = controller0Ref.current;
    const controller1 = controller1Ref.current;
    
    if (!controller0 || !controller1) return;
    
    // Get controller gamepads for input - try multiple methods
    let gamepad0 = controller0.userData.gamepad;
    let gamepad1 = controller1.userData.gamepad;
    
    // Alternative: Try getting gamepad from WebXR session
    const session = gl.xr.getSession();
    if (session && session.inputSources) {
      const inputSources = Array.from(session.inputSources);
      
      // Find left and right controllers
      const leftController = inputSources.find(source => source.handedness === 'left');
      const rightController = inputSources.find(source => source.handedness === 'right');
      
      gamepad0 = leftController?.gamepad || gamepad0;
      gamepad1 = rightController?.gamepad || gamepad1;
    }
    
    // Debug: Log gamepad availability (reduce spam)
    if (Math.random() < 0.01) { // Only log 1% of frames
      console.log('Gamepad0:', !!gamepad0, 'Gamepad1:', !!gamepad1);
      if (gamepad0) {
        console.log('Gamepad0 buttons length:', gamepad0.buttons?.length);
      }
    }
    
    // Handle movement with left controller's left joystick
    if (gamepad0?.axes) {
      const joystickX = gamepad0.axes[2]; // Left joystick X axis
      const joystickY = gamepad0.axes[3]; // Left joystick Y axis
      
      if (Math.abs(joystickX) > 0.1 || Math.abs(joystickY) > 0.1) { // Dead zone
        const moveSpeed = 0.05; // Movement speed
        
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
        
        console.log(`VRControllers: Moving - X: ${joystickX.toFixed(2)}, Y: ${joystickY.toFixed(2)}`);
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
    
    // Use event-based trigger detection instead of gamepad polling
    if (leftTriggerPressed.current) {
      fireBullet(controller0, 'left');
    }
    
    if (rightTriggerPressed.current) {
      fireBullet(controller1, 'right');
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
  });

  return (
    <>
      {controller0Ref.current && <primitive object={controller0Ref.current} />}
      {controller1Ref.current && <primitive object={controller1Ref.current} />}
    </>
  );
}