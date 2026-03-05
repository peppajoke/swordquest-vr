import { useEffect } from 'react';

interface MainMenuProps {
  onStart: () => void;
  onDevMode: () => void;
}

export default function MainMenu({ onStart, onDevMode }: MainMenuProps) {
  // Any keypress starts the game
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return;
      onStart();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onStart]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'radial-gradient(ellipse at center, #0d0d1a 0%, #000 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", monospace',
      userSelect: 'none',
      cursor: 'pointer',
    }} onClick={onStart}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 52, fontWeight: 'bold', color: '#e8e8e8', letterSpacing: 6, textTransform: 'uppercase' }}>
          SwordQuest
        </div>
        <div style={{ fontSize: 12, color: '#444', letterSpacing: 4, marginTop: 8 }}>
          VR · DESKTOP
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#555', letterSpacing: 3, marginBottom: 48, animation: 'pulse 2s infinite' }}>
        CLICK TO BEGIN
      </div>

      <div style={{ fontSize: 11, color: '#2a2a2a', letterSpacing: 2 }}>
        Walk up to a weapon to choose your path
      </div>

      {/* Dev button — barely visible */}
      <div
        onClick={(e) => { e.stopPropagation(); onDevMode(); }}
        style={{
          position: 'absolute', bottom: 24, right: 24,
          fontSize: 10, color: '#1a1a1a', letterSpacing: 2,
          cursor: 'pointer', padding: '6px 12px',
          border: '1px solid #111', borderRadius: 4,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#444')}
        onMouseLeave={e => (e.currentTarget.style.color = '#1a1a1a')}
      >
        dev sandbox
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>
    </div>
  );
}
