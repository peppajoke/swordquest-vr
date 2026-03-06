import { create } from "zustand";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Play a file from /sounds/ with optional params. Returns the Audio element. */
function sfx(file: string, volume = 0.5, rate = 1.0, stopAfterMs?: number): HTMLAudioElement {
  const a = new Audio(`/sounds/${file}`);
  a.volume = volume;
  a.playbackRate = rate;
  a.play().catch(() => {});
  if (stopAfterMs !== undefined) setTimeout(() => { a.pause(); a.currentTime = 0; }, stopAfterMs);
  return a;
}

/** Create a fresh AudioContext, run callback, auto-close after `closeMs`. */
function synth(fn: (ctx: AudioContext) => void, closeMs = 600) {
  try {
    const ctx = new AudioContext();
    fn(ctx);
    setTimeout(() => ctx.close().catch(() => {}), closeMs);
  } catch {}
}

// ─── synthesized gun shots ────────────────────────────────────────────────────

function synthPistol(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Crack layer — sharp high-freq noise burst
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 280; bp.Q.value = 0.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.7, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(now);
  // Thump layer — sine punch
  const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(130, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
  const og = ctx.createGain(); og.gain.setValueAtTime(0.6, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now + 0.12);
}

function synthShotgun(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Massive boom — long noise + very low thump
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(1.0, now);
  g.gain.setValueAtTime(0.8, now + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start(now);
  // Sub thump
  const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(60, now); osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);
  const og = ctx.createGain(); og.gain.setValueAtTime(0.9, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now + 0.55);
}

function synthSniper(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Sharp supersonic crack — very brief, then long low rumble
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.9, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  src.connect(hp); hp.connect(g); g.connect(ctx.destination); src.start(now);
  // Long resonant tail
  const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(180, now + 0.01); osc.frequency.exponentialRampToValueAtTime(60, now + 0.7);
  const og = ctx.createGain(); og.gain.setValueAtTime(0.0, now); og.gain.setValueAtTime(0.5, now + 0.02); og.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now + 1.0);
}

function synthSMG(ctx: AudioContext) {
  const now = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 160; bp.Q.value = 1.2;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(now);
}

function synthFootstep(ctx: AudioContext) {
  const now = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.22, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  src.connect(lp); lp.connect(g); g.connect(ctx.destination); src.start(now);
  // Low thud
  const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(80, now); osc.frequency.exponentialRampToValueAtTime(35, now + 0.06);
  const og = ctx.createGain(); og.gain.setValueAtTime(0.3, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now + 0.1);
}

function synthEnemyAlert(ctx: AudioContext) {
  const now = ctx.currentTime;

  // === ROBOT POWER-UP / TARGET LOCK ===
  // Layer 1: Deep mechanical THUD — system activating (0–180ms)
  const thudBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.18), ctx.sampleRate);
  const thudData = thudBuf.getChannelData(0);
  for (let i = 0; i < thudData.length; i++) {
    const t = i / ctx.sampleRate;
    thudData[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.04);
  }
  const thudSrc = ctx.createBufferSource(); thudSrc.buffer = thudBuf;
  const thudLp = ctx.createBiquadFilter(); thudLp.type = 'lowpass'; thudLp.frequency.value = 90;
  const thudGain = ctx.createGain(); thudGain.gain.setValueAtTime(1.2, now); thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  thudSrc.connect(thudLp); thudLp.connect(thudGain); thudGain.connect(ctx.destination); thudSrc.start(now);

  // Layer 2: Electrical charge whine — pitch rises as it powers up (80ms–850ms)
  const whine = ctx.createOscillator(); whine.type = 'sawtooth';
  whine.frequency.setValueAtTime(55, now + 0.08);
  whine.frequency.exponentialRampToValueAtTime(3200, now + 0.82);
  const whineGain = ctx.createGain();
  whineGain.gain.setValueAtTime(0.0, now + 0.08);
  whineGain.gain.linearRampToValueAtTime(0.18, now + 0.18);
  whineGain.gain.linearRampToValueAtTime(0.30, now + 0.75);
  whineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.88);
  // Mild distortion via waveshaper
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; curve[i] = (Math.PI + 80) * x / (Math.PI + 80 * Math.abs(x)); }
  shaper.curve = curve;
  whine.connect(shaper); shaper.connect(whineGain); whineGain.connect(ctx.destination);
  whine.start(now + 0.08); whine.stop(now + 0.9);

  // Layer 3: Mechanical stutter — servo clicks during charge (120ms–650ms)
  [0.12, 0.22, 0.34, 0.48, 0.60].forEach(t => {
    const click = ctx.createOscillator(); click.type = 'square'; click.frequency.value = 180 + t * 400;
    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.12, now + t); cg.gain.exponentialRampToValueAtTime(0.001, now + t + 0.03);
    click.connect(cg); cg.connect(ctx.destination); click.start(now + t); click.stop(now + t + 0.04);
  });

  // Layer 4: TARGET LOCK — sharp square burst at end (850ms–1100ms)
  const lock = ctx.createOscillator(); lock.type = 'square'; lock.frequency.value = 3400;
  const lockGain = ctx.createGain();
  lockGain.gain.setValueAtTime(0.0, now + 0.84);
  lockGain.gain.setValueAtTime(0.28, now + 0.86);
  lockGain.gain.setValueAtTime(0.0,  now + 0.92); // double-blip
  lockGain.gain.setValueAtTime(0.28, now + 0.94);
  lockGain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
  lock.connect(lockGain); lockGain.connect(ctx.destination); lock.start(now + 0.84); lock.stop(now + 1.2);
}

function synthRobotDeath(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Descending electronic death — system crash
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.9, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1400, now); bp.frequency.exponentialRampToValueAtTime(80, now + 0.8); bp.Q.value = 2;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(now);
  // Dying oscillator
  const osc = ctx.createOscillator(); osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);
  const og = ctx.createGain(); og.gain.setValueAtTime(0.35, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
  osc.connect(og); og.connect(ctx.destination); osc.start(now); osc.stop(now + 0.9);
}

function synthSwordSwing(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Frequency-swept noise — whoosh
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t / 0.18);
  }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.setValueAtTime(800, now); bp.frequency.exponentialRampToValueAtTime(200, now + 0.18); bp.Q.value = 1.5;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(now);
}

function synthPickup(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Ascending chime — two notes
  [0, 0.12].forEach((delay, i) => {
    const freq = [440, 660][i];
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.3, now + delay); g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
    osc.connect(g); g.connect(ctx.destination); osc.start(now + delay); osc.stop(now + delay + 0.3);
  });
}

// ─── Zustand store ────────────────────────────────────────────────────────────

interface AudioState {
  isMuted: boolean;
  // Ambient
  _ambientCtx: AudioContext | null;
  _ambientStarted: boolean;

  toggleMute: () => void;
  startAmbient: () => void;
  stopAmbient: () => void;

  // ── Game sound functions ──
  playGunShoot: (weaponId?: string) => void;
  playSwordSwing: () => void;
  playSwordHit: (heavy?: boolean) => void;
  playPlayerDamage: () => void;
  playRobotDeath: () => void;
  playEnemyAlert: () => void;
  playWeaponPickup: () => void;
  playFootstep: () => void;
  playJetpackBoost: () => void;
  playReload: () => void;
  playKill: () => void;

  // Legacy aliases (keep existing call sites working)
  playHit: () => void;
  playSuccess: () => void;
  playGunHit: () => void;
  playBoost: () => void;
  playGunAmmo: () => void;
  playAcceleration: () => void;
  stopAcceleration: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  isMuted: false,
  _ambientCtx: null,
  _ambientStarted: false,

  toggleMute: () => set(s => ({ isMuted: !s.isMuted })),

  startAmbient: () => {
    const { _ambientStarted, isMuted } = get();
    if (_ambientStarted || isMuted) return;
    try {
      const ctx = new AudioContext();
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400;
      const gain = ctx.createGain(); gain.gain.value = 0.04;
      filter.connect(gain); gain.connect(ctx.destination);
      const osc1 = ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = 55; osc1.connect(filter); osc1.start();
      const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 57.5; osc2.connect(filter); osc2.start();
      set({ _ambientCtx: ctx, _ambientStarted: true });
    } catch {}
  },

  stopAmbient: () => {
    const { _ambientCtx } = get();
    try { _ambientCtx?.close(); } catch {}
    set({ _ambientCtx: null, _ambientStarted: false });
  },

  // ── Sounds ────────────────────────────────────────────────────────────────

  playGunShoot: (weaponId = 'pistols') => {
    if (get().isMuted) return;
    switch (weaponId) {
      case 'pistols': synth(synthPistol, 300); break;
      case 'smg':     synth(synthSMG, 200); break;
      case 'shotgun': synth(synthShotgun, 800); break;
      case 'sniper':  synth(synthSniper, 1200); break;
      default:        synth(synthPistol, 300); break;
    }
  },

  playSwordSwing: () => {
    if (get().isMuted) return;
    // Try file first, fall back to synth
    try {
      sfx('sword_swish.mp3', 0.45);
    } catch {
      synth(synthSwordSwing, 400);
    }
  },

  playSwordHit: (heavy = false) => {
    if (get().isMuted) return;
    sfx(heavy ? 'heavy_hit.mp3' : 'melee_hit.mp3', heavy ? 0.65 : 0.5);
  },

  playPlayerDamage: () => {
    if (get().isMuted) return;
    sfx('player_damage_new.mp3', 0.6);
  },

  playRobotDeath: () => {
    if (get().isMuted) return;
    synth(synthRobotDeath, 1200);
  },

  playEnemyAlert: () => {
    if (get().isMuted) return;
    synth(synthEnemyAlert, 1400); // 1.2s sound + buffer
  },

  playWeaponPickup: () => {
    if (get().isMuted) return;
    synth(synthPickup, 500);
  },

  playFootstep: () => {
    if (get().isMuted) return;
    synth(synthFootstep, 200);
  },

  playJetpackBoost: () => {
    if (get().isMuted) return;
    sfx('boost.mp3', 0.4);
  },

  playReload: () => {
    if (get().isMuted) return;
    try {
      const ctx = new AudioContext();
      const playClick = (time: number, freq: number, dur: number) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(freq, time); osc.frequency.exponentialRampToValueAtTime(freq * 0.3, time + dur);
        gain.gain.setValueAtTime(0.35, time); gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(time); osc.stop(time + dur);
      };
      playClick(ctx.currentTime,        220, 0.07);
      playClick(ctx.currentTime + 0.09, 340, 0.06);
      playClick(ctx.currentTime + 0.16, 180, 0.10);
      setTimeout(() => ctx.close().catch(() => {}), 400);
    } catch {}
  },

  playKill: () => {
    if (get().isMuted) return;
    try {
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      const ding = ctx.createOscillator(); const dingGain = ctx.createGain();
      ding.type = 'sine'; ding.frequency.setValueAtTime(1050, now); ding.frequency.exponentialRampToValueAtTime(660, now + 0.12);
      dingGain.gain.setValueAtTime(0.5, now); dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      ding.connect(dingGain); dingGain.connect(ctx.destination); ding.start(now); ding.stop(now + 0.2);
      const click = ctx.createOscillator(); const clickGain = ctx.createGain();
      click.type = 'square'; click.frequency.setValueAtTime(2200, now + 0.03);
      clickGain.gain.setValueAtTime(0.25, now + 0.03); clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      click.connect(clickGain); clickGain.connect(ctx.destination); click.start(now + 0.03); click.stop(now + 0.08);
      setTimeout(() => ctx.close().catch(() => {}), 400);
    } catch {}
  },

  // ── Legacy aliases ────────────────────────────────────────────────────────
  playHit:           () => { if (!get().isMuted) synth(synthSwordHit, 300); },
  playSuccess:       () => {},
  playGunHit:        () => { if (!get().isMuted) sfx('gun_hit.mp3', 0.3); },
  playBoost:         () => { if (!get().isMuted) sfx('boost.mp3', 0.4); },
  playGunAmmo:       () => { if (!get().isMuted) synth(synthPickup, 400); },
  playAcceleration:  () => {},
  stopAcceleration:  () => {},
}));

// Small helper used by playHit legacy alias
function synthSwordHit(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 900;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.18);
}
