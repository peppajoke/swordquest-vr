import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import VRControllers from './VRControllers';
import GameObjects from './GameObjects';
import SwordEffects from './SwordEffects';
import { VRDebugDisplay } from './VRDebugDisplay';
import DesktopControls from './DesktopControls';
import DesktopUI from './DesktopUI';
import PlayerCollisionDetector from './PlayerCollisionDetector';
import { Text } from '@react-three/drei';
import { useVRGame } from '../lib/stores/useVRGame';
import { useAudio } from '../lib/stores/useAudio';

export default function VRGame() {
  const { scene } = useThree();
  const { isPresenting: isVRPresenting } = useXR();
  const { initializeGame, health, maxHealth, isDead, inDeathRoom, respawn } = useVRGame();
  const { 
    setHitSound, setSuccessSound, setSwordHitSound, setGunShootSound, 
    setGunHitSound, setPlayerDamageSound, setAccelerationSound, 
    setBoostSound, setGunAmmoSound, setReloadSound 
  } = useAudio();
  const [fuel, setFuel] = useState(100);
  const [maxFuel] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [leftClip, setLeftClip] = useState(12);
  const [rightClip, setRightClip] = useState(12);
  const [jetpackEnabled, setJetpackEnabled] = useState(false);
  const [currentSwordHand, setCurrentSwordHand] = useState<'left' | 'right'>('right');

  useEffect(() => {
    // Initialize audio store with sound files
    const loadAudio = async () => {
      try {
        const hitSound = new Audio('/sounds/hit.mp3');
        const successSound = new Audio('/sounds/success.mp3');
        const swordHitSound = new Audio('/sounds/sword_hit.mp3');
        const gunShootSound = new Audio('/sounds/gun_shoot.mp3');
        const gunHitSound = new Audio('/sounds/gun_hit.mp3');
        const playerDamageSound = new Audio('/sounds/player_damage.mp3');
        const accelerationSound = new Audio('/sounds/acceleration.mp3');
        const boostSound = new Audio('/sounds/boost.mp3');
        const gunAmmoSound = new Audio('/sounds/gun_ammo.mp3');
        const reloadSound = new Audio('/sounds/reload.mp3');
        
        // Set all sounds in the store
        setHitSound(hitSound);
        setSuccessSound(successSound);
        setSwordHitSound(swordHitSound);
        setGunShootSound(gunShootSound);
        setGunHitSound(gunHitSound);
        setPlayerDamageSound(playerDamageSound);
        setAccelerationSound(accelerationSound);
        setBoostSound(boostSound);
        setGunAmmoSound(gunAmmoSound);
        setReloadSound(reloadSound);
        
      } catch (error) {
        console.error('Failed to load audio:', error);
      }
    };

    loadAudio();
    initializeGame();
  }, [initializeGame, setHitSound, setSuccessSound, setSwordHitSound, setGunShootSound, setGunHitSound, setPlayerDamageSound, setAccelerationSound, setBoostSound, setGunAmmoSound, setReloadSound]);

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
        {/* Death room removed for now */}
        
        {/* White Room Floor - 5x bigger */}
        <mesh receiveShadow position={[0, 0, -50]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 100]} />
          <meshLambertMaterial color="#FFFFFF" />
        </mesh>
        
        {/* Game Objects - targets and environment */}
        <GameObjects />
        <SwordEffects />
      </group>

      {/* VR Components - Stay in VR space, don't move with world */}
      <VRControllers onFuelChange={setFuel} onAmmoChange={setAmmo} onLeftClipChange={setLeftClip} onRightClipChange={setRightClip} onJetpackChange={setJetpackEnabled} />
      
      {/* Desktop Controls - WASD + Mouse alternative to VR */}
      <DesktopControls
        onShoot={(hand) => {
          // desktop gun fired
        }}
        onSwordSwing={(hand) => {
          setCurrentSwordHand(hand === 'left' ? 'right' : 'left');
        }}
        onClipChange={(leftClipVal, rightClipVal, _currentGunVal, _isReloadingVal) => {
          setLeftClip(leftClipVal);
          setRightClip(rightClipVal);
        }}
      />
      
      {/* Player Collision Detection */}
      <PlayerCollisionDetector />
      
      {/* VR Debug Display with HP/Fuel/Ammo - Visible in Quest 3 */}
      {/* VRDebugDisplay only in VR — desktop uses DesktopUI HTML overlay instead */}
      {isVRPresenting && <VRDebugDisplay fuel={fuel} maxFuel={maxFuel} ammo={ammo} leftClip={leftClip} rightClip={rightClip} jetpackEnabled={jetpackEnabled} />}
      
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
      
      {/* Auto-respawn when dead */}
      {isDead && (
        <mesh position={[0, 0, 0]} visible={false}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="transparent" />
        </mesh>
      )}
    </>
  );
}
