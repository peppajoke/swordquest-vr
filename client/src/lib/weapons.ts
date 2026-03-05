import weaponConfig from '../data/weaponConfig.json';

export type MeleeWeaponId = keyof typeof weaponConfig.melee;
export type RangedWeaponId = keyof typeof weaponConfig.ranged;

export interface PlayerStats {
  str: number; // Strength  — melee damage multiplier
  agi: number; // Agility   — swing speed + reload speed
  vit: number; // Vitality  — max health
}

// Stat scaling formulas
// AGI 0–10: up to 40% faster swing / 60% faster reload
// STR 0–10: up to 80% more melee damage
export function computeSwingDuration(baseSeconds: number, agi: number): number {
  return baseSeconds * Math.max(0.5, 1 - agi * 0.04);
}

export function computeMeleeDamage(baseDamage: number, str: number): number {
  return Math.floor(baseDamage * (1 + str * 0.08));
}

export function computeReloadTime(baseMs: number, agi: number): number {
  return Math.floor(baseMs * Math.max(0.4, 1 - agi * 0.06));
}

export function getMeleeWeapon(id: MeleeWeaponId) {
  return weaponConfig.melee[id];
}

export function getRangedWeapon(id: RangedWeaponId) {
  return weaponConfig.ranged[id];
}

export const DEFAULT_MELEE: MeleeWeaponId = 'longsword';
export const DEFAULT_RANGED: RangedWeaponId = 'pistols';

// Starting bonus: sword pick → +2 STR, gun pick → +2 AGI
export function getStartingStats(weaponChoice: 'sword' | 'gun'): PlayerStats {
  return weaponChoice === 'sword'
    ? { str: 2, agi: 0, vit: 0 }
    : { str: 0, agi: 2, vit: 0 };
}
