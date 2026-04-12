import { useEffect, useMemo, useState } from 'react';

import { CaseRecord, fetchCases } from '@/lib/api/cases';

interface CaseFilters {
  caseTypeKey: string;
  ownerPersonId: string;
  subjectPersonId: string;
}

interface UseCasesListState {
  data: CaseRecord[];
  error: string | null;
  filters: CaseFilters;
  handleFilterChange: (field: keyof CaseFilters, value: string) => void;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const initialFilters: CaseFilters = {
  caseTypeKey: '',
  ownerPersonId: '',
  subjectPersonId: '',
};

export function useCasesList(): UseCasesListState {
  const [data, setData] = useState<CaseRecord[]>([]);
  const [filters, setFilters] = useState<CaseFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCases(nextFilters: CaseFilters): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchCases({
        ...(nextFilters.caseTypeKey.trim() ? { caseTypeKey: nextFilters.caseTypeKey.trim() } : {}),
        ...(nextFilters.ownerPersonId.trim()
          ? { ownerPersonId: nextFilters.ownerPersonId.trim() }
          : {}),
        ...(nextFilters.subjectPersonId.trim()
          ? { subjectPersonId: nextFilters.subjectPersonId.trim() }
          : {}),
      });

      setData(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load cases.');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCases(filters);
  }, [filters]);

  return useMemo(
    () => ({
      data,
      error,
      filters,
      handleFilterChange: (field, value) => {
        setFilters((current) => ({
          ...current,
          [field]: value,
        }));
      },
      isLoading,
      reload: async () => loadCases(filters),
    }),
    [data, error, filters, isLoading],
  );
}
