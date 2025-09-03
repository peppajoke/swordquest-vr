import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import VRControllers from './VRControllers';
import GameObjects from './GameObjects';
import SwordEffects from './SwordEffects';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';

export default function VRGame() {
  const { scene } = useThree();
  const { initializeGame } = useVRGame();
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();

  useEffect(() => {
    console.log('VRGame: Initializing VR sword fighting game');
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

    console.log('VRGame: Audio initialized');
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
      
      {/* Ground */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshLambertMaterial color="#2d3436" />
      </mesh>

      {/* Game Components */}
      <VRControllers />
      <GameObjects />
      <SwordEffects />
    </>
  );
}
