import { useState } from 'react';
import { useVRGame } from '../lib/stores/useVRGame';

type WeaponChoice = 'sword' | 'gun';

interface MainMenuProps {
  onStart: (weapon: WeaponChoice) => void;
  onDevMode: () => void;
}

export default function MainMenu({ onStart, onDevMode }: MainMenuProps) {
  const [selected, setSelected] = useState<WeaponChoice | null>(null);
  const [hovered, setHovered] = useState<WeaponChoice | null>(null);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'radial-gradient(ellipse at center, #0d0d1a 0%, #000 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", monospace',
      userSelect: 'none',
    }}>
      {/* Title */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 'bold', color: '#e8e8e8', letterSpacing: 6, textTransform: 'uppercase' }}>
          SwordQuest
        </div>
        <div style={{ fontSize: 13, color: '#444', letterSpacing: 4, marginTop: 8 }}>
          CHOOSE YOUR WEAPON
        </div>
      </div>

      {/* Weapon Select */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 48 }}>
        {(['sword', 'gun'] as WeaponChoice[]).map(w => {
          const isSelected = selected === w;
          const isHovered = hovered === w;
          return (
            <div
              key={w}
              onClick={() => setSelected(w)}
              onMouseEnter={() => setHovered(w)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: 180, height: 220,
                border: `2px solid ${isSelected ? (w === 'sword' ? '#c0a060' : '#4a90e2') : isHovered ? '#444' : '#222'}`,
                borderRadius: 12,
                background: isSelected ? (w === 'sword' ? 'rgba(192,160,96,0.08)' : 'rgba(74,144,226,0.08)') : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.04)' : isHovered ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div style={{ fontSize: 52 }}>{w === 'sword' ? '⚔️' : '🔫'}</div>
              <div style={{ fontSize: 18, color: isSelected ? '#e8e8e8' : '#888', fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>
                {w === 'sword' ? 'Sword' : 'Guns'}
              </div>
              <div style={{ fontSize: 11, color: '#444', textAlign: 'center', padding: '0 16px', lineHeight: 1.6 }}>
                {w === 'sword'
                  ? 'High damage\nUp close & personal\nBonus: +STR'
                  : 'Ranged attacks\nSafe distance\nBonus: +AGI'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Button */}
      <button
        onClick={() => selected && onStart(selected)}
        disabled={!selected}
        style={{
          padding: '14px 48px',
          fontSize: 15, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 'bold',
          background: selected ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: selected ? '#e8e8e8' : '#333',
          border: `1px solid ${selected ? '#555' : '#222'}`,
          borderRadius: 6, cursor: selected ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          transition: 'all 0.15s ease',
          marginBottom: 24,
        }}
        onMouseEnter={e => selected && ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.14)')}
        onMouseLeave={e => selected && ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
      >
        Enter
      </button>

      {/* Dev button */}
      <button
        onClick={onDevMode}
        style={{
          padding: '6px 18px', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
          background: 'transparent', color: '#2a2a2a', border: '1px solid #1a1a1a',
          borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.color = '#555'; (e.target as HTMLElement).style.borderColor = '#333'; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.color = '#2a2a2a'; (e.target as HTMLElement).style.borderColor = '#1a1a1a'; }}
      >
        dev sandbox
      </button>
    </div>
  );
}
