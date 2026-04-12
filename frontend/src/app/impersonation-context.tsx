import { createContext, useCallback, useContext, useState } from 'react';

interface ImpersonationState {
  personId: string;
  displayName: string;
  roles: string[];
}

interface ImpersonationContextValue {
  impersonation: ImpersonationState | null;
  startImpersonation: (state: ImpersonationState) => void;
  exitImpersonation: () => void;
}

const STORAGE_KEY = 'dc:impersonation';

function loadFromStorage(): ImpersonationState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonationState;
  } catch {
    return null;
  }
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

// Exported so useAuth() can read impersonation state reactively without circular imports.
export { ImpersonationContext as ImpersonationReactContext };

export function ImpersonationProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(loadFromStorage);

  const startImpersonation = useCallback((state: ImpersonationState): void => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setImpersonation(state);
  }, []);

  const exitImpersonation = useCallback((): void => {
    sessionStorage.removeItem(STORAGE_KEY);
    setImpersonation(null);
  }, []);

  return (
    <ImpersonationContext.Provider value={{ impersonation, startImpersonation, exitImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): ImpersonationContextValue {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonation must be used inside ImpersonationProvider');
  return ctx;
}
