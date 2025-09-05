import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVRGame } from "../lib/stores/useVRGame";
import HealthBar from "./HealthBar";
import enemyConfig from "../data/enemyConfig.json";

interface EnemyProps {
  type:
    | "grunt"
    | "rifleman"
    | "heavy"
    | "assassin"
    | "bomber"
    | "sniper"
    | "berserker"
    | "shield"
    | "mage"
    | "boss"
    | "drone"
    | "wasp"
    | "phoenix";
  position: [number, number, number];
}

// Helper functions to get enemy properties from configuration
function getEnemyProperty(enemyType: string, property: keyof (typeof enemyConfig.enemyTypes)[keyof typeof enemyConfig.enemyTypes]) {
  const config = enemyConfig.enemyTypes[enemyType as keyof typeof enemyConfig.enemyTypes];
  return config ? config[property] : enemyConfig.enemyTypes.grunt[property];
}

function getMaxHealth(enemyType: string): number {
  return getEnemyProperty(enemyType, 'health') as number;
}

function getEnemyColor(enemyType: string): string {
  return getEnemyProperty(enemyType, 'color') as string;
}

function getEnemySize(enemyType: string): [number, number, number] {
  return getEnemyProperty(enemyType, 'size') as [number, number, number];
}

function getAttackDamage(enemyType: string, rageMode: boolean = false): number {
  const config = enemyConfig.enemyTypes[enemyType as keyof typeof enemyConfig.enemyTypes];
  if (config && enemyType === 'berserker' && rageMode && 'rageDamage' in config) {
    return config.rageDamage as number;
  }
  return getEnemyProperty(enemyType, 'attackDamage') as number;
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

  const { addHitEffect, gameResetKey } = useVRGame();

  // Reset enemy when game resets
  useEffect(() => {
    if (gameResetKey > 0) {
      setHealth(getMaxHealth(type));
      setIsDead(false);
      setLastAttack(0);
      setIsAttacking(false);
      setRageMode(false);
      setTeleportCooldown(0);
      console.log(`🔄 ${type} enemy reset!`);
    }
  }, [gameResetKey, type]);

  function getAttackSpeed(enemyType: string): number {
    const config = enemyConfig.enemyTypes[enemyType as keyof typeof enemyConfig.enemyTypes];
    if (config && enemyType === 'berserker' && rageMode) {
      return 600; // Faster in rage mode
    }
    return config ? config.attackCooldown : 2000;
  }

  function takeDamage(damage: number) {
    if (isDead) return;

    const newHealth = Math.max(0, health - damage);
    setHealth(newHealth);

    // Berserker rage mode when low health
    if (type === "berserker" && newHealth < maxHealth * 0.3 && !rageMode) {
      setRageMode(true);
      console.log("🔥 BERSERKER RAGE ACTIVATED!");
    }

    if (newHealth <= 0) {
      setIsDead(true);
      // Mark death start time for animation
      if (meshRef.current) {
        meshRef.current.userData.deathStartTime = Date.now();
      }
      // Award points based on enemy type
      const points = type === "boss" ? 500 : type === "heavy" ? 100 : 50;
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
    if (!meshRef.current) return;

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

    // Death animation sequence
    if (isDead) {
      const deathTime =
        currentTime - (meshRef.current.userData.deathStartTime || currentTime);

      if (deathTime < 500) {
        // Phase 1: Turn bright red (0-0.5 seconds)
        meshRef.current.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshLambertMaterial
          ) {
            child.material.color.set("#FF0000"); // Bright red
            child.material.transparent = true;
          }
        });
      } else if (deathTime < 1500) {
        // Phase 2: Become translucent (0.5-1.5 seconds)
        const fadeProgress = (deathTime - 500) / 1000; // 0 to 1
        const opacity = 1.0 - fadeProgress * 0.5; // Fade to 50% opacity

        meshRef.current.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshLambertMaterial
          ) {
            child.material.opacity = opacity;
            child.material.transparent = true;
          }
        });
      } else {
        // Phase 3: Dissolve (1.5+ seconds)
        const dissolveProgress = (deathTime - 1500) / 1000; // 0 to 1+
        const scale = Math.max(0, 1.0 - dissolveProgress);
        const opacity = Math.max(0, 0.5 - dissolveProgress * 0.5);

        meshRef.current.scale.setScalar(scale);
        meshRef.current.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshLambertMaterial
          ) {
            child.material.opacity = opacity;
            child.material.transparent = true;
          }
        });

        // Remove completely after dissolving
        if (scale <= 0) {
          scene.remove(meshRef.current);
        }
      }
      return;
    }

    // AI Behaviors based on type
    switch (type) {
      case "grunt":
        // Basic melee - walk toward player if close
        if (distance < 15 && distance > 2) {
          const direction = playerPos.clone().sub(enemyPos).normalize();
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 2));
        }
        break;

      case "rifleman":
        // Medium range shooting
        if (distance < 20 && distance > 8) {
          meshRef.current.lookAt(playerPos);
        }
        break;

      case "heavy":
        // Slow movement, high damage
        if (distance < 12 && distance > 3) {
          const direction = playerPos.clone().sub(enemyPos).normalize();
          meshRef.current.position.add(
            direction.multiplyScalar(deltaTime * 0.8),
          );
        }
        break;

      case "assassin":
        // Teleport closer if far away
        if (distance > 15 && currentTime > teleportCooldown) {
          const teleportPos = playerPos
            .clone()
            .add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                0,
                (Math.random() - 0.5) * 6,
              ),
            );
          meshRef.current.position.copy(teleportPos);
          setTeleportCooldown(currentTime + 5000);
          console.log("🥷 Assassin teleported!");
        } else if (distance < 8) {
          // Fast melee approach
          const direction = playerPos.clone().sub(enemyPos).normalize();
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 4));
        }
        break;

      case "berserker":
        // Aggressive charging
        if (distance < 20) {
          const direction = playerPos.clone().sub(enemyPos).normalize();
          const speed = rageMode ? 5 : 2.5;
          meshRef.current.position.add(
            direction.multiplyScalar(deltaTime * speed),
          );

          // Berserker visual effects when in rage
          if (rageMode) {
            meshRef.current.rotation.y += deltaTime * 5;
          }
        }
        break;

      case "sniper":
        // Keep distance and aim
        if (distance < 25 && distance > 15) {
          meshRef.current.lookAt(playerPos);
        } else if (distance < 10) {
          // Back away
          const direction = enemyPos.clone().sub(playerPos).normalize();
          meshRef.current.position.add(
            direction.multiplyScalar(deltaTime * 1.5),
          );
        }
        break;

      case "shield":
        // Defensive positioning
        if (distance < 8) {
          meshRef.current.lookAt(playerPos);
        }
        break;

      case "mage":
        // Keep medium distance
        if (distance < 15 && distance > 8) {
          meshRef.current.lookAt(playerPos);
        } else if (distance < 6) {
          // Retreat
          const direction = enemyPos.clone().sub(playerPos).normalize();
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 2));
        }
        break;

      case "boss":
        // Multi-phase behavior
        if (distance < 30) {
          meshRef.current.lookAt(playerPos);
          // Slow approach
          if (distance > 8) {
            const direction = playerPos.clone().sub(enemyPos).normalize();
            meshRef.current.position.add(
              direction.multiplyScalar(deltaTime * 1),
            );
          }
        }
        break;

      case "drone":
        // Hover and strafe around player
        if (distance < 20) {
          meshRef.current.lookAt(playerPos);
          // Circular movement pattern
          const angle = currentTime * 0.001; // Slow rotation
          const radius = 8;
          const targetX = playerPos.x + Math.cos(angle) * radius;
          const targetZ = playerPos.z + Math.sin(angle) * radius;
          const targetY = playerPos.y + 3; // Stay airborne

          const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
          const direction = targetPos.clone().sub(enemyPos).normalize();
          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 2));
        }
        break;

      case "wasp":
        // Fast, erratic flight patterns
        if (distance < 15) {
          // Quick dives toward player
          const direction = playerPos.clone().sub(enemyPos).normalize();
          // Add random jitter for erratic movement
          direction.x += (Math.random() - 0.5) * 0.5;
          direction.z += (Math.random() - 0.5) * 0.5;
          direction.y += Math.sin(currentTime * 0.01) * 0.3; // Bobbing flight
          direction.normalize();

          meshRef.current.position.add(direction.multiplyScalar(deltaTime * 4));
          meshRef.current.lookAt(playerPos);
        }
        break;

      case "phoenix":
        // Majestic aerial predator
        if (distance < 25) {
          // Swooping attacks from above
          const currentY = meshRef.current.position.y;
          const targetY = playerPos.y + 6; // Stay well above player

          if (distance > 10) {
            // Approach from above
            const direction = playerPos.clone().sub(enemyPos).normalize();
            direction.y = (targetY - currentY) * 0.1; // Gradual height adjustment
            meshRef.current.position.add(
              direction.multiplyScalar(deltaTime * 2.5),
            );
          } else {
            // Circle overhead for attack positioning
            const angle = currentTime * 0.002;
            const radius = 6;
            const targetX = playerPos.x + Math.cos(angle) * radius;
            const targetZ = playerPos.z + Math.sin(angle) * radius;

            const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
            const direction = targetPos.clone().sub(enemyPos).normalize();
            meshRef.current.position.add(
              direction.multiplyScalar(deltaTime * 1.5),
            );
          }
          meshRef.current.lookAt(playerPos);
        }
        break;
    }

    // Attack logic for all types
    if (
      distance < getAttackRange(type) &&
      currentTime > lastAttack + getAttackSpeed(type)
    ) {
      performAttack(enemyPos, playerPos, scene, currentTime);
      setLastAttack(currentTime);
    }
  });

  function getAttackRange(enemyType: string): number {
    switch (enemyType) {
      case "grunt":
        return 3;
      case "rifleman":
        return 18;
      case "heavy":
        return 5;
      case "assassin":
        return 2.5;
      case "bomber":
        return 4;
      case "sniper":
        return 25;
      case "berserker":
        return 3.5;
      case "shield":
        return 4;
      case "mage":
        return 12;
      case "boss":
        return 15;
      case "drone":
        return 12;
      case "wasp":
        return 6;
      case "phoenix":
        return 20;
      default:
        return 3;
    }
  }

  function performAttack(
    enemyPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    scene: THREE.Scene,
    currentTime: number,
  ) {
    const direction = playerPos.clone().sub(enemyPos).normalize();
    const damage = getAttackDamage(type, rageMode);

    setIsAttacking(true);
    setTimeout(() => setIsAttacking(false), 300);

    switch (type) {
      case "grunt":
      case "heavy":
      case "assassin":
      case "berserker":
      case "shield":
        // Melee attack - damage player directly
        console.log(`⚔️ ${type} melee attack! ${damage} damage`);

        // Check if player is in melee range (2 units)
        const playerDistance = enemyPos.distanceTo(playerPos);
        if (playerDistance < 2.0) {
          // Import and call the damage function
          import("../lib/stores/useVRGame").then(({ useVRGame }) => {
            useVRGame.getState().takeDamage(damage);
            console.log(`💥 Player hit by ${type}! Took ${damage} damage!`);
          });

          // Play damage sound
          import("../lib/stores/useAudio").then(({ useAudio }) => {
            useAudio.getState().playPlayerDamage();
          });
        }

        addHitEffect([enemyPos.x, enemyPos.y + 1, enemyPos.z]);
        break;

      case "rifleman":
      case "sniper":
        // Projectile attack
        createProjectile(enemyPos, direction, scene, "bullet", damage);
        break;

      case "bomber":
        // AOE explosion
        createExplosion(enemyPos, scene, damage);
        break;

      case "mage":
        // Magic projectile
        createProjectile(enemyPos, direction, scene, "magic", damage);
        break;

      case "boss":
        // Multiple attacks
        createProjectile(enemyPos, direction, scene, "boss", damage);
        // Boss also creates AOE every 3rd attack
        if (Math.random() < 0.33) {
          createExplosion(enemyPos, scene, damage * 0.5);
        }
        break;

      case "drone":
        // Precision laser shots
        createProjectile(enemyPos, direction, scene, "laser", damage);
        break;

      case "wasp":
        // Fast stinger attacks
        createProjectile(enemyPos, direction, scene, "stinger", damage);
        break;

      case "phoenix":
        // Fire breath attack
        createProjectile(enemyPos, direction, scene, "fire", damage);
        // Phoenix also creates fire AOE
        if (Math.random() < 0.25) {
          createExplosion(enemyPos, scene, damage * 0.3);
        }
        break;
    }
  }

  function createProjectile(
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    scene: THREE.Scene,
    projectileType: string,
    damage: number,
  ) {
    const projectileGroup = new THREE.Group();

    let geometry, material;
    switch (projectileType) {
      case "bullet":
        geometry = new THREE.SphereGeometry(0.05);
        material = new THREE.MeshLambertMaterial({ color: "#FFD700" });
        break;
      case "magic":
        geometry = new THREE.SphereGeometry(0.1);
        material = new THREE.MeshLambertMaterial({
          color: "#9400D3",
          emissive: "#4B0082",
          emissiveIntensity: 0.5,
        });
        break;
      case "boss":
        geometry = new THREE.SphereGeometry(0.15);
        material = new THREE.MeshLambertMaterial({
          color: "#FF0000",
          emissive: "#8B0000",
          emissiveIntensity: 0.8,
        });
        break;
      case "laser":
        geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3);
        material = new THREE.MeshLambertMaterial({
          color: "#00FFFF",
          emissive: "#0080FF",
          emissiveIntensity: 1.0,
        });
        break;
      case "stinger":
        geometry = new THREE.ConeGeometry(0.03, 0.2);
        material = new THREE.MeshLambertMaterial({
          color: "#FFD700",
          emissive: "#FFA500",
          emissiveIntensity: 0.6,
        });
        break;
      case "fire":
        geometry = new THREE.SphereGeometry(0.12);
        material = new THREE.MeshLambertMaterial({
          color: "#FF4500",
          emissive: "#FF6347",
          emissiveIntensity: 1.2,
        });
        break;
      default:
        geometry = new THREE.SphereGeometry(0.05);
        material = new THREE.MeshLambertMaterial({ color: "#FFD700" });
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
      if (elapsed > 5000) {
        // Remove after 5 seconds
        scene.remove(projectileGroup);
        return;
      }

      projectileGroup.position.add(
        projectileGroup.userData.velocity.clone().multiplyScalar(0.016),
      );
      requestAnimationFrame(animateProjectile);
    };
    animateProjectile();

    console.log(`🏹 ${type} fired ${projectileType}! ${damage} damage`);
  }

  function createExplosion(
    center: THREE.Vector3,
    scene: THREE.Scene,
    damage: number,
  ) {
    // Create explosion effect
    addHitEffect([center.x, center.y + 1, center.z]);

    // Create explosion sphere for visual
    const explosionGeometry = new THREE.SphereGeometry(3);
    const explosionMaterial = new THREE.MeshLambertMaterial({
      color: "#FF4500",
      transparent: true,
      opacity: 0.7,
    });
    const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosionMesh.position.copy(center);
    explosionMesh.position.y += 1;

    // Mark explosion for player collision detection
    explosionMesh.userData.isExplosion = true;
    explosionMesh.userData.damage = damage;
    explosionMesh.userData.radius = 3.0;
    explosionMesh.userData.hitPlayer = false;

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
          color={isAttacking ? "#FF0000" : color}
          transparent={true}
          opacity={rageMode ? 0.9 : 1.0}
        />
      </mesh>

      {/* Health Bar Component */}
      <HealthBar
        health={health}
        maxHealth={maxHealth}
        position={[position[0], position[1], position[2]]}
        enemyType={type}
      />

      {/* Special Visual Effects */}
      {type === "shield" && (
        <mesh position={[0.8, size[1] / 2, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.1, 1.5, 0.8]} />
          <meshLambertMaterial color="#4682B4" />
        </mesh>
      )}

      {type === "mage" && (
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
