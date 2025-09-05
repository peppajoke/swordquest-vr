import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import VRControllers from './VRControllers';
import GameObjects from './GameObjects';
import SwordEffects from './SwordEffects';
import { VRDebugDisplay } from './VRDebugDisplay';
import { KeyboardMouseControls } from './KeyboardMouseControls';
import { ControlsInstructions } from './ControlsInstructions';
import { DeathHandler } from './DeathHandler';
import { LoadingScreen } from './LoadingScreen';
import { DeathRoom } from './DeathRoom';
import { Text } from '@react-three/drei';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';

export default function VRGame() {
  const { scene } = useThree();
  const { initializeGame, health, maxHealth, isDead, inDeathRoom, respawn } = useVRGame();
  // Audio setup is handled by App.tsx preloading
  const [fuel, setFuel] = useState(100);
  const [maxFuel] = useState(100);
  const [ammo, setAmmo] = useState(30);
  // Loading is now handled by App.tsx

  useEffect(() => {
    // Audio is preloaded by App.tsx before this component renders
    initializeGame();
    console.log('🎮 VRGame fully loaded and ready!');
  }, [initializeGame]);

  // Game is now fully loaded when this component renders
  return (
    <>
      {/* Environment Lighting */}
      <color attach="background" args={["#001122"]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      {/* World Group - Everything that moves with locomotion - starts centered in room */}
      <group name="worldGroup" position={[0, 0, 10]}>
        {inDeathRoom && <DeathRoom />}
        
        {/* White Room Floor */}
        <mesh receiveShadow position={[0, 0, -10]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[40, 20]} />
          <meshLambertMaterial color="#FFFFFF" />
        </mesh>
        
        {/* Game Objects - targets and environment */}
        <GameObjects />
        <SwordEffects />
      </group>

      {/* VR Components - Stay in VR space, don't move with world */}
      <VRControllers onFuelChange={setFuel} onAmmoChange={setAmmo} />
      
      {/* Keyboard/Mouse Controls - Alternative to VR */}
      <KeyboardMouseControls onFuelChange={setFuel} />
      
      {/* VR Debug Display with HP/Fuel/Ammo - Visible in Quest 3 */}
      <VRDebugDisplay fuel={fuel} maxFuel={maxFuel} ammo={ammo} />
      
      {/* Death Overlay */}
      {isDead && (
        <group>
          {/* Death Screen Background */}
          <mesh position={[0, 0, -2]}>
            <planeGeometry args={[10, 6]} />
            <meshLambertMaterial color="#000000" opacity={0.8} transparent />
          </mesh>
          
          {/* Game Over Text */}
          <Text
            position={[0, 1, -1.9]}
            fontSize={1}
            color="#ff0000"
            anchorX="center"
            anchorY="middle"
          >
            GAME OVER
          </Text>
          
          {/* Auto-reboot Message */}
          <Text
            position={[0, -0.5, -1.9]}
            fontSize={0.3}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            Rebooting in 3 seconds...
          </Text>
        </group>
      )}
      
      {/* Death Handler for respawn */}
      <DeathHandler />
    </>
  );
}
