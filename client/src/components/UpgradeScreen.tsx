import { useState, useEffect } from 'react';
import { useVRGame } from '../lib/stores/useVRGame';

interface Upgrade {
  name: string;
  description: string;
  effect: string;
  delta: { str?: number; agi?: number; vit?: number };
}

const UPGRADE_POOL: Upgrade[] = [
  {
    name: 'Brute Force',
    description: 'Raw power. Sword damage increases substantially.',
    effect: '+2 STR',
    delta: { str: 2 },
  },
  {
    name: 'Quick Hands',
    description: 'Faster swings and faster reloads.',
    effect: '+2 AGI',
    delta: { agi: 2 },
  },
  {
    name: 'Iron Will',
    description: 'Fortify your body. Max health up, heal 20 HP.',
    effect: '+2 VIT',
    delta: { vit: 2 },
  },
  {
    name: 'Berserker',
    description: 'Sacrifice finesse for overwhelming force.',
    effect: '+3 STR / -1 AGI',
    delta: { str: 3, agi: -1 },
  },
  {
    name: 'Precision',
    description: 'Speed over brute strength. Every strike counts.',
    effect: '+3 AGI / -1 STR',
    delta: { agi: 3, str: -1 },
  },
  {
    name: 'Tank',
    description: 'A wall of flesh. Slower but nearly unkillable.',
    effect: '+3 VIT / -1 AGI',
    delta: { vit: 3, agi: -1 },
  },
  {
    name: 'Balanced',
    description: 'A measured advance on all fronts.',
    effect: '+1 STR / +1 AGI / +1 VIT',
    delta: { str: 1, agi: 1, vit: 1 },
  },
  {
    name: 'Bloodlust',
    description: 'Power through carnage. Damage and vitality rise.',
    effect: '+2 STR / +1 VIT',
    delta: { str: 2, vit: 1 },
  },
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function UpgradeScreen() {
  const { playerStats, setPlayerStats, heal, setShowUpgradeScreen } =
    useVRGame((s) => ({
      playerStats: s.playerStats,
      setPlayerStats: s.setPlayerStats,
      heal: s.heal,
      setShowUpgradeScreen: s.setShowUpgradeScreen,
    }));

  const [choices] = useState<Upgrade[]>(() => pickRandom(UPGRADE_POOL, 3));
  const [visible, setVisible] = useState(false);

  // Release pointer lock so cursor is free for clicking upgrade cards
  useEffect(() => {
    document.exitPointerLock();
  }, []);

  useEffect(() => {
    // Fade in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const applyUpgrade = (upgrade: Upgrade) => {
    const newStats = {
      str: playerStats.str + (upgrade.delta.str ?? 0),
      agi: playerStats.agi + (upgrade.delta.agi ?? 0),
      vit: playerStats.vit + (upgrade.delta.vit ?? 0),
    };

    // VIT increases max health by 10 per point gained
    const vitGain = upgrade.delta.vit ?? 0;
    if (vitGain > 0) {
      const extraHp = vitGain * 10;
      // Increase maxHealth in store — we do it by setting a boosted value
      // useVRGame set directly isn't exposed, so we call setPlayerStats and
      // also manually patch maxHealth via a store subscription trick.
      // Instead: use the exposed setHealth to add the heal, and update a
      // side-channel. We'll use the store's internal set via a workaround.
      // Actually, useVRGame.setState is available on the store object.
      useVRGame.setState((state) => ({
        maxHealth: state.maxHealth + extraHp,
      }));
      // Also heal 20 HP on VIT upgrades
      heal(20 + extraHp);
    }

    setPlayerStats(newStats);
    setShowUpgradeScreen(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.80)',
        zIndex: 997,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease-in',
      }}
    >
      <style>{`
        @keyframes upgradePulse {
          0%, 100% { text-shadow: 0 0 18px rgba(218,165,32,0.8), 0 0 40px rgba(218,165,32,0.3); }
          50%       { text-shadow: 0 0 30px rgba(218,165,32,1),   0 0 70px rgba(218,165,32,0.6); }
        }
        .upgrade-card {
          background: rgba(10, 10, 10, 0.95);
          border: 2px solid #8b6914;
          border-radius: 4px;
          padding: 28px 24px;
          width: 220px;
          cursor: pointer;
          transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }
        .upgrade-card:hover {
          border-color: #daa520;
          transform: translateY(-6px);
          box-shadow: 0 0 24px rgba(218,165,32,0.4), 0 8px 32px rgba(0,0,0,0.6);
        }
        .upgrade-card-name {
          font-size: 16px;
          font-weight: bold;
          color: #daa520;
          letter-spacing: 3px;
          text-transform: uppercase;
        }
        .upgrade-card-desc {
          font-size: 12px;
          color: #999;
          line-height: 1.5;
          letter-spacing: 0.5px;
        }
        .upgrade-card-effect {
          font-size: 14px;
          color: #e8c96a;
          letter-spacing: 2px;
          font-weight: bold;
          margin-top: 4px;
          padding: 6px 12px;
          border: 1px solid #5a4010;
          border-radius: 2px;
          background: rgba(218,165,32,0.08);
        }
      `}</style>

      {/* Title */}
      <h1
        style={{
          fontSize: '36px',
          color: '#daa520',
          margin: '0 0 12px 0',
          letterSpacing: '8px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          animation: 'upgradePulse 2s ease-in-out infinite',
        }}
      >
        CHOOSE AN UPGRADE
      </h1>

      <div
        style={{
          fontSize: '12px',
          color: '#555',
          marginBottom: '40px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
        }}
      >
        ── room cleared ──
      </div>

      {/* Cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '24px',
          alignItems: 'stretch',
        }}
      >
        {choices.map((upgrade, idx) => (
          <div
            key={upgrade.name}
            className="upgrade-card"
            onClick={() => applyUpgrade(upgrade)}
  
          >
            <div className="upgrade-card-name">{upgrade.name}</div>
            <div className="upgrade-card-desc">{upgrade.description}</div>
            <div className="upgrade-card-effect">{upgrade.effect}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
