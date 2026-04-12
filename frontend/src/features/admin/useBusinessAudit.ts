import { FormEvent, useEffect, useMemo, useState } from 'react';

import { BusinessAuditFilterValues } from '@/components/admin/BusinessAuditFilters';
import { BusinessAuditRecord, fetchBusinessAudit } from '@/lib/api/business-audit';

interface BusinessAuditPageState {
  data: BusinessAuditRecord[];
  error: string | null;
  handleChange: (field: keyof BusinessAuditFilterValues, value: string) => void;
  handleLimitChange: (value: string) => void;
  handleNextPage: () => void;
  handlePrevPage: () => void;
  handleReset: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
  limit: string;
  page: number;
  totalCount: number;
  values: BusinessAuditFilterValues;
}

function defaultOccurredAfter(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

const initialValues: BusinessAuditFilterValues = {
  actionType: '',
  actorId: '',
  occurredAfter: defaultOccurredAfter(),
  occurredBefore: '',
  targetEntityId: '',
  targetEntityType: '',
};

const DEFAULT_PAGE_SIZE = 50;

export function useBusinessAudit(): BusinessAuditPageState {
  const [values, setValues] = useState<BusinessAuditFilterValues>(initialValues);
  const [limit, setLimit] = useState(String(DEFAULT_PAGE_SIZE));
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BusinessAuditRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRecords(
    nextValues: BusinessAuditFilterValues,
    nextLimit: string,
    nextPage: number,
  ): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const pageSize = parseLimit(nextLimit) ?? DEFAULT_PAGE_SIZE;
      const response = await fetchBusinessAudit({
        ...(nextValues.actionType.trim() ? { actionType: nextValues.actionType.trim() } : {}),
        ...(nextValues.actorId.trim() ? { actorId: nextValues.actorId.trim() } : {}),
        ...(nextValues.targetEntityId.trim()
          ? { targetEntityId: nextValues.targetEntityId.trim() }
          : {}),
        ...(nextValues.targetEntityType.trim()
          ? { targetEntityType: nextValues.targetEntityType.trim() }
          : {}),
        ...(nextValues.occurredAfter ? { from: `${nextValues.occurredAfter}T00:00:00.000Z` } : {}),
        ...(nextValues.occurredBefore
          ? { to: `${nextValues.occurredBefore}T23:59:59.999Z` }
          : {}),
        page: nextPage,
        pageSize,
      });

      setData(response.items);
      setTotalCount(response.totalCount);
      setPage(response.page);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load business audit.');
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords(initialValues, String(DEFAULT_PAGE_SIZE), 1);
  }, []);

  return useMemo(
    () => ({
      data,
      error,
      handleChange: (field, value) => {
        setValues((current) => ({
          ...current,
          [field]: value,
        }));
      },
      handleLimitChange: (value) => {
        setLimit(value);
      },
      handleNextPage: () => {
        const nextPage = page + 1;
        setPage(nextPage);
        void loadRecords(values, limit, nextPage);
      },
      handlePrevPage: () => {
        const prevPage = Math.max(1, page - 1);
        setPage(prevPage);
        void loadRecords(values, limit, prevPage);
      },
      handleReset: () => {
        setValues(initialValues);
        setLimit(String(DEFAULT_PAGE_SIZE));
        setPage(1);
        void loadRecords(initialValues, String(DEFAULT_PAGE_SIZE), 1);
      },
      handleSubmit: async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPage(1);
        await loadRecords(values, limit, 1);
      },
      isLoading,
      limit,
      page,
      totalCount,
      values,
    }),
    [data, error, isLoading, limit, page, totalCount, values],
  );
}

function parseLimit(value: string): number | undefined {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }

  return Math.trunc(numeric);
}
