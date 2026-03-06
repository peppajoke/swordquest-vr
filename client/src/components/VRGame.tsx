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
// Text import removed — death screen is HTML overlay now
import { useVRGame } from '../lib/stores/useVRGame';
import { getStartingStats } from '../lib/weapons';
import { useAudio } from '../lib/stores/useAudio';
import WeaponPickup from './WeaponPickup';
import DropOrb from './DropOrb';
import { registerTestHarness } from '../lib/testHarness';

interface VRGameProps {
  startWeapon?: 'sword' | 'gun';
  devMode?: boolean;
}

export default function VRGame({ startWeapon = 'sword', devMode = false }: VRGameProps) {
  const { scene, camera } = useThree();
  const isVRPresenting = !!useXR((s) => s.session);

  // Register dev test harness
  useEffect(() => { registerTestHarness(camera, scene); }, []);

  // Hand light: point light attached to camera so weapon is always lit regardless of scene
  useEffect(() => {
    const handLight = new THREE.PointLight('#fff8ee', 6, 5, 2);
    handLight.position.set(0.25, -0.15, -0.5); // weapon-hand position in camera space
    camera.add(handLight);
    return () => { camera.remove(handLight); };
  }, [camera]);

  // Set initial camera tilt; weapon + stats set on pickup (not on mount)
  useEffect(() => {
    if (!isVRPresenting) {
      camera.rotation.x = -0.18;
    }
    // Dev mode: skip pickup phase, give starting weapons in inventory
    if (devMode) {
      setPickupPhase(false);
      setWeaponLocked(false);
      setActiveWeapon(startWeapon);
      setPlayerStats(getStartingStats(startWeapon));
      // Populate inventory slots for dev mode
      const store = useVRGame.getState();
      store.pickupWeapon('melee', 'longsword');
      store.pickupWeapon('ranged', 'pistols');
    }
  }, []);
  const { initializeGame, health, maxHealth, setActiveWeapon, setPlayerStats, setWeaponLocked, setPickupPhase, pickupPhase, dropOrbs, droppedWeapons, removeDroppedWeapon } = useVRGame();
  const { 
    setHitSound, setSuccessSound, setSwordHitSound, setGunShootSound, 
    setGunHitSound, setPlayerDamageSound, setAccelerationSound, 
    setBoostSound, setGunAmmoSound, setReloadSound,
    startAmbient, stopAmbient,
  } = useAudio();
  const [fuel, setFuel] = useState(100);
  const [maxFuel] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [leftClip, setLeftClip] = useState(12);
  const [rightClip, setRightClip] = useState(12);
  const [jetpackEnabled, setJetpackEnabled] = useState(false);
  const [currentSwordHand, setCurrentSwordHand] = useState<'left' | 'right'>('right');
  // Count of starting pickups taken — when all 4 are picked, end pickupPhase
  const [startPickupCount, setStartPickupCount] = useState(0);
  useEffect(() => {
    if (startPickupCount >= 4) setPickupPhase(false);
  }, [startPickupCount]);

  // Ambient drone — starts on first user interaction (satisfies autoplay policy)
  useEffect(() => {
    if (isVRPresenting) return;
    const onInteract = () => {
      startAmbient();
      window.removeEventListener('click', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
    window.addEventListener('click', onInteract);
    window.addEventListener('keydown', onInteract);
    return () => {
      window.removeEventListener('click', onInteract);
      window.removeEventListener('keydown', onInteract);
      stopAmbient();
    };
  }, [isVRPresenting]);

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
      <color attach="background" args={["#1a1a22"]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        color="#aabbff"
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

        {/* Weapons scattered through the first corridor section
             worldGroup at world z=10, so local z = world_z - 10.
             First corridor stretch: local z -12 to -22 (world z -2 to -12).
             Spread on both sides of the hall — explore to arm up. */}
        {pickupPhase && !isVRPresenting && (
          <>
            {/* Left wall side — melee */}
            <WeaponPickup pickupId="start-dagger"     weaponType="melee"  weaponId="dagger"     position={[-3.2, 1.2, -12]} onPicked={() => setStartPickupCount(c => c + 1)} />
            <WeaponPickup pickupId="start-shortsword" weaponType="melee"  weaponId="shortsword" position={[-3.2, 1.2, -15]} onPicked={() => setStartPickupCount(c => c + 1)} />
            <WeaponPickup pickupId="start-longsword"  weaponType="melee"  weaponId="longsword"  position={[-3.2, 1.2, -18]} onPicked={() => setStartPickupCount(c => c + 1)} />
            <WeaponPickup pickupId="start-battleaxe"  weaponType="melee"  weaponId="battleaxe"  position={[-3.2, 1.2, -21]} onPicked={() => setStartPickupCount(c => c + 1)} />
            {/* Center — heavy melee */}
            <WeaponPickup pickupId="start-greatsword" weaponType="melee"  weaponId="greatsword" position={[ 0.0, 1.2, -13]} onPicked={() => setStartPickupCount(c => c + 1)} />
            <WeaponPickup pickupId="start-warhammer"  weaponType="melee"  weaponId="warhammer"  position={[ 0.0, 1.2, -20]} onPicked={() => setStartPickupCount(c => c + 1)} />
            {/* Right wall side — ranged */}
            <WeaponPickup pickupId="start-pistols"    weaponType="ranged" weaponId="pistols"    position={[ 3.2, 1.2, -12]} onPicked={() => setStartPickupCount(c => c + 1)} />
            <WeaponPickup pickupId="start-smg"        weaponType="ranged" weaponId="smg"        position={[ 3.2, 1.2, -15]} onPicked={() => setStartPickupCount(c => c + 1)} />
            <WeaponPickup pickupId="start-shotgun"    weaponType="ranged" weaponId="shotgun"    position={[ 3.2, 1.2, -18]} onPicked={() => setStartPickupCount(c => c + 1)} />
            <WeaponPickup pickupId="start-sniper"     weaponType="ranged" weaponId="sniper"     position={[ 3.2, 1.2, -21]} onPicked={() => setStartPickupCount(c => c + 1)} />
          </>
        )}
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
      
      {/* Dropped weapons — spawned by player pressing G, world-space positions */}
      {droppedWeapons.map(dw => (
        <WeaponPickup
          key={dw.id}
          pickupId={dw.id}
          weaponType={dw.type}
          weaponId={dw.weaponId}
          position={dw.position}
          onPicked={(id) => removeDroppedWeapon(id)}
        />
      ))}

      {/* Drop Orbs - rendered in world space outside worldGroup */}
      {dropOrbs.map(orb => (
        <DropOrb
          key={orb.id}
          id={orb.id}
          type={orb.type}
          position={orb.position}
          spawnTime={orb.spawnTime}
        />
      ))}

      {/* Death is handled by DeathScreen HTML overlay in App.tsx */}
    </>
  );
}
