import React, { useEffect, useState } from 'react';
import { Text } from '@react-three/drei';

interface VRDebugData {
  controllersDetected: { left: boolean; right: boolean };
  vrSessionActive: boolean;
  gripStates: { leftGripping: boolean; rightGripping: boolean };
  timestamp: number;
  eventLogs: string[];
}

export function VRDebugDisplay() {
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

  return (
    <group position={[0, 2, -3]}>
      {/* VR Status Display */}
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.3}
        color={debugData.vrSessionActive ? '#00ff00' : '#ff0000'}
        anchorX="center"
        anchorY="middle"
      >
        VR SESSION: {debugData.vrSessionActive ? 'ACTIVE ✓' : 'INACTIVE ✗'}
      </Text>
      
      {/* Controller Status */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.2}
        color={debugData.controllersDetected.left && debugData.controllersDetected.right ? '#00ff00' : '#ffaa00'}
        anchorX="center"
        anchorY="middle"
      >
        CONTROLLERS: L:{debugData.controllersDetected.left ? '✓' : '✗'} R:{debugData.controllersDetected.right ? '✓' : '✗'}
      </Text>
      
      {/* Grip Status */}
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.2}
        color={debugData.gripStates.leftGripping || debugData.gripStates.rightGripping ? '#00ff00' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
      >
        GRIPS: L:{debugData.gripStates.leftGripping ? '⚔️' : '✋'} R:{debugData.gripStates.rightGripping ? '⚔️' : '✋'}
      </Text>
      
      {/* Event Log */}
      {debugData.eventLogs.slice(-5).map((log, index) => (
        <Text
          key={index}
          position={[0, -1 - (index * 0.3), 0]}
          fontSize={0.15}
          color="#cccccc"
          anchorX="center"
          anchorY="middle"
        >
          {log}
        </Text>
      ))}
    </group>
  );
}