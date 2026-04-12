import { useEffect, useMemo, useState } from 'react';

import {
  FetchMetadataDictionariesParams,
  MetadataDictionaryDetails,
  MetadataDictionarySummary,
  fetchMetadataDictionaryById,
  fetchMetadataDictionaries,
} from '@/lib/api/metadata';

interface UseMetadataAdminOptions extends FetchMetadataDictionariesParams {}

interface UseMetadataAdminState {
  dictionaries: MetadataDictionarySummary[];
  error: string | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  selectedDictionary: MetadataDictionaryDetails | null;
  selectedDictionaryId: string | null;
  selectDictionary: (id: string) => void;
}

export function useMetadataAdmin(
  options: UseMetadataAdminOptions,
): UseMetadataAdminState {
  const [dictionaries, setDictionaries] = useState<MetadataDictionarySummary[]>([]);
  const [selectedDictionaryId, setSelectedDictionaryId] = useState<string | null>(null);
  const [selectedDictionary, setSelectedDictionary] =
    useState<MetadataDictionaryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestKey = useMemo(
    () => JSON.stringify(options),
    [options.entityType, options.scopeOrgUnitId, options.search],
  );

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void fetchMetadataDictionaries(options)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setDictionaries(response.items);
        setSelectedDictionaryId((current) => {
          if (current && response.items.some((item) => item.id === current)) {
            return current;
          }

          return response.items[0]?.id ?? null;
        });
      })
      .catch((reason: Error) => {
        if (!isMounted) {
          return;
        }

        setError(reason.message);
        setDictionaries([]);
        setSelectedDictionaryId(null);
        setSelectedDictionary(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [requestKey]);

  useEffect(() => {
    let isMounted = true;

    if (!selectedDictionaryId) {
      setSelectedDictionary(null);
      setIsLoadingDetails(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingDetails(true);

    void fetchMetadataDictionaryById(selectedDictionaryId)
      .then((response) => {
        if (isMounted) {
          setSelectedDictionary(response);
        }
      })
      .catch((reason: Error) => {
        if (isMounted) {
          setError(reason.message);
          setSelectedDictionary(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingDetails(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDictionaryId]);

  return {
    dictionaries,
    error,
    isLoading,
    isLoadingDetails,
    selectDictionary: setSelectedDictionaryId,
    selectedDictionary,
    selectedDictionaryId,
  };
}
