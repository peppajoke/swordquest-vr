import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';

export default function PlayerCollisionDetector() {
  const { camera, scene } = useThree();
  const { takeDamage, isDead } = useVRGame();
  const { playPlayerDamage } = useAudio();

  useFrame(() => {
    if (isDead) return; // Don't check collisions if player is dead

    const playerPos = camera.position.clone();
    const playerRadius = 0.5; // Player collision radius

    // Check collision with enemy projectiles
    scene.traverse((child) => {
      if (child.userData.isEnemyProjectile && child.parent) {
        const projectilePos = new THREE.Vector3();
        child.getWorldPosition(projectilePos);
        
        const distance = playerPos.distanceTo(projectilePos);
        if (distance < playerRadius) {
          // Player hit by projectile
          const damage = child.userData.damage || 15;
          takeDamage(damage);
          playPlayerDamage();
          console.log(`💥 Player hit by projectile! Took ${damage} damage!`);
          
          // Remove the projectile
          if (child.parent) {
            child.parent.removeFromParent();
          }
        }
      }
    });

    // Check collision with AOE explosions
    scene.traverse((child) => {
      if (child.userData.isExplosion && child.parent) {
        const explosionPos = new THREE.Vector3();
        child.getWorldPosition(explosionPos);
        
        const distance = playerPos.distanceTo(explosionPos);
        const explosionRadius = child.userData.radius || 3.0;
        
        if (distance < explosionRadius) {
          // Player caught in explosion
          const damage = child.userData.damage || 25;
          const falloffDamage = Math.max(5, damage * (1 - distance / explosionRadius));
          takeDamage(Math.floor(falloffDamage));
          playPlayerDamage();
          console.log(`💥 Player caught in explosion! Took ${Math.floor(falloffDamage)} damage!`);
          
          // Mark explosion as processed for this player
          child.userData.hitPlayer = true;
        }
      }
    });
  });

  return null; // This component doesn't render anything
}