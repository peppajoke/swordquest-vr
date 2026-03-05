import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useEffect } from "react";
import { VRButton, XR, createXRStore } from "@react-three/xr";
import VRGame from "./components/VRGame";
import { ControlsInstructions } from "./components/ControlsInstructions";
import DesktopUI from "./components/DesktopUI";
import MainMenu from "./components/MainMenu";
import "@fontsource/inter";
import "./index.css";

const store = createXRStore({
  hand: false, // Disable hand tracking - controllers only
  controller: { left: false, right: false },
  // optional: also disable hands/transient pointers if they pop in
  transientPointer: false,
});

const sessionInit = {
  requiredFeatures: [], // none
  optionalFeatures: ["local-floor", "bounded-floor", "layers"], // omit 'hand-tracking'
};

type GameMode = 'menu' | 'playing' | 'dev';

function App() {
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [startWeapon, setStartWeapon] = useState<'sword' | 'gun'>('sword');
  const [fuel, setFuel] = useState(100);
  const [jetpackEnabled, setJetpackEnabled] = useState(false);
  const [currentSwordHand, setCurrentSwordHand] = useState<'left' | 'right'>('right');
  const [leftClip, setLeftClip] = useState(12);
  const [rightClip, setRightClip] = useState(12);
  const [currentGun, setCurrentGun] = useState<'left' | 'right'>('left');
  const [isReloading, setIsReloading] = useState(false);
  const [isVRPresenting, setIsVRPresenting] = useState(false);

  useEffect(() => {
    // Subscribe to XR store session changes to detect VR mode
    const unsubscribe = store.subscribe((state) => {
      setIsVRPresenting(!!state.session);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Main Menu */}
      {gameMode === 'menu' && (
        <MainMenu
          onStart={(weapon) => { setStartWeapon(weapon); setGameMode('playing'); }}
          onDevMode={() => setGameMode('dev')}
        />
      )}

      {/* VR Entry Button — only shown in-game */}
      {gameMode !== 'menu' && (
        <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 1000 }}>
          <VRButton store={store} />
        </div>
      )}

      {/* Controls Instructions */}
      {gameMode !== 'menu' && <ControlsInstructions />}

      {/* Main Canvas - fills the full viewport */}
      <Canvas
        shadows
        style={{ display: 'block', width: '100%', height: '100%' }}
        camera={{
          position: [0, 1.6, -5],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <XR store={store}>
          <Suspense fallback={null}>
            <VRGame startWeapon={startWeapon} devMode={gameMode === 'dev'} />
          </Suspense>
        </XR>
      </Canvas>
      
      {/* Desktop UI Overlay */}
      <DesktopUI
        leftClip={leftClip}
        rightClip={rightClip}
        currentGun={currentGun}
        isReloading={isReloading}
      />
    </div>
  );
}

export default App;
