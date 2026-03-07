/**
 * Central Game Configuration
 * All hardcoded values and magic numbers are consolidated here for easy balancing and modification
 */

export const GAME_CONFIG = {
  // Player Settings
  player: {
    health: {
      max: 100,
      lowThreshold: 30, // Below 30% shows red
      mediumThreshold: 60, // Below 60% shows orange
    },
    movement: {
      maxSpeed: 8.0,
      accelerationRate: 6.0,
      turnRate: 0.3,
      walkSpeed: 3.5,
      jetpackSpeed: 8,
      gravity: -9.8,
      jumpVelocity: 6,
      groundLevel: 1.8,
      playerRadius: 0.5,
      roomBounds: 95,
    },
    jetpack: {
      maxFuel: 100,
      fuelDrainRate: 3.0,
      fuelRechargeRate: 8.0,
      fuelPenaltyRecovery: 15.0,
      fuelDrainAirborne: 60, // 4x faster when airborne
      fuelDrainGrounded: 15,
    },
    weapons: {
      maxClipSize: 12,
      shotCooldown: 100, // ms
      reloadTimeout: 2000, // ms
      autoReloadDelay: 100, // ms
      swordDamageCooldown: 100, // ms
      swingCooldown: 300, // ms
      swingDuration: 150, // ms
      swordDamage: 25, // Lower damage for continuous hits
      swordDamageVR: 45, // Higher VR sword damage
      gunDamage: 4, // Pistol damage
    },
    burst: {
      minBoost: 1.5,
      maxBoost: 3.0,
    },
  },

  // Combat Settings
  combat: {
    collision: {
      maxCheckDistance: 100, // Distance for any AI behavior
      closeDistance: 30, // Distance for full AI updates
      midDistance: 60, // Distance for reduced AI updates
      collisionCheckDistance: 50, // VR collision detection range
      swordCheckDistance: 25, // Desktop sword collision range
      
      // Collision distances for different objects
      pillarHitDistance: 1.0,
      turretHitDistance: 1.5,
      enemyHitDistance: 1.2,
      playAgainBoxDistance: 2.0,
      bulletCollisionDistance: 0.3,
      bulletCancelDistance: 0.1,
    },
    
    projectiles: {
      maxDistance: 100,
      speed: 4.0,
      bulletRemovalDistance: 100,
    },

    explosions: {
      defaultRadius: 3.0,
      defaultDamage: 15,
    },
  },

  // Performance Settings
  performance: {
    frameSkipping: {
      closeFrameSkip: 1, // Update every frame for close enemies
      midFrameSkip: 2, // Update every 2nd frame for mid-range
      farFrameSkip: 4, // Update every 4th frame for distant enemies
    },
    
    optimization: {
      maxActiveEnemies: 100,
      cullingDistance: 150,
    },
  },

  // UI Settings
  ui: {
    healthBar: {
      lowHealthThreshold: 30,
      mediumHealthThreshold: 60,
    },
    
    debug: {
      maxEventLogs: 10,
      maxErrorLogs: 3,
      updateInterval: 100, // ms
    },
    
    overlay: {
      vrPosition: { x: -0.6, y: -0.4, z: 0.8 },
    },
  },

  // World Settings
  world: {
    lighting: {
      ambientIntensity: 0.6,
      directionalIntensity: 1.0,
      shadowMapSize: { width: 1024, height: 1024 },
      shadowCameraFar: 50,
      shadowCameraNear: 0.1,
    },
    
    camera: {
      fov: 75,
      near: 0.1,
      far: 1000,
    },
    
    walls: {
      dimensions: { width: 200, height: 20, depth: 2 },
      ceilingDimensions: { width: 200, height: 100 },
    },
    
    turrets: {
      health: 100,
      detectionRange: 25,
      shootingRange: 20,
      shootInterval: 2000, // ms
      bulletSpeed: 4.0,
      damage: 20,
    },
  },

  // Animation Settings
  animations: {
    deathSequence: {
      redPhase: 500, // ms
      fadePhase: 1000, // ms (500ms to 1500ms)
      dissolveStart: 1500, // ms
    },
    
    sword: {
      swingDuration: 150, // ms
      swingTypes: 20, // Total number of swing patterns
    },
    
    loading: {
      stepDuration: 1000, // ms per loading step
      finalDelay: 500, // ms before completion
    },
  },

  // Audio Settings
  audio: {
    volumes: {
      master: 1.0,
      sfx: 0.8,
      music: 0.6,
    },
  },

  // Visual Effects
  effects: {
    laser: {
      radius: 0.005,
      segments: 8,
      opacity: 0.8,
      emissiveIntensity: 1.5,
    },
    
    explosion: {
      scaleMultiplier: 0.1,
      rotationSpeed: 0.2,
      maxScale: 2.0,
    },
  },

  // Development Settings
  dev: {
    debugMode: false,
    showCollisionBoxes: false,
    showPerformanceStats: false,
  },
} as const;

// Type-safe config access helpers
export type GameConfig = typeof GAME_CONFIG;

// Convenience exports for commonly used values
export const PLAYER_CONFIG = GAME_CONFIG.player;
export const COMBAT_CONFIG = GAME_CONFIG.combat;
export const PERFORMANCE_CONFIG = GAME_CONFIG.performance;
export const UI_CONFIG = GAME_CONFIG.ui;
export const WORLD_CONFIG = GAME_CONFIG.world;
export const ANIMATION_CONFIG = GAME_CONFIG.animations;