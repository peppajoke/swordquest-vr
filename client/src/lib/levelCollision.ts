/**
 * levelCollision.ts
 * Axis-aligned wall AABBs derived from GameObjects.tsx geometry.
 * All coordinates are in WORLD space (X, Z — Y ignored for horizontal collision).
 * Format: [xMin, zMin, xMax, zMax]
 */
export type WallAABB = [number, number, number, number];

export const WALLS: WallAABB[] = [
  // ── CELL (z = 0 to -6) ──────────────────────────────────────────
  // Back wall at z=+0.5 (behind spawn)
  [-3.5,  0.35,   3.5,  0.65],
  // Left wall x=-3.5 (mesh center -3.5, half-width 0.15)
  [-3.65, -6.5,  -3.35,  0.5],
  // Right wall x=+3.5
  [ 3.35, -6.5,   3.65,  0.5],

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
 * Resolve a circular entity (x, z, radius) against all wall AABBs.
 * Returns the corrected (x, z) pushed out of any overlapping walls.
 * Call once per frame after computing the desired new position.
 */
export function resolveWallCollision(
  x: number,
  z: number,
  radius: number,
): { x: number; z: number } {
  for (const [xMin, zMin, xMax, zMax] of WALLS) {
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
