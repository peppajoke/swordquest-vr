import * as THREE from 'three';
import { COMBAT_CONFIG } from '../config/gameConfig';

export interface CollisionResult {
  hit: boolean;
  distance?: number;
  hitPoint?: THREE.Vector3;
  target?: THREE.Object3D;
}

export interface RaycastHit {
  hit: boolean;
  distance: number;
  point: THREE.Vector3;
  object: THREE.Object3D;
}

export class CollisionService {
  private static raycaster = new THREE.Raycaster();

  /**
   * Check if two spheres collide
   */
  static checkSphereCollision(
    pos1: THREE.Vector3, 
    radius1: number, 
    pos2: THREE.Vector3, 
    radius2: number
  ): CollisionResult {
    const distance = pos1.distanceTo(pos2);
    const combinedRadius = radius1 + radius2;
    
    return {
      hit: distance <= combinedRadius,
      distance
    };
  }

  /**
   * Check collision between a point and a sphere
   */
  static checkPointSphereCollision(
    point: THREE.Vector3,
    sphereCenter: THREE.Vector3,
    sphereRadius: number
  ): CollisionResult {
    const distance = point.distanceTo(sphereCenter);
    
    return {
      hit: distance <= sphereRadius,
      distance
    };
  }

  /**
   * Check collision between a sword position and objects
   */
  static checkSwordCollision(
    swordPosition: THREE.Vector3,
    targets: THREE.Object3D[],
    maxDistance: number = COMBAT_CONFIG.collision.swordCheckDistance
  ): CollisionResult[] {
    const results: CollisionResult[] = [];

    for (const target of targets) {
      if (!target.userData || target.userData.destroyed || target.userData.isDead) {
        continue;
      }

      const targetPos = new THREE.Vector3();
      target.getWorldPosition(targetPos);
      const distance = swordPosition.distanceTo(targetPos);

      let hitDistance: number = COMBAT_CONFIG.collision.enemyHitDistance;
      
      // Different hit distances for different object types
      if (target.userData.isPillar) {
        hitDistance = COMBAT_CONFIG.collision.pillarHitDistance;
      } else if (target.userData.isTurret) {
        hitDistance = COMBAT_CONFIG.collision.turretHitDistance;
      } else if (target.userData.isPlayAgainBox) {
        hitDistance = COMBAT_CONFIG.collision.playAgainBoxDistance;
      }

      if (distance <= hitDistance && distance <= maxDistance) {
        results.push({
          hit: true,
          distance,
          hitPoint: targetPos,
          target
        });
      }
    }

    return results.sort((a, b) => a.distance! - b.distance!);
  }

  /**
   * Perform raycast collision detection
   */
  static raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    targets: THREE.Object3D[],
    maxDistance: number = COMBAT_CONFIG.projectiles.maxDistance
  ): RaycastHit | null {
    this.raycaster.set(origin, direction.normalize());
    this.raycaster.far = maxDistance;

    const validTargets = targets.filter(target => 
      target.userData && 
      !target.userData.destroyed && 
      (target.userData.isPillar || (target.userData.isTurret && target.userData.health > 0))
    );

    const intersects = this.raycaster.intersectObjects(validTargets, false);

    if (intersects.length > 0) {
      const closest = intersects[0];
      return {
        hit: true,
        distance: closest.distance,
        point: closest.point!,
        object: closest.object
      };
    }

    return null;
  }

  /**
   * Check bullet collision with enemies and world objects
   */
  static checkBulletCollision(
    bulletPosition: THREE.Vector3,
    targets: { enemies: THREE.Object3D[]; worldObjects: THREE.Object3D[] }
  ): { enemy?: THREE.Object3D; worldObject?: THREE.Object3D; distance: number } | null {
    let closestHit: { target: THREE.Object3D; distance: number; type: 'enemy' | 'world' } | null = null;

    // Check enemy collisions
    for (const enemy of targets.enemies) {
      if (!enemy.userData || enemy.userData.isDead) continue;

      const enemyPos = new THREE.Vector3();
      enemy.getWorldPosition(enemyPos);
      const distance = bulletPosition.distanceTo(enemyPos);

      if (distance < COMBAT_CONFIG.collision.bulletCollisionDistance) {
        if (!closestHit || distance < closestHit.distance) {
          closestHit = { target: enemy, distance, type: 'enemy' };
        }
      }
    }

    // Check world object collisions
    for (const obj of targets.worldObjects) {
      if (!obj.userData || obj.userData.destroyed) continue;

      const objPos = new THREE.Vector3();
      obj.getWorldPosition(objPos);
      const distance = bulletPosition.distanceTo(objPos);

      if (distance < COMBAT_CONFIG.collision.bulletCollisionDistance) {
        if (!closestHit || distance < closestHit.distance) {
          closestHit = { target: obj, distance, type: 'world' };
        }
      }
    }

    if (closestHit) {
      return {
        [closestHit.type === 'enemy' ? 'enemy' : 'worldObject']: closestHit.target,
        distance: closestHit.distance
      };
    }

    return null;
  }

  /**
   * Check if player is within bounds
   */
  static checkPlayerBounds(
    playerPosition: THREE.Vector3,
    bounds: number = 95
  ): { inBounds: boolean; correctedPosition?: THREE.Vector3 } {
    const { x, z } = playerPosition;
    
    if (Math.abs(x) <= bounds && Math.abs(z) <= bounds) {
      return { inBounds: true };
    }

    // Calculate corrected position
    const correctedPosition = playerPosition.clone();
    correctedPosition.x = Math.max(-bounds, Math.min(bounds, x));
    correctedPosition.z = Math.max(-bounds, Math.min(bounds, z));

    return { inBounds: false, correctedPosition };
  }

  /**
   * Check explosion collision with targets
   */
  static checkExplosionCollision(
    explosionCenter: THREE.Vector3,
    explosionRadius: number,
    targets: THREE.Object3D[]
  ): Array<{ target: THREE.Object3D; distance: number; damage: number }> {
    const results: Array<{ target: THREE.Object3D; distance: number; damage: number }> = [];

    for (const target of targets) {
      if (!target.userData || target.userData.isDead || target.userData.destroyed) {
        continue;
      }

      const targetPos = new THREE.Vector3();
      target.getWorldPosition(targetPos);
      const distance = explosionCenter.distanceTo(targetPos);

      if (distance <= explosionRadius) {
        // Calculate damage falloff based on distance
        const falloffFactor = 1 - (distance / explosionRadius);
        const baseDamage = target.userData.damage || COMBAT_CONFIG.explosions.defaultDamage;
        const damage = baseDamage * falloffFactor;

        results.push({ target, distance, damage });
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check distance-based performance optimization
   */
  static shouldOptimizeForDistance(
    objectPosition: THREE.Vector3,
    playerPosition: THREE.Vector3,
    optimizationType: 'ai' | 'collision' | 'sword'
  ): { shouldOptimize: boolean; distance: number } {
    const distance = objectPosition.distanceTo(playerPosition);
    
    let maxDistance: number;
    switch (optimizationType) {
      case 'ai':
        maxDistance = COMBAT_CONFIG.collision.maxCheckDistance;
        break;
      case 'collision':
        maxDistance = COMBAT_CONFIG.collision.collisionCheckDistance;
        break;
      case 'sword':
        maxDistance = COMBAT_CONFIG.collision.swordCheckDistance;
        break;
      default:
        maxDistance = COMBAT_CONFIG.collision.maxCheckDistance;
    }

    return {
      shouldOptimize: distance > maxDistance,
      distance
    };
  }
}