/**
 * AudioController — centralized audio management for the app.
 *
 * Handles:
 * - Background music (looping, crossfade)
 * - Sound effects (one-shot)
 * - Volume control (master, music, sfx)
 * - Mute state persistence
 *
 * Pure TypeScript class — no React dependency. React hooks/context
 * subscribe to state changes via the listener pattern.
 */

export interface AudioControllerState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  isMusicPlaying: boolean;
}

export type AudioControllerListener = (state: AudioControllerState) => void;

const STORAGE_KEY = 'echoAvatar_audio';

interface StoredAudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
}

function loadSettings(): StoredAudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredAudioSettings;
      return {
        masterVolume: parsed.masterVolume ?? 1,
        musicVolume: parsed.musicVolume ?? 0.5,
        sfxVolume: parsed.sfxVolume ?? 1,
        isMuted: parsed.isMuted ?? false,
      };
    }
  } catch { /* ignore */ }
  return { masterVolume: 1, musicVolume: 0.5, sfxVolume: 1, isMuted: false };
}

function saveSettings(settings: StoredAudioSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export class AudioController {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private musicElement: HTMLAudioElement | null = null;
  private musicSource: MediaElementAudioSourceNode | null = null;
  private currentMusicUrl: string | null = null;

  private _masterVolume = 1;
  private _musicVolume = 0.5;
  private _sfxVolume = 1;
  private _isMuted = false;
  private _isMusicPlaying = false;

  private listeners: AudioControllerListener[] = [];
  private initialized = false;

  constructor() {
    const settings = loadSettings();
    this._masterVolume = settings.masterVolume;
    this._musicVolume = settings.musicVolume;
    this._sfxVolume = settings.sfxVolume;
    this._isMuted = settings.isMuted;
  }

  // ---- Initialization (must be called after user interaction) ----

  async init(): Promise<void> {
    if (this.initialized) return;

    this.audioContext = new AudioContext();

    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);

    this.musicGain = this.audioContext.createGain();
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.audioContext.createGain();
    this.sfxGain.connect(this.masterGain);

    this.applyVolumes();
    this.initialized = true;

    console.log('[AudioController] Initialized');
  }

  private ensureContext() {
    if (!this.audioContext || !this.masterGain || !this.musicGain || !this.sfxGain) {
      throw new Error('AudioController not initialized. Call init() first.');
    }
  }

  // ---- Subscribe / Notify ----

  subscribe(listener: AudioControllerListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    for (const l of this.listeners) l(state);
  }

  getState(): AudioControllerState {
    return {
      masterVolume: this._masterVolume,
      musicVolume: this._musicVolume,
      sfxVolume: this._sfxVolume,
      isMuted: this._isMuted,
      isMusicPlaying: this._isMusicPlaying,
    };
  }

  // ---- Volume Control ----

  private applyVolumes() {
    if (!this.masterGain || !this.musicGain || !this.sfxGain) return;

    const effectiveMaster = this._isMuted ? 0 : this._masterVolume;
    this.masterGain.gain.value = effectiveMaster;
    this.musicGain.gain.value = this._musicVolume;
    this.sfxGain.gain.value = this._sfxVolume;
  }

  private persistSettings() {
    saveSettings({
      masterVolume: this._masterVolume,
      musicVolume: this._musicVolume,
      sfxVolume: this._sfxVolume,
      isMuted: this._isMuted,
    });
  }

  setMasterVolume(value: number) {
    this._masterVolume = Math.max(0, Math.min(1, value));
    this.applyVolumes();
    this.persistSettings();
    this.notify();
  }

  setMusicVolume(value: number) {
    this._musicVolume = Math.max(0, Math.min(1, value));
    this.applyVolumes();
    this.persistSettings();
    this.notify();
  }

  setSfxVolume(value: number) {
    this._sfxVolume = Math.max(0, Math.min(1, value));
    this.applyVolumes();
    this.persistSettings();
    this.notify();
  }

  setMuted(muted: boolean) {
    this._isMuted = muted;
    this.applyVolumes();
    this.persistSettings();
    this.notify();
  }

  toggleMute() {
    this.setMuted(!this._isMuted);
  }

  get masterVolume() { return this._masterVolume; }
  get musicVolume() { return this._musicVolume; }
  get sfxVolume() { return this._sfxVolume; }
  get isMuted() { return this._isMuted; }
  get isMusicPlaying() { return this._isMusicPlaying; }

  // ---- Background Music ----

  async playMusic(url: string, options: { loop?: boolean; fadeIn?: number } = {}): Promise<void> {
    const { loop = true, fadeIn = 1000 } = options;

    if (!this.initialized) {
      await this.init();
    }
    this.ensureContext();

    if (this.currentMusicUrl === url && this._isMusicPlaying) {
      return;
    }

    await this.stopMusic({ fadeOut: fadeIn > 0 ? 500 : 0 });

    this.musicElement = new Audio(url);
    this.musicElement.loop = loop;
    this.musicElement.crossOrigin = 'anonymous';

    this.musicSource = this.audioContext!.createMediaElementSource(this.musicElement);
    this.musicSource.connect(this.musicGain!);

    if (fadeIn > 0) {
      const originalVolume = this._musicVolume;
      this.musicGain!.gain.value = 0;
      this.musicElement.volume = 1;

      await this.musicElement.play();
      this._isMusicPlaying = true;
      this.currentMusicUrl = url;
      this.notify();

      const startTime = this.audioContext!.currentTime;
      this.musicGain!.gain.setValueAtTime(0, startTime);
      this.musicGain!.gain.linearRampToValueAtTime(originalVolume, startTime + fadeIn / 1000);
    } else {
      await this.musicElement.play();
      this._isMusicPlaying = true;
      this.currentMusicUrl = url;
      this.notify();
    }

    this.musicElement.addEventListener('ended', () => {
      if (!loop) {
        this._isMusicPlaying = false;
        this.currentMusicUrl = null;
        this.notify();
      }
    });

    console.log('[AudioController] Playing music:', url);
  }

  async stopMusic(options: { fadeOut?: number } = {}): Promise<void> {
    const { fadeOut = 500 } = options;

    if (!this.musicElement || !this._isMusicPlaying) return;

    if (fadeOut > 0 && this.audioContext && this.musicGain) {
      const startTime = this.audioContext.currentTime;
      const currentVolume = this.musicGain.gain.value;
      this.musicGain.gain.setValueAtTime(currentVolume, startTime);
      this.musicGain.gain.linearRampToValueAtTime(0, startTime + fadeOut / 1000);

      await new Promise((resolve) => setTimeout(resolve, fadeOut));
    }

    this.musicElement.pause();
    this.musicElement.currentTime = 0;

    if (this.musicSource) {
      this.musicSource.disconnect();
      this.musicSource = null;
    }

    this.musicElement = null;
    this._isMusicPlaying = false;
    this.currentMusicUrl = null;

    if (this.musicGain) {
      this.musicGain.gain.value = this._musicVolume;
    }

    this.notify();
    console.log('[AudioController] Music stopped');
  }

  pauseMusic() {
    if (this.musicElement && this._isMusicPlaying) {
      this.musicElement.pause();
      this._isMusicPlaying = false;
      this.notify();
    }
  }

  resumeMusic() {
    if (this.musicElement && !this._isMusicPlaying) {
      this.musicElement.play().catch(console.error);
      this._isMusicPlaying = true;
      this.notify();
    }
  }

  // ---- Sound Effects ----

  async playSfx(url: string, options: { volume?: number } = {}): Promise<void> {
    const { volume = 1 } = options;

    if (!this.initialized) {
      await this.init();
    }
    this.ensureContext();

    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';

    const source = this.audioContext!.createMediaElementSource(audio);
    const gainNode = this.audioContext!.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.sfxGain!);

    audio.addEventListener('ended', () => {
      source.disconnect();
      gainNode.disconnect();
    });

    await audio.play();
  }

  // ---- Cleanup ----

  dispose() {
    this.stopMusic({ fadeOut: 0 });

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.initialized = false;

    console.log('[AudioController] Disposed');
  }
}

export const audioController = new AudioController();
