/**
 * AudioContext — React context for the AudioController.
 *
 * Provides hooks to control audio throughout the app.
 * Automatically starts background music on first user interaction.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { audioController, type AudioControllerState } from './AudioController';
import { getCdnUrl } from '../lib/cdnAssets';

interface AudioContextValue extends AudioControllerState {
  initAudio: () => Promise<void>;
  playBackgroundMusic: () => Promise<void>;
  stopBackgroundMusic: () => Promise<void>;
  pauseBackgroundMusic: () => void;
  resumeBackgroundMusic: () => void;
  playSfx: (key: 'invite' | 'ui') => Promise<void>;
  setMasterVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  toggleMute: () => void;
  isInitialized: boolean;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AudioControllerState>(audioController.getState());
  const [isInitialized, setIsInitialized] = useState(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const unsub = audioController.subscribe(setState);
    return unsub;
  }, []);

  const initAudio = useCallback(async () => {
    if (isInitialized) return;

    if (!initPromiseRef.current) {
      initPromiseRef.current = audioController.init().then(() => {
        setIsInitialized(true);
      });
    }

    await initPromiseRef.current;
  }, [isInitialized]);

  const playBackgroundMusic = useCallback(async () => {
    await initAudio();
    const musicUrl = getCdnUrl('AUDIO_BG_MUSIC');
    await audioController.playMusic(musicUrl, { loop: true, fadeIn: 2000 });
  }, [initAudio]);

  const stopBackgroundMusic = useCallback(async () => {
    await audioController.stopMusic({ fadeOut: 1000 });
  }, []);

  const pauseBackgroundMusic = useCallback(() => {
    audioController.pauseMusic();
  }, []);

  const resumeBackgroundMusic = useCallback(() => {
    audioController.resumeMusic();
  }, []);

  const playSfx = useCallback(async (key: 'invite' | 'ui') => {
    await initAudio();
    const urlMap = {
      invite: getCdnUrl('AUDIO_INVITE_SFX'),
      ui: getCdnUrl('AUDIO_UI_SFX'),
    };
    await audioController.playSfx(urlMap[key]);
  }, [initAudio]);

  const setMasterVolume = useCallback((value: number) => {
    audioController.setMasterVolume(value);
  }, []);

  const setMusicVolume = useCallback((value: number) => {
    audioController.setMusicVolume(value);
  }, []);

  const setSfxVolume = useCallback((value: number) => {
    audioController.setSfxVolume(value);
  }, []);

  const toggleMute = useCallback(() => {
    audioController.toggleMute();
  }, []);

  const value: AudioContextValue = {
    ...state,
    initAudio,
    playBackgroundMusic,
    stopBackgroundMusic,
    pauseBackgroundMusic,
    resumeBackgroundMusic,
    playSfx,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    toggleMute,
    isInitialized,
  };

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}
