import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { VRButton, XR, createXRStore } from "@react-three/xr";
import VRGame from "./components/VRGame";
import { ControlsInstructions } from "./components/ControlsInstructions";
import DesktopUI from "./components/DesktopUI";
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

function App() {
  const [fuel, setFuel] = useState(100);
  const [jetpackEnabled, setJetpackEnabled] = useState(false);
  const [currentSwordHand, setCurrentSwordHand] = useState<'left' | 'right'>('right');
  const [ammo, setAmmo] = useState(120);
  const maxAmmo = 120;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* VR Entry Button */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: "10px 20px",
          borderRadius: "8px",
          color: "white",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <h1 style={{ margin: "0 0 10px 0", fontSize: "24px" }}>
          VR Sword Fighting
        </h1>
        <p style={{ margin: "0 0 15px 0", fontSize: "14px" }}>
          Squeeze controllers to spawn swords!
        </p>
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
          far: 1000,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <XR store={store}>
          <Suspense fallback={null}>
            <VRGame />
          </Suspense>
        </XR>
      </Canvas>
      
      {/* Desktop UI Overlay */}
      <DesktopUI 
        fuel={fuel}
        jetpackEnabled={jetpackEnabled}
        currentSwordHand={currentSwordHand}
        ammo={ammo}
        maxAmmo={maxAmmo}
      />
    </div>
  );
}

export default App;
