import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

export function DeathRoom() {
  const playAgainBoxRef = useRef<THREE.Group>(null);
  const roomRef = useRef<THREE.Group>(null);
  const { exitDeathRoom, gameStarted, isDead } = useVRGame();
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
      {/* Simple floor */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshLambertMaterial color="#444444" />
      </mesh>
      
      {/* Strong lighting */}
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={2} 
        color="#ffffff"
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
        
        {/* Text - changes based on game state */}
        <Text
          position={[0, 0, 0.2]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Bold.woff"
        >
          {!gameStarted ? "START GAME" : "PLAY AGAIN"}
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
      
      {/* Title message - changes based on game state */}
      <Text
        position={[0, 3.5, -2]}
        fontSize={0.4}
        color={!gameStarted ? "#4499ff" : "#ff4444"}
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        {!gameStarted ? "VR SWORD FIGHTER" : "YOU DIED"}
      </Text>
      
      {!gameStarted && (
        <Text
          position={[0, 3, -2]}
          fontSize={0.2}
          color="#88ccff"
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Regular.woff"
        >
          Ready for combat?
        </Text>
      )}
    </group>
  );
}