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
  isMuted: boolean;
  
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
  
  // Control functions
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playSwordHit: () => void;
  playGunShoot: () => void;
  playGunHit: () => void;
  playPlayerDamage: () => void;
  playAcceleration: () => void;
  playBoost: () => void;
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
  isMuted: false, // Audio enabled by default
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setSwordHitSound: (sound) => set({ swordHitSound: sound }),
  setGunShootSound: (sound) => set({ gunShootSound: sound }),
  setGunHitSound: (sound) => set({ gunHitSound: sound }),
  setPlayerDamageSound: (sound) => set({ playerDamageSound: sound }),
  setAccelerationSound: (sound) => set({ accelerationSound: sound }),
  setBoostSound: (sound) => set({ boostSound: sound }),
  
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
      soundClone.play().catch(error => {});
    }
  },
  
  playGunShoot: () => {
    const { gunShootSound, hitSound, isMuted } = get();
    const sound = gunShootSound || hitSound; // Fallback to generic hit sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.5;
      soundClone.play().catch(error => {});
    }
  },
  
  playGunHit: () => {
    const { gunHitSound, hitSound, isMuted } = get();
    const sound = gunHitSound || hitSound; // Fallback to generic hit sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.4;
      soundClone.play().catch(error => {});
    }
  },
  
  playPlayerDamage: () => {
    const { playerDamageSound, hitSound, isMuted } = get();
    const sound = playerDamageSound || hitSound; // Fallback to generic hit sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.6;
      soundClone.play().catch(error => {});
    }
  },
  
  playAcceleration: () => {
    const { accelerationSound, successSound, isMuted } = get();
    const sound = accelerationSound || successSound; // Fallback to success sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.play().catch(error => {});
    }
  },
  
  playBoost: () => {
    const { boostSound, successSound, isMuted } = get();
    const sound = boostSound || successSound; // Fallback to success sound
    if (sound && !isMuted) {
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.5;
      soundClone.play().catch(error => {});
    }
  }
}));
