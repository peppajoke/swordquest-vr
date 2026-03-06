/**
 * zones.ts — Zone definitions for SwordQuestVR checkpoint/zone progression system.
 * All positions are LOCAL to the worldGroup (which sits at scene position [0, 0, 10]).
 * Camera (player) is in scene world space. local_z + 10 = world_z.
 */

export type ZoneId = 'prison' | 'canyon' | 'dungeon' | 'area_a' | 'area_b';

export interface ZoneEnemyConfig {
  type: string;
  position: [number, number, number]; // local to worldGroup
  maxHealth?: number; // override enemyConfig.json health
}

export interface ZoneConfig {
  id: ZoneId;
  displayName: string;
  /** Camera world-space position after teleport (local + 10 in z) */
  playerSpawnWorld: [number, number, number];
  /** Camera bounds in local worldGroup coordinate space */
  cameraBounds: { xMin: number; xMax: number; zMin: number; zMax: number };
  enemies: ZoneEnemyConfig[];
}

export const ZONES: Record<ZoneId, ZoneConfig> = {
  prison: {
    id: 'prison',
    displayName: 'PRISON',
    playerSpawnWorld: [0, 1.7, -1],
    cameraBounds: { xMin: -60, xMax: 60, zMin: -82, zMax: 1 },
    enemies: [
      { type: 'grunt', position: [0, 0, -38] },
      { type: 'grunt', position: [-2, 0, -43] },
      { type: 'grunt', position: [-20, 0, -44] },
      { type: 'grunt', position: [20, 0, -46] },
      { type: 'grunt', position: [-47, 0, -40] },
      { type: 'grunt', position: [47, 0, -40] },
      { type: 'grunt', position: [0, 0, -68] },
    ],
  },

  canyon: {
    id: 'canyon',
    displayName: 'CANYON FIELD',
    // Teleport to world z=-80, which is local z=-90 (10 units inside canyon start)
    playerSpawnWorld: [0, 1.7, -78],
    cameraBounds: { xMin: -65, xMax: 65, zMin: -205, zMax: -65 },
    enemies: [
      { type: 'grunt',    position: [-20, 0, -95]  },
      { type: 'grunt',    position: [15,  0, -100] },
      { type: 'rifleman', position: [30,  0, -115] },
      { type: 'grunt',    position: [-35, 0, -122] },
      { type: 'rifleman', position: [10,  0, -132] },
      { type: 'grunt',    position: [-10, 0, -140] },
      { type: 'grunt',    position: [42,  0, -145] },
      { type: 'rifleman', position: [-30, 0, -155] },
      { type: 'grunt',    position: [22,  0, -162] },
      { type: 'grunt',    position: [-44, 0, -168] },
      { type: 'rifleman', position: [5,   0, -176] },
      { type: 'grunt',    position: [-18, 0, -185] },
    ],
  },

  dungeon: {
    id: 'dungeon',
    displayName: 'DUNGEON',
    // Inside dungeon room (local x=-50 to -60, z=-125 to -135)
    playerSpawnWorld: [-50, 1.7, -118],
    cameraBounds: { xMin: -84, xMax: -16, zMin: -164, zMax: -108 },
    enemies: [
      { type: 'grunt', position: [-35, 0, -130], maxHealth: 100 },
      { type: 'grunt', position: [-50, 0, -135], maxHealth: 100 },
      { type: 'grunt', position: [-65, 0, -130], maxHealth: 100 },
      { type: 'grunt', position: [-40, 0, -143], maxHealth: 100 },
      { type: 'grunt', position: [-55, 0, -145], maxHealth: 100 },
      { type: 'grunt', position: [-70, 0, -143], maxHealth: 100 },
      { type: 'grunt', position: [-35, 0, -155], maxHealth: 100 },
      { type: 'grunt', position: [-65, 0, -155], maxHealth: 100 },
    ],
  },

  area_a: {
    id: 'area_a',
    displayName: 'AREA A',
    playerSpawnWorld: [-20, 1.7, -185],
    cameraBounds: { xMin: -65, xMax: 65, zMin: -205, zMax: -65 },
    enemies: [],
  },

  area_b: {
    id: 'area_b',
    displayName: 'AREA B',
    playerSpawnWorld: [20, 1.7, -185],
    cameraBounds: { xMin: -65, xMax: 65, zMin: -205, zMax: -65 },
    enemies: [],
  },
};
