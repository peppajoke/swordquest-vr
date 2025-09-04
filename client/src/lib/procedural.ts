import * as THREE from 'three';

export interface WorldChunk {
  id: string;
  position: THREE.Vector3;
  generated: boolean;
  meshes: THREE.Object3D[];
  obstacles: THREE.Object3D[];
  destroyables: THREE.Object3D[];
}

export interface TerrainConfig {
  chunkSize: number;
  maxChunks: number;
  terrainHeight: number;
  obstacleCount: number;
}

export class ProceduralWorldGenerator {
  private chunks: Map<string, WorldChunk> = new Map();
  private config: TerrainConfig;
  private scene: THREE.Scene;
  private worldGroup: THREE.Group;

  constructor(scene: THREE.Scene, worldGroup: THREE.Group, config: Partial<TerrainConfig> = {}) {
    this.scene = scene;
    this.worldGroup = worldGroup;
    this.config = {
      chunkSize: 20,
      maxChunks: 25, // Keep reasonable number loaded
      terrainHeight: 0.1,
      obstacleCount: 8,
      ...config
    };
  }

  private getChunkKey(x: number, z: number): string {
    return `${Math.floor(x / this.config.chunkSize)}_${Math.floor(z / this.config.chunkSize)}`;
  }

  private getChunkPosition(x: number, z: number): THREE.Vector3 {
    const chunkX = Math.floor(x / this.config.chunkSize) * this.config.chunkSize;
    const chunkZ = Math.floor(z / this.config.chunkSize) * this.config.chunkSize;
    return new THREE.Vector3(chunkX, 0, chunkZ);
  }

  private generateTerrain(chunkPos: THREE.Vector3): THREE.Object3D[] {
    const terrains: THREE.Object3D[] = [];
    
    // Generate multiple terrain patches within chunk
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = chunkPos.x + (i * this.config.chunkSize / 4);
        const z = chunkPos.z + (j * this.config.chunkSize / 4);
        
        // Create ground patch with slight height variation
        const height = this.config.terrainHeight + (Math.random() - 0.5) * 0.05;
        const size = this.config.chunkSize / 4;
        
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshLambertMaterial({ 
          color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.3, 0.2 + Math.random() * 0.2)
        });
        
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(x, height, z);
        ground.receiveShadow = true;
        
        terrains.push(ground);
      }
    }
    
    return terrains;
  }

  private generateDestroyableObjects(chunkPos: THREE.Vector3): THREE.Object3D[] {
    const destroyables: THREE.Object3D[] = [];
    
    // Generate 8-12 destroyable objects per chunk
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const x = chunkPos.x + Math.random() * this.config.chunkSize;
      const z = chunkPos.z + Math.random() * this.config.chunkSize;
      
      // Random destroyable type
      const type = Math.floor(Math.random() * 4);
      let object: THREE.Object3D;
      
      switch (type) {
        case 0: // Wooden Crates
          object = new THREE.Mesh(
            new THREE.BoxGeometry(0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.4),
            new THREE.MeshLambertMaterial({ color: 0x8B4513 + Math.random() * 0x333333 })
          );
          break;
        case 1: // Crystal Formations
          object = new THREE.Mesh(
            new THREE.ConeGeometry(0.2 + Math.random() * 0.3, 0.8 + Math.random() * 0.6, 6),
            new THREE.MeshLambertMaterial({ color: 0x00FFFF + Math.random() * 0x004444, transparent: true, opacity: 0.8 })
          );
          break;
        case 2: // Pottery/Vases
          object = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2 + Math.random() * 0.2, 0.3 + Math.random() * 0.2, 0.8 + Math.random() * 0.4, 8),
            new THREE.MeshLambertMaterial({ color: 0xCD853F + Math.random() * 0x222222 })
          );
          break;
        default: // Ice Blocks
          object = new THREE.Mesh(
            new THREE.BoxGeometry(0.4 + Math.random() * 0.6, 0.4 + Math.random() * 0.6, 0.4 + Math.random() * 0.6),
            new THREE.MeshLambertMaterial({ color: 0x87CEEB + Math.random() * 0x111111, transparent: true, opacity: 0.7 })
          );
          break;
      }
      
      // Set position
      object.position.set(x, 0.5, z);
      object.castShadow = true;
      
      // Mark as destroyable
      (object as any).userData = { destroyable: true, health: 1 };
      
      destroyables.push(object);
    }
    
    return destroyables;
  }

  private generateObstacles(chunkPos: THREE.Vector3): THREE.Object3D[] {
    const obstacles: THREE.Object3D[] = [];
    
    for (let i = 0; i < this.config.obstacleCount; i++) {
      const x = chunkPos.x + Math.random() * this.config.chunkSize;
      const z = chunkPos.z + Math.random() * this.config.chunkSize;
      
      // Random obstacle type
      const obstacleType = Math.floor(Math.random() * 4);
      let obstacle: THREE.Object3D;
      
      switch (obstacleType) {
        case 0: // Cube
          obstacle = new THREE.Mesh(
            new THREE.BoxGeometry(0.5 + Math.random() * 1.5, 0.5 + Math.random() * 2, 0.5 + Math.random() * 1.5),
            new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff })
          );
          break;
        case 1: // Cylinder (tree-like)
          obstacle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1 + Math.random() * 0.3, 0.2 + Math.random() * 0.5, 1 + Math.random() * 2),
            new THREE.MeshLambertMaterial({ color: 0x4a4a2f + Math.random() * 0x202020 })
          );
          break;
        case 2: // Sphere (rocks)
          obstacle = new THREE.Mesh(
            new THREE.SphereGeometry(0.3 + Math.random() * 0.7, 8, 6),
            new THREE.MeshLambertMaterial({ color: 0x666666 + Math.random() * 0x333333 })
          );
          break;
        default: // Cone
          obstacle = new THREE.Mesh(
            new THREE.ConeGeometry(0.2 + Math.random() * 0.5, 0.8 + Math.random() * 1.5),
            new THREE.MeshLambertMaterial({ color: Math.random() * 0x888888 })
          );
          break;
      }
      
      // Set obstacle position with reasonable height
      const height = obstacle instanceof THREE.Mesh ? 0.5 : 0.5;
      obstacle.position.set(x, height, z);
      obstacle.castShadow = true;
      
      // Mark all obstacles as destroyable
      (obstacle as any).userData = { destroyable: true, health: 1, type: 'obstacle' };
      
      obstacles.push(obstacle);
    }
    
    return obstacles;
  }

  private generateChunk(chunkPos: THREE.Vector3): WorldChunk {
    const chunkId = this.getChunkKey(chunkPos.x, chunkPos.z);
    
    // Generate terrain, obstacles, and destroyable objects
    const terrains = this.generateTerrain(chunkPos);
    const obstacles = this.generateObstacles(chunkPos);
    const destroyables = this.generateDestroyableObjects(chunkPos);
    
    const chunk: WorldChunk = {
      id: chunkId,
      position: chunkPos,
      generated: true,
      meshes: terrains,
      obstacles: obstacles,
      destroyables: destroyables
    };
    
    // Add to world group
    [...terrains, ...obstacles, ...destroyables].forEach(obj => {
      this.worldGroup.add(obj);
    });
    
    console.log(`🌍 Generated chunk ${chunkId} at (${chunkPos.x}, ${chunkPos.z}) with ${destroyables.length} destroyables`);
    return chunk;
  }

  public updateWorld(playerPosition: THREE.Vector3, movementDirection?: THREE.Vector3): void {
    const currentChunkKey = this.getChunkKey(playerPosition.x, playerPosition.z);
    
    // Check if player is at the edge of generated terrain
    const isAtEdge = this.isPlayerAtTerrainEdge(playerPosition);
    
    // Base generation radius
    let generateRadius = 1; // 3x3 grid normally
    
    // If at edge or moving into unexplored areas, generate more aggressively
    if (isAtEdge || this.isMovingIntoUnexplored(playerPosition, movementDirection)) {
      generateRadius = 3; // 7x7 grid for aggressive generation
      console.log(`🚀 AGGRESSIVE GENERATION: Player at terrain edge, expanding to ${generateRadius * 2 + 1}x${generateRadius * 2 + 1} grid`);
    }
    
    // Generate chunks around player
    for (let dx = -generateRadius; dx <= generateRadius; dx++) {
      for (let dz = -generateRadius; dz <= generateRadius; dz++) {
        const chunkPos = this.getChunkPosition(
          playerPosition.x + dx * this.config.chunkSize,
          playerPosition.z + dz * this.config.chunkSize
        );
        const chunkKey = this.getChunkKey(chunkPos.x, chunkPos.z);
        
        // Generate chunk if it doesn't exist
        if (!this.chunks.has(chunkKey)) {
          const newChunk = this.generateChunk(chunkPos);
          this.chunks.set(chunkKey, newChunk);
        }
      }
    }
    
    // If moving with direction, generate extra chunks ahead
    if (movementDirection && movementDirection.length() > 0.1) {
      this.generateDirectional(playerPosition, movementDirection, generateRadius);
    }
    
    // Cleanup distant chunks
    this.cleanupDistantChunks(playerPosition);
  }

  private isPlayerAtTerrainEdge(playerPosition: THREE.Vector3): boolean {
    // Check if any adjacent chunks are missing
    const checkRadius = 2;
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      for (let dz = -checkRadius; dz <= checkRadius; dz++) {
        const chunkPos = this.getChunkPosition(
          playerPosition.x + dx * this.config.chunkSize,
          playerPosition.z + dz * this.config.chunkSize
        );
        const chunkKey = this.getChunkKey(chunkPos.x, chunkPos.z);
        
        if (!this.chunks.has(chunkKey)) {
          return true; // Found missing chunk nearby
        }
      }
    }
    return false;
  }

  private isMovingIntoUnexplored(playerPosition: THREE.Vector3, movementDirection?: THREE.Vector3): boolean {
    if (!movementDirection || movementDirection.length() < 0.1) return false;
    
    // Project forward in movement direction
    const futurePosition = playerPosition.clone().add(
      movementDirection.clone().normalize().multiplyScalar(this.config.chunkSize * 2)
    );
    
    const futureChunkKey = this.getChunkKey(futurePosition.x, futurePosition.z);
    return !this.chunks.has(futureChunkKey);
  }

  private generateDirectional(playerPosition: THREE.Vector3, direction: THREE.Vector3, baseRadius: number): void {
    const normalizedDir = direction.clone().normalize();
    
    // Generate chunks in a line ahead of movement
    for (let i = 1; i <= 4; i++) {
      const futurePos = playerPosition.clone().add(
        normalizedDir.clone().multiplyScalar(i * this.config.chunkSize)
      );
      
      // Generate chunks in a small cross pattern around the future position
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const chunkPos = this.getChunkPosition(
            futurePos.x + dx * this.config.chunkSize,
            futurePos.z + dz * this.config.chunkSize
          );
          const chunkKey = this.getChunkKey(chunkPos.x, chunkPos.z);
          
          if (!this.chunks.has(chunkKey)) {
            const newChunk = this.generateChunk(chunkPos);
            this.chunks.set(chunkKey, newChunk);
          }
        }
      }
    }
  }

  private cleanupDistantChunks(playerPosition: THREE.Vector3): void {
    const maxDistance = this.config.chunkSize * 3; // Keep chunks within 3 chunk radius
    const chunksToRemove: string[] = [];
    
    this.chunks.forEach((chunk, key) => {
      const distance = playerPosition.distanceTo(chunk.position);
      
      if (distance > maxDistance) {
        // Remove from world group
        [...chunk.meshes, ...chunk.obstacles, ...chunk.destroyables].forEach(obj => {
          this.worldGroup.remove(obj);
          // Dispose geometry and material to prevent memory leaks
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(mat => mat.dispose());
            } else {
              obj.material?.dispose();
            }
          }
        });
        
        chunksToRemove.push(key);
        console.log(`🧹 Cleaned up distant chunk ${key}`);
      }
    });
    
    chunksToRemove.forEach(key => this.chunks.delete(key));
  }

  public getGeneratedChunks(): Map<string, WorldChunk> {
    return new Map(this.chunks);
  }

  public destroy(): void {
    // Cleanup all chunks
    this.chunks.forEach((chunk) => {
      [...chunk.meshes, ...chunk.obstacles, ...chunk.destroyables].forEach(obj => {
        this.worldGroup.remove(obj);
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    });
    this.chunks.clear();
  }
}