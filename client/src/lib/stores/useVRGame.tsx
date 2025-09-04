import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import * as THREE from 'three';

interface Target {
  id: string;
  position: [number, number, number];
  destroyed: boolean;
}

interface HitEffect {
  id: string;
  position: { x: number, y: number, z: number };
  direction?: { x: number, y: number, z: number };
  timestamp: number;
}

interface SwordCollider {
  id: string;
  mesh: THREE.Group;
}

interface VRGameState {
  score: number;
  targets: Target[];
  hitEffects: HitEffect[];
  swordColliders: SwordCollider[];
  targetMeshes: { [key: string]: THREE.Mesh };
  swordClashCooldown: number;
  lastClashTime: number;
  health: number;
  maxHealth: number;
  
  // Endless runner mechanics
  gameSpeed: number;
  baseSpeed: number;
  speedIncrement: number;
  gameStartTime: number;
  distanceTraveled: number;
  lastSpawnZ: number;
  nextTargetId: number;

  // Actions
  initializeGame: () => void;
  destroyTarget: (id: string) => void;
  addHitEffect: (position: [number, number, number], direction?: THREE.Vector3) => void;
  addSwordCollider: (id: string, mesh: THREE.Group) => void;
  removeSwordCollider: (id: string) => void;
  registerTarget: (id: string, mesh: THREE.Mesh) => void;
  resetGame: () => void;
  handleSwordClash: (collisionPoint: THREE.Vector3, cameraPosition: THREE.Vector3, cameraDirection: THREE.Vector3) => void;
  canSwordClash: () => boolean;
  updateMovement: (deltaTime: number) => void;
  spawnNewTargets: () => void;
  cleanupOldTargets: (playerZ: number) => void;
  setHealth: (health: number) => void;
  takeDamage: (damage: number) => void;
  heal: (amount: number) => void;
}

const createInitialTargets = (): Target[] => [
  { id: 'target_1', position: [-2, 1.5, -2], destroyed: false },
  { id: 'target_2', position: [2, 1.5, -2], destroyed: false },
  { id: 'target_3', position: [0, 2, -3], destroyed: false },
  { id: 'target_4', position: [-1, 1, -1], destroyed: false },
  { id: 'target_5', position: [1, 1, -1], destroyed: false },
  { id: 'target_6', position: [0, 0.5, -2.5], destroyed: false },
];

export const useVRGame = create<VRGameState>()(
  subscribeWithSelector((set, get) => ({
    score: 0,
    targets: createInitialTargets(),
    hitEffects: [],
    swordColliders: [],
    targetMeshes: {},
    swordClashCooldown: 5000, // 5 seconds in milliseconds
    lastClashTime: 0,
    health: 100,
    maxHealth: 100,
    
    // Endless runner state
    gameSpeed: 0.02, // Initial forward movement speed
    baseSpeed: 0.02,
    speedIncrement: 0.001, // Speed increase per second
    gameStartTime: Date.now(),
    distanceTraveled: 0,
    lastSpawnZ: -10, // Z position of last spawned targets
    nextTargetId: 7, // Continue from existing targets

    initializeGame: () => {
      set({
        score: 0,
        targets: createInitialTargets(),
        hitEffects: [],
        swordColliders: [],
        targetMeshes: {},
        lastClashTime: 0,
        gameSpeed: 0.02,
        gameStartTime: Date.now(),
        distanceTraveled: 0,
        lastSpawnZ: -10,
        nextTargetId: 7
      });
    },

    destroyTarget: (id: string) => {
      const { targets, score } = get();
      const target = targets.find(t => t.id === id);
      
      if (target && !target.destroyed) {
        
        set({
          targets: targets.map(t => 
            t.id === id ? { ...t, destroyed: true } : t
          ),
          score: score + 10
        });

        // Play hit sound
        import('../stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playHit();
        });

        // Respawn individual target after 3 seconds
        setTimeout(() => {
          set(state => ({
            targets: state.targets.map(t => 
              t.id === id ? { ...t, destroyed: false } : t
            )
          }));
        }, 3000);
        
        // Check if all targets destroyed for bonus score
        const remainingTargets = targets.filter(t => t.id !== id && !t.destroyed);
        if (remainingTargets.length === 0) {
          set(state => ({ score: state.score + 50 })); // Bonus points
        }
      }
    },

    addHitEffect: (position: [number, number, number], direction?: THREE.Vector3) => {
      const effect: HitEffect = {
        id: `effect_${Date.now()}_${Math.random()}`,
        position: { x: position[0], y: position[1], z: position[2] },
        direction: direction ? { x: direction.x, y: direction.y, z: direction.z } : undefined,
        timestamp: Date.now()
      };

      set(state => ({
        hitEffects: [...state.hitEffects, effect]
      }));

      // Remove effect after 2 seconds
      setTimeout(() => {
        set(state => ({
          hitEffects: state.hitEffects.filter(e => e.id !== effect.id)
        }));
      }, 2000);
    },

    addSwordCollider: (id: string, mesh: THREE.Group) => {
      set(state => ({
        swordColliders: [
          ...state.swordColliders.filter(s => s.id !== id),
          { id, mesh }
        ]
      }));
    },

    removeSwordCollider: (id: string) => {
      set(state => ({
        swordColliders: state.swordColliders.filter(s => s.id !== id)
      }));
    },

    registerTarget: (id: string, mesh: THREE.Mesh) => {
      set(state => ({
        targetMeshes: {
          ...state.targetMeshes,
          [id]: mesh
        }
      }));
    },

    resetGame: () => {
      set({
        score: 0,
        targets: createInitialTargets(),
        hitEffects: [],
        swordColliders: [],
        targetMeshes: {},
        lastClashTime: 0,
        health: 100
      });
    },

    canSwordClash: () => {
      const { lastClashTime, swordClashCooldown } = get();
      const now = Date.now();
      return (now - lastClashTime) >= swordClashCooldown;
    },

    handleSwordClash: (collisionPoint: THREE.Vector3, cameraPosition: THREE.Vector3, cameraDirection: THREE.Vector3) => {
      const { canSwordClash } = get();
      
      if (!canSwordClash()) {
        return;
      }

      
      // Update last clash time
      set({ lastClashTime: Date.now() });
      
      // Create projectile from camera to collision point
      const projectileDirection = collisionPoint.clone().sub(cameraPosition).normalize();
      
      // Add hit effect at collision point with directional velocity
      const { addHitEffect } = get();
      addHitEffect([collisionPoint.x, collisionPoint.y, collisionPoint.z], projectileDirection);
      
      // Add sparkle effect at sword collision point
      addHitEffect([collisionPoint.x, collisionPoint.y, collisionPoint.z], new THREE.Vector3(0, 1, 0));
    },

    updateMovement: (deltaTime: number) => {
      const { gameSpeed, baseSpeed, speedIncrement, gameStartTime, distanceTraveled } = get();
      
      // Increase speed over time
      const timeElapsed = (Date.now() - gameStartTime) / 1000; // seconds
      const newSpeed = baseSpeed + (speedIncrement * timeElapsed);
      
      // Update distance traveled
      const newDistance = distanceTraveled + (newSpeed * deltaTime * 60); // 60fps assumption
      
      set({ 
        gameSpeed: newSpeed,
        distanceTraveled: newDistance
      });

      // Removed speed/distance momentum logging
    },

    spawnNewTargets: () => {
      const { lastSpawnZ, nextTargetId, targets } = get();
      
      // Spawn new targets ahead of player
      const spawnDistance = 20; // How far ahead to spawn
      const newSpawnZ = lastSpawnZ - spawnDistance;
      
      // Create new targets in various positions
      const newTargets: Target[] = [
        { id: `target_${nextTargetId}`, position: [-2, 1.5, newSpawnZ], destroyed: false },
        { id: `target_${nextTargetId + 1}`, position: [2, 1.5, newSpawnZ - 2], destroyed: false },
        { id: `target_${nextTargetId + 2}`, position: [0, 2, newSpawnZ - 4], destroyed: false },
        { id: `target_${nextTargetId + 3}`, position: [-1, 1, newSpawnZ - 6], destroyed: false },
        { id: `target_${nextTargetId + 4}`, position: [1, 1, newSpawnZ - 8], destroyed: false },
      ];
      
      
      set({ 
        targets: [...targets, ...newTargets],
        lastSpawnZ: newSpawnZ,
        nextTargetId: nextTargetId + 5
      });
    },

    cleanupOldTargets: (playerZ: number) => {
      const { targets } = get();
      
      // Remove targets that are far behind the player
      const cleanupDistance = 10;
      const cleanedTargets = targets.filter(target => 
        target.position[2] > (playerZ + cleanupDistance)
      );
      
      if (cleanedTargets.length !== targets.length) {
        set({ targets: cleanedTargets });
      }
    },

    setHealth: (health: number) => {
      const { maxHealth } = get();
      set({ health: Math.max(0, Math.min(maxHealth, health)) });
    },

    takeDamage: (damage: number) => {
      const { health } = get();
      set({ health: Math.max(0, health - damage) });
    },

    heal: (amount: number) => {
      const { health, maxHealth } = get();
      set({ health: Math.min(maxHealth, health + amount) });
    }
  }))
);
