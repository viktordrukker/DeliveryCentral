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
  handlePageChange: (nextPage: number) => void;
  handlePageSizeChange: (nextPageSize: number) => void;
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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [items, setItems] = useState<NotificationQueueItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(status: string, nextPage: number, nextPageSize: number): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchNotificationQueue({
        page: nextPage,
        pageSize: nextPageSize,
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
    void load('', 1, DEFAULT_PAGE_SIZE);
  }, []);

  const handleRequeue = useCallback(async (id: string): Promise<void> => {
    await requeueNotification(id);
    void load(selectedStatus, page, pageSize);
  }, [selectedStatus, page, pageSize]);

  return useMemo(
    () => ({
      error,
      handleNextPage: () => {
        const next = page + 1;
        setPage(next);
        void load(selectedStatus, next, pageSize);
      },
      handlePrevPage: () => {
        const prev = Math.max(1, page - 1);
        setPage(prev);
        void load(selectedStatus, prev, pageSize);
      },
      handlePageChange: (nextPage: number) => {
        const safe = Math.max(1, nextPage);
        setPage(safe);
        void load(selectedStatus, safe, pageSize);
      },
      handlePageSizeChange: (nextPageSize: number) => {
        setPageSize(nextPageSize);
        setPage(1);
        void load(selectedStatus, 1, nextPageSize);
      },
      handleRequeue,
      handleStatusChange: (status: string) => {
        setSelectedStatus(status);
        setPage(1);
        void load(status, 1, pageSize);
      },
      isLoading,
      items,
      page,
      pageSize,
      selectedStatus,
      totalCount,
    }),
    [error, handleRequeue, isLoading, items, page, pageSize, selectedStatus, totalCount],
  );
}
