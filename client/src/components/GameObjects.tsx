import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import Enemy from './Enemy';
import enemySpawns from '../data/enemySpawns.json';

export default function GameObjects() {
  const { pillars } = useVRGame();
  
  // No more ammo pickups - removed for auto-recharge system
  
  // No turrets in starting room
  const turrets = useMemo(() => [], []);
  
  // Add invisible collision boxes for walls
  useFrame(() => {
    // Wall collision is handled in VRControllers via userData.isWall
  });

  return (
    <>
      {/* 5x Bigger Room Walls with collision */}
      {/* Back wall */}
      <mesh position={[0, 10, -100]} receiveShadow userData={{ isWall: true }}>
        <boxGeometry args={[200, 20, 2]} />
        <meshLambertMaterial color="#8B4513" />
      </mesh>
      
      {/* Left wall */}
      <mesh position={[-100, 10, -50]} rotation={[0, Math.PI / 2, 0]} receiveShadow userData={{ isWall: true }}>
        <boxGeometry args={[100, 20, 2]} />
        <meshLambertMaterial color="#8B4513" />
      </mesh>
      
      {/* Right wall */}
      <mesh position={[100, 10, -50]} rotation={[0, Math.PI / 2, 0]} receiveShadow userData={{ isWall: true }}>
        <boxGeometry args={[100, 20, 2]} />
        <meshLambertMaterial color="#8B4513" />
      </mesh>
      
      {/* Front wall (partial, with opening) */}
      <mesh position={[-50, 10, 0]} receiveShadow userData={{ isWall: true }}>
        <boxGeometry args={[80, 20, 2]} />
        <meshLambertMaterial color="#8B4513" />
      </mesh>
      <mesh position={[50, 10, 0]} receiveShadow userData={{ isWall: true }}>
        <boxGeometry args={[80, 20, 2]} />
        <meshLambertMaterial color="#8B4513" />
      </mesh>
      
      {/* Grey Ceiling */}
      <mesh position={[0, 20, -50]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 100]} />
        <meshLambertMaterial color="#808080" />
      </mesh>
      
      {/* ENEMY ARMY - Spawned from configuration data */}
      {enemySpawns.spawns.map((spawn, index) => (
        <Enemy
          key={`${spawn.type}-${index}`}
          type={spawn.type as any}
          position={spawn.position as [number, number, number]}
        />
      ))}
      
      {/* All red pillars removed per user request */}
    </>
  );
}

// RedPillar component removed per user request

// AmmoPickup component removed - using auto-recharge system instead

function TurretTower({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const lastShotTime = useRef(0);
  const turretHealth = useRef(100); // Turrets have 100 health
  const isDead = useRef(false);
  const turretBullets = useRef<Array<{
    id: string;
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    startTime: number;
  }>>([]);

  useFrame((state, deltaTime) => {
    if (!groupRef.current || isDead.current) return;
    
    const currentTime = Date.now();
    const { camera, scene } = state;
    
    // Mark as turret for collision detection
    groupRef.current.userData.isTurret = true;
    groupRef.current.userData.health = turretHealth.current;
    
    // Check if turret is destroyed
    if (turretHealth.current <= 0 && !isDead.current) {
      isDead.current = true;
      // Destruction animation
      const destroyAnimation = () => {
        if (groupRef.current) {
          groupRef.current.scale.multiplyScalar(1.1);
          groupRef.current.rotation.x += 0.1;
          groupRef.current.rotation.z += 0.1;
          
          if (groupRef.current.scale.x < 3) {
            requestAnimationFrame(destroyAnimation);
          } else {
            // Complete despawn
            scene.remove(groupRef.current);
            // Clean up all turret bullets
            turretBullets.current.forEach(bullet => {
              scene.remove(bullet.mesh);
            });
            turretBullets.current = [];
          }
        }
      };
      destroyAnimation();
      return;
    }
    
    // Aim at player (camera position)
    const turretPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(turretPos);
    turretPos.y += 1.5; // Turret barrel height
    
    const playerPos = camera.position.clone();
    const distance = turretPos.distanceTo(playerPos);
    
    // Define detection range and shooting range
    const detectionRange = 25; // Turret detects player within 25 units
    const shootingRange = 20;  // Turret shoots within 20 units
    const canSeePlayer = distance < detectionRange && distance > 5;
    const canShootPlayer = distance < shootingRange && distance > 5;
    
    // Change turret color based on detection
    if (canSeePlayer) {
      // Turn red when player is detected
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.color.setHex(0xff0000); // Bright red
        }
      });
      
      // Rotate turret to face player
      const direction = playerPos.clone().sub(turretPos).normalize();
      const angle = Math.atan2(direction.x, direction.z);
      groupRef.current.rotation.y = angle;
    } else {
      // Turn back to default gray when player is out of range
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.color.setHex(0x666666); // Dark gray
        }
      });
    }
    
    // Only shoot if player is within shooting range
    if (canShootPlayer) {
      // Shoot every 2 seconds
      if (currentTime - lastShotTime.current > 2000) {
        // Calculate shooting direction
        const direction = playerPos.clone().sub(turretPos).normalize();
        
        // Create turret bullet group
        const bulletGroup = new THREE.Group();
        
        // Core energy bolt - thin elongated cylinder like Star Wars blaster
        const coreGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.25, 8);
        const coreMaterial = new THREE.MeshLambertMaterial({ 
          color: '#ff2200',
          emissive: '#ff4400',
          emissiveIntensity: 1.2
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        
        // Outer glow effect - slightly thicker
        const glowGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8);
        const glowMaterial = new THREE.MeshLambertMaterial({ 
          color: '#ff6644',
          emissive: '#ff2200',
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.7
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        
        // Align with direction of travel
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        
        core.quaternion.copy(quaternion);
        glow.quaternion.copy(quaternion);
        
        bulletGroup.add(glow);
        bulletGroup.add(core);
        bulletGroup.position.copy(turretPos);
        
        // Mark as turret bullet for collision detection
        bulletGroup.userData.isTurretBullet = true;
        
        const bulletData = {
          id: `turret_bullet_${Date.now()}_${Math.random()}`,
          mesh: bulletGroup,
          velocity: direction.clone().multiplyScalar(4.0), // Slower bullets
          startTime: currentTime
        };
        
        turretBullets.current.push(bulletData);
        scene.add(bulletGroup);
        lastShotTime.current = currentTime;
      }
    }
    
    // Update turret bullets
    turretBullets.current = turretBullets.current.filter(bullet => {
      // Move bullet
      bullet.mesh.position.add(bullet.velocity.clone().multiplyScalar(deltaTime));
      
      // Check collision with player
      const bulletPos = bullet.mesh.position;
      const playerPos = camera.position.clone();
      const distance = bulletPos.distanceTo(playerPos);
      
      if (distance < 0.3) { // Hit player
        // Damage player
        import('../lib/stores/useVRGame').then(({ useVRGame }) => {
          useVRGame.getState().takeDamage(10);
        });
        
        // Play player damage sound
        import('../lib/stores/useAudio').then(({ useAudio }) => {
          useAudio.getState().playPlayerDamage();
        });
        
        scene.remove(bullet.mesh);
        return false;
      }
      
      // Check collision with player bullets
      const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
      if (worldGroup) {
        let hitPlayerBullet = false;
        worldGroup.traverse((child) => {
          if (child.userData.isPlayerBullet && !hitPlayerBullet) {
            const playerBulletPos = new THREE.Vector3();
            child.getWorldPosition(playerBulletPos);
            
            const distance = bulletPos.distanceTo(playerBulletPos);
            if (distance < 0.1) { // Bullets cancel each other out
              scene.remove(bullet.mesh);
              scene.remove(child);
              hitPlayerBullet = true;
              console.log('💥 Bullets canceled each other out!');
              
              // Play hit sound for bullet collision
              import('../lib/stores/useAudio').then(({ useAudio }) => {
                useAudio.getState().playHit();
              });
            }
          }
        });
        
        if (hitPlayerBullet) return false;
      }
      
      // Remove bullet if too old or too far
      if ((currentTime - bullet.startTime) > 5000 || bullet.mesh.position.length() > 100) {
        scene.remove(bullet.mesh);
        return false;
      }
      
      return true;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Base */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.0, 0.6, 8]} />
        <meshLambertMaterial color="#444444" />
      </mesh>
      
      {/* Tower */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 1.2, 6]} />
        <meshLambertMaterial color="#666666" />
      </mesh>
      
      {/* Turret Head */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.6]} />
        <meshLambertMaterial color="#333333" />
      </mesh>
      
      {/* Barrel */}
      <mesh position={[0, 1.8, 0.4]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 6]} />
        <meshLambertMaterial color="#222222" />
      </mesh>
    </group>
  );
}