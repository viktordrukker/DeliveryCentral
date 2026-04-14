import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'entity-nav-ids';

/**
 * Store entity IDs when navigating from a list to a detail page.
 * Call `storeIds` on the list page before navigating.
 */
export function storeEntityIds(basePath: string, ids: string[]): void {
  sessionStorage.setItem(`${STORAGE_KEY}:${basePath}`, JSON.stringify(ids));
}

/**
 * Retrieve stored entity IDs and compute previous/next for the current entity.
 */
export function useEntityNavigation(
  basePath: string,
  currentId: string | undefined,
): {
  hasPrevious: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  goToPrevious: () => void;
  goToNext: () => void;
} {
  const navigate = useNavigate();

  const ids: string[] = useMemo(() => {
    try {
      const stored = sessionStorage.getItem(`${STORAGE_KEY}:${basePath}`);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  }, [basePath]);

  const currentIndex = currentId ? ids.indexOf(currentId) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < ids.length - 1;

  const goToPrevious = useCallback(() => {
    if (hasPrevious) {
      navigate(`${basePath}/${ids[currentIndex - 1]}`);
    }
  }, [hasPrevious, navigate, basePath, ids, currentIndex]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      navigate(`${basePath}/${ids[currentIndex + 1]}`);
    }
  }, [hasNext, navigate, basePath, ids, currentIndex]);

  return {
    hasPrevious,
    hasNext,
    currentIndex: currentIndex >= 0 ? currentIndex + 1 : 0,
    totalCount: ids.length,
    goToPrevious,
    goToNext,
  };
}
