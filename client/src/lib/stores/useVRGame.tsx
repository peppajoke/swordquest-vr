import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import * as THREE from 'three';
import type { MeleeWeaponId, RangedWeaponId } from '../weapons';

interface Target {
  id: string;
  position: [number, number, number];
  destroyed: boolean;
}

interface Pillar {
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

interface DropOrb {
  id: string;
  type: 'health' | 'xp';
  position: [number, number, number];
  spawnTime: number;
}

interface DroppedWeapon {
  id: string;
  type: 'melee' | 'ranged';
  weaponId: MeleeWeaponId | RangedWeaponId;
  position: [number, number, number];
}

interface VRGameState {
  score: number;
  targets: Target[];
  pillars: Pillar[];
  hitEffects: HitEffect[];
  swordColliders: SwordCollider[];
  targetMeshes: { [key: string]: THREE.Mesh };
  swordClashCooldown: number;
  lastClashTime: number;
  health: number;
  maxHealth: number;
  isDead: boolean;
  gameOver: boolean;
  inDeathRoom: boolean;
  gameStarted: boolean;
  gameResetKey: number;
  xp: number;
  dropOrbs: DropOrb[];
  killCount: number;
  comboCount: number;
  comboTimer: number;
  runStartTime: number;
  
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
  explodePillar: (id: string) => void;
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
  addKill: () => void;
  resetRun: () => void;

  // Drop orb management
  addDropOrb: (orb: DropOrb) => void;
  removeDropOrb: (id: string) => void;
  addXP: (amount: number) => void;

  // Room / wave state
  roomCleared: boolean;
  setRoomCleared: (v: boolean) => void;

  // Upgrade screen
  showUpgradeScreen: boolean;
  setShowUpgradeScreen: (v: boolean) => void;

  setHealth: (health: number) => void;
  takeDamage: (damage: number) => void;
  heal: (amount: number) => void;
  respawn: () => void;
  setGameOver: (gameOver: boolean) => void;
  enterDeathRoom: () => void;
  exitDeathRoom: () => void;
  startGame: () => void;

  // Desktop mode state
  activeWeapon: 'sword' | 'gun' | null;
  isBoostActive: boolean;
  weaponLocked: boolean; // true after pickup — can't switch weapon class
  pickupPhase: boolean;  // true until player picks up a starting weapon
  setActiveWeapon: (weapon: 'sword' | 'gun' | null) => void;
  setBoostActive: (active: boolean) => void;
  setWeaponLocked: (locked: boolean) => void;
  setPickupPhase: (active: boolean) => void;

  // 4-slot weapon inventory
  weaponInventory: {
    melee: [MeleeWeaponId | null, MeleeWeaponId | null];
    ranged: [RangedWeaponId | null, RangedWeaponId | null];
  };
  activeMeleeSlot: 0 | 1;
  activeRangedSlot: 0 | 1;
  getActiveMelee: () => MeleeWeaponId | null;
  getActiveRanged: () => RangedWeaponId | null;
  pickupWeapon: (type: 'melee' | 'ranged', weaponId: MeleeWeaponId | RangedWeaponId) => boolean;
  dropWeapon: (type: 'melee' | 'ranged', slot: 0 | 1) => MeleeWeaponId | RangedWeaponId | null;
  setActiveMeleeSlot: (slot: 0 | 1) => void;
  setActiveRangedSlot: (slot: 0 | 1) => void;
  // Dropped weapon pickups (spawned when player drops)
  droppedWeapons: DroppedWeapon[];
  addDroppedWeapon: (weapon: DroppedWeapon) => void;
  removeDroppedWeapon: (id: string) => void;
  // Legacy compat — kept for upgrade screen / VR path
  activeMeleeWeapon: string;
  activeRangedWeapon: string;
  playerStats: { str: number; agi: number; vit: number };
  setActiveMeleeWeapon: (id: string) => void;
  setActiveRangedWeapon: (id: string) => void;
  setPlayerStats: (stats: { str: number; agi: number; vit: number }) => void;
  // Desktop fuel (mirrored from DesktopControls for HUD)
  desktopFuel: number;
  setDesktopFuel: (fuel: number) => void;

  // Desktop ammo HUD state (shared so DesktopUI can read without prop drilling)
  desktopLeftClip: number;
  desktopRightClip: number;
  desktopCurrentGun: 'left' | 'right';
  desktopIsReloading: boolean;
  setDesktopAmmo: (left: number, right: number, gun: 'left' | 'right', reloading: boolean) => void;
}

const createInitialTargets = (): Target[] => [];

const createInitialPillars = (): Pillar[] => [];

export const useVRGame = create<VRGameState>()(
  subscribeWithSelector((set, get) => ({
    score: 0,
    targets: [],
    pillars: [],
    hitEffects: [],
    swordColliders: [],
    targetMeshes: {},
    swordClashCooldown: 5000, // 5 seconds in milliseconds
    lastClashTime: 0,
    health: 100,
    maxHealth: 100,
    isDead: false,
    gameOver: false,
    inDeathRoom: false,
    gameStarted: true,
    gameResetKey: 0,
    xp: 0,
    dropOrbs: [],
    killCount: 0,
    runStartTime: Date.now(),
    activeWeapon: null as 'sword' | 'gun' | null,
    isBoostActive: false,
    weaponLocked: false,
    pickupPhase: true,
    weaponInventory: {
      melee: [null, null] as [MeleeWeaponId | null, MeleeWeaponId | null],
      ranged: [null, null] as [RangedWeaponId | null, RangedWeaponId | null],
    },
    activeMeleeSlot: 0 as 0 | 1,
    activeRangedSlot: 0 as 0 | 1,
    droppedWeapons: [] as DroppedWeapon[],
    activeMeleeWeapon: 'longsword',
    activeRangedWeapon: 'pistols',
    playerStats: { str: 0, agi: 0, vit: 0 },
    desktopFuel: 100,
    desktopLeftClip: 12,
    desktopRightClip: 12,
    desktopCurrentGun: 'left' as 'left' | 'right',
    desktopIsReloading: false,
    comboCount: 0,
    comboTimer: 0,

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
        health: 100,
        maxHealth: 100,
        isDead: false,
        gameOver: false,
        targets: createInitialTargets(),
        pillars: createInitialPillars(),
        hitEffects: [],
        swordColliders: [],
        targetMeshes: {},
        lastClashTime: 0,
        gameSpeed: 0.02,
        gameStartTime: Date.now(),
        distanceTraveled: 0,
        lastSpawnZ: -10,
        nextTargetId: 7,
        inDeathRoom: false,
        gameStarted: true,
        killCount: 0,
        runStartTime: Date.now(),
      });
    },

    destroyTarget: (id: string) => {
      const { targets, score } = get();
      const target = targets.find(t => t.id === id);
      
      if (target && !target.destroyed) {
        
        set(state => ({
          targets: targets.map(t => 
            t.id === id ? { ...t, destroyed: true } : t
          ),
          score: score + 10,
          killCount: state.killCount + 1,
        }));

        // Play sword hit sound - direct access to avoid async issues
        try {
          const audioStore = require('../stores/useAudio').useAudio;
          audioStore.getState().playSwordHit();
        } catch (error) {
          console.log('🔊 Sword hit sound error:', error);
        }

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

    explodePillar: (id: string) => {
      const { pillars, score } = get();
      const pillar = pillars.find(p => p.id === id);
      
      if (pillar && !pillar.destroyed) {
        set({
          pillars: pillars.map(p => 
            p.id === id ? { ...p, destroyed: true } : p
          ),
          score: score + 20 // More points for pillars
        });

        // Play sword hit sound for pillar destruction
        try {
          const audioStore = require('../stores/useAudio').useAudio;
          audioStore.getState().playSwordHit();
        } catch (error) {
          console.log('🔊 Sword hit sound error:', error);
        }

        // Remove pillar completely after 2 seconds
        setTimeout(() => {
          set(state => ({
            pillars: state.pillars.filter(p => p.id !== id)
          }));
        }, 2000);
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
        health: 100,
        isDead: false,
        gameOver: false
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

    incrementKillCount: () => {
      set(state => ({ killCount: state.killCount + 1 }));
    },

    setHealth: (health: number) => {
      const { maxHealth } = get();
      set({ health: Math.max(0, Math.min(maxHealth, health)) });
    },

    takeDamage: (damage: number) => {
      const state = get();
      if (state.isDead) return;
      
      const newHealth = Math.max(0, state.health - damage);
      const isDead = newHealth <= 0;
      
      if (isDead) {
        console.log('💀 Died — respawning at prison start, weapons cleared, stats kept');
        // Short invincibility window then respawn — keep stats, clear weapons
        setTimeout(() => {
          set((s) => ({
            health: s.maxHealth,
            isDead: false,
            gameOver: false,
            killCount: 0,
            comboCount: 0,
            comboTimer: 0,
            roomCleared: false,
            showUpgradeScreen: false,
            activeWeapon: null,
            activeMeleeSlot: 0,
            activeRangedSlot: 0,
            weaponInventory: { melee: [null, null], ranged: [null, null] },
            droppedWeapons: [],
            pickupPhase: true,
            gameResetKey: (s.gameResetKey || 0) + 1,
            // playerStats intentionally NOT reset — stats persist through death
          }));
        }, 800); // 800ms delay so the hit flash registers before respawn
        set({ health: 0, isDead: true });
      } else {
        set({ health: newHealth });
        console.log(`💥 Took ${damage} damage! Health: ${newHealth}/${state.maxHealth}`);
      }
    },

    heal: (amount: number) => {
      const state = get();
      if (state.isDead) return;
      
      const newHealth = Math.min(state.maxHealth, state.health + amount);
      set({ health: newHealth });
    },
    
    respawn: () => {
      // Full game reset - reset everything including enemies
      set((state) => ({
        health: 100,
        isDead: false,
        gameOver: false,
        score: 0,
        inDeathRoom: false,
        killCount: 0,
        runStartTime: Date.now(),
        gameResetKey: (state.gameResetKey || 0) + 1 // Force enemy reset
      }));
      console.log('🔄 Game Reset! All enemies restored.');
    },
    
    setGameOver: (gameOver: boolean) => {
      set({ gameOver });
    },
    
    enterDeathRoom: () => {
      set({
        inDeathRoom: true,
        isDead: true,
        gameOver: false
      });
      console.log('🏠 Entered death room - slash the Play Again box to respawn!');
    },
    
    exitDeathRoom: () => {
      const { gameStarted } = get();
      if (!gameStarted) {
        // First time starting the game
        get().startGame();
      } else {
        // Respawning after death
        set({
          inDeathRoom: false,
          isDead: false,
          health: 100,
          gameOver: false,
          score: 0
        });
        console.log('🔄 Exiting death room and respawning!');
      }
    },
    
    startGame: () => {
      set({
        inDeathRoom: false,
        isDead: false,
        health: 100,
        gameOver: false,
        score: 0,
        gameStarted: true,
        killCount: 0,
        runStartTime: Date.now(),
      });
      console.log('🎮 Game Started! Welcome to VR Sword Fighter!');
    },

    setActiveWeapon: (weapon: 'sword' | 'gun' | null) => {
      set({ activeWeapon: weapon });
    },

    setBoostActive: (active: boolean) => {
      set({ isBoostActive: active });
    },
    setWeaponLocked: (locked: boolean) => { set({ weaponLocked: locked }); },
    setPickupPhase: (active: boolean) => { set({ pickupPhase: active }); },

    getActiveMelee: () => {
      const { weaponInventory, activeMeleeSlot } = get();
      return weaponInventory.melee[activeMeleeSlot];
    },
    getActiveRanged: () => {
      const { weaponInventory, activeRangedSlot } = get();
      return weaponInventory.ranged[activeRangedSlot];
    },
    pickupWeapon: (type: 'melee' | 'ranged', weaponId: MeleeWeaponId | RangedWeaponId): boolean => {
      const { weaponInventory } = get();
      const slots = weaponInventory[type];
      const emptyIdx = slots.findIndex(s => s === null);
      if (emptyIdx === -1) return false; // both slots full
      const newSlots = [...slots] as [MeleeWeaponId | null, MeleeWeaponId | null] | [RangedWeaponId | null, RangedWeaponId | null];
      newSlots[emptyIdx] = weaponId as any;
      set({
        weaponInventory: {
          ...weaponInventory,
          [type]: newSlots,
        },
      });
      return true;
    },
    dropWeapon: (type: 'melee' | 'ranged', slot: 0 | 1): MeleeWeaponId | RangedWeaponId | null => {
      const { weaponInventory } = get();
      const weaponId = weaponInventory[type][slot];
      if (weaponId === null) return null;
      const newSlots = [...weaponInventory[type]] as typeof weaponInventory[typeof type];
      newSlots[slot] = null;
      set({
        weaponInventory: {
          ...weaponInventory,
          [type]: newSlots,
        },
      });
      return weaponId;
    },
    setActiveMeleeSlot: (slot: 0 | 1) => { set({ activeMeleeSlot: slot }); },
    setActiveRangedSlot: (slot: 0 | 1) => { set({ activeRangedSlot: slot }); },
    addDroppedWeapon: (weapon: DroppedWeapon) => {
      set(state => ({ droppedWeapons: [...state.droppedWeapons, weapon] }));
    },
    removeDroppedWeapon: (id: string) => {
      set(state => ({ droppedWeapons: state.droppedWeapons.filter(w => w.id !== id) }));
    },
    setActiveMeleeWeapon: (id: string) => { set({ activeMeleeWeapon: id }); },
    setActiveRangedWeapon: (id: string) => { set({ activeRangedWeapon: id }); },
    setPlayerStats: (stats: { str: number; agi: number; vit: number }) => { set({ playerStats: stats }); },
    setDesktopFuel: (fuel: number) => { set({ desktopFuel: fuel }); },

    setDesktopAmmo: (left: number, right: number, gun: 'left' | 'right', reloading: boolean) => {
      set({ desktopLeftClip: left, desktopRightClip: right, desktopCurrentGun: gun, desktopIsReloading: reloading });
    },

    addKill: () => {
      const now = Date.now();
      const { killCount, comboCount, comboTimer } = get();
      const withinCombo = now - comboTimer < 3000;
      set({
        killCount: killCount + 1,
        comboCount: withinCombo ? comboCount + 1 : 1,
        comboTimer: now,
      });
    },

    resetRun: () => {
      set({ killCount: 0, comboCount: 0, comboTimer: 0 });
    },

    addDropOrb: (orb: DropOrb) => {
      set(state => ({ dropOrbs: [...state.dropOrbs, orb] }));
    },

    removeDropOrb: (id: string) => {
      set(state => ({ dropOrbs: state.dropOrbs.filter(o => o.id !== id) }));
    },

    addXP: (amount: number) => {
      set(state => ({ xp: state.xp + amount }));
    },

    // Room / wave state
    roomCleared: false,
    setRoomCleared: (v: boolean) => {
      set({ roomCleared: v });
      if (v) {
        // Show upgrade screen after a 2-second delay
        setTimeout(() => {
          set({ showUpgradeScreen: true });
        }, 2000);
      }
    },

    // Upgrade screen
    showUpgradeScreen: false,
    setShowUpgradeScreen: (v: boolean) => { set({ showUpgradeScreen: v }); },
  }))
);
