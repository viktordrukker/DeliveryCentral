import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import {
  quadrantForAxis,
  quadrantsForField,
  type PulseNarrativeField,
  type PulseQuadrantKey,
} from './narrative-axis-map';

export type PulseHoverTarget =
  | { kind: 'axis'; axisKey: string }
  | { kind: 'narrative'; field: PulseNarrativeField }
  | null;

interface PulseHoverContextValue {
  hoverTarget: PulseHoverTarget;
  setHoverTarget: (t: PulseHoverTarget) => void;
  isAxisActive: (axisKey: string) => boolean;
  isFieldActive: (field: PulseNarrativeField) => boolean;
}

const PulseHoverContext = createContext<PulseHoverContextValue | null>(null);

export function PulseHoverProvider({ children }: PropsWithChildren): JSX.Element {
  const [hoverTarget, setHoverTarget] = useState<PulseHoverTarget>(null);

  const value = useMemo<PulseHoverContextValue>(() => {
    function isAxisActive(axisKey: string): boolean {
      if (!hoverTarget) return true;
      if (hoverTarget.kind === 'axis') return hoverTarget.axisKey === axisKey;
      const q = quadrantForAxis(axisKey);
      if (!q) return true;
      return quadrantsForField(hoverTarget.field).includes(q);
    }
    function isFieldActive(field: PulseNarrativeField): boolean {
      if (!hoverTarget) return true;
      if (hoverTarget.kind === 'narrative') return hoverTarget.field === field;
      const qs = quadrantsForField(field);
      const axisQuadrant = quadrantForAxis(hoverTarget.axisKey);
      return axisQuadrant !== null && qs.includes(axisQuadrant);
    }
    return { hoverTarget, setHoverTarget, isAxisActive, isFieldActive };
  }, [hoverTarget]);

  return <PulseHoverContext.Provider value={value}>{children}</PulseHoverContext.Provider>;
}

export function usePulseHover(): PulseHoverContextValue {
  const ctx = useContext(PulseHoverContext);
  if (!ctx) {
    return {
      hoverTarget: null,
      setHoverTarget: () => undefined,
      isAxisActive: () => true,
      isFieldActive: () => true,
    };
  }
  return ctx;
}
