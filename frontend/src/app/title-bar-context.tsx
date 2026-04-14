import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface TitleBarContextValue {
  actions: ReactNode | null;
  setActions: (node: ReactNode | null) => void;
}

const TitleBarContext = createContext<TitleBarContextValue>({
  actions: null,
  setActions: () => {},
});

export function TitleBarProvider({ children }: { children: ReactNode }): JSX.Element {
  const [actions, setActionsState] = useState<ReactNode | null>(null);
  const setActions = useCallback((node: ReactNode | null) => setActionsState(node), []);
  return (
    <TitleBarContext.Provider value={{ actions, setActions }}>
      {children}
    </TitleBarContext.Provider>
  );
}

export function useTitleBarActions(): TitleBarContextValue {
  return useContext(TitleBarContext);
}
