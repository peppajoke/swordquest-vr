import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface VROverlayProps {
  fuel: number;
  maxFuel: number;
  health: number;
  maxHealth: number;
}

export function VROverlay({ fuel, maxFuel, health, maxHealth }: VROverlayProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ camera }) => {
    // Position overlay in bottom left of VR view
    if (groupRef.current) {
      const cameraPosition = camera.position.clone();
      const cameraQuaternion = camera.quaternion.clone();
      
      // Create local coordinate system from camera
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQuaternion);
      
      // Position in bottom left: close distance, left and down from center
      const overlayPosition = cameraPosition.clone()
        .add(forward.multiplyScalar(1.2)) // 1.2 units in front
        .add(right.multiplyScalar(-0.7))  // 0.7 units to the left
        .add(up.multiplyScalar(-0.5));    // 0.5 units down
      
      groupRef.current.position.copy(overlayPosition);
      groupRef.current.lookAt(camera.position);
    }
  });

  const fuelPercentage = Math.max(0, Math.min(100, (fuel / maxFuel) * 100));
  const healthPercentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  
  const getFuelColor = () => {
    if (fuelPercentage > 60) return '#00ff00'; // Green
    if (fuelPercentage > 30) return '#ffaa00'; // Orange
    return '#ff0000'; // Red
  };
  
  const getHealthColor = () => {
    if (healthPercentage > 60) return '#00ff00'; // Green
    if (healthPercentage > 30) return '#ffaa00'; // Orange
    return '#ff0000'; // Red
  };

  return (
    <group ref={groupRef}>
      <Html
        transform
        occlude={false}
        distanceFactor={0.5}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          width: '200px',
          height: '80px',
        }}
      >
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #555',
          borderRadius: '8px',
          padding: '8px',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: '180px',
        }}>
          {/* Health Bar */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}>
              <span>♥ Health</span>
              <span>{health}/{maxHealth}</span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#333',
              borderRadius: '6px',
              border: '1px solid #555',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${healthPercentage}%`,
                height: '100%',
                backgroundColor: getHealthColor(),
                transition: 'width 0.3s ease, background-color 0.3s ease',
                borderRadius: '6px',
                boxShadow: `0 0 8px ${getHealthColor()}`,
              }} />
            </div>
          </div>

          {/* Fuel Bar */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}>
              <span>⛽ Fuel</span>
              <span>{Math.round(fuel)}/{maxFuel}</span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#333',
              borderRadius: '6px',
              border: '1px solid #555',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${fuelPercentage}%`,
                height: '100%',
                backgroundColor: getFuelColor(),
                transition: 'width 0.3s ease, background-color 0.3s ease',
                borderRadius: '6px',
                boxShadow: `0 0 8px ${getFuelColor()}`,
              }} />
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}