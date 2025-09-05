import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

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
      
      {/* Red Destructible Pillars scattered around the room - Original 20 */}
      <RedPillar position={[-60, 1, -20]} destroyed={false} />
      <RedPillar position={[40, 1, -30]} destroyed={false} />
      <RedPillar position={[-30, 1, -60]} destroyed={false} />
      <RedPillar position={[70, 1, -70]} destroyed={false} />
      <RedPillar position={[20, 1, -80]} destroyed={false} />
      <RedPillar position={[-80, 1, -40]} destroyed={false} />
      <RedPillar position={[50, 1, -15]} destroyed={false} />
      <RedPillar position={[-40, 1, -85]} destroyed={false} />
      <RedPillar position={[80, 1, -25]} destroyed={false} />
      <RedPillar position={[-20, 1, -75]} destroyed={false} />
      <RedPillar position={[60, 1, -60]} destroyed={false} />
      <RedPillar position={[-70, 1, -65]} destroyed={false} />
      <RedPillar position={[30, 1, -40]} destroyed={false} />
      <RedPillar position={[-50, 1, -30]} destroyed={false} />
      <RedPillar position={[10, 1, -90]} destroyed={false} />
      <RedPillar position={[-90, 1, -80]} destroyed={false} />
      <RedPillar position={[85, 1, -50]} destroyed={false} />
      <RedPillar position={[-15, 1, -45]} destroyed={false} />
      <RedPillar position={[65, 1, -35]} destroyed={false} />
      <RedPillar position={[-75, 1, -55]} destroyed={false} />
      
      {/* Additional 100 Random Red Pillars */}
      <RedPillar position={[-45, 1, -12]} destroyed={false} />
      <RedPillar position={[35, 1, -67]} destroyed={false} />
      <RedPillar position={[-78, 1, -23]} destroyed={false} />
      <RedPillar position={[62, 1, -45]} destroyed={false} />
      <RedPillar position={[-25, 1, -89]} destroyed={false} />
      <RedPillar position={[48, 1, -18]} destroyed={false} />
      <RedPillar position={[-67, 1, -72]} destroyed={false} />
      <RedPillar position={[23, 1, -55]} destroyed={false} />
      <RedPillar position={[-89, 1, -34]} destroyed={false} />
      <RedPillar position={[76, 1, -81]} destroyed={false} />
      <RedPillar position={[-38, 1, -46]} destroyed={false} />
      <RedPillar position={[52, 1, -29]} destroyed={false} />
      <RedPillar position={[-71, 1, -58]} destroyed={false} />
      <RedPillar position={[17, 1, -73]} destroyed={false} />
      <RedPillar position={[-54, 1, -16]} destroyed={false} />
      <RedPillar position={[83, 1, -42]} destroyed={false} />
      <RedPillar position={[-26, 1, -91]} destroyed={false} />
      <RedPillar position={[41, 1, -37]} destroyed={false} />
      <RedPillar position={[-65, 1, -69]} destroyed={false} />
      <RedPillar position={[28, 1, -24]} destroyed={false} />
      <RedPillar position={[-82, 1, -48]} destroyed={false} />
      <RedPillar position={[59, 1, -76]} destroyed={false} />
      <RedPillar position={[-33, 1, -52]} destroyed={false} />
      <RedPillar position={[74, 1, -19]} destroyed={false} />
      <RedPillar position={[-47, 1, -83]} destroyed={false} />
      <RedPillar position={[19, 1, -61]} destroyed={false} />
      <RedPillar position={[-86, 1, -27]} destroyed={false} />
      <RedPillar position={[66, 1, -88]} destroyed={false} />
      <RedPillar position={[-21, 1, -43]} destroyed={false} />
      <RedPillar position={[57, 1, -14]} destroyed={false} />
      <RedPillar position={[-73, 1, -79]} destroyed={false} />
      <RedPillar position={[32, 1, -56]} destroyed={false} />
      <RedPillar position={[-58, 1, -32]} destroyed={false} />
      <RedPillar position={[81, 1, -64]} destroyed={false} />
      <RedPillar position={[-39, 1, -87]} destroyed={false} />
      <RedPillar position={[46, 1, -41]} destroyed={false} />
      <RedPillar position={[-69, 1, -17]} destroyed={false} />
      <RedPillar position={[24, 1, -74]} destroyed={false} />
      <RedPillar position={[-91, 1, -51]} destroyed={false} />
      <RedPillar position={[53, 1, -28]} destroyed={false} />
      <RedPillar position={[-36, 1, -93]} destroyed={false} />
      <RedPillar position={[72, 1, -39]} destroyed={false} />
      <RedPillar position={[-49, 1, -66]} destroyed={false} />
      <RedPillar position={[16, 1, -22]} destroyed={false} />
      <RedPillar position={[-77, 1, -84]} destroyed={false} />
      <RedPillar position={[63, 1, -47]} destroyed={false} />
      <RedPillar position={[-22, 1, -71]} destroyed={false} />
      <RedPillar position={[44, 1, -13]} destroyed={false} />
      <RedPillar position={[-84, 1, -59]} destroyed={false} />
      <RedPillar position={[29, 1, -82]} destroyed={false} />
      <RedPillar position={[-61, 1, -26]} destroyed={false} />
      <RedPillar position={[78, 1, -68]} destroyed={false} />
      <RedPillar position={[-43, 1, -35]} destroyed={false} />
      <RedPillar position={[56, 1, -92]} destroyed={false} />
      <RedPillar position={[-75, 1, -49]} destroyed={false} />
      <RedPillar position={[31, 1, -15]} destroyed={false} />
      <RedPillar position={[-88, 1, -77]} destroyed={false} />
      <RedPillar position={[67, 1, -54]} destroyed={false} />
      <RedPillar position={[-34, 1, -21]} destroyed={false} />
      <RedPillar position={[51, 1, -86]} destroyed={false} />
      <RedPillar position={[-68, 1, -62]} destroyed={false} />
      <RedPillar position={[18, 1, -38]} destroyed={false} />
      <RedPillar position={[-85, 1, -75]} destroyed={false} />
      <RedPillar position={[42, 1, -53]} destroyed={false} />
      <RedPillar position={[-55, 1, -18]} destroyed={false} />
      <RedPillar position={[79, 1, -85]} destroyed={false} />
      <RedPillar position={[-27, 1, -44]} destroyed={false} />
      <RedPillar position={[64, 1, -71]} destroyed={false} />
      <RedPillar position={[-72, 1, -31]} destroyed={false} />
      <RedPillar position={[37, 1, -95]} destroyed={false} />
      <RedPillar position={[-59, 1, -57]} destroyed={false} />
      <RedPillar position={[15, 1, -24]} destroyed={false} />
      <RedPillar position={[-81, 1, -88]} destroyed={false} />
      <RedPillar position={[68, 1, -46]} destroyed={false} />
      <RedPillar position={[-40, 1, -63]} destroyed={false} />
      <RedPillar position={[58, 1, -19]} destroyed={false} />
      <RedPillar position={[-74, 1, -81]} destroyed={false} />
      <RedPillar position={[26, 1, -58]} destroyed={false} />
      <RedPillar position={[-87, 1, -25]} destroyed={false} />
      <RedPillar position={[73, 1, -72]} destroyed={false} />
      <RedPillar position={[-31, 1, -49]} destroyed={false} />
      <RedPillar position={[45, 1, -16]} destroyed={false} />
      <RedPillar position={[-66, 1, -84]} destroyed={false} />
      <RedPillar position={[21, 1, -61]} destroyed={false} />
      <RedPillar position={[-93, 1, -38]} destroyed={false} />
      <RedPillar position={[54, 1, -75]} destroyed={false} />
      <RedPillar position={[-48, 1, -52]} destroyed={false} />
      <RedPillar position={[71, 1, -29]} destroyed={false} />
      <RedPillar position={[-35, 1, -94]} destroyed={false} />
      <RedPillar position={[60, 1, -66]} destroyed={false} />
      <RedPillar position={[-76, 1, -33]} destroyed={false} />
      <RedPillar position={[33, 1, -78]} destroyed={false} />
      <RedPillar position={[-62, 1, -45]} destroyed={false} />
      <RedPillar position={[47, 1, -12]} destroyed={false} />
      <RedPillar position={[-79, 1, -69]} destroyed={false} />
      <RedPillar position={[14, 1, -56]} destroyed={false} />
      <RedPillar position={[-56, 1, -22]} destroyed={false} />
      <RedPillar position={[82, 1, -83]} destroyed={false} />
      <RedPillar position={[-29, 1, -59]} destroyed={false} />
      <RedPillar position={[65, 1, -36]} destroyed={false} />
      <RedPillar position={[-83, 1, -73]} destroyed={false} />
      <RedPillar position={[38, 1, -50]} destroyed={false} />
      <RedPillar position={[-51, 1, -17]} destroyed={false} />
      <RedPillar position={[70, 1, -87]} destroyed={false} />
      <RedPillar position={[-24, 1, -64]} destroyed={false} />
      <RedPillar position={[49, 1, -41]} destroyed={false} />
      <RedPillar position={[-90, 1, -28]} destroyed={false} />
      <RedPillar position={[25, 1, -95]} destroyed={false} />
      <RedPillar position={[-64, 1, -55]} destroyed={false} />
      <RedPillar position={[75, 1, -32]} destroyed={false} />
      <RedPillar position={[-37, 1, -89]} destroyed={false} />
      <RedPillar position={[61, 1, -48]} destroyed={false} />
      <RedPillar position={[-70, 1, -15]} destroyed={false} />
      <RedPillar position={[22, 1, -76]} destroyed={false} />
      <RedPillar position={[-95, 1, -62]} destroyed={false} />
      <RedPillar position={[50, 1, -39]} destroyed={false} />
      <RedPillar position={[-53, 1, -86]} destroyed={false} />
      <RedPillar position={[34, 1, -23]} destroyed={false} />
      <RedPillar position={[-80, 1, -70]} destroyed={false} />
      <RedPillar position={[69, 1, -57]} destroyed={false} />
      <RedPillar position={[-42, 1, -34]} destroyed={false} />
      <RedPillar position={[55, 1, -91]} destroyed={false} />
      <RedPillar position={[-67, 1, -47]} destroyed={false} />
      <RedPillar position={[27, 1, -14]} destroyed={false} />
      <RedPillar position={[-92, 1, -81]} destroyed={false} />
      <RedPillar position={[43, 1, -68]} destroyed={false} />
      <RedPillar position={[-46, 1, -25]} destroyed={false} />
      <RedPillar position={[77, 1, -92]} destroyed={false} />
      <RedPillar position={[-28, 1, -54]} destroyed={false} />
      <RedPillar position={[84, 1, -31]} destroyed={false} />
      <RedPillar position={[-65, 1, -88]} destroyed={false} />
      <RedPillar position={[39, 1, -65]} destroyed={false} />
      <RedPillar position={[-52, 1, -42]} destroyed={false} />
      <RedPillar position={[13, 1, -79]} destroyed={false} />
      <RedPillar position={[-89, 1, -56]} destroyed={false} />
      <RedPillar position={[58, 1, -33]} destroyed={false} />
      <RedPillar position={[-41, 1, -90]} destroyed={false} />
      <RedPillar position={[76, 1, -67]} destroyed={false} />
      <RedPillar position={[-23, 1, -44]} destroyed={false} />
      <RedPillar position={[92, 1, -21]} destroyed={false} />
      <RedPillar position={[-78, 1, -77]} destroyed={false} />
      <RedPillar position={[36, 1, -53]} destroyed={false} />
      <RedPillar position={[-63, 1, -30]} destroyed={false} />
      <RedPillar position={[20, 1, -85]} destroyed={false} />
      <RedPillar position={[-96, 1, -63]} destroyed={false} />
      <RedPillar position={[87, 1, -40]} destroyed={false} />
      <RedPillar position={[-44, 1, -96]} destroyed={false} />
      <RedPillar position={[12, 1, -27]} destroyed={false} />
      <RedPillar position={[-71, 1, -74]} destroyed={false} />
      <RedPillar position={[85, 1, -51]} destroyed={false} />
      <RedPillar position={[-30, 1, -18]} destroyed={false} />
      <RedPillar position={[91, 1, -78]} destroyed={false} />
      <RedPillar position={[-57, 1, -35]} destroyed={false} />
      <RedPillar position={[11, 1, -92]} destroyed={false} />
      <RedPillar position={[-94, 1, -59]} destroyed={false} />
      <RedPillar position={[74, 1, -26]} destroyed={false} />
      <RedPillar position={[-32, 1, -83]} destroyed={false} />
      <RedPillar position={[88, 1, -62]} destroyed={false} />
      <RedPillar position={[-75, 1, -39]} destroyed={false} />
      <RedPillar position={[30, 1, -96]} destroyed={false} />
      <RedPillar position={[-61, 1, -76]} destroyed={false} />
      <RedPillar position={[95, 1, -13]} destroyed={false} />
      <RedPillar position={[-18, 1, -60]} destroyed={false} />
      <RedPillar position={[86, 1, -87]} destroyed={false} />
      <RedPillar position={[-77, 1, -24]} destroyed={false} />
      <RedPillar position={[56, 1, -71]} destroyed={false} />
      <RedPillar position={[-95, 1, -48]} destroyed={false} />
      <RedPillar position={[17, 1, -35]} destroyed={false} />
      <RedPillar position={[-54, 1, -93]} destroyed={false} />
      <RedPillar position={[80, 1, -58]} destroyed={false} />
      <RedPillar position={[-19, 1, -75]} destroyed={false} />
      <RedPillar position={[93, 1, -32]} destroyed={false} />
      <RedPillar position={[-84, 1, -95]} destroyed={false} />
      <RedPillar position={[40, 1, -49]} destroyed={false} />
      <RedPillar position={[-60, 1, -16]} destroyed={false} />
      <RedPillar position={[89, 1, -73]} destroyed={false} />
      <RedPillar position={[-33, 1, -80]} destroyed={false} />
      <RedPillar position={[72, 1, -37]} destroyed={false} />
      <RedPillar position={[-87, 1, -54]} destroyed={false} />
      <RedPillar position={[16, 1, -91]} destroyed={false} />
      <RedPillar position={[-49, 1, -71]} destroyed={false} />
      <RedPillar position={[94, 1, -28]} destroyed={false} />
      <RedPillar position={[-76, 1, -85]} destroyed={false} />
      <RedPillar position={[53, 1, -44]} destroyed={false} />
      <RedPillar position={[-90, 1, -21]} destroyed={false} />
      <RedPillar position={[29, 1, -88]} destroyed={false} />
      <RedPillar position={[-58, 1, -65]} destroyed={false} />
      <RedPillar position={[81, 1, -15]} destroyed={false} />
      <RedPillar position={[-25, 1, -52]} destroyed={false} />
      <RedPillar position={[67, 1, -79]} destroyed={false} />
      <RedPillar position={[-72, 1, -36]} destroyed={false} />
      <RedPillar position={[48, 1, -93]} destroyed={false} />
      <RedPillar position={[-85, 1, -61]} destroyed={false} />
      <RedPillar position={[24, 1, -38]} destroyed={false} />
      <RedPillar position={[-97, 1, -77]} destroyed={false} />
      <RedPillar position={[90, 1, -54]} destroyed={false} />
      <RedPillar position={[-41, 1, -31]} destroyed={false} />
      <RedPillar position={[75, 1, -90]} destroyed={false} />
      <RedPillar position={[-34, 1, -67]} destroyed={false} />
      <RedPillar position={[62, 1, -24]} destroyed={false} />
      <RedPillar position={[-79, 1, -86]} destroyed={false} />
      <RedPillar position={[18, 1, -43]} destroyed={false} />
      <RedPillar position={[-66, 1, -20]} destroyed={false} />
      <RedPillar position={[96, 1, -77]} destroyed={false} />
      <RedPillar position={[-47, 1, -94]} destroyed={false} />
      <RedPillar position={[35, 1, -61]} destroyed={false} />
      <RedPillar position={[-73, 1, -28]} destroyed={false} />
      <RedPillar position={[59, 1, -95]} destroyed={false} />
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