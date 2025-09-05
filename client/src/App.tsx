import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { VRButton, XR, createXRStore } from "@react-three/xr";
import VRGame from "./components/VRGame";
import { ControlsInstructions } from "./components/ControlsInstructions";
import "@fontsource/inter";
import "./index.css";

const store = createXRStore();

function App() {
  
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
      >
        <XR store={store}>
          <Suspense fallback={null}>
            <VRGame />
          </Suspense>
        </XR>
      </Canvas>
    </div>
  );
}

export default App;
