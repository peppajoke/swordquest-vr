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
import { Text } from '@react-three/drei';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';

export default function VRGame() {
  const { scene } = useThree();
  const { initializeGame, health, maxHealth, isDead, respawn } = useVRGame();
  const { 
    setBackgroundMusic, 
    setHitSound, 
    setSuccessSound,
    setSwordHitSound,
    setGunShootSound,
    setGunHitSound,
    setPlayerDamageSound,
    setAccelerationSound,
    setBoostSound
  } = useAudio();
  const [fuel, setFuel] = useState(100);
  const [maxFuel] = useState(100);
  const [ammo, setAmmo] = useState(30);

  useEffect(() => {
    initializeGame();

    // Setup sound effects only
    const hitSFX = new Audio('/sounds/hit.mp3');
    hitSFX.volume = 0.5;
    setHitSound(hitSFX);

    const successSFX = new Audio('/sounds/success.mp3');
    successSFX.volume = 0.6;
    setSuccessSound(successSFX);
    
    // Try to load unique sound files (with fallbacks to existing sounds)
    try {
      const swordHitSFX = new Audio('/sounds/sword_hit.mp3');
      swordHitSFX.volume = 0.5;
      setSwordHitSound(swordHitSFX);
    } catch { /* Use fallback */ }
    
    try {
      const gunShootSFX = new Audio('/sounds/gun_shoot.mp3');
      gunShootSFX.volume = 0.4;
      setGunShootSound(gunShootSFX);
    } catch { /* Use fallback */ }
    
    try {
      const gunHitSFX = new Audio('/sounds/gun_hit.mp3');
      gunHitSFX.volume = 0.5;
      setGunHitSound(gunHitSFX);
    } catch { /* Use fallback */ }
    
    try {
      const playerDamageSFX = new Audio('/sounds/player_damage.mp3');
      playerDamageSFX.volume = 0.6;
      setPlayerDamageSound(playerDamageSFX);
    } catch { /* Use fallback */ }
    
    try {
      const accelerationSFX = new Audio('/sounds/acceleration.mp3');
      accelerationSFX.volume = 0.3;
      setAccelerationSound(accelerationSFX);
    } catch { /* Use fallback */ }
    
    try {
      const boostSFX = new Audio('/sounds/boost.mp3');
      boostSFX.volume = 0.5;
      setBoostSound(boostSFX);
    } catch { /* Use fallback */ }

  }, [initializeGame, setBackgroundMusic, setHitSound, setSuccessSound, setSwordHitSound, setGunShootSound, setGunHitSound, setPlayerDamageSound, setAccelerationSound, setBoostSound]);

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
        {/* Ground - Covers entire expanded map area */}
        <mesh receiveShadow position={[0, 0, -50]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[150, 200]} />
          <meshLambertMaterial color="#2d3436" />
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
