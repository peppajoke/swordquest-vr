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

  // Actions
  initializeGame: () => void;
  destroyTarget: (id: string) => void;
  addHitEffect: (position: [number, number, number]) => void;
  addSwordCollider: (id: string, mesh: THREE.Group) => void;
  removeSwordCollider: (id: string) => void;
  registerTarget: (id: string, mesh: THREE.Mesh) => void;
  resetGame: () => void;
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

    initializeGame: () => {
      console.log('VRGame: Initializing game state');
      set({
        score: 0,
        targets: createInitialTargets(),
        hitEffects: [],
        swordColliders: [],
        targetMeshes: {}
      });
    },

    destroyTarget: (id: string) => {
      const { targets, score } = get();
      const target = targets.find(t => t.id === id);
      
      if (target && !target.destroyed) {
        console.log(`VRGame: Destroying target ${id}, score: ${score + 10}`);
        
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

        // Check if all targets destroyed
        const remainingTargets = targets.filter(t => t.id !== id && !t.destroyed);
        if (remainingTargets.length === 0) {
          console.log('VRGame: All targets destroyed! Respawning...');
          setTimeout(() => {
            set({
              targets: createInitialTargets()
            });
          }, 2000);
        }
      }
    },

    addHitEffect: (position: [number, number, number]) => {
      const effect: HitEffect = {
        id: `effect_${Date.now()}_${Math.random()}`,
        position: { x: position[0], y: position[1], z: position[2] },
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
      console.log('VRGame: Resetting game');
      set({
        score: 0,
        targets: createInitialTargets(),
        hitEffects: [],
        swordColliders: [],
        targetMeshes: {}
      });
    }
  }))
);
