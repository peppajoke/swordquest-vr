import { useEffect, useState } from 'react';
import { useVRGame } from '../lib/stores/useVRGame';

export default function DeathScreen() {
  const { killCount, runStartTime, respawn } = useVRGame();
  const [timeSurvived, setTimeSurvived] = useState(0);

  useEffect(() => {
    // Capture time survived at moment of death (component mount)
    const seconds = Math.floor((Date.now() - runStartTime) / 1000);
    setTimeSurvived(seconds);
  }, [runStartTime]);

  const handleTryAgain = () => {
    respawn();
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        animation: 'deathFadeIn 0.5s ease-in',
      }}
    >
      <style>{`
        @keyframes deathFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .death-try-again-btn {
          padding: 16px 48px;
          font-size: 20px;
          font-family: monospace;
          background: transparent;
          color: #fff;
          border: 2px solid #dc143c;
          cursor: pointer;
          letter-spacing: 4px;
          transition: background 0.2s, color 0.2s;
        }
        .death-try-again-btn:hover {
          background-color: #dc143c;
          color: #000;
        }
      `}</style>

      {/* YOU DIED */}
      <h1
        style={{
          fontSize: '72px',
          color: '#dc143c',
          margin: '0 0 40px 0',
          textShadow: '0 0 24px rgba(220, 20, 60, 0.9), 0 0 60px rgba(220, 20, 60, 0.4)',
          letterSpacing: '10px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
        }}
      >
        YOU DIED
      </h1>

      {/* Run Summary */}
      <div
        style={{
          fontSize: '14px',
          color: '#555',
          marginBottom: '20px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
        }}
      >
        ── run summary ──
      </div>

      <div
        style={{
          fontSize: '22px',
          color: '#ccc',
          marginBottom: '10px',
          letterSpacing: '1px',
        }}
      >
        Kills:{' '}
        <span style={{ color: '#dc143c', fontWeight: 'bold' }}>{killCount}</span>
      </div>

      <div
        style={{
          fontSize: '22px',
          color: '#ccc',
          marginBottom: '56px',
          letterSpacing: '1px',
        }}
      >
        Time:{' '}
        <span style={{ color: '#dc143c', fontWeight: 'bold' }}>
          {formatTime(timeSurvived)}
        </span>
      </div>

      {/* Try Again button */}
      <button className="death-try-again-btn" onClick={handleTryAgain}>
        TRY AGAIN
      </button>
    </div>
  );
}
