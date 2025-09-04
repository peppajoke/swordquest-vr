import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

export function DeathRoom() {
  const playAgainBoxRef = useRef<THREE.Group>(null);
  const roomRef = useRef<THREE.Group>(null);
  const { exitDeathRoom } = useVRGame();
  const { scene } = useThree();

  useFrame(() => {
    if (!playAgainBoxRef.current) return;
    
    // Make the Play Again box glow and rotate
    playAgainBoxRef.current.rotation.y += 0.01;
    playAgainBoxRef.current.position.y = 2 + Math.sin(Date.now() * 0.003) * 0.2;
    
    // Mark as slashable for sword collision detection
    playAgainBoxRef.current.userData.isPlayAgainBox = true;
    
    // Check for sword collisions with Play Again box
    const worldGroup = scene.getObjectByName('worldGroup') as THREE.Group;
    if (worldGroup) {
      worldGroup.traverse((child) => {
        if (child.userData.isSword) {
          const swordPos = new THREE.Vector3();
          child.getWorldPosition(swordPos);
          
          const boxPos = new THREE.Vector3();
          playAgainBoxRef.current!.getWorldPosition(boxPos);
          
          const distance = swordPos.distanceTo(boxPos);
          if (distance < 2.0) { // Hit distance for the box
            console.log('⚔️ Slashed Play Again box - respawning!');
            exitDeathRoom();
          }
        }
      });
    }
  });

  return (
    <group ref={roomRef}>
      {/* Death Room Environment */}
      {/* Dark room walls */}
      <mesh position={[0, 2, -3]} receiveShadow>
        <boxGeometry args={[8, 4, 0.1]} />
        <meshLambertMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-4, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[6, 4, 0.1]} />
        <meshLambertMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[4, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[6, 4, 0.1]} />
        <meshLambertMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 6]} />
        <meshLambertMaterial color="#333333" />
      </mesh>
      
      {/* Ceiling */}
      <mesh position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshLambertMaterial color="#222222" />
      </mesh>
      
      {/* Red mood lighting */}
      <pointLight 
        position={[0, 3, 0]} 
        intensity={1.5} 
        color="#ff4444" 
        distance={10}
      />
      
      {/* Play Again Box - Large slashable target */}
      <group ref={playAgainBoxRef} position={[0, 2, -1]}>
        {/* Main box */}
        <mesh castShadow>
          <boxGeometry args={[2, 1, 0.3]} />
          <meshLambertMaterial color="#ff6600" emissive="#ff3300" emissiveIntensity={0.3} />
        </mesh>
        
        {/* Glow effect */}
        <mesh>
          <boxGeometry args={[2.2, 1.2, 0.5]} />
          <meshLambertMaterial 
            color="#ff8844" 
            transparent 
            opacity={0.3}
            emissive="#ff4400"
            emissiveIntensity={0.2}
          />
        </mesh>
        
        {/* Text */}
        <Text
          position={[0, 0, 0.2]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Bold.woff"
        >
          PLAY AGAIN
        </Text>
        
        <Text
          position={[0, -0.4, 0.2]}
          fontSize={0.15}
          color="#ffcccc"
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Regular.woff"
        >
          Slash with sword
        </Text>
      </group>
      
      {/* Death message */}
      <Text
        position={[0, 3.5, -2]}
        fontSize={0.4}
        color="#ff4444"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        YOU DIED
      </Text>
    </group>
  );
}