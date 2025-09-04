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
  fuel?: number;
  maxFuel?: number;
}

interface VRDebugDisplayProps {
  fuel: number;
  maxFuel: number;
}

export function VRDebugDisplay({ fuel, maxFuel }: VRDebugDisplayProps) {
  const { health, maxHealth } = useVRGame();
  const groupRef = useRef<THREE.Group>(null);
  const [debugData, setDebugData] = useState<VRDebugData>({
    controllersDetected: { left: false, right: false },
    vrSessionActive: false,
    gripStates: { leftGripping: false, rightGripping: false },
    timestamp: 0,
    eventLogs: []
  });

  useEffect(() => {
    // Create global debug system for Quest 3
    if (typeof window !== 'undefined') {
      (window as any).vrDebugLog = (message: string) => {
        setDebugData(prev => ({
          ...prev,
          eventLogs: [...prev.eventLogs.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]
        }));
      };
      
      // Check for debug data updates
      const interval = setInterval(() => {
        const data = (window as any).vrDebugData;
        if (data) {
          setDebugData(prev => ({ ...prev, ...data }));
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, []);

  // Follow camera rotation and position
  useFrame(({ camera }) => {
    if (groupRef.current) {
      const cameraPosition = camera.position.clone();
      const cameraQuaternion = camera.quaternion.clone();
      
      // Create coordinate system from camera
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQuaternion);
      
      // Position in upper left area of view
      const displayPosition = cameraPosition.clone()
        .add(forward.multiplyScalar(2.0))  // 2 units in front
        .add(right.multiplyScalar(-1.2))   // 1.2 units to the left
        .add(up.multiplyScalar(0.5));      // 0.5 units up
      
      groupRef.current.position.copy(displayPosition);
      groupRef.current.lookAt(camera.position);
    }
  });
  
  const fuelPercentage = Math.max(0, Math.min(100, (fuel / maxFuel) * 100));
  const healthPercentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  
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
      {/* Health Bar */}
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.3}
        color={getHealthColor()}
        anchorX="center"
        anchorY="middle"
      >
        ♥ HP: {health}/{maxHealth} ({healthPercentage.toFixed(0)}%)
      </Text>
      
      {/* Fuel Bar */}
      <Text
        position={[0, -0.2, 0]}
        fontSize={0.3}
        color={getFuelColor()}
        anchorX="center"
        anchorY="middle"
      >
        ⛽ FUEL: {Math.round(fuel)}/{maxFuel} ({fuelPercentage.toFixed(0)}%)
      </Text>
    </group>
  );
}