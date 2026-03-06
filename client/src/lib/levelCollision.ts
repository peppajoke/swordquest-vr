/**
 * levelCollision.ts
 * Wall collision system for SwordQuestVR.
 * Supports both static fallback AABBs and dynamic scene-derived AABBs.
 * All coordinates are in WORLD space (X, Z — Y ignored for horizontal collision).
 * Format: [xMin, zMin, xMax, zMax]
 */
import * as THREE from 'three';

export type WallAABB = [number, number, number, number];

/**
 * Static fallback AABBs — used only if buildWallsFromScene hasn't been called yet
 * (e.g., VRControllers.tsx calling resolveWallCollision without passing walls).
 */
export const WALLS: WallAABB[] = [
  // ── CELL: walls removed — open starting area ────────────────────

  // ── MAIN CORRIDOR (z = -6 to -45, x = -4 to +4) ────────────────
  [-4.15, -45.0, -3.85,  -6.0],  // left wall
  [ 3.85, -45.0,  4.15,  -6.0],  // right wall

  // ── CROSS-HALLWAY (z = -40 to -52, x = -40 to +40) ─────────────
  // North wall left portion (x=-40 to -6, gap at -6 to +6 = corridor opening)
  [-40.0, -40.15, -6.0, -39.85],
  // North wall right portion (x=+6 to +40)
  [  6.0, -40.15, 40.0, -39.85],
  // Left end wall x=-40
  [-40.15, -52.0, -39.85, -40.0],
  // Right end wall x=+40
  [ 39.85, -52.0,  40.15, -40.0],
  // South wall OMITTED — back section is accessible through it

  // ── LEFT GUARD ROOM (x = -55 to -35, z = -25 to -55) ───────────
  [-55.0, -25.15, -35.0, -24.85],   // north wall
  [-55.0, -55.15, -35.0, -54.85],   // south wall
  [-55.15, -55.0, -54.85, -25.0],   // west wall
  // East wall has doorway gap at z = -37 to -43
  [-35.15, -37.0, -34.85, -25.0],   // east upper (z=-25 to -37)
  [-35.15, -55.0, -34.85, -43.0],   // east lower (z=-43 to -55)

  // ── RIGHT GUARD ROOM (x = +35 to +55, z = -25 to -55) ──────────
  [ 35.0, -25.15,  55.0, -24.85],   // north wall
  [ 35.0, -55.15,  55.0, -54.85],   // south wall
  [ 54.85, -55.0,  55.15, -25.0],   // east wall
  // West wall has doorway gap at z = -37 to -43
  [ 34.85, -37.0,  35.15, -25.0],   // west upper
  [ 34.85, -55.0,  35.15, -43.0],   // west lower

  // ── BACK SECTION (x = -25 to +25, z = -52 to -80) ──────────────
  [-25.15, -80.0, -24.85, -52.0],   // left wall
  [ 24.85, -80.0,  25.15, -52.0],   // right wall
  [-25.0,  -80.15, 25.0,  -79.85],  // back wall
];

/**
 * Build a WallAABB list from all scene objects tagged with userData.isWall = true.
 * Traverses the scene, computes each tagged object's world-space bounding box,
 * and returns the XZ extents as WallAABB entries.
 *
 * Call once after the scene is fully populated (e.g., on the first useFrame tick).
 * Re-call when the scene geometry changes (e.g., zone transitions).
 */
export function buildWallsFromScene(scene: THREE.Scene): WallAABB[] {
  const walls: WallAABB[] = [];
  const box = new THREE.Box3();

  scene.traverse((obj) => {
    if (obj.userData.isWall === true) {
      box.setFromObject(obj);
      if (!box.isEmpty()) {
        walls.push([box.min.x, box.min.z, box.max.x, box.max.z]);
      }
    }
  });

  return walls;
}

/**
 * Resolve a circular entity (x, z, radius) against all wall AABBs.
 * Returns the corrected (x, z) pushed out of any overlapping walls.
 * Call once per frame after computing the desired new position.
 *
 * @param walls  Optional wall list — pass wallsRef.current from the caller.
 *               Falls back to the static WALLS array (used by VR path).
 */
export function resolveWallCollision(
  x: number,
  z: number,
  radius: number,
  walls: WallAABB[] = WALLS,
): { x: number; z: number } {
  for (const [xMin, zMin, xMax, zMax] of walls) {
    // Closest point on AABB to circle center
    const cx = Math.max(xMin, Math.min(xMax, x));
    const cz = Math.max(zMin, Math.min(zMax, z));
    const dx = x - cx;
    const dz = z - cz;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      if (distSq > 0.0001) {
        // Normal push-out
        const dist = Math.sqrt(distSq);
        const push = (radius - dist) / dist;
        x += dx * push;
        z += dz * push;
      } else {
        // Center is exactly inside AABB — push out on the shortest axis
        const toLeft   = x - xMin;
        const toRight  = xMax - x;
        const toNear   = z - zMin;
        const toFar    = zMax - z;
        const minDist  = Math.min(toLeft, toRight, toNear, toFar);
        if      (minDist === toLeft)  x = xMin - radius;
        else if (minDist === toRight) x = xMax + radius;
        else if (minDist === toNear)  z = zMin - radius;
        else                          z = zMax + radius;
      }
    }
  }
  return { x, z };
}
