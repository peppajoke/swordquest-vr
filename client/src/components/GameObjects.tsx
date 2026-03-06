import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';
import Enemy from './Enemy';
import enemySpawns from '../data/enemySpawns.json';

const MAX_WAVE = 3;

export default function GameObjects() {
  const { pillars, setRoomCleared } = useVRGame();

  // Wave state
  const [visibleWave, setVisibleWave] = useState<1 | 2 | 3>(1);
  const visibleWaveRef = useRef<number>(1);
  const waveStarted = useRef(false);
  const waveAdvancing = useRef(false);

  // Filter spawns for current visible wave
  const currentWaveSpawns = useMemo(
    () => enemySpawns.spawns.filter((s) => (s as any).wave === visibleWave),
    [visibleWave]
  );

  useFrame((state) => {
    if (waveAdvancing.current) return;

    // Count living enemies in scene
    let liveCount = 0;
    state.scene.traverse((obj) => {
      if (obj.userData.isEnemy && !obj.userData.isDead) {
        liveCount++;
      }
    });

    if (liveCount > 0) {
      waveStarted.current = true;
    }

    if (waveStarted.current && liveCount === 0) {
      waveAdvancing.current = true;
      waveStarted.current = false;

      const currentWave = visibleWaveRef.current;

      if (currentWave >= MAX_WAVE) {
        // All waves cleared — room cleared!
        setRoomCleared(true);
      } else {
        // Advance to next wave after 3s delay
        const nextWave = (currentWave + 1) as 1 | 2 | 3;
        setTimeout(() => {
          visibleWaveRef.current = nextWave;
          setVisibleWave(nextWave);
          // Signal the HUD via store (reuse roomCleared pattern with a wave signal)
          // We'll dispatch a custom event for the HUD to pick up
          window.dispatchEvent(new CustomEvent('waveAdvance', { detail: { wave: nextWave } }));
          waveAdvancing.current = false;
        }, 3000);
      }
    }
  });

  return (
    <>
      {/* Prison floor - dark concrete over the white base */}
      <mesh receiveShadow position={[0, 0.01, -50]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 100]} />
        <meshLambertMaterial color="#3a3a3a" />
      </mesh>

      {/* Cell back wall (behind player) */}
      <mesh position={[0, 2, 0.5]} receiveShadow>
        <boxGeometry args={[7, 5, 0.3]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Cell left wall */}
      <mesh position={[-3.5, 2, -3]} receiveShadow>
        <boxGeometry args={[0.3, 5, 7]} />
        <meshLambertMaterial color="#585858" />
      </mesh>
      {/* Cell right wall */}
      <mesh position={[3.5, 2, -3]} receiveShadow>
        <boxGeometry args={[0.3, 5, 7]} />
        <meshLambertMaterial color="#585858" />
      </mesh>
      {/* Cell ceiling */}
      <mesh position={[0, 4.5, -3]} receiveShadow>
        <boxGeometry args={[7, 0.3, 7]} />
        <meshLambertMaterial color="#484848" />
      </mesh>

      {/* Cell bars - broken open, 4 bars with center 2 missing */}
      {[-3, -1.8, 1.8, 3].map((x, i) => (
        <mesh key={`bar-${i}`} position={[x, 2.2, -6]} receiveShadow>
          <boxGeometry args={[0.08, 4, 0.08]} />
          <meshLambertMaterial color="#222222" />
        </mesh>
      ))}
      {/* Bent bar - left side, angled */}
      <mesh position={[-2.5, 1.5, -6.3]} rotation={[0, 0, 0.4]} receiveShadow>
        <boxGeometry args={[0.08, 2.5, 0.08]} />
        <meshLambertMaterial color="#222222" />
      </mesh>
      {/* Top crossbar */}
      <mesh position={[0, 4.2, -6]} receiveShadow>
        <boxGeometry args={[7, 0.1, 0.08]} />
        <meshLambertMaterial color="#222222" />
      </mesh>

      {/* Corridor left wall */}
      <mesh position={[-6, 2.5, -14]} receiveShadow>
        <boxGeometry args={[0.3, 5, 16]} />
        <meshLambertMaterial color="#585858" />
      </mesh>
      {/* Corridor right wall */}
      <mesh position={[6, 2.5, -14]} receiveShadow>
        <boxGeometry args={[0.3, 5, 16]} />
        <meshLambertMaterial color="#585858" />
      </mesh>
      {/* Corridor ceiling */}
      <mesh position={[0, 5, -14]} receiveShadow>
        <boxGeometry args={[12, 0.3, 16]} />
        <meshLambertMaterial color="#484848" />
      </mesh>

      {/* Overhead fluorescent lights */}
      {([-14, -35, -60, -85] as number[]).map((z, i) => (
        <mesh key={`light-${i}`} position={[0, 4.7, z]} receiveShadow>
          <boxGeometry args={[1.2, 0.1, 0.3]} />
          <meshLambertMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} />
        </mesh>
      ))}

      {/* Back wall */}
      <mesh position={[0, 8, -100]} receiveShadow userData={{ isWall: true }}>
        <boxGeometry args={[200, 16, 2]} />
        <meshLambertMaterial color="#555555" />
      </mesh>
      {/* Left wall */}
      <mesh position={[-100, 8, -60]} rotation={[0, Math.PI / 2, 0]} receiveShadow userData={{ isWall: true }}>
        <boxGeometry args={[80, 16, 2]} />
        <meshLambertMaterial color="#4e4e4e" />
      </mesh>
      {/* Right wall */}
      <mesh position={[100, 8, -60]} rotation={[0, Math.PI / 2, 0]} receiveShadow userData={{ isWall: true }}>
        <boxGeometry args={[80, 16, 2]} />
        <meshLambertMaterial color="#4e4e4e" />
      </mesh>
      {/* Arena ceiling */}
      <mesh position={[0, 16, -60]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 80]} />
        <meshLambertMaterial color="#404040" />
      </mesh>

      {/* Guard checkpoint desk */}
      <mesh position={[-2.5, 0.8, -22]} receiveShadow>
        <boxGeometry args={[4, 0.15, 1.2]} />
        <meshLambertMaterial color="#4a4a30" />
      </mesh>
      <mesh position={[-2.5, 0.4, -22]} receiveShadow>
        <boxGeometry args={[3.8, 0.6, 1.0]} />
        <meshLambertMaterial color="#3a3a28" />
      </mesh>
      {/* Monitor on desk */}
      <mesh position={[-1.5, 1.0, -22.3]} receiveShadow>
        <boxGeometry args={[0.5, 0.35, 0.05]} />
        <meshLambertMaterial color="#111111" emissive="#003300" emissiveIntensity={0.6} />
      </mesh>

      {/* Prison cells lining the left wall */}
      {([-30, -45, -60, -75] as number[]).map((z, i) => (
        <group key={`cellfront-${i}`} position={[-18, 0, z]}>
          {/* Cell door frame */}
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[3, 4.5, 0.2]} />
            <meshLambertMaterial color="#2a2a2a" />
          </mesh>
          {/* 4 vertical bars in the door */}
          {([-1, -0.3, 0.3, 1] as number[]).map((bx, bi) => (
            <mesh key={bi} position={[bx, 2, 0.05]}>
              <boxGeometry args={[0.07, 4.2, 0.07]} />
              <meshLambertMaterial color="#1a1a1a" />
            </mesh>
          ))}
        </group>
      ))}

      {/* ENEMY ARMY - Current wave only */}
      {currentWaveSpawns.map((spawn, index) => (
        <Enemy
          key={`wave${visibleWave}-${spawn.type}-${index}`}
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