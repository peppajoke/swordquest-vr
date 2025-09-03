import * as THREE from 'three';

export interface AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export function getAABB(object: THREE.Object3D): AABB {
  const box = new THREE.Box3().setFromObject(object);
  return {
    min: box.min,
    max: box.max
  };
}

export function checkCollision(aabb1: AABB, aabb2: AABB): boolean {
  return (
    aabb1.min.x <= aabb2.max.x &&
    aabb1.max.x >= aabb2.min.x &&
    aabb1.min.y <= aabb2.max.y &&
    aabb1.max.y >= aabb2.min.y &&
    aabb1.min.z <= aabb2.max.z &&
    aabb1.max.z >= aabb2.min.z
  );
}

export function checkSphereCollision(
  pos1: THREE.Vector3, 
  radius1: number,
  pos2: THREE.Vector3, 
  radius2: number
): boolean {
  const distance = pos1.distanceTo(pos2);
  return distance <= (radius1 + radius2);
}

export function getWorldPosition(object: THREE.Object3D): THREE.Vector3 {
  const worldPosition = new THREE.Vector3();
  object.getWorldPosition(worldPosition);
  return worldPosition;
}

export function logCollision(object1: string, object2: string, position: THREE.Vector3) {
  console.log(`Collision detected: ${object1} -> ${object2} at position:`, {
    x: position.x.toFixed(2),
    y: position.y.toFixed(2),
    z: position.z.toFixed(2)
  });
}
