import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  swordHitSound: HTMLAudioElement | null;
  gunShootSound: HTMLAudioElement | null;
  gunHitSound: HTMLAudioElement | null;
  playerDamageSound: HTMLAudioElement | null;
  accelerationSound: HTMLAudioElement | null;
  boostSound: HTMLAudioElement | null;
  gunAmmoSound: HTMLAudioElement | null;
  reloadSound: HTMLAudioElement | null;
  currentAccelerationSound: HTMLAudioElement | null;
  isMuted: boolean;

  // Ambient drone (Web Audio API — procedural, no file needed)
  _ambientCtx: AudioContext | null;
  _ambientOsc1: OscillatorNode | null;
  _ambientOsc2: OscillatorNode | null;
  _ambientGain: GainNode | null;
  _ambientStarted: boolean;
  startAmbient: () => void;
  stopAmbient: () => void;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setSwordHitSound: (sound: HTMLAudioElement) => void;
  setGunShootSound: (sound: HTMLAudioElement) => void;
  setGunHitSound: (sound: HTMLAudioElement) => void;
  setPlayerDamageSound: (sound: HTMLAudioElement) => void;
  setAccelerationSound: (sound: HTMLAudioElement) => void;
  setBoostSound: (sound: HTMLAudioElement) => void;
  setGunAmmoSound: (sound: HTMLAudioElement) => void;
  setReloadSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playSwordHit: () => void;
  playGunShoot: (suppressed?: boolean) => void;
  playGunHit: () => void;
  playPlayerDamage: () => void;
  playAcceleration: () => void;
  playBoost: () => void;
  playGunAmmo: () => void;
  playReload: () => void;
  playKill: () => void;
  stopAcceleration: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  swordHitSound: null,
  gunShootSound: null,
  gunHitSound: null,
  playerDamageSound: null,
  accelerationSound: null,
  boostSound: null,
  gunAmmoSound: null,
  reloadSound: null,
  currentAccelerationSound: null,
  isMuted: false, // Audio enabled by default

  _ambientCtx: null,
  _ambientOsc1: null,
  _ambientOsc2: null,
  _ambientGain: null,
  _ambientStarted: false,

  startAmbient: () => {
    const { _ambientStarted, isMuted } = get();
    if (_ambientStarted || isMuted) return;

    try {
      const ctx = new AudioContext();

      // Lowpass filter — keeps it soft and dark
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      // Master gain — very quiet
      const gain = ctx.createGain();
      gain.gain.value = 0.04;

      filter.connect(gain);
      gain.connect(ctx.destination);

      // Two detuned sines — slight beating = tension
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 55;
      osc1.connect(filter);
      osc1.start();

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 57.5;
      osc2.connect(filter);
      osc2.start();

      set({ _ambientCtx: ctx, _ambientOsc1: osc1, _ambientOsc2: osc2, _ambientGain: gain, _ambientStarted: true });
    } catch (e) {
      // Web Audio not available — silently skip
    }
  },

  stopAmbient: () => {
    const { _ambientCtx, _ambientOsc1, _ambientOsc2 } = get();
    try {
      _ambientOsc1?.stop();
      _ambientOsc2?.stop();
      _ambientCtx?.close();
    } catch (e) {}
    set({ _ambientCtx: null, _ambientOsc1: null, _ambientOsc2: null, _ambientGain: null, _ambientStarted: false });
  },
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setSwordHitSound: (sound) => set({ swordHitSound: sound }),
  setGunShootSound: (sound) => set({ gunShootSound: sound }),
  setGunHitSound: (sound) => set({ gunHitSound: sound }),
  setPlayerDamageSound: (sound) => set({ playerDamageSound: sound }),
  setAccelerationSound: (sound) => set({ accelerationSound: sound }),
  setBoostSound: (sound) => set({ boostSound: sound }),
  setGunAmmoSound: (sound) => set({ gunAmmoSound: sound }),
  setReloadSound: (sound) => set({ reloadSound: sound }),
  
  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    
    // Just update the muted state
    set({ isMuted: newMutedState });
    
    // Log the change
  },
  
  playHit: () => {
    const { hitSound, isMuted } = get();
    if (hitSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        return;
      }
      
      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.play().catch(error => {
      });
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        return;
      }
      
      successSound.currentTime = 0;
      successSound.play().catch(error => {
      });
    }
  },
  
  playSwordHit: () => {
    const { swordHitSound, hitSound, isMuted } = get();
    const sound = swordHitSound || hitSound; // Fallback to generic hit sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.4;
      soundClone.currentTime = 0; // Play from beginning
      soundClone.play().catch(error => {});
    }
  },
  
  playGunShoot: (suppressed = false) => {
    const { gunShootSound, hitSound, isMuted } = get();
    const sound = gunShootSound || hitSound;
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = suppressed ? 0.18 : 0.5;
      soundClone.playbackRate = suppressed ? 0.6 : 1.0; // lower pitch = suppressed thwump
      soundClone.currentTime = 0;
      soundClone.play().catch(() => {});
    }
  },
  
  playGunHit: () => {
    const { gunHitSound, hitSound, isMuted } = get();
    const sound = gunHitSound || hitSound; // Fallback to generic hit sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.4;
      soundClone.currentTime = 0; // Play from beginning
      soundClone.play().catch(error => {});
    }
  },
  
  playPlayerDamage: () => {
    const { playerDamageSound, hitSound, isMuted } = get();
    const sound = playerDamageSound || hitSound; // Fallback to generic hit sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.6;
      soundClone.currentTime = 0; // Play from beginning
      soundClone.play().catch(error => {});
    }
  },
  
  playAcceleration: () => {
    const { accelerationSound, successSound, isMuted, currentAccelerationSound } = get();
    
    // Stop any existing acceleration sound
    if (currentAccelerationSound) {
      currentAccelerationSound.pause();
      currentAccelerationSound.currentTime = 0;
    }
    
    const sound = accelerationSound || successSound; // Fallback to success sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.loop = true; // Loop the acceleration sound
      soundClone.currentTime = 0; // Play from beginning
      soundClone.play().catch(error => {});
      
      // Store reference to current acceleration sound
      set({ currentAccelerationSound: soundClone });
    }
  },
  
  playBoost: () => {
    const { boostSound, successSound, isMuted } = get();
    const sound = boostSound || successSound; // Fallback to success sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.5;
      soundClone.currentTime = 0; // Play from beginning
      soundClone.play().catch(error => {});
    }
  },
  
  playGunAmmo: () => {
    const { gunAmmoSound, successSound, isMuted } = get();
    const sound = gunAmmoSound || successSound; // Fallback to success sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.4;
      soundClone.currentTime = 0; // Play from beginning
      soundClone.play().catch(error => {});
    }
  },
  
  playReload: () => {
    const { isMuted } = get();
    if (isMuted) return;
    try {
      const ctx = new AudioContext();
      // Two metallic "click-clack" sounds 90ms apart
      const playClick = (time: number, freq: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.3, time + dur);
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + dur);
      };
      playClick(ctx.currentTime,        220, 0.07); // clack
      playClick(ctx.currentTime + 0.09, 340, 0.06); // click
      playClick(ctx.currentTime + 0.16, 180, 0.1);  // thunk
      setTimeout(() => ctx.close(), 400);
    } catch {}
  },

  playKill: () => {
    const { isMuted } = get();
    if (isMuted) return;
    try {
      const ctx = new AudioContext();
      // Satisfying "ding-click" — sine at 880Hz fast decay + noise snap
      const now = ctx.currentTime;
      const ding = ctx.createOscillator();
      const dingGain = ctx.createGain();
      ding.type = 'sine';
      ding.frequency.setValueAtTime(1050, now);
      ding.frequency.exponentialRampToValueAtTime(660, now + 0.12);
      dingGain.gain.setValueAtTime(0.5, now);
      dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      ding.connect(dingGain);
      dingGain.connect(ctx.destination);
      ding.start(now);
      ding.stop(now + 0.2);
      // Add a sharp click snap 30ms later
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(2200, now + 0.03);
      clickGain.gain.setValueAtTime(0.25, now + 0.03);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      click.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(now + 0.03);
      click.stop(now + 0.08);
      setTimeout(() => ctx.close(), 400);
    } catch {}
  },

  stopAcceleration: () => {
    const { currentAccelerationSound } = get();
    if (currentAccelerationSound) {
      currentAccelerationSound.pause();
      currentAccelerationSound.currentTime = 0;
      set({ currentAccelerationSound: null });
    }
  }
}));
