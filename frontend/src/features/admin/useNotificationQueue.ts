import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  NotificationQueueItem,
  fetchNotificationQueue,
  requeueNotification,
} from '@/lib/api/notifications';

interface NotificationQueueState {
  error: string | null;
  handleNextPage: () => void;
  handlePrevPage: () => void;
  handleRequeue: (id: string) => Promise<void>;
  handleStatusChange: (status: string) => void;
  isLoading: boolean;
  items: NotificationQueueItem[];
  page: number;
  pageSize: number;
  selectedStatus: string;
  totalCount: number;
}

const DEFAULT_PAGE_SIZE = 25;

export function useNotificationQueue(): NotificationQueueState {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NotificationQueueItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(status: string, nextPage: number): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchNotificationQueue({
        page: nextPage,
        pageSize: DEFAULT_PAGE_SIZE,
        ...(status ? { status } : {}),
      });

      setItems(response.items);
      setTotalCount(response.totalCount);
      setPage(response.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification queue.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load('', 1);
  }, []);

  const handleRequeue = useCallback(async (id: string): Promise<void> => {
    await requeueNotification(id);
    void load(selectedStatus, page);
  }, [selectedStatus, page]);

  return useMemo(
    () => ({
      error,
      handleNextPage: () => {
        const next = page + 1;
        setPage(next);
        void load(selectedStatus, next);
      },
      handlePrevPage: () => {
        const prev = Math.max(1, page - 1);
        setPage(prev);
        void load(selectedStatus, prev);
      },
      handleRequeue,
      handleStatusChange: (status: string) => {
        setSelectedStatus(status);
        setPage(1);
        void load(status, 1);
      },
      isLoading,
      items,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      selectedStatus,
      totalCount,
    }),
    [error, handleRequeue, isLoading, items, page, selectedStatus, totalCount],
  );
}
