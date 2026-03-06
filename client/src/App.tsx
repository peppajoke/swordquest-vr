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
  hand: false,
  controller: { left: false, right: false },
  transientPointer: false,
});

type GameMode = 'menu' | 'playing' | 'dev';

function App() {
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const isDead = useVRGame((s) => s.isDead);
  const showUpgradeScreen = useVRGame((s) => s.showUpgradeScreen);
  const [isMobile] = useState(() => isTouchDevice());
  const [leftClip, setLeftClip] = useState(12);
  const [rightClip, setRightClip] = useState(12);
  const [currentGun, setCurrentGun] = useState<'left' | 'right'>('left');
  const [isReloading, setIsReloading] = useState(false);
  const [isVRPresenting, setIsVRPresenting] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      setIsVRPresenting(!!state.session);
    });
    return () => unsubscribe();
  }, []);

  // Force landscape on mobile — CSS rotation fallback covers iOS where lock() is unsupported
  useEffect(() => {
    if (!isMobile) return;
    try { (screen.orientation as any).lock('landscape').catch(() => {}); } catch {}

    const check = () => setIsPortrait(window.innerWidth < window.innerHeight);
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, [isMobile]);

  // When portrait on mobile, rotate the entire app -90deg so it renders as landscape.
  // Works on iOS (where orientation lock is ignored) and any other device.
  const rotatedStyle: React.CSSProperties = (isMobile && isPortrait) ? {
    position: 'fixed',
    top: '100%',
    left: 0,
    width: '100vh',   // swap dimensions: height becomes the new width
    height: '100vw',
    transformOrigin: 'top left',
    transform: 'rotate(-90deg)',
    overflow: 'hidden',
  } : {
    width: '100vw',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div style={rotatedStyle}>
      {/* Main Menu */}
      {gameMode === 'menu' && (
        <MainMenu
          onStart={() => setGameMode('playing')}
          onDevMode={() => setGameMode('dev')}
        />
      )}

      {/* VR Entry Button — only shown in-game, not on mobile */}
      {gameMode !== 'menu' && !isMobile && (
        <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 1000 }}>
          <VRButton store={store} />
        </div>
      )}

      {/* Controls Instructions — desktop only (useless on mobile, takes up space) */}
      {gameMode !== 'menu' && !isMobile && <ControlsInstructions />}

      {/* Main Canvas */}
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

      {/* Desktop UI Overlay — hidden on mobile */}
      {!isMobile && (
        <DesktopUI
          leftClip={leftClip}
          rightClip={rightClip}
          currentGun={currentGun}
          isReloading={isReloading}
        />
      )}

      {/* Upgrade Screen */}
      {showUpgradeScreen && gameMode !== 'menu' && <UpgradeScreen />}

      {/* Mobile touch controls */}
      {isMobile && gameMode !== 'menu' && <MobileControls />}
    </div>
  );
}

export default App;
