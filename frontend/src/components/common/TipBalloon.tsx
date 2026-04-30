import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { IconButton } from '@/components/ds';

/* ══════════════════════════════════════════════════════════════════
   Tips Context — global toggle for "show all tips" mode
   ══════════════════════════════════════════════════════════════════ */
interface TipsContextValue {
  showAll: boolean;
  toggleShowAll: () => void;
}

const TipsContext = createContext<TipsContextValue>({ showAll: false, toggleShowAll: () => {} });

export function TipsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const toggleShowAll = useCallback(() => setShowAll((v) => !v), []);
  return (
    <TipsContext.Provider value={{ showAll, toggleShowAll }}>
      {children}
    </TipsContext.Provider>
  );
}

export function useTips(): TipsContextValue {
  return useContext(TipsContext);
}

/* ══════════════════════════════════════════════════════════════════
   TipTrigger — the "?" button for headers, toggles all tips
   ══════════════════════════════════════════════════════════════════ */
export function TipTrigger(): JSX.Element {
  const { showAll, toggleShowAll } = useTips();
  return (
    <IconButton
      className={`tip-trigger ${showAll ? 'tip-trigger--active' : ''}`}
      onClick={toggleShowAll}
      size="sm"
      aria-label={showAll ? 'Hide tips' : 'Show tips'}
      title={showAll ? 'Hide all tips' : 'Show all tips'}
    >
      ?
    </IconButton>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TipBalloon — hover-triggered info icon + tooltip balloon
   NOT clickable — shows on mouse hover only.
   Also visible when global showAll is active.
   ══════════════════════════════════════════════════════════════════ */
interface TipBalloonProps {
  tip: string;
  arrow?: 'top' | 'bottom' | 'left' | 'right';
}

export function TipBalloon({ tip, arrow = 'bottom' }: TipBalloonProps): JSX.Element {
  const { showAll } = useTips();

  return (
    <span className={`tip-anchor ${showAll ? 'tip-anchor--forced' : ''}`}>
      <span className="tip-dot" aria-hidden="true" />
      <span className={`tip-popup tip-popup--${arrow}`} role="tooltip">
        {tip}
      </span>
    </span>
  );
}
