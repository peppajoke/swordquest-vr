import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface EnemyProps {
  type: 'grunt' | 'rifleman' | 'heavy' | 'assassin' | 'bomber' | 'sniper' | 'berserker' | 'shield' | 'mage' | 'boss';
  position: [number, number, number];
}

export default function Enemy({ type, position }: EnemyProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [health, setHealth] = useState(getMaxHealth(type));
  const [maxHealth] = useState(getMaxHealth(type));
  const [isDead, setIsDead] = useState(false);
  const [lastAttack, setLastAttack] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);
  const [rageMode, setRageMode] = useState(false);
  const [teleportCooldown, setTeleportCooldown] = useState(0);
  
  const { addHitEffect } = useVRGame();
  
  function getMaxHealth(enemyType: string): number {
    switch (enemyType) {
      case 'grunt': return 50;
      case 'rifleman': return 75;
      case 'heavy': return 150;
      case 'assassin': return 40;
      case 'bomber': return 60;
      case 'sniper': return 80;
      case 'berserker': return 120;
      case 'shield': return 200;
      case 'mage': return 90;
      case 'boss': return 1000;
      default: return 50;
    }
  }
  
  function getEnemyColor(enemyType: string): string {
    switch (enemyType) {
      case 'grunt': return '#8B4513'; // Brown
      case 'rifleman': return '#4B8B3B'; // Olive
      case 'heavy': return '#2F4F4F'; // Dark slate
      case 'assassin': return '#1C1C1C'; // Almost black
      case 'bomber': return '#FF4500'; // Orange red
      case 'sniper': return '#483D8B'; // Dark slate blue
      case 'berserker': return '#8B0000'; // Dark red
      case 'shield': return '#4682B4'; // Steel blue
      case 'mage': return '#9400D3'; // Violet
      case 'boss': return '#000000'; // Pure black
      default: return '#8B4513';
    }
  }
  
  function getEnemySize(enemyType: string): [number, number, number] {
    switch (enemyType) {
      case 'grunt': return [0.8, 1.5, 0.8];
      case 'rifleman': return [0.7, 1.6, 0.7];
      case 'heavy': return [1.2, 1.8, 1.2];
      case 'assassin': return [0.6, 1.4, 0.6];
      case 'bomber': return [0.9, 1.3, 0.9];
      case 'sniper': return [0.7, 1.7, 0.7];
      case 'berserker': return [1.0, 1.6, 1.0];
      case 'shield': return [1.1, 1.9, 1.1];
      case 'mage': return [0.8, 1.6, 0.8];
      case 'boss': return [3.0, 4.0, 3.0];
      default: return [0.8, 1.5, 0.8];
    }
  }
  
  function getAttackDamage(enemyType: string): number {
    switch (enemyType) {
      case 'grunt': return 15;
      case 'rifleman': return 20;
      case 'heavy': return 35;
      case 'assassin': return 25;
      case 'bomber': return 50; // AOE
      case 'sniper': return 40;
      case 'berserker': return rageMode ? 45 : 30;
      case 'shield': return 12;
      case 'mage': return 28;
      case 'boss': return 60;
      default: return 15;
    }
  }
  
  function getAttackSpeed(enemyType: string): number {
    switch (enemyType) {
      case 'grunt': return 2000; // 2 seconds
      case 'rifleman': return 1500;
      case 'heavy': return 3000;
      case 'assassin': return 800;
      case 'bomber': return 4000;
      case 'sniper': return 2500;
      case 'berserker': return rageMode ? 600 : 1200;
      case 'shield': return 2200;
      case 'mage': return 1800;
      case 'boss': return 1000;
      default: return 2000;
    }
  }
  
  function takeDamage(damage: number) {
    if (isDead) return;
    
    const newHealth = Math.max(0, health - damage);
    setHealth(newHealth);
    
    // Berserker rage mode when low health
    if (type === 'berserker' && newHealth < maxHealth * 0.3 && !rageMode) {
      setRageMode(true);
      console.log('🔥 BERSERKER RAGE ACTIVATED!');
    }
    
    if (newHealth <= 0) {
      setIsDead(true);
      // Award points based on enemy type
      const points = type === 'boss' ? 500 : type === 'heavy' ? 100 : 50;
      console.log(`💀 ${type.toUpperCase()} defeated! +${points} points`);
    }
  }
  
  useEffect(() => {
    if (meshRef.current) {
      // Mark for collision detection
      meshRef.current.userData.isEnemy = true;
      meshRef.current.userData.enemyType = type;
      meshRef.current.userData.health = health;
      meshRef.current.userData.maxHealth = maxHealth;
      meshRef.current.userData.takeDamage = takeDamage;
      meshRef.current.userData.isDead = isDead;
    }
  }, [health, maxHealth, isDead, type]);
  
  useFrame((state) => {
    if (!meshRef.current || isDead) return;
    
    const currentTime = Date.now();
    const { camera, scene } = state;
    const deltaTime = 0.016; // ~60fps
    
    // Get positions
    const enemyPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(enemyPos);
    const playerPos = camera.position.clone();
    const distance = enemyPos.distanceTo(playerPos);
    
    // Update collision data
    meshRef.current.userData.health = health;
    meshRef.current.userData.isDead = isDead;
    
    // Don't attack if dead
    if (isDead) {
      // Death animation - fade and shrink
      meshRef.current.scale.multiplyScalar(0.98);
      meshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.opacity = Math.max(0, child.material.opacity - 0.02);
          child.material.transparent = true;
        }
      });
      
      // Remove after fading
      if (meshRef.current.scale.x < 0.1) {
        scene.remove(meshRef.current);
      }
      return;
    }
    
    // AI Behaviors based on type
    switch (type) {
      case 'grunt':
        // Basic melee - walk toward player if close
        if (distance < 15 && distance > 2) {
          const direction = playerPos.clone().sub(enemyPos).normalize();
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 2));
        }
        break;
        
      case 'rifleman':
        // Medium range shooting
        if (distance < 20 && distance > 8) {
          meshRef.current.lookAt(playerPos);
        }
        break;
        
      case 'heavy':
        // Slow movement, high damage
        if (distance < 12 && distance > 3) {
          const direction = playerPos.clone().sub(enemyPos).normalize();
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 0.8));
        }
        break;
        
      case 'assassin':
        // Teleport closer if far away
        if (distance > 15 && currentTime > teleportCooldown) {
          const teleportPos = playerPos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            0,
            (Math.random() - 0.5) * 6
          ));
          meshRef.current.position.copy(teleportPos);
          setTeleportCooldown(currentTime + 5000);
          console.log('🥷 Assassin teleported!');
        } else if (distance < 8) {
          // Fast melee approach
          const direction = playerPos.clone().sub(enemyPos).normalize();
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 4));
        }
        break;
        
      case 'berserker':
        // Aggressive charging
        if (distance < 20) {
          const direction = playerPos.clone().sub(enemyPos).normalize();
          const speed = rageMode ? 5 : 2.5;
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * speed));
          
          // Berserker visual effects when in rage
          if (rageMode) {
            meshRef.current.rotation.y += deltaTime * 5;
          }
        }
        break;
        
      case 'sniper':
        // Keep distance and aim
        if (distance < 25 && distance > 15) {
          meshRef.current.lookAt(playerPos);
        } else if (distance < 10) {
          // Back away
          const direction = enemyPos.clone().sub(playerPos).normalize();
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 1.5));
        }
        break;
        
      case 'shield':
        // Defensive positioning
        if (distance < 8) {
          meshRef.current.lookAt(playerPos);
        }
        break;
        
      case 'mage':
        // Keep medium distance
        if (distance < 15 && distance > 8) {
          meshRef.current.lookAt(playerPos);
        } else if (distance < 6) {
          // Retreat
          const direction = enemyPos.clone().sub(playerPos).normalize();
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 2));
        }
        break;
        
      case 'boss':
        // Multi-phase behavior
        if (distance < 30) {
          meshRef.current.lookAt(playerPos);
          // Slow approach
          if (distance > 8) {
            const direction = playerPos.clone().sub(enemyPos).normalize();
            meshRef.current.position.add(direction.multiplyScalar(deltaTime * 1));
          }
        }
        break;
    }
    
    // Attack logic for all types
    if (distance < getAttackRange(type) && currentTime > lastAttack + getAttackSpeed(type)) {
      performAttack(enemyPos, playerPos, scene, currentTime);
      setLastAttack(currentTime);
    }
  });
  
  function getAttackRange(enemyType: string): number {
    switch (enemyType) {
      case 'grunt': return 3;
      case 'rifleman': return 18;
      case 'heavy': return 5;
      case 'assassin': return 2.5;
      case 'bomber': return 4;
      case 'sniper': return 25;
      case 'berserker': return 3.5;
      case 'shield': return 4;
      case 'mage': return 12;
      case 'boss': return 15;
      default: return 3;
    }
  }
  
  function performAttack(enemyPos: THREE.Vector3, playerPos: THREE.Vector3, scene: THREE.Scene, currentTime: number) {
    const direction = playerPos.clone().sub(enemyPos).normalize();
    const damage = getAttackDamage(type);
    
    setIsAttacking(true);
    setTimeout(() => setIsAttacking(false), 300);
    
    switch (type) {
      case 'grunt':
      case 'heavy':
      case 'assassin':
      case 'berserker':
      case 'shield':
        // Melee attack - damage player directly
        console.log(`⚔️ ${type} melee attack! ${damage} damage`);
        // TODO: Integrate with player health system
        addHitEffect([enemyPos.x, enemyPos.y + 1, enemyPos.z]);
        break;
        
      case 'rifleman':
      case 'sniper':
        // Projectile attack
        createProjectile(enemyPos, direction, scene, 'bullet', damage);
        break;
        
      case 'bomber':
        // AOE explosion
        createExplosion(enemyPos, scene, damage);
        break;
        
      case 'mage':
        // Magic projectile
        createProjectile(enemyPos, direction, scene, 'magic', damage);
        break;
        
      case 'boss':
        // Multiple attacks
        createProjectile(enemyPos, direction, scene, 'boss', damage);
        // Boss also creates AOE every 3rd attack
        if (Math.random() < 0.33) {
          createExplosion(enemyPos, scene, damage * 0.5);
        }
        break;
    }
  }
  
  function createProjectile(startPos: THREE.Vector3, direction: THREE.Vector3, scene: THREE.Scene, projectileType: string, damage: number) {
    const projectileGroup = new THREE.Group();
    
    let geometry, material;
    switch (projectileType) {
      case 'bullet':
        geometry = new THREE.SphereGeometry(0.05);
        material = new THREE.MeshLambertMaterial({ color: '#FFD700' });
        break;
      case 'magic':
        geometry = new THREE.SphereGeometry(0.1);
        material = new THREE.MeshLambertMaterial({ 
          color: '#9400D3', 
          emissive: '#4B0082',
          emissiveIntensity: 0.5 
        });
        break;
      case 'boss':
        geometry = new THREE.SphereGeometry(0.15);
        material = new THREE.MeshLambertMaterial({ 
          color: '#FF0000', 
          emissive: '#8B0000',
          emissiveIntensity: 0.8 
        });
        break;
      default:
        geometry = new THREE.SphereGeometry(0.05);
        material = new THREE.MeshLambertMaterial({ color: '#FFD700' });
    }
    
    const projectileMesh = new THREE.Mesh(geometry, material);
    projectileGroup.add(projectileMesh);
    projectileGroup.position.copy(startPos);
    projectileGroup.position.y += 1.5; // Shoot from chest height
    
    // Mark as enemy projectile
    projectileGroup.userData.isEnemyProjectile = true;
    projectileGroup.userData.damage = damage;
    projectileGroup.userData.velocity = direction.clone().multiplyScalar(15);
    projectileGroup.userData.startTime = Date.now();
    
    scene.add(projectileGroup);
    
    // Animate projectile
    const animateProjectile = () => {
      if (!projectileGroup.parent) return;
      
      const elapsed = Date.now() - projectileGroup.userData.startTime;
      if (elapsed > 5000) { // Remove after 5 seconds
        scene.remove(projectileGroup);
        return;
      }
      
      projectileGroup.position.add(projectileGroup.userData.velocity.clone().multiplyScalar(0.016));
      requestAnimationFrame(animateProjectile);
    };
    animateProjectile();
    
    console.log(`🏹 ${type} fired ${projectileType}! ${damage} damage`);
  }
  
  function createExplosion(center: THREE.Vector3, scene: THREE.Scene, damage: number) {
    // Create explosion effect
    addHitEffect([center.x, center.y + 1, center.z]);
    
    // Create explosion sphere for visual
    const explosionGeometry = new THREE.SphereGeometry(3);
    const explosionMaterial = new THREE.MeshLambertMaterial({ 
      color: '#FF4500',
      transparent: true,
      opacity: 0.7
    });
    const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosionMesh.position.copy(center);
    explosionMesh.position.y += 1;
    
    scene.add(explosionMesh);
    
    // Animate explosion
    let scale = 0.1;
    const animateExplosion = () => {
      scale += 0.2;
      explosionMesh.scale.setScalar(scale);
      explosionMaterial.opacity -= 0.05;
      
      if (explosionMaterial.opacity <= 0) {
        scene.remove(explosionMesh);
      } else {
        requestAnimationFrame(animateExplosion);
      }
    };
    animateExplosion();
    
    console.log(`💥 ${type} EXPLOSION! ${damage} AOE damage`);
  }
  
  if (isDead) return null;
  
  const size = getEnemySize(type);
  const color = getEnemyColor(type);
  
  return (
    <group ref={meshRef} position={position}>
      {/* Main Body */}
      <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshLambertMaterial 
          color={isAttacking ? '#FF0000' : color}
          transparent={true}
          opacity={rageMode ? 0.9 : 1.0}
        />
      </mesh>
      
      {/* Health Bar */}
      {health < maxHealth && (
        <>
          {/* Health Bar Background */}
          <mesh position={[0, size[1] + 0.5, 0]}>
            <boxGeometry args={[1.5, 0.1, 0.01]} />
            <meshLambertMaterial color="#333333" />
          </mesh>
          
          {/* Health Bar Fill */}
          <mesh position={[-0.75 + (health / maxHealth) * 0.75, size[1] + 0.5, 0.005]}>
            <boxGeometry args={[(health / maxHealth) * 1.5, 0.08, 0.01]} />
            <meshLambertMaterial color={health > maxHealth * 0.5 ? '#00ff00' : health > maxHealth * 0.25 ? '#ffaa00' : '#ff0000'} />
          </mesh>
        </>
      )}
      
      {/* Special Visual Effects */}
      {type === 'shield' && (
        <mesh position={[0.8, size[1] / 2, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.1, 1.5, 0.8]} />
          <meshLambertMaterial color="#4682B4" />
        </mesh>
      )}
      
      {type === 'mage' && (
        <mesh position={[0, size[1] + 0.8, 0]}>
          <sphereGeometry args={[0.2]} />
          <meshLambertMaterial 
            color="#9400D3" 
            emissive="#4B0082"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {rageMode && (
        <mesh position={[0, size[1] + 1, 0]}>
          <sphereGeometry args={[0.3]} />
          <meshLambertMaterial 
            color="#FF0000" 
            emissive="#8B0000"
            emissiveIntensity={1.0}
            transparent={true}
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}