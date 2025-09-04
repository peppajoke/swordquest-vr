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
  const { gl } = useThree();
  const leftSwordRef = useRef<THREE.Group>();
  const rightSwordRef = useRef<THREE.Group>();
  const leftGrabbing = useRef(false);
  const rightGrabbing = useRef(false);
  const controller0Ref = useRef<THREE.Group>();
  const controller1Ref = useRef<THREE.Group>();
  const { addSwordCollider, removeSwordCollider, targets, destroyTarget, addHitEffect } = useVRGame();
  const previousPositions = useRef<{ [key: string]: THREE.Vector3 }>({});
  
  // Store sword angles for each controller (in radians)
  const swordAngles = useRef<{ [key: string]: number }>({
    controller0: 0,
    controller1: 0
  });

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
    
    controller0.addEventListener('squeezestart', handleSqueezeStart0);
    controller0.addEventListener('squeezeend', handleSqueezeEnd0);
    controller1.addEventListener('squeezestart', handleSqueezeStart1);
    controller1.addEventListener('squeezeend', handleSqueezeEnd1);
    
    return () => {
      try {
        controller0.removeEventListener('squeezestart', handleSqueezeStart0);
        controller0.removeEventListener('squeezeend', handleSqueezeEnd0);
        controller1.removeEventListener('squeezestart', handleSqueezeStart1);
        controller1.removeEventListener('squeezeend', handleSqueezeEnd1);
      } catch (error) {
        console.warn('Error removing controller event listeners:', error);
      }
    };
  }, [gl]);

  useFrame(() => {
    const controller0 = controller0Ref.current;
    const controller1 = controller1Ref.current;
    
    if (!controller0 || !controller1) return;
    
    // Get controller gamepads for joystick input
    const gamepad0 = controller0.userData.gamepad;
    const gamepad1 = controller1.userData.gamepad;
    
    // Update sword angles based on joystick input
    if (gamepad0?.axes) {
      const joystickY = gamepad0.axes[3]; // Right joystick Y axis
      if (joystickY < -0.5) { // Joystick pushed down
        swordAngles.current.controller0 = Math.min(swordAngles.current.controller0 + 0.02, Math.PI / 3); // Max 60 degrees down
      } else {
        swordAngles.current.controller0 = Math.max(swordAngles.current.controller0 - 0.01, 0); // Return to neutral
      }
    }
    
    if (gamepad1?.axes) {
      const joystickY = gamepad1.axes[3]; // Right joystick Y axis
      if (joystickY < -0.5) { // Joystick pushed down
        swordAngles.current.controller1 = Math.min(swordAngles.current.controller1 + 0.02, Math.PI / 3); // Max 60 degrees down
      } else {
        swordAngles.current.controller1 = Math.max(swordAngles.current.controller1 - 0.01, 0); // Return to neutral
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
      // Update sword angle based on joystick input
      if (leftSwordRef.current) {
        leftSwordRef.current.rotation.x = -swordAngles.current.controller0;
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
      // Update sword angle based on joystick input
      if (rightSwordRef.current) {
        rightSwordRef.current.rotation.x = -swordAngles.current.controller1;
      }
    } else if (!rightGrabbing.current && rightSwordRef.current?.parent) {
      controller1.remove(rightSwordRef.current);
      removeSwordCollider('right');
      rightSwordRef.current = undefined;
      console.log('VRControllers: Right sword despawned');
    }

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