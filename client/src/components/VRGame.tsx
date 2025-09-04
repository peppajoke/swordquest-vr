import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import VRControllers from './VRControllers';
import GameObjects from './GameObjects';
import SwordEffects from './SwordEffects';
import { VRDebugDisplay } from './VRDebugDisplay';
import { VROverlay } from './VROverlay';
import { KeyboardMouseControls } from './KeyboardMouseControls';
import { ControlsInstructions } from './ControlsInstructions';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';

export default function VRGame() {
  const { scene } = useThree();
  const { initializeGame, health, maxHealth } = useVRGame();
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();
  const [fuel, setFuel] = useState(100);
  const [maxFuel] = useState(100);

  useEffect(() => {
    initializeGame();

    // Setup audio
    const bgMusic = new Audio('/sounds/background.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.2;
    setBackgroundMusic(bgMusic);

    const hitSFX = new Audio('/sounds/hit.mp3');
    hitSFX.volume = 0.5;
    setHitSound(hitSFX);

    const successSFX = new Audio('/sounds/success.mp3');
    successSFX.volume = 0.6;
    setSuccessSound(successSFX);

  }, [initializeGame, setBackgroundMusic, setHitSound, setSuccessSound]);

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
      
      {/* World Group - Everything that moves with locomotion */}
      <group name="worldGroup">
        {/* Ground - Increased by 300% (20 * 4 = 80) */}
        <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshLambertMaterial color="#2d3436" />
        </mesh>
        
        {/* Game Objects - targets and environment */}
        <GameObjects />
        <SwordEffects />
      </group>

      {/* VR Components - Stay in VR space, don't move with world */}
      <VRControllers onFuelChange={setFuel} />
      
      {/* Keyboard/Mouse Controls - Alternative to VR */}
      <KeyboardMouseControls onFuelChange={setFuel} />
      
      {/* VR Overlay with health and fuel meters */}
      <VROverlay 
        fuel={fuel}
        maxFuel={maxFuel}
        health={health}
        maxHealth={maxHealth}
      />
      
      {/* VR Debug Display - Visible in Quest 3 */}
      <VRDebugDisplay />
    </>
  );
}
