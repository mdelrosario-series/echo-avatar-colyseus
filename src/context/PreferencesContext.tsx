import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';

const STORAGE_KEY = 'echoAvatar_preferences';

interface Preferences {
  showNameTags: boolean;
  showMyNameTag: boolean;
  voiceVolume: number;  // 0–1
}

const DEFAULT_PREFERENCES: Preferences = {
  showNameTags: true,
  showMyNameTag: true,
  voiceVolume: 1,
};

function loadStored(): Preferences {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_PREFERENCES, ...(parsed as Partial<Preferences>) };
      }
    }
  } catch {}
  return { ...DEFAULT_PREFERENCES };
}

function saveStored(prefs: Preferences): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

function persistToRun(prefs: Preferences): void {
  try {
    if (typeof RundotGameAPI?.appStorage?.setItem !== 'function') return;
    RundotGameAPI.appStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)).catch(() => {});
  } catch {}
}

interface PreferencesContextValue {
  showNameTags: boolean;
  setShowNameTags: (value: boolean) => void;
  showMyNameTag: boolean;
  setShowMyNameTag: (value: boolean) => void;
  voiceVolume: number;
  setVoiceVolume: (value: number) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(loadStored);

  // Hydrate from RUN app storage so preferences survive full reloads
  useEffect(() => {
    if (typeof RundotGameAPI?.appStorage?.getItem !== 'function') return;
    RundotGameAPI.appStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') {
          const hydrated: Preferences = { ...DEFAULT_PREFERENCES, ...(parsed as Partial<Preferences>) };
          setPrefs(hydrated);
          saveStored(hydrated);
        }
      } catch {}
    }).catch(() => {});
  }, []);

  const setShowNameTags = useCallback((value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, showNameTags: value };
      saveStored(next);
      persistToRun(next);
      return next;
    });
  }, []);

  const setShowMyNameTag = useCallback((value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, showMyNameTag: value };
      saveStored(next);
      persistToRun(next);
      return next;
    });
  }, []);

  const setVoiceVolume = useCallback((value: number) => {
    setPrefs((prev) => {
      const next = { ...prev, voiceVolume: Math.max(0, Math.min(1, value)) };
      saveStored(next);
      persistToRun(next);
      return next;
    });
  }, []);

  return (
    <PreferencesContext.Provider value={{ showNameTags: prefs.showNameTags, setShowNameTags, showMyNameTag: prefs.showMyNameTag, setShowMyNameTag, voiceVolume: prefs.voiceVolume, setVoiceVolume }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
