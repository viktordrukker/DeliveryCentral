import { useCallback, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

interface SavedView {
  id: string;
  name: string;
  params: Record<string, string>;
  isDefault?: boolean;
}

export function useSavedViews(): {
  views: SavedView[];
  saveView: (name: string) => void;
  deleteView: (id: string) => void;
  setDefault: (id: string) => void;
  applyView: (view: SavedView) => void;
} {
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const storageKey = `saved-views-${location.pathname}`;

  const [views, setViews] = useState<SavedView[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as SavedView[]) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback(
    (next: SavedView[]) => {
      setViews(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const saveView = useCallback(
    (name: string) => {
      const params: Record<string, string> = {};
      const sp = new URLSearchParams(location.search);
      sp.forEach((value, key) => {
        params[key] = value;
      });
      const view: SavedView = { id: crypto.randomUUID(), name, params };
      persist([...views, view]);
    },
    [views, location.search, persist],
  );

  const deleteView = useCallback(
    (id: string) => {
      persist(views.filter((v) => v.id !== id));
    },
    [views, persist],
  );

  const setDefault = useCallback(
    (id: string) => {
      persist(
        views.map((v) => ({ ...v, isDefault: v.id === id })),
      );
    },
    [views, persist],
  );

  const applyView = useCallback(
    (view: SavedView) => {
      setSearchParams(view.params, { replace: true });
    },
    [setSearchParams],
  );

  return { views, saveView, deleteView, setDefault, applyView };
}
