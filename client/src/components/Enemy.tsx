import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVRGame } from "../lib/stores/useVRGame";
import HealthBar from "./HealthBar";
import EnemyMesh from "./EnemyMesh";
import enemyConfig from "../data/enemyConfig.json";
import { EnemyAIService, EnemyState } from "../services/EnemyAIService";
import { COMBAT_CONFIG, PERFORMANCE_CONFIG, ANIMATION_CONFIG } from "../config/gameConfig";

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

function getEnemyColor(enemyType: string): string {
  return getEnemyProperty(enemyType, 'color') as string;
}

function getEnemySize(enemyType: string): [number, number, number] {
  return getEnemyProperty(enemyType, 'size') as [number, number, number];
}

export default function Enemy({ type, position }: EnemyProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [enemyState, setEnemyState] = useState<EnemyState>(() => ({
    health: EnemyAIService.getMaxHealth(type),
    maxHealth: EnemyAIService.getMaxHealth(type),
    isDead: false,
    lastAttackTime: 0,
    position: new THREE.Vector3(...position),
    rageMode: false,
    teleportCooldown: 0
  }));
  const [isAttacking, setIsAttacking] = useState(false);

  const { addHitEffect, gameResetKey } = useVRGame();

  // Reset enemy when game resets
  useEffect(() => {
    if (gameResetKey > 0) {
      setEnemyState({
        health: EnemyAIService.getMaxHealth(type),
        maxHealth: EnemyAIService.getMaxHealth(type),
        isDead: false,
        lastAttackTime: 0,
        position: new THREE.Vector3(...position),
        rageMode: false,
        teleportCooldown: 0
      });
      setIsAttacking(false);
      console.log(`🔄 ${type} enemy reset!`);
    }
  }, [gameResetKey, type, position]);

  function takeDamage(damage: number) {
    if (enemyState.isDead) return;

    const currentTime = Date.now();
    const enemyDied = EnemyAIService.takeDamage(enemyState, damage, currentTime);
    
    setEnemyState(prev => ({ ...prev })); // Trigger re-render

    // Handle death
    if (enemyDied) {
      // Mark death start time for animation
      if (meshRef.current) {
        meshRef.current.userData.deathStartTime = currentTime;
      }
      // Award points based on enemy type
      const points = type === "boss" ? 500 : type === "heavy" ? 100 : 50;
      console.log(`💀 ${type.toUpperCase()} defeated! +${points} points`);
    }

    // Handle berserker rage mode
    if (type === "berserker" && enemyState.health < enemyState.maxHealth * 0.3 && !enemyState.rageMode) {
      setEnemyState(prev => ({ ...prev, rageMode: true }));
      console.log("🔥 BERSERKER RAGE ACTIVATED!");
    }
  }

  useEffect(() => {
    if (meshRef.current) {
      // Mark for collision detection
      meshRef.current.userData.isEnemy = true;
      meshRef.current.userData.enemyType = type;
      meshRef.current.userData.health = enemyState.health;
      meshRef.current.userData.maxHealth = enemyState.maxHealth;
      meshRef.current.userData.takeDamage = takeDamage;
      meshRef.current.userData.isDead = enemyState.isDead;
    }
  }, [enemyState.health, enemyState.maxHealth, enemyState.isDead, type]);

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

    // Always update collision data and dead status for immediate response
    meshRef.current.userData.health = enemyState.health;
    meshRef.current.userData.isDead = enemyState.isDead;

    // Distance-based performance optimization using central config
    const MAX_ACTIVE_DISTANCE = COMBAT_CONFIG.collision.maxCheckDistance;
    const CLOSE_DISTANCE = COMBAT_CONFIG.collision.closeDistance;
    const MID_DISTANCE = COMBAT_CONFIG.collision.midDistance;
    
    // Skip expensive AI computations for very distant enemies
    if (distance > MAX_ACTIVE_DISTANCE && !enemyState.isDead) {
      // Only update position for very basic collision detection
      return;
    }

    // Reduce update frequency for distant enemies using simple frame counter
    const frameSkip = distance > CLOSE_DISTANCE ? 
      (distance > MID_DISTANCE ? PERFORMANCE_CONFIG.frameSkipping.farFrameSkip : PERFORMANCE_CONFIG.frameSkipping.midFrameSkip) : PERFORMANCE_CONFIG.frameSkipping.closeFrameSkip;
    
    // Use frame-based skipping instead of time-based for better performance
    const frameNum = Math.floor(currentTime / 16) % frameSkip;
    if (frameNum !== 0 && !enemyState.isDead) {
      // Skip this frame for distant enemies
      return;
    }

    // Death animation sequence using central config
    if (enemyState.isDead) {
      const deathTime =
        currentTime - (meshRef.current.userData.deathStartTime || currentTime);

      if (deathTime < ANIMATION_CONFIG.deathSequence.redPhase) {
        // Phase 1: Turn bright red
        meshRef.current.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshLambertMaterial
          ) {
            child.material.color.set("#FF0000"); // Bright red
            child.material.transparent = true;
          }
        });
      } else if (deathTime < ANIMATION_CONFIG.deathSequence.dissolveStart) {
        // Phase 2: Become translucent
        const fadeProgress = (deathTime - ANIMATION_CONFIG.deathSequence.redPhase) / ANIMATION_CONFIG.deathSequence.fadePhase; // 0 to 1
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
        // Phase 3: Dissolve
        const dissolveProgress = (deathTime - ANIMATION_CONFIG.deathSequence.dissolveStart) / 1000; // 0 to 1+
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

    // Update enemy state position for AI service
    enemyState.position = enemyPos;
    
    // Use AI service for decision making
    const aiResult = EnemyAIService.updateEnemyAI(
      type,
      enemyState,
      playerPos,
      currentTime,
      deltaTime
    );
    
    // Handle AI results
    if (aiResult.shouldTeleport && meshRef.current) {
      const teleportPos = playerPos
        .clone()
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            0,
            (Math.random() - 0.5) * 6,
          ),
        );
      // Convert world teleport target to local space before applying
      const teleportLocal = teleportPos.clone();
      if (meshRef.current.parent) meshRef.current.parent.worldToLocal(teleportLocal);
      meshRef.current.position.copy(teleportLocal);
      setEnemyState(prev => ({ ...prev, teleportCooldown: currentTime + 5000 }));
    }
    
    if (aiResult.shouldMove && aiResult.newPosition && meshRef.current) {
      // AI computes position in world space; convert to local before applying
      const localPos = aiResult.newPosition.clone();
      if (meshRef.current.parent) meshRef.current.parent.worldToLocal(localPos);
      meshRef.current.position.copy(localPos);
    }
    
    if (aiResult.logMessage) {
      console.log(aiResult.logMessage);
    }
    
    // Berserker visual effects when in rage
    if (type === "berserker" && enemyState.rageMode && meshRef.current) {
      meshRef.current.rotation.y += deltaTime * 5;
    }

    // Handle attack logic through AI service
    if (aiResult.shouldAttack) {
      performAttack(enemyPos, playerPos, scene, currentTime);
      setEnemyState(prev => ({ ...prev, lastAttackTime: currentTime }));
    }
  });


  function performAttack(
    enemyPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    scene: THREE.Scene,
    currentTime: number,
  ) {
    const direction = playerPos.clone().sub(enemyPos).normalize();
    const damage = EnemyAIService.getAttackDamage(type, enemyState.rageMode);

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

  if (enemyState.isDead) return null;

  const color = getEnemyColor(type);

  return (
    <group ref={meshRef} position={position}>
      {/* Procedural enemy geometry */}
      <EnemyMesh type={type} color={color} isAttacking={isAttacking} rageMode={enemyState.rageMode} />

      {/* Health Bar Component */}
      <HealthBar
        health={enemyState.health}
        maxHealth={enemyState.maxHealth}
        position={[position[0], position[1], position[2]]}
        enemyType={type}
      />

      {/* Special Visual Effects */}
      {type === "shield" && (
        <mesh position={[0.8, 0.5, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.1, 1.5, 0.8]} />
          <meshLambertMaterial color="#4682B4" />
        </mesh>
      )}

      {type === "mage" && (
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[0.2]} />
          <meshLambertMaterial
            color="#9400D3"
            emissive="#4B0082"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {enemyState.rageMode && (
        <mesh position={[0, 1.4, 0]}>
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
