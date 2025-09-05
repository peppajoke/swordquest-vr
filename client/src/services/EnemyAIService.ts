import * as THREE from 'three';
import { COMBAT_CONFIG, PERFORMANCE_CONFIG, ANIMATION_CONFIG } from '../config/gameConfig';
import enemyConfig from '../data/enemyConfig.json';

export interface EnemyState {
  health: number;
  maxHealth: number;
  isDead: boolean;
  rageMode?: boolean;
  lastAttackTime: number;
  deathStartTime?: number;
  teleportCooldown?: number;
  position: THREE.Vector3;
  velocity?: THREE.Vector3;
  target?: THREE.Vector3;
}

export interface EnemyAIResult {
  shouldMove: boolean;
  shouldAttack: boolean;
  shouldTeleport?: boolean;
  newPosition?: THREE.Vector3;
  attackDamage?: number;
  logMessage?: string;
}

export class EnemyAIService {
  private static getEnemyProperty(enemyType: string, property: keyof (typeof enemyConfig.enemyTypes)[keyof typeof enemyConfig.enemyTypes]) {
    const config = enemyConfig.enemyTypes[enemyType as keyof typeof enemyConfig.enemyTypes];
    return config ? config[property] : enemyConfig.enemyTypes.grunt[property];
  }

  static getMaxHealth(enemyType: string): number {
    return this.getEnemyProperty(enemyType, 'health') as number;
  }

  static getEnemySize(enemyType: string): number {
    return this.getEnemyProperty(enemyType, 'size') as number;
  }

  static getAttackDamage(enemyType: string, rageMode: boolean = false): number {
    const config = enemyConfig.enemyTypes[enemyType as keyof typeof enemyConfig.enemyTypes];
    if (config && enemyType === 'berserker' && rageMode && 'rageDamage' in config) {
      return config.rageDamage as number;
    }
    return this.getEnemyProperty(enemyType, 'attackDamage') as number;
  }

  static getAttackSpeed(enemyType: string, rageMode: boolean = false): number {
    const config = enemyConfig.enemyTypes[enemyType as keyof typeof enemyConfig.enemyTypes];
    if (config && enemyType === 'berserker' && rageMode) {
      return 600; // Faster in rage mode
    }
    return config ? config.attackCooldown : 2000;
  }

  static getMovementSpeed(enemyType: string): number {
    return this.getEnemyProperty(enemyType, 'speed') as number;
  }

  static getAttackRange(enemyType: string): number {
    const ranges: Record<string, number> = {
      grunt: 3,
      rifleman: 18,
      heavy: 5,
      assassin: 2.5,
      bomber: 4,
      sniper: 25,
      berserker: 3.5,
      shield: 4,
      mage: 12,
      boss: 15,
      drone: 12,
      wasp: 6,
      phoenix: 20
    };
    return ranges[enemyType] || 3;
  }

  static shouldSkipAIUpdate(distance: number, isDead: boolean, currentTime: number): { skip: boolean; frameSkip: number } {
    const MAX_ACTIVE_DISTANCE = COMBAT_CONFIG.collision.maxCheckDistance;
    const CLOSE_DISTANCE = COMBAT_CONFIG.collision.closeDistance;
    const MID_DISTANCE = COMBAT_CONFIG.collision.midDistance;

    // Skip expensive AI computations for very distant enemies
    if (distance > MAX_ACTIVE_DISTANCE && !isDead) {
      return { skip: true, frameSkip: 1 };
    }

    // Reduce update frequency for distant enemies using frame counter
    const frameSkip = distance > CLOSE_DISTANCE ? 
      (distance > MID_DISTANCE ? PERFORMANCE_CONFIG.frameSkipping.farFrameSkip : PERFORMANCE_CONFIG.frameSkipping.midFrameSkip) : 
      PERFORMANCE_CONFIG.frameSkipping.closeFrameSkip;

    const frameNum = Math.floor(currentTime / 16) % frameSkip;
    return { skip: frameNum !== 0 && !isDead, frameSkip };
  }

  static updateEnemyAI(
    enemyType: string,
    state: EnemyState,
    playerPosition: THREE.Vector3,
    currentTime: number,
    deltaTime: number
  ): EnemyAIResult {
    const result: EnemyAIResult = {
      shouldMove: false,
      shouldAttack: false
    };

    if (state.isDead) {
      return result;
    }

    const distance = state.position.distanceTo(playerPosition);
    const attackRange = this.getAttackRange(enemyType);
    const attackCooldown = this.getAttackSpeed(enemyType, state.rageMode);

    // Check if enemy can attack
    const canAttack = distance <= attackRange && 
                     (currentTime - state.lastAttackTime) >= attackCooldown;

    if (canAttack) {
      result.shouldAttack = true;
      result.attackDamage = this.getAttackDamage(enemyType, state.rageMode);
      result.logMessage = `⚔️ ${enemyType} ${enemyType === 'assassin' ? 'melee attack' : 
                          enemyType === 'rifleman' ? 'shot' :
                          enemyType === 'phoenix' ? 'fired fire' : 'attacked'}! ${result.attackDamage} damage`;
    }

    // Special behaviors for different enemy types
    switch (enemyType) {
      case 'assassin':
        // Teleport behavior
        if (distance > 15 && (!state.teleportCooldown || currentTime - state.teleportCooldown > 5000)) {
          result.shouldTeleport = true;
          result.logMessage = '🥷 Assassin teleported!';
        }
        break;

      case 'berserker':
        // Rage mode when health is low
        if (state.health < state.maxHealth * 0.3 && !state.rageMode) {
          state.rageMode = true;
          result.logMessage = '😡 Berserker entered RAGE MODE!';
        }
        break;

      case 'wasp':
      case 'drone':
      case 'phoenix':
        // Flying enemies circle the player
        result.shouldMove = true;
        const angle = currentTime * 0.001;
        const radius = 8 + Math.sin(currentTime * 0.0005) * 3;
        result.newPosition = new THREE.Vector3(
          playerPosition.x + Math.cos(angle) * radius,
          playerPosition.y + 3 + Math.sin(angle * 0.5) * 2,
          playerPosition.z + Math.sin(angle) * radius
        );
        break;

      default:
        // Ground enemies move toward player if not in attack range
        if (distance > attackRange) {
          result.shouldMove = true;
          const direction = playerPosition.clone().sub(state.position).normalize();
          const speed = this.getMovementSpeed(enemyType);
          result.newPosition = state.position.clone().add(direction.multiplyScalar(speed * deltaTime));
        }
        break;
    }

    return result;
  }

  static updateDeathAnimation(
    state: EnemyState,
    currentTime: number
  ): { phase: 'red' | 'fade' | 'dissolve'; progress: number; scale?: number; opacity?: number } {
    if (!state.isDead || !state.deathStartTime) {
      return { phase: 'red', progress: 0 };
    }

    const deathTime = currentTime - state.deathStartTime;

    if (deathTime < ANIMATION_CONFIG.deathSequence.redPhase) {
      // Phase 1: Turn bright red
      return { phase: 'red', progress: 0, opacity: 1.0 };
    } else if (deathTime < ANIMATION_CONFIG.deathSequence.dissolveStart) {
      // Phase 2: Become translucent
      const fadeProgress = (deathTime - ANIMATION_CONFIG.deathSequence.redPhase) / ANIMATION_CONFIG.deathSequence.fadePhase;
      const opacity = 1.0 - fadeProgress * 0.5;
      return { phase: 'fade', progress: fadeProgress, opacity };
    } else {
      // Phase 3: Dissolve
      const dissolveProgress = (deathTime - ANIMATION_CONFIG.deathSequence.dissolveStart) / 1000;
      const scale = Math.max(0, 1.0 - dissolveProgress);
      const opacity = Math.max(0, 0.5 - dissolveProgress * 0.5);
      return { phase: 'dissolve', progress: dissolveProgress, scale, opacity };
    }
  }

  static takeDamage(state: EnemyState, damage: number, currentTime: number): boolean {
    if (state.isDead) return false;

    state.health = Math.max(0, state.health - damage);
    
    if (state.health <= 0) {
      state.isDead = true;
      state.deathStartTime = currentTime;
      return true; // Enemy died
    }
    
    return false; // Enemy still alive
  }
}