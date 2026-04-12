import { useEffect, useMemo, useState } from 'react';

import {
  CreateMetadataDictionaryEntryRequest,
  MetadataDictionaryDetails,
  MetadataDictionarySummary,
  createMetadataDictionaryEntry,
  fetchMetadataDictionaryById,
  fetchMetadataDictionaries,
  toggleMetadataDictionaryEntry,
} from '@/lib/api/metadata';

interface DictionaryEntryFormValues {
  displayName: string;
  entryKey: string;
  entryValue: string;
  sortOrder: string;
}

interface UseDictionaryAdminState {
  createEntry: (values: DictionaryEntryFormValues) => Promise<boolean>;
  dictionaries: MetadataDictionarySummary[];
  error: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  selectedDictionary: MetadataDictionaryDetails | null;
  selectedDictionaryId: string | null;
  selectDictionary: (id: string) => void;
  successMessage: string | null;
  toggleEntry: (entryId: string, isEnabled: boolean) => Promise<void>;
}

export const initialDictionaryEntryFormValues: DictionaryEntryFormValues = {
  displayName: '',
  entryKey: '',
  entryValue: '',
  sortOrder: '',
};

export function useDictionaryAdmin(): UseDictionaryAdminState {
  const [dictionaries, setDictionaries] = useState<MetadataDictionarySummary[]>([]);
  const [selectedDictionaryId, setSelectedDictionaryId] = useState<string | null>(null);
  const [selectedDictionary, setSelectedDictionary] =
    useState<MetadataDictionaryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSummary = useMemo(
    () => dictionaries.find((item) => item.id === selectedDictionaryId) ?? null,
    [dictionaries, selectedDictionaryId],
  );

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void fetchMetadataDictionaries()
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

        setDictionaries([]);
        setSelectedDictionaryId(null);
        setSelectedDictionary(null);
        setError(reason.message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!selectedDictionaryId) {
      setSelectedDictionary(null);
      return () => {
        isMounted = false;
      };
    }

    void fetchMetadataDictionaryById(selectedDictionaryId)
      .then((response) => {
        if (isMounted) {
          setSelectedDictionary(response);
        }
      })
      .catch((reason: Error) => {
        if (isMounted) {
          setSelectedDictionary(null);
          setError(reason.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDictionaryId]);

  async function refreshSelectedDictionary(id: string): Promise<void> {
    const [dictionaryResponse, detailResponse] = await Promise.all([
      fetchMetadataDictionaries(),
      fetchMetadataDictionaryById(id),
    ]);

    setDictionaries(dictionaryResponse.items);
    setSelectedDictionary(detailResponse);
  }

  async function createEntry(values: DictionaryEntryFormValues): Promise<boolean> {
    if (!selectedSummary) {
      setError('Select a dictionary before creating an entry.');
      return false;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const request: CreateMetadataDictionaryEntryRequest = {
        displayName: values.displayName,
        entryKey: values.entryKey,
        entryValue: values.entryValue,
        ...(values.sortOrder.trim().length > 0 ? { sortOrder: Number(values.sortOrder) } : {}),
      };

      const createdEntry = await createMetadataDictionaryEntry(selectedSummary.dictionaryKey, request);

      await refreshSelectedDictionary(selectedSummary.id);
      setSuccessMessage(`Created dictionary entry ${createdEntry.displayName}.`);
      return true;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to create dictionary entry.',
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleEntry(entryId: string, isEnabled: boolean): Promise<void> {
    setError(null);
    setSuccessMessage(null);

    try {
      await toggleMetadataDictionaryEntry(entryId, isEnabled);

      if (selectedSummary) {
        await refreshSelectedDictionary(selectedSummary.id);
      }

      setSuccessMessage(`Entry ${isEnabled ? 'enabled' : 'disabled'} successfully.`);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : 'Failed to update entry.',
      );
    }
  }

  return {
    createEntry,
    dictionaries,
    error,
    isLoading,
    isSubmitting,
    selectedDictionary,
    selectedDictionaryId,
    selectDictionary: (id: string) => {
      setSelectedDictionaryId(id);
      setSuccessMessage(null);
      setError(null);
    },
    successMessage,
    toggleEntry,
  };
}
