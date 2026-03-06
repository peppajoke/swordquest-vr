import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useEffect } from "react";
import { VRButton, XR, createXRStore } from "@react-three/xr";
import VRGame from "./components/VRGame";
import { ControlsInstructions } from "./components/ControlsInstructions";
import DesktopUI from "./components/DesktopUI";
import MainMenu from "./components/MainMenu";
import MobileControls from "./components/MobileControls";
import UpgradeScreen from "./components/UpgradeScreen";
import { useVRGame } from "./lib/stores/useVRGame";
import { isTouchDevice } from "./lib/mobileInput";
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
  const isDead = useVRGame((s) => s.isDead);
  const showUpgradeScreen = useVRGame((s) => s.showUpgradeScreen);
  const [isMobile] = useState(() => isTouchDevice());
  const [fuel, setFuel] = useState(100);
  const [jetpackEnabled, setJetpackEnabled] = useState(false);
  const [currentSwordHand, setCurrentSwordHand] = useState<'left' | 'right'>('right');
  const [leftClip, setLeftClip] = useState(12);
  const [rightClip, setRightClip] = useState(12);
  const [currentGun, setCurrentGun] = useState<'left' | 'right'>('left');
  const [isReloading, setIsReloading] = useState(false);
  const [isVRPresenting, setIsVRPresenting] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    // Subscribe to XR store session changes to detect VR mode
    const unsubscribe = store.subscribe((state) => {
      setIsVRPresenting(!!state.session);
    });
    return () => unsubscribe();
  }, []);

  // Force landscape orientation on mobile
  useEffect(() => {
    if (!isMobile) return;
    // Attempt API lock (supported on Android Chrome, ignored elsewhere)
    try {
      (screen.orientation as any).lock('landscape').catch(() => {});
    } catch {}

    const checkOrientation = () => {
      setIsPortrait(window.innerWidth < window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isMobile]);

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
          onStart={() => setGameMode('playing')}
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
            <VRGame startWeapon="sword" devMode={gameMode === 'dev'} />
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

      {/* Upgrade Screen — shown after room clear */}
      {showUpgradeScreen && gameMode !== 'menu' && <UpgradeScreen />}

      {/* Mobile touch controls */}
      {isMobile && gameMode !== 'menu' && <MobileControls />}

      {/* Portrait mode warning — blocks gameplay until rotated */}
      {isMobile && isPortrait && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'sans-serif',
          gap: 16,
        }}>
          <div style={{ fontSize: 64 }}>↻</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Rotate your device</div>
          <div style={{ fontSize: 14, opacity: 0.6 }}>This game requires landscape mode</div>
        </div>
      )}

      {/* Death Screen removed — death now triggers instant respawn at prison start */}
    </div>
  );
}

export default App;
