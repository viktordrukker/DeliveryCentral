import { useEffect, useState } from 'react';

import {
  CreateResourcePoolRequest,
  ResourcePool,
  addResourcePoolMember,
  createResourcePool,
  fetchResourcePools,
  removeResourcePoolMember,
} from '@/lib/api/resource-pools';
import { fetchPersonDirectory, PersonDirectoryItem } from '@/lib/api/person-directory';

export interface ResourcePoolFormValues {
  code: string;
  description: string;
  name: string;
  orgUnitId: string;
}

export const initialResourcePoolFormValues: ResourcePoolFormValues = {
  code: '',
  description: '',
  name: '',
  orgUnitId: '',
};

interface ResourcePoolsState {
  addMember: (poolId: string, personId: string) => Promise<void>;
  createPool: (values: ResourcePoolFormValues) => Promise<boolean>;
  error: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  people: PersonDirectoryItem[];
  pools: ResourcePool[];
  removeMember: (poolId: string, personId: string) => Promise<void>;
  selectedPool: ResourcePool | null;
  selectedPoolId: string | null;
  selectPool: (id: string) => void;
  successMessage: string | null;
}

export function useResourcePools(): ResourcePoolsState {
  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedPool = pools.find((p) => p.id === selectedPoolId) ?? null;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    void Promise.all([fetchResourcePools(), fetchPersonDirectory({ page: 1, pageSize: 200 })])
      .then(([poolResponse, peopleResponse]) => {
        if (!isMounted) return;
        setPools(poolResponse.items);
        setPeople(peopleResponse.items);
        setSelectedPoolId(poolResponse.items[0]?.id ?? null);
      })
      .catch((reason: Error) => {
        if (!isMounted) return;
        setError(reason.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshPools(selectId?: string): Promise<void> {
    const response = await fetchResourcePools();
    setPools(response.items);
    const nextId = selectId ?? response.items[0]?.id ?? null;
    setSelectedPoolId(nextId);
  }

  async function handleCreatePool(values: ResourcePoolFormValues): Promise<boolean> {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const request: CreateResourcePoolRequest = {
        code: values.code,
        description: values.description || undefined,
        name: values.name,
        orgUnitId: values.orgUnitId || undefined,
      };

      const created = await createResourcePool(request);
      await refreshPools(created.id);
      setSuccessMessage(`Created resource pool "${created.name}".`);
      return true;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create resource pool.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddMember(poolId: string, personId: string): Promise<void> {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await addResourcePoolMember(poolId, personId);
      setPools((prev) => prev.map((p) => (p.id === poolId ? updated : p)));
      const person = people.find((person) => person.id === personId);
      setSuccessMessage(`Added ${person?.displayName ?? 'member'} to pool.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add member.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveMember(poolId: string, personId: string): Promise<void> {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await removeResourcePoolMember(poolId, personId);
      setPools((prev) => prev.map((p) => (p.id === poolId ? updated : p)));
      const person = people.find((person) => person.id === personId);
      setSuccessMessage(`Removed ${person?.displayName ?? 'member'} from pool.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to remove member.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    addMember: handleAddMember,
    createPool: handleCreatePool,
    error,
    isLoading,
    isSubmitting,
    people,
    pools,
    removeMember: handleRemoveMember,
    selectedPool,
    selectedPoolId,
    selectPool: (id: string) => {
      setSelectedPoolId(id);
      setSuccessMessage(null);
      setError(null);
    },
    successMessage,
  };
}
