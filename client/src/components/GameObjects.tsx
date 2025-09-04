import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

export default function GameObjects() {
  const { pillars } = useVRGame();
  
  // Generate 40 ammo pickups scattered around the level
  const ammoPickups = useMemo(() => {
    const pickups: Array<{ id: string; x: number; y: number; z: number }> = [];
    
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 140; // -70 to +70 (wider area)
      const z = -10 + Math.random() * -120;   // -10 to -130 (wider area)
      const y = 0.3; // Slightly above ground
      
      pickups.push({
        id: `ammo-${i}`,
        x, y, z
      });
    }
    
    return pickups;
  }, []);
  
  // Generate 12 turret towers scattered around the level
  const turrets = useMemo(() => {
    const towerList: Array<{ id: string; x: number; y: number; z: number }> = [];
    
    for (let i = 0; i < 12; i++) {
      const x = (Math.random() - 0.5) * 120; // -60 to +60
      const z = -30 + Math.random() * -80;   // -30 to -110
      const y = 0; // Ground level
      
      towerList.push({
        id: `turret-${i}`,
        x, y, z
      });
    }
    
    return towerList;
  }, []);

  return (
    <>
      {/* Red Pillars scattered throughout the level */}
      {pillars.map((pillar) => (
        <RedPillar
          key={pillar.id}
          position={pillar.position}
          destroyed={pillar.destroyed}
        />
      ))}
      
      {/* Ammo Pickups */}
      {ammoPickups.map((pickup) => (
        <AmmoPickup
          key={pickup.id}
          position={[pickup.x, pickup.y, pickup.z]}
        />
      ))}
      
      {/* Turret Towers */}
      {turrets.map((turret) => (
        <TurretTower
          key={turret.id}
          position={[turret.x, turret.y, turret.z]}
        />
      ))}
    </>
  );
}

function RedPillar({ position, destroyed }: { position: [number, number, number], destroyed: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && !destroyed) {
      // Add the pillar marker for collision detection
      meshRef.current.userData.isPillar = true;
    }
  });

  if (destroyed) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[0.3, 0.3, 2, 8]} />
      <meshLambertMaterial color="#e74c3c" />
    </mesh>
  );
}

function AmmoPickup({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Add rotation animation
      meshRef.current.rotation.y += 0.02;
      // Add floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      
      // Mark for collision detection
      meshRef.current.userData.isAmmoPickup = true;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Ammo box */}
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.1, 0.25]} />
        <meshLambertMaterial color="#ffd700" />
      </mesh>
      
      {/* Ammo label */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.12, 0.02, 0.2]} />
        <meshLambertMaterial color="#333333" />
      </mesh>
    </group>
  );
}

function TurretTower({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const lastShotTime = useRef(0);
  const turretBullets = useRef<Array<{
    id: string;
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    startTime: number;
  }>>([]);

  useFrame((state, deltaTime) => {
    if (!groupRef.current) return;
    
    const currentTime = Date.now();
    const { camera, scene } = state;
    
    // Mark as turret for collision detection
    groupRef.current.userData.isTurret = true;
    
    // Aim at player (camera position)
    const turretPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(turretPos);
    turretPos.y += 1.5; // Turret barrel height
    
    const playerPos = camera.position.clone();
    const distance = turretPos.distanceTo(playerPos);
    
    // Only shoot if player is within 50 units and not too close
    if (distance < 50 && distance > 5) {
      // Rotate turret to face player
      const direction = playerPos.clone().sub(turretPos).normalize();
      const angle = Math.atan2(direction.x, direction.z);
      groupRef.current.rotation.y = angle;
      
      // Shoot every 2 seconds
      if (currentTime - lastShotTime.current > 2000) {
        // Create turret bullet
        const bullet = new THREE.Mesh(
          new THREE.SphereGeometry(0.03),
          new THREE.MeshLambertMaterial({ color: '#ff0000', emissive: '#aa0000' })
        );
        
        bullet.position.copy(turretPos);
        const bulletData = {
          id: `turret_bullet_${Date.now()}_${Math.random()}`,
          mesh: bullet,
          velocity: direction.clone().multiplyScalar(8.0), // Fast bullets
          startTime: currentTime
        };
        
        turretBullets.current.push(bulletData);
        scene.add(bullet);
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
        
        scene.remove(bullet.mesh);
        return false;
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