import * as THREE from 'three';
import { PLAYER_CONFIG } from '../config/gameConfig';

export interface MovementState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  onGround: boolean;
  fuel: number;
  jetpackEnabled: boolean;
  lastGroundedTime: number;
  direction: THREE.Vector3;
}

export interface MovementInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  jetpack: boolean;
  sprint: boolean;
}

export interface MovementResult {
  newPosition: THREE.Vector3;
  newVelocity: THREE.Vector3;
  fuelChanged: boolean;
  newFuel: number;
  onGround: boolean;
  logMessage?: string;
}

export class MovementService {
  /**
   * Update player movement based on input and physics
   */
  static updateMovement(
    state: MovementState,
    input: MovementInput,
    deltaTime: number,
    camera: THREE.Camera
  ): MovementResult {
    const result: MovementResult = {
      newPosition: state.position.clone(),
      newVelocity: state.velocity.clone(),
      fuelChanged: false,
      newFuel: state.fuel,
      onGround: state.onGround
    };

    // Calculate movement direction based on camera orientation
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    
    // Transform directions by camera rotation
    forward.applyQuaternion(camera.quaternion);
    right.applyQuaternion(camera.quaternion);
    
    // Remove Y component for ground movement
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    // Build movement vector
    if (input.forward) direction.add(forward);
    if (input.backward) direction.sub(forward);
    if (input.left) direction.sub(right);
    if (input.right) direction.add(right);

    // Normalize diagonal movement
    if (direction.length() > 0) {
      direction.normalize();
    }

    // Apply movement
    if (direction.length() > 0) {
      const speed = input.sprint ? PLAYER_CONFIG.movement.maxSpeed * 1.5 : PLAYER_CONFIG.movement.maxSpeed;
      const targetVelocity = direction.multiplyScalar(speed);
      
      // Smooth acceleration
      result.newVelocity.x = THREE.MathUtils.lerp(result.newVelocity.x, targetVelocity.x, PLAYER_CONFIG.movement.accelerationRate * deltaTime);
      result.newVelocity.z = THREE.MathUtils.lerp(result.newVelocity.z, targetVelocity.z, PLAYER_CONFIG.movement.accelerationRate * deltaTime);
    } else {
      // Apply friction when not moving
      result.newVelocity.x *= 0.8;
      result.newVelocity.z *= 0.8;
    }

    // Handle jumping and jetpack
    if (input.jump) {
      if (state.onGround) {
        // Ground jump
        result.newVelocity.y = PLAYER_CONFIG.movement.jumpVelocity;
        result.onGround = false;
        result.logMessage = '🦘 Player jumped!';
      } else if (input.jetpack && state.fuel > 0) {
        // Jetpack flight
        result.newVelocity.y = PLAYER_CONFIG.movement.jetpackSpeed;
        result.newFuel = Math.max(0, state.fuel - PLAYER_CONFIG.jetpack.fuelDrainAirborne * deltaTime);
        result.fuelChanged = true;
      }
    }

    // Apply gravity
    if (!state.onGround) {
      result.newVelocity.y += PLAYER_CONFIG.movement.gravity * deltaTime;
    }

    // Update position
    result.newPosition.add(result.newVelocity.clone().multiplyScalar(deltaTime));

    // Ground collision (simple)
    if (result.newPosition.y <= PLAYER_CONFIG.movement.groundLevel) {
      result.newPosition.y = PLAYER_CONFIG.movement.groundLevel;
      result.newVelocity.y = 0;
      result.onGround = true;
    }

    // Fuel recharge when on ground
    if (result.onGround && state.fuel < PLAYER_CONFIG.jetpack.maxFuel) {
      result.newFuel = Math.min(PLAYER_CONFIG.jetpack.maxFuel, state.fuel + PLAYER_CONFIG.jetpack.fuelRechargeRate * deltaTime);
      result.fuelChanged = true;
    }

    return result;
  }

  /**
   * Update VR movement with hand controllers
   */
  static updateVRMovement(
    state: MovementState,
    leftController: THREE.XRTargetRaySpace | undefined,
    rightController: THREE.XRTargetRaySpace | undefined,
    deltaTime: number
  ): MovementResult {
    const result: MovementResult = {
      newPosition: state.position.clone(),
      newVelocity: state.velocity.clone(),
      fuelChanged: false,
      newFuel: state.fuel,
      onGround: state.onGround
    };

    // VR movement logic would go here
    // For now, just apply basic physics
    
    // Apply gravity
    if (!state.onGround) {
      result.newVelocity.y += PLAYER_CONFIG.movement.gravity * deltaTime;
    }

    // Update position
    result.newPosition.add(result.newVelocity.clone().multiplyScalar(deltaTime));

    // Ground collision
    if (result.newPosition.y <= PLAYER_CONFIG.movement.groundLevel) {
      result.newPosition.y = PLAYER_CONFIG.movement.groundLevel;
      result.newVelocity.y = 0;
      result.onGround = true;
    }

    return result;
  }

  /**
   * Check and enforce world boundaries
   */
  static enforceBounds(
    position: THREE.Vector3,
    bounds: number = PLAYER_CONFIG.movement.roomBounds
  ): { corrected: boolean; newPosition: THREE.Vector3 } {
    const newPosition = position.clone();
    let corrected = false;

    if (Math.abs(newPosition.x) > bounds) {
      newPosition.x = Math.sign(newPosition.x) * bounds;
      corrected = true;
    }

    if (Math.abs(newPosition.z) > bounds) {
      newPosition.z = Math.sign(newPosition.z) * bounds;
      corrected = true;
    }

    return { corrected, newPosition };
  }

  /**
   * Calculate burst speed multiplier for VR jetpack
   */
  static calculateBurstMultiplier(
    fuelPercentage: number,
    controllerGesture: 'punch' | 'spread' | 'normal' = 'normal'
  ): number {
    const baseMultiplier = THREE.MathUtils.lerp(
      PLAYER_CONFIG.burst.minBoost,
      PLAYER_CONFIG.burst.maxBoost,
      fuelPercentage
    );

    // Gesture modifiers
    switch (controllerGesture) {
      case 'punch':
        return baseMultiplier * 1.3;
      case 'spread':
        return baseMultiplier * 1.1;
      default:
        return baseMultiplier;
    }
  }

  /**
   * Get fuel status for UI
   */
  static getFuelStatus(fuel: number): {
    percentage: number;
    level: 'high' | 'medium' | 'low' | 'empty';
    color: string;
  } {
    const percentage = (fuel / PLAYER_CONFIG.jetpack.maxFuel) * 100;
    
    let level: 'high' | 'medium' | 'low' | 'empty';
    let color: string;
    
    if (percentage > 60) {
      level = 'high';
      color = 'green';
    } else if (percentage > 30) {
      level = 'medium';
      color = 'yellow';
    } else if (percentage > 0) {
      level = 'low';
      color = 'red';
    } else {
      level = 'empty';
      color = 'gray';
    }

    return { percentage, level, color };
  }

  /**
   * Create initial movement state
   */
  static createInitialState(startPosition?: THREE.Vector3): MovementState {
    return {
      position: startPosition || new THREE.Vector3(0, PLAYER_CONFIG.movement.groundLevel, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      onGround: true,
      fuel: PLAYER_CONFIG.jetpack.maxFuel,
      jetpackEnabled: false,
      lastGroundedTime: 0,
      direction: new THREE.Vector3(0, 0, 0)
    };
  }

  /**
   * Handle teleportation for VR
   */
  static teleport(
    currentPosition: THREE.Vector3,
    targetPosition: THREE.Vector3,
    maxDistance: number = 10
  ): { success: boolean; newPosition: THREE.Vector3; message?: string } {
    const distance = currentPosition.distanceTo(targetPosition);
    
    if (distance > maxDistance) {
      return {
        success: false,
        newPosition: currentPosition,
        message: `Teleport failed: distance ${distance.toFixed(1)} exceeds max ${maxDistance}`
      };
    }

    // Ensure target position is above ground
    const newPosition = targetPosition.clone();
    newPosition.y = Math.max(newPosition.y, PLAYER_CONFIG.movement.groundLevel);

    return {
      success: true,
      newPosition,
      message: `Teleported ${distance.toFixed(1)} units`
    };
  }
}