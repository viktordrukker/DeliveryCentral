import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  ExceptionCategory,
  ExceptionQueueItem,
  ExceptionQueueResponse,
  ExceptionStatusFilter,
  fetchExceptionById,
  fetchExceptions,
  resolveException,
  suppressException,
} from '@/lib/api/exceptions';

interface ExceptionQueueFilters {
  asOf: string;
  category: '' | ExceptionCategory;
  provider: '' | 'm365' | 'radius';
  statusFilter: ExceptionStatusFilter;
  targetEntityId: string;
}

interface ExceptionQueueState {
  activeItem: ExceptionQueueItem | null;
  data: ExceptionQueueResponse | null;
  error: string | null;
  filters: ExceptionQueueFilters;
  isLoading: boolean;
  isLoadingDetail: boolean;
  selectedId: string | null;
  selectException: (id: string | null) => void;
  setFilter: <TKey extends keyof ExceptionQueueFilters>(
    key: TKey,
    value: ExceptionQueueFilters[TKey],
  ) => void;
  handleResolve: (id: string, resolution: string) => Promise<void>;
  handleSuppress: (id: string, reason: string) => Promise<void>;
}

export function useExceptionQueue(): ExceptionQueueState {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<ExceptionQueueResponse | null>(null);
  const [activeItem, setActiveItem] = useState<ExceptionQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const filters = useMemo<ExceptionQueueFilters>(
    () => ({
      asOf: searchParams.get('asOf') ?? new Date().toISOString(),
      category: (searchParams.get('category') as ExceptionCategory | null) ?? '',
      provider: (searchParams.get('provider') as 'm365' | 'radius' | null) ?? '',
      statusFilter: (searchParams.get('statusFilter') as ExceptionStatusFilter | null) ?? 'OPEN',
      targetEntityId: searchParams.get('targetEntityId') ?? '',
    }),
    [searchParams],
  );

  const selectedId = searchParams.get('selected');

  useEffect(() => {
    let isCancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchExceptions({
          asOf: filters.asOf,
          ...(filters.category ? { category: filters.category } : {}),
          limit: 100,
          ...(filters.provider ? { provider: filters.provider } : {}),
          status: filters.statusFilter || 'OPEN',
          ...(filters.targetEntityId ? { targetEntityId: filters.targetEntityId } : {}),
        });

        if (isCancelled) {
          return;
        }

        setData(response);
      } catch (reason) {
        if (isCancelled) {
          return;
        }

        setError(reason instanceof Error ? reason.message : 'Failed to load exceptions.');
        setData(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [filters.asOf, filters.category, filters.provider, filters.statusFilter, filters.targetEntityId, refreshKey]);

  useEffect(() => {
    let isCancelled = false;

    async function loadDetail(): Promise<void> {
      if (!selectedId) {
        setActiveItem(null);
        return;
      }

      setIsLoadingDetail(true);
      setError(null);

      try {
        const detail = await fetchExceptionById(selectedId, { asOf: filters.asOf });
        if (isCancelled) {
          return;
        }

        setActiveItem(detail);
      } catch (reason) {
        if (isCancelled) {
          return;
        }

        setActiveItem(null);
        setError(reason instanceof Error ? reason.message : 'Failed to load exception detail.');
      } finally {
        if (!isCancelled) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [filters.asOf, selectedId]);

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleResolve = useCallback(
    async (id: string, resolution: string): Promise<void> => {
      await resolveException(id, resolution, 'admin');
      reload();
    },
    [reload],
  );

  const handleSuppress = useCallback(
    async (id: string, reason: string): Promise<void> => {
      await suppressException(id, reason, 'admin');
      reload();
    },
    [reload],
  );

  return {
    activeItem,
    data,
    error,
    filters,
    handleResolve,
    handleSuppress,
    isLoading,
    isLoadingDetail,
    selectedId,
    selectException: (id) => {
      const next = new URLSearchParams(searchParams);
      if (id) {
        next.set('selected', id);
      } else {
        next.delete('selected');
      }
      setSearchParams(next);
    },
    setFilter: (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (typeof value === 'string' && value.trim().length === 0) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      if (key !== 'asOf') {
        next.delete('selected');
      }
      setSearchParams(next);
    },
  };
}
