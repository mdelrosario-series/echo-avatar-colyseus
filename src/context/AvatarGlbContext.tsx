import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';

const STORAGE_KEY = 'echoAvatar_avatar';

export interface StoredAvatar {
  glbUrl: string;
  previewImageUrl?: string | null;
}

function loadStored(): StoredAvatar | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && typeof (parsed as StoredAvatar).glbUrl === 'string') {
        return parsed as StoredAvatar;
      }
    }
    const legacy = sessionStorage.getItem('echoAvatar_glbUrl');
    if (legacy) {
      const migrated: StoredAvatar = { glbUrl: legacy };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      sessionStorage.removeItem('echoAvatar_glbUrl');
      return migrated;
    }
  } catch {}
  return null;
}

function saveStored(avatar: StoredAvatar | null) {
  try {
    if (avatar?.glbUrl) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(avatar));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

function persistToRun(avatar: StoredAvatar | null) {
  try {
    if (typeof RundotGameAPI?.appStorage?.setItem !== 'function') return;
    if (avatar?.glbUrl) {
      RundotGameAPI.appStorage.setItem(STORAGE_KEY, JSON.stringify(avatar)).catch(() => {});
    } else {
      RundotGameAPI.appStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  } catch {}
}

interface AvatarGlbContextValue {
  glbUrl: string | null;
  previewImageUrl: string | null;
  setGlbUrl: (url: string | null) => void;
  /** Set both GLB and preview URL (e.g. when job completes). */
  setAvatar: (glbUrl: string | null, previewImageUrl?: string | null) => void;
  switchToWorldTab: () => void;
  switchToAvatarTab: () => void;
}

const AvatarGlbContext = createContext<AvatarGlbContextValue | null>(null);

interface AvatarGlbProviderProps {
  children: ReactNode;
  switchToWorldTab: () => void;
  switchToAvatarTab: () => void;
}

export function AvatarGlbProvider({ children, switchToWorldTab, switchToAvatarTab }: AvatarGlbProviderProps) {
  const [stored, setStoredState] = useState<StoredAvatar | null>(loadStored);

  // Hydrate from RUN app storage so chosen avatar (e.g. from Library) survives refresh
  useEffect(() => {
    if (typeof RundotGameAPI?.appStorage?.getItem !== 'function') return;
    RundotGameAPI.appStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed && typeof parsed === 'object' && typeof (parsed as StoredAvatar).glbUrl === 'string') {
            setStoredState(parsed as StoredAvatar);
            saveStored(parsed as StoredAvatar);
          }
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const glbUrl = stored?.glbUrl ?? null;
  const previewImageUrl = stored?.previewImageUrl ?? null;

  const setGlbUrl = useCallback((url: string | null) => {
    setStoredState((prev) => {
      if (!url) {
        saveStored(null);
        persistToRun(null);
        return null;
      }
      const next = prev ? { ...prev, glbUrl: url } : { glbUrl: url };
      saveStored(next);
      persistToRun(next);
      return next;
    });
  }, []);

  const setAvatar = useCallback((url: string | null, preview?: string | null) => {
    setStoredState(() => {
      if (!url) {
        saveStored(null);
        persistToRun(null);
        return null;
      }
      const next: StoredAvatar = { glbUrl: url, previewImageUrl: preview ?? null };
      saveStored(next);
      persistToRun(next);
      return next;
    });
  }, []);

  return (
    <AvatarGlbContext.Provider value={{ glbUrl, previewImageUrl, setGlbUrl, setAvatar, switchToWorldTab, switchToAvatarTab }}>
      {children}
    </AvatarGlbContext.Provider>
  );
}

export function useAvatarGlb(): AvatarGlbContextValue {
  const ctx = useContext(AvatarGlbContext);
  if (!ctx) throw new Error('useAvatarGlb must be used within AvatarGlbProvider');
  return ctx;
}
