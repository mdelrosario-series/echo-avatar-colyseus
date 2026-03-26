import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/** `inviteToken` is the Colyseus room id from invites — case-sensitive; do not normalize case. */
export interface PendingJoin {
  inviteToken: string;
}

interface GameContextValue {
  pendingGuestJoin: PendingJoin | null;
  setPendingJoin: (code: string) => void;
  clearPendingGuestJoin: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: ReactNode;
  onAcceptInvite?: () => void;
}

export function GameProvider({ children, onAcceptInvite }: GameProviderProps) {
  const [pendingGuestJoin, setPendingGuestJoin] = useState<PendingJoin | null>(null);

  const setPendingJoin = useCallback((code: string) => {
    setPendingGuestJoin({ inviteToken: code.trim() });
    onAcceptInvite?.();
  }, [onAcceptInvite]);

  const clearPendingGuestJoin = useCallback(() => setPendingGuestJoin(null), []);

  return (
    <GameContext.Provider value={{ pendingGuestJoin, setPendingJoin, clearPendingGuestJoin }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
