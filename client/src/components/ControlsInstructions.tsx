import React, { useState } from 'react';

export function ControlsInstructions() {
  const [isVisible, setIsVisible] = useState(true);
  
  if (!isVisible) {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
      }}>
        <button
          onClick={() => setIsVisible(true)}
          style={{
            padding: '5px 10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: '1px solid #333',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Controls
        </button>
      </div>
    );
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      border: '2px solid #333',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      zIndex: 1000,
      minWidth: '250px',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Controls</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0',
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ lineHeight: '1.4' }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>Movement:</strong>
        </div>
        <div style={{ marginLeft: '10px', marginBottom: '8px' }}>
          • WASD - Move around<br/>
          • Mouse - Look around<br/>
          • Click to lock mouse cursor
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>Swords & Fuel:</strong>
        </div>
        <div style={{ marginLeft: '10px', marginBottom: '8px' }}>
          • Hold SPACEBAR - Left sword<br/>
          • Hold SHIFT - Right sword<br/>
          • Left Click - Left sword<br/>
          • Right Click - Right sword<br/>
        </div>
        
        <div style={{ fontSize: '12px', color: '#aaa' }}>
          Hold sword buttons + WASD to move and consume fuel.<br/>
          Release to recharge fuel. Destroy objects to score!
        </div>
      </div>
    </div>
  );
}