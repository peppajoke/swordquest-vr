import * as THREE from 'three';
import { PLAYER_CONFIG } from '../config/gameConfig';

export interface WeaponState {
  leftClip: number;
  rightClip: number;
  currentGun: 'left' | 'right';
  lastShotTime: number;
  lastSwingTime: number;
  lastSwordDamageTime: number;
  isReloading: boolean;
  reloadTimeout?: NodeJS.Timeout;
}

export interface WeaponAction {
  type: 'shoot' | 'reload' | 'swing';
  hand: 'left' | 'right';
  damage?: number;
  success: boolean;
  message?: string;
}

export interface SwordSwingData {
  hand: 'left' | 'right';
  swingType: number;
  pattern: {
    rotation: { x: number; y: number; z: number };
    position: { x: number; y: number; z: number };
  };
}

export class WeaponService {
  /**
   * Check if weapon can shoot
   */
  static canShoot(state: WeaponState, currentTime: number): boolean {
    const timeSinceLastShot = currentTime - state.lastShotTime;
    const clipHasAmmo = state.currentGun === 'left' ? state.leftClip > 0 : state.rightClip > 0;
    
    return !state.isReloading && 
           timeSinceLastShot >= PLAYER_CONFIG.weapons.shotCooldown &&
           clipHasAmmo;
  }

  /**
   * Check if weapon can swing
   */
  static canSwing(state: WeaponState, currentTime: number): boolean {
    const timeSinceLastSwing = currentTime - state.lastSwingTime;
    return timeSinceLastSwing >= PLAYER_CONFIG.weapons.swingCooldown;
  }

  /**
   * Check if sword can deal damage (prevents multiple hits per swing)
   */
  static canDealSwordDamage(state: WeaponState, currentTime: number): boolean {
    const timeSinceLastDamage = currentTime - state.lastSwordDamageTime;
    return timeSinceLastDamage >= PLAYER_CONFIG.weapons.swordDamageCooldown;
  }

  /**
   * Perform weapon shoot action
   */
  static shoot(state: WeaponState, currentTime: number): WeaponAction {
    if (!this.canShoot(state, currentTime)) {
      return {
        type: 'shoot',
        hand: state.currentGun,
        success: false,
        message: 'Cannot shoot: cooling down, reloading, or no ammo'
      };
    }

    // Consume ammo
    if (state.currentGun === 'left') {
      state.leftClip--;
    } else {
      state.rightClip--;
    }

    state.lastShotTime = currentTime;

    // Switch to other gun if current is empty
    if ((state.currentGun === 'left' && state.leftClip === 0) ||
        (state.currentGun === 'right' && state.rightClip === 0)) {
      state.currentGun = state.currentGun === 'left' ? 'right' : 'left';
    }

    return {
      type: 'shoot',
      hand: state.currentGun,
      success: true,
      message: `Shot fired from ${state.currentGun} gun`
    };
  }

  /**
   * Perform sword swing action
   */
  static swing(state: WeaponState, currentTime: number, hand: 'left' | 'right'): WeaponAction & { swingData?: SwordSwingData } {
    if (!this.canSwing(state, currentTime)) {
      return {
        type: 'swing',
        hand,
        success: false,
        message: 'Cannot swing: cooling down'
      };
    }

    state.lastSwingTime = currentTime;
    const swingType = Math.floor(Math.random() * 20); // 20 different swing patterns
    
    const swingData: SwordSwingData = {
      hand,
      swingType,
      pattern: this.getSwingPattern(swingType)
    };

    return {
      type: 'swing',
      hand,
      success: true,
      damage: PLAYER_CONFIG.weapons.swordDamage,
      message: `Sword swung with ${hand} hand`,
      swingData
    };
  }

  /**
   * Check if weapon needs auto-reload
   */
  static needsAutoReload(state: WeaponState): boolean {
    return state.leftClip === 0 && state.rightClip === 0 && !state.isReloading;
  }

  /**
   * Start reload process
   */
  static startReload(state: WeaponState): WeaponAction {
    if (state.isReloading) {
      return {
        type: 'reload',
        hand: 'both' as any,
        success: false,
        message: 'Already reloading'
      };
    }

    state.isReloading = true;

    // Clear any existing reload timeout
    if (state.reloadTimeout) {
      clearTimeout(state.reloadTimeout);
    }

    // Set reload timeout
    state.reloadTimeout = setTimeout(() => {
      this.completeReload(state);
    }, PLAYER_CONFIG.weapons.reloadTimeout);

    return {
      type: 'reload',
      hand: 'both' as any,
      success: true,
      message: 'Reload started'
    };
  }

  /**
   * Complete reload process
   */
  static completeReload(state: WeaponState): void {
    state.leftClip = PLAYER_CONFIG.weapons.maxClipSize;
    state.rightClip = PLAYER_CONFIG.weapons.maxClipSize;
    state.isReloading = false;
    state.currentGun = 'left';
    
    if (state.reloadTimeout) {
      clearTimeout(state.reloadTimeout);
      state.reloadTimeout = undefined;
    }
  }

  /**
   * Cancel reload process
   */
  static cancelReload(state: WeaponState): void {
    if (state.reloadTimeout) {
      clearTimeout(state.reloadTimeout);
      state.reloadTimeout = undefined;
    }
    state.isReloading = false;
  }

  /**
   * Get swing pattern for animation
   */
  private static getSwingPattern(swingType: number): { rotation: { x: number; y: number; z: number }; position: { x: number; y: number; z: number } } {
    const patterns = [
      // Horizontal swings
      { rotation: { x: 0, y: 0, z: Math.PI / 4 }, position: { x: 0.3, y: 0, z: 0 } },
      { rotation: { x: 0, y: 0, z: -Math.PI / 4 }, position: { x: -0.3, y: 0, z: 0 } },
      
      // Vertical swings
      { rotation: { x: Math.PI / 4, y: 0, z: 0 }, position: { x: 0, y: 0.3, z: 0 } },
      { rotation: { x: -Math.PI / 4, y: 0, z: 0 }, position: { x: 0, y: -0.3, z: 0 } },
      
      // Diagonal swings
      { rotation: { x: Math.PI / 6, y: 0, z: Math.PI / 6 }, position: { x: 0.2, y: 0.2, z: 0 } },
      { rotation: { x: -Math.PI / 6, y: 0, z: -Math.PI / 6 }, position: { x: -0.2, y: -0.2, z: 0 } },
      
      // Thrust attacks
      { rotation: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0.4 } },
      { rotation: { x: 0, y: Math.PI / 8, z: 0 }, position: { x: 0.1, y: 0, z: 0.3 } },
      
      // Overhead swings
      { rotation: { x: -Math.PI / 3, y: 0, z: 0 }, position: { x: 0, y: 0.4, z: 0.2 } },
      { rotation: { x: -Math.PI / 2, y: Math.PI / 8, z: 0 }, position: { x: 0.2, y: 0.3, z: 0.1 } },
      
      // Side swings
      { rotation: { x: 0, y: Math.PI / 4, z: 0 }, position: { x: 0.4, y: 0, z: 0 } },
      { rotation: { x: 0, y: -Math.PI / 4, z: 0 }, position: { x: -0.4, y: 0, z: 0 } },
      
      // Spinning attacks
      { rotation: { x: 0, y: Math.PI / 2, z: Math.PI / 8 }, position: { x: 0.3, y: 0.1, z: 0.1 } },
      { rotation: { x: 0, y: -Math.PI / 2, z: -Math.PI / 8 }, position: { x: -0.3, y: 0.1, z: 0.1 } },
      
      // Low swings
      { rotation: { x: Math.PI / 3, y: 0, z: Math.PI / 6 }, position: { x: 0.2, y: -0.3, z: 0 } },
      { rotation: { x: Math.PI / 3, y: 0, z: -Math.PI / 6 }, position: { x: -0.2, y: -0.3, z: 0 } },
      
      // Cross cuts
      { rotation: { x: Math.PI / 6, y: Math.PI / 6, z: Math.PI / 6 }, position: { x: 0.2, y: 0.2, z: 0.1 } },
      { rotation: { x: -Math.PI / 6, y: -Math.PI / 6, z: -Math.PI / 6 }, position: { x: -0.2, y: -0.2, z: 0.1 } },
      
      // High cuts
      { rotation: { x: -Math.PI / 4, y: Math.PI / 8, z: Math.PI / 8 }, position: { x: 0.15, y: 0.35, z: 0.1 } },
      { rotation: { x: -Math.PI / 4, y: -Math.PI / 8, z: -Math.PI / 8 }, position: { x: -0.15, y: 0.35, z: 0.1 } }
    ];

    return patterns[swingType % patterns.length];
  }

  /**
   * Get weapon state summary for UI
   */
  static getWeaponStatus(state: WeaponState): {
    leftClip: number;
    rightClip: number;
    currentGun: 'left' | 'right';
    isReloading: boolean;
    totalAmmo: number;
  } {
    return {
      leftClip: state.leftClip,
      rightClip: state.rightClip,
      currentGun: state.currentGun,
      isReloading: state.isReloading,
      totalAmmo: state.leftClip + state.rightClip
    };
  }

  /**
   * Initialize weapon state
   */
  static createInitialState(): WeaponState {
    return {
      leftClip: PLAYER_CONFIG.weapons.maxClipSize,
      rightClip: PLAYER_CONFIG.weapons.maxClipSize,
      currentGun: 'left',
      lastShotTime: 0,
      lastSwingTime: 0,
      lastSwordDamageTime: 0,
      isReloading: false
    };
  }
}