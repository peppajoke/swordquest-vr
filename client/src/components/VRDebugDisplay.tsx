import React, { useEffect, useState, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface VRDebugData {
  controllersDetected: { left: boolean; right: boolean };
  vrSessionActive: boolean;
  gripStates: { leftGripping: boolean; rightGripping: boolean };
  timestamp: number;
  eventLogs: string[];
  errorLogs: string[]; // Added for error logging
}

interface VRDebugDisplayProps {
  fuel: number;
  maxFuel: number;
  ammo: number;
  jetpackEnabled: boolean;
}

export function VRDebugDisplay({ fuel, maxFuel, ammo, jetpackEnabled }: VRDebugDisplayProps) {
  const { health, maxHealth } = useVRGame();
  const groupRef = useRef<THREE.Group>(null);
  const [debugData, setDebugData] = useState<VRDebugData>({
    controllersDetected: { left: false, right: false },
    vrSessionActive: false,
    gripStates: { leftGripping: false, rightGripping: false },
    timestamp: 0,
    eventLogs: [],
    errorLogs: [] // Initialize errorLogs
  });

  // Check for debug mode from environment variables
  const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true' || 
                   import.meta.env.DEBUG_MODE === 'true' ||
                   (typeof window !== 'undefined' && (window as any).DEBUG_MODE === 'true');

  useEffect(() => {
    // Create global debug system for Quest 3
    if (typeof window !== 'undefined') {
      (window as any).vrDebugLog = (message: string) => {
        setDebugData(prev => ({
          ...prev,
          eventLogs: [...prev.eventLogs.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]
        }));
      };

      // Add a global error handler to capture uncaught exceptions
      const originalErrorHandler = (window as any).onerror;
      (window as any).onerror = (message: string, source?: string, lineno?: number, colno?: number, error?: Error) => {
        try {
          console.log('Global error caught:', { message, source, lineno, colno, error, debugMode });
          if (debugMode) {
            setDebugData(prev => ({
              ...prev,
              errorLogs: [...prev.errorLogs.slice(-3), `${new Date().toLocaleTimeString()}: ${message} (at ${source}:${lineno}:${colno})`]
            }));
          }
        } catch (e) {
          console.error('Debug display error:', e);
        }
        // Call original handler if it existed
        if (originalErrorHandler) {
          return originalErrorHandler(message, source, lineno, colno, error);
        }
        // Continue with default error handling
        return false;
      };

      // Check for debug data updates
      const interval = setInterval(() => {
        const data = (window as any).vrDebugData;
        if (data) {
          setDebugData(prev => ({ ...prev, ...data }));
        }
      }, 100);

      return () => {
        clearInterval(interval);
        // Restore original error handler instead of setting to null
        if (originalErrorHandler) {
          (window as any).onerror = originalErrorHandler;
        } else {
          (window as any).onerror = null;
        }
      };
    }
  }, [debugMode]); // Re-run effect if debugMode changes

  // Follow camera rotation and position
  useFrame(({ camera }) => {
    if (groupRef.current) {
      // Position debug display in top left of VR view
      const cameraPosition = camera.position.clone();
      const cameraQuaternion = camera.quaternion.clone();

      // Create local coordinate system from camera
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQuaternion);

      // Position in top left
      const debugPosition = cameraPosition.clone()
        .add(forward.multiplyScalar(1.5))
        .add(right.multiplyScalar(-1.2))
        .add(up.multiplyScalar(0.8));

      groupRef.current.position.copy(debugPosition);
      groupRef.current.lookAt(camera.position);
    }
  });

  const fuelPercentage = Math.max(0, Math.min(100, (fuel / maxFuel) * 100));
  const healthPercentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const ammoPercentage = Math.max(0, Math.min(100, (ammo / 100) * 100)); // Max ammo is 100

  const getFuelColor = () => {
    if (fuelPercentage > 60) return '#00ff00';
    if (fuelPercentage > 30) return '#ffaa00';
    return '#ff0000';
  };

  const getHealthColor = () => {
    if (healthPercentage > 60) return '#00ff00';
    if (healthPercentage > 30) return '#ffaa00';
    return '#ff0000';
  };

  return (
    <group ref={groupRef}>
      {/* Health Bar Background */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[1, 0.06, 0.01]} />
        <meshLambertMaterial color="#333333" />
      </mesh>

      {/* Health Bar Fill - Always Green */}
      <mesh position={[-0.5 + (healthPercentage / 100) * 0.5, 0.15, 0.005]}>
        <boxGeometry args={[(healthPercentage / 100), 0.05, 0.01]} />
        <meshLambertMaterial color="#00ff00" />
      </mesh>

      {/* Fuel Bar - Only show when jetpack is enabled */}
      {jetpackEnabled && (
        <>
          {/* Fuel Bar Background */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[1, 0.06, 0.01]} />
            <meshLambertMaterial color="#333333" />
          </mesh>

          {/* Fuel Bar Fill - Always Yellow */}
          <mesh position={[-0.5 + (fuelPercentage / 100) * 0.5, 0.05, 0.005]}>
            <boxGeometry args={[(fuelPercentage / 100), 0.05, 0.01]} />
            <meshLambertMaterial color="#ffff00" />
          </mesh>
        </>
      )}

      {/* Ammo Bar Background */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[1, 0.06, 0.01]} />
        <meshLambertMaterial color="#333333" />
      </mesh>

      {/* Ammo Bar Fill - Always Orange */}
      <mesh position={[-0.5 + (ammoPercentage / 100) * 0.5, -0.05, 0.005]}>
        <boxGeometry args={[(ammoPercentage / 100), 0.05, 0.01]} />
        <meshLambertMaterial color="#ff8800" />
      </mesh>

      {/* Ammo Count Text */}
      <Text
        position={[0, -0.15, 0]}
        fontSize={0.08}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {ammo}
      </Text>

      {/* Event Logs */}
      <Text
        position={[0, -1.4, 0]}
        fontSize={0.03}
        color="#ffff00"
        anchorX="left"
        anchorY="top"
        font="/fonts/Inter-Regular.woff"
      >
        {`Event Logs:\n${debugData.eventLogs.slice(-5).join('\n')}`}
      </Text>

      {/* Error Messages - Only show when debug mode is enabled */}
      {debugMode && debugData.errorLogs.length > 0 && (
        <Text
          position={[0, -2.2, 0]}
          fontSize={0.03}
          color="#ff4444"
          anchorX="left"
          anchorY="top"
          font="/fonts/Inter-Regular.woff"
        >
          {`Error Messages:\n${debugData.errorLogs.slice(-3).join('\n')}`}
        </Text>
      )}
    </group>
  );
}