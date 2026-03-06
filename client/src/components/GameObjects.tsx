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
      {/* ── FLOOR — dark concrete ── */}
      <mesh receiveShadow position={[0, 0.01, -50]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 120]} />
        <meshLambertMaterial color="#3a3a3a" />
      </mesh>

      {/* ════════════════════════════════════
          CELL (z=0 to z=-6) — keep untouched
          ════════════════════════════════════ */}
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

      {/* ════════════════════════════════════
          MAIN CORRIDOR — z=-6 to z=-45, x=[-4,4]
          ════════════════════════════════════ */}
      {/* Left wall: x=-4, z=-6 to z=-45 (length 39, center z=-25.5) */}
      <mesh position={[-4, 2.5, -25.5]} receiveShadow>
        <boxGeometry args={[0.3, 5, 39]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Right wall: x=+4 */}
      <mesh position={[4, 2.5, -25.5]} receiveShadow>
        <boxGeometry args={[0.3, 5, 39]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Ceiling strip over corridor */}
      <mesh position={[0, 5, -25.5]} receiveShadow>
        <boxGeometry args={[8, 0.3, 39]} />
        <meshLambertMaterial color="#484848" />
      </mesh>

      {/* ════════════════════════════════════
          CROSS-HALL — z=-40 to z=-52, x=-40 to x=+40
          ════════════════════════════════════ */}
      {/* North wall left portion: z=-40, x=-40 to x=-6 (width 34, center x=-23) */}
      <mesh position={[-23, 2.5, -40]} receiveShadow>
        <boxGeometry args={[34, 5, 0.3]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* North wall right portion: z=-40, x=+6 to x=+40 (width 34, center x=+23) */}
      <mesh position={[23, 2.5, -40]} receiveShadow>
        <boxGeometry args={[34, 5, 0.3]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* South wall: z=-52, x=-40 to x=+40 (solid, width 80) */}
      <mesh position={[0, 2.5, -52]} receiveShadow>
        <boxGeometry args={[80, 5, 0.3]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Left end wall: x=-40, z=-40 to z=-52 (depth 12, center z=-46) */}
      <mesh position={[-40, 2.5, -46]} receiveShadow>
        <boxGeometry args={[0.3, 5, 12]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Right end wall: x=+40 */}
      <mesh position={[40, 2.5, -46]} receiveShadow>
        <boxGeometry args={[0.3, 5, 12]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Ceiling: x=-40 to +40 (width 80), z=-40 to -52 (depth 12, center z=-46) */}
      <mesh position={[0, 5, -46]} receiveShadow>
        <boxGeometry args={[80, 0.3, 12]} />
        <meshLambertMaterial color="#484848" />
      </mesh>

      {/* ════════════════════════════════════
          LEFT GUARD ROOM — x=-55 to x=-35, z=-25 to z=-55
          ════════════════════════════════════ */}
      {/* North wall: z=-25, x=-55 to x=-35 (width 20, center x=-45) */}
      <mesh position={[-45, 2.5, -25]} receiveShadow>
        <boxGeometry args={[20, 5, 0.3]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* South wall: z=-55 */}
      <mesh position={[-45, 2.5, -55]} receiveShadow>
        <boxGeometry args={[20, 5, 0.3]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* West wall: x=-55, z=-25 to z=-55 (depth 30, center z=-40) */}
      <mesh position={[-55, 2.5, -40]} receiveShadow>
        <boxGeometry args={[0.3, 5, 30]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* East wall upper segment: x=-35, z=-25 to z=-37 (length 12, center z=-31) */}
      <mesh position={[-35, 2.5, -31]} receiveShadow>
        <boxGeometry args={[0.3, 5, 12]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* East wall lower segment: x=-35, z=-43 to z=-55 (length 12, center z=-49) */}
      <mesh position={[-35, 2.5, -49]} receiveShadow>
        <boxGeometry args={[0.3, 5, 12]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Ceiling: x=-55 to x=-35 (width 20), z=-25 to z=-55 (depth 30) */}
      <mesh position={[-45, 5, -40]} receiveShadow>
        <boxGeometry args={[20, 0.3, 30]} />
        <meshLambertMaterial color="#484848" />
      </mesh>
      {/* Guard desk (left room) */}
      <mesh position={[-45, 0.45, -38]} receiveShadow>
        <boxGeometry args={[4, 0.9, 1.2]} />
        <meshLambertMaterial color="#4a4a30" />
      </mesh>

      {/* ════════════════════════════════════
          RIGHT GUARD ROOM — x=+35 to x=+55, z=-25 to z=-55
          ════════════════════════════════════ */}
      {/* North wall: z=-25, x=35 to x=55 (width 20, center x=45) */}
      <mesh position={[45, 2.5, -25]} receiveShadow>
        <boxGeometry args={[20, 5, 0.3]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* South wall: z=-55 */}
      <mesh position={[45, 2.5, -55]} receiveShadow>
        <boxGeometry args={[20, 5, 0.3]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* East wall: x=55, z=-25 to z=-55 (depth 30, center z=-40) */}
      <mesh position={[55, 2.5, -40]} receiveShadow>
        <boxGeometry args={[0.3, 5, 30]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* West wall upper segment: x=35, z=-25 to z=-37 (length 12, center z=-31) */}
      <mesh position={[35, 2.5, -31]} receiveShadow>
        <boxGeometry args={[0.3, 5, 12]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* West wall lower segment: x=35, z=-43 to z=-55 (length 12, center z=-49) */}
      <mesh position={[35, 2.5, -49]} receiveShadow>
        <boxGeometry args={[0.3, 5, 12]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Ceiling: x=35 to x=55 (width 20), z=-25 to z=-55 (depth 30) */}
      <mesh position={[45, 5, -40]} receiveShadow>
        <boxGeometry args={[20, 0.3, 30]} />
        <meshLambertMaterial color="#484848" />
      </mesh>
      {/* Guard desk (right room) */}
      <mesh position={[45, 0.45, -38]} receiveShadow>
        <boxGeometry args={[4, 0.9, 1.2]} />
        <meshLambertMaterial color="#4a4a30" />
      </mesh>

      {/* ════════════════════════════════════
          BACK SECTION — x=-25 to x=+25, z=-52 to z=-80
          ════════════════════════════════════ */}
      {/* Left wall: x=-25, z=-52 to z=-80 (depth 28, center z=-66) */}
      <mesh position={[-25, 2.5, -66]} receiveShadow>
        <boxGeometry args={[0.3, 5, 28]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Right wall: x=+25 */}
      <mesh position={[25, 2.5, -66]} receiveShadow>
        <boxGeometry args={[0.3, 5, 28]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Back wall: z=-80, x=-25 to x=+25 (width 50) */}
      <mesh position={[0, 2.5, -80]} receiveShadow>
        <boxGeometry args={[50, 5, 0.3]} />
        <meshLambertMaterial color="#606060" />
      </mesh>
      {/* Ceiling: width 50, depth 28 */}
      <mesh position={[0, 5, -66]} receiveShadow>
        <boxGeometry args={[50, 0.3, 28]} />
        <meshLambertMaterial color="#484848" />
      </mesh>
      {/* Concrete pillars */}
      <mesh position={[-12, 2.5, -65]} receiveShadow>
        <boxGeometry args={[0.8, 5, 0.8]} />
        <meshLambertMaterial color="#505050" />
      </mesh>
      <mesh position={[12, 2.5, -65]} receiveShadow>
        <boxGeometry args={[0.8, 5, 0.8]} />
        <meshLambertMaterial color="#505050" />
      </mesh>

      {/* ════════════════════════════════════
          OUTER BOUNDARY WALLS (safety net)
          ════════════════════════════════════ */}
      <mesh position={[0, 8, -120]} userData={{ isWall: true }}>
        <boxGeometry args={[200, 16, 2]} />
        <meshLambertMaterial color="#404040" />
      </mesh>
      <mesh position={[-100, 8, -60]} rotation={[0, Math.PI / 2, 0]} userData={{ isWall: true }}>
        <boxGeometry args={[120, 16, 2]} />
        <meshLambertMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[100, 8, -60]} rotation={[0, Math.PI / 2, 0]} userData={{ isWall: true }}>
        <boxGeometry args={[120, 16, 2]} />
        <meshLambertMaterial color="#3a3a3a" />
      </mesh>

      {/* ════════════════════════════════════
          OVERHEAD LIGHTS
          ════════════════════════════════════ */}
      {([-20, -46, -66] as number[]).map((z, i) => (
        <group key={`light-${i}`} position={[0, 4.7, z]}>
          <mesh receiveShadow>
            <boxGeometry args={[1.2, 0.1, 0.3]} />
            <meshLambertMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
          </mesh>
          <pointLight color="#e8eeff" intensity={18} distance={28} decay={2} position={[0, -0.2, 0]} />
        </group>
      ))}
      {/* Side lights in guard rooms */}
      <group position={[-45, 4.7, -40]}>
        <mesh receiveShadow>
          <boxGeometry args={[1.2, 0.1, 0.3]} />
          <meshLambertMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
        </mesh>
        <pointLight color="#e8eeff" intensity={12} distance={20} decay={2} position={[0, -0.2, 0]} />
      </group>
      <group position={[45, 4.7, -40]}>
        <mesh receiveShadow>
          <boxGeometry args={[1.2, 0.1, 0.3]} />
          <meshLambertMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
        </mesh>
        <pointLight color="#e8eeff" intensity={12} distance={20} decay={2} position={[0, -0.2, 0]} />
      </group>

      {/* ════════════════════════════════════
          ENEMIES — current wave only
          ════════════════════════════════════ */}
      {currentWaveSpawns.map((spawn, index) => (
        <Enemy
          key={`wave${visibleWave}-${spawn.type}-${index}`}
          type={spawn.type as any}
          position={spawn.position as [number, number, number]}
        />
      ))}
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