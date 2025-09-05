import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useEffect } from "react";
import { VRButton, XR, createXRStore } from "@react-three/xr";
import VRGame from "./components/VRGame";
import { ControlsInstructions } from "./components/ControlsInstructions";
import { LoadingScreen } from "./components/LoadingScreen";
import "@fontsource/inter";
import "./index.css";

const store = createXRStore();

function App() {
  console.log('🚀 App component rendering...');
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [gameInstance, setGameInstance] = useState<JSX.Element | null>(null);
  
  console.log('📊 App state - isGameLoaded:', isGameLoaded, 'gameInstance:', !!gameInstance);
  
  // Preload game systems
  const handleLoadingComplete = async () => {
    // Preload all audio files
    const audioPromises = [
      new Promise(resolve => {
        const audio = new Audio('/sounds/hit.mp3');
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', resolve, { once: true });
        audio.load();
      }),
      new Promise(resolve => {
        const audio = new Audio('/sounds/success.mp3');
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', resolve, { once: true });
        audio.load();
      }),
      new Promise(resolve => {
        const audio = new Audio('/sounds/sword_hit.mp3');
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', resolve, { once: true });
        audio.load();
      }),
      new Promise(resolve => {
        const audio = new Audio('/sounds/gun_shoot.mp3');
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', resolve, { once: true });
        audio.load();
      }),
      new Promise(resolve => {
        const audio = new Audio('/sounds/gun_hit.mp3');
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', resolve, { once: true });
        audio.load();
      })
    ];
    
    // Wait for all audio to preload
    await Promise.allSettled(audioPromises);
    
    // Create the game instance
    const game = <VRGame />;
    setGameInstance(game);
    
    // Shorter delay - VR controllers will initialize themselves properly
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsGameLoaded(true);
  };
  
  // Show loading screen first, then load game
  if (!isGameLoaded) {
    console.log('📱 Showing LoadingScreen...');
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }
  
  console.log('🎮 Game loaded, showing main UI...');
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* VR Entry Button */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '10px 20px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>VR Sword Fighting</h1>
        <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>Squeeze controllers to spawn swords!</p>
        <VRButton store={store} />
      </div>

      {/* Controls Instructions */}
      <ControlsInstructions />

      {/* Main Canvas */}
      <Canvas
        shadows
        camera={{
          position: [0, 1.6, 3],
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance"
        }}
        onCreated={(state) => {
          console.log('🖼️ Canvas created successfully', state);
        }}
        onError={(error) => {
          console.error('❌ Canvas error:', error);
        }}
      >
        <XR store={store}>
          <Suspense fallback={<mesh><boxGeometry /><meshNormalMaterial /></mesh>}>
            {gameInstance}
          </Suspense>
        </XR>
      </Canvas>
    </div>
  );
}

export default App;
