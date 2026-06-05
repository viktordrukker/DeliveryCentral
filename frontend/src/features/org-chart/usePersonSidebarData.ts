import { useEffect, useRef, useState } from 'react';

import { fetchPersonSkills, PersonSkill } from '@/lib/api/skills';
import { fetchExceptions, ExceptionQueueItem } from '@/lib/api/exceptions';
import type { AssignmentDirectoryItem } from '@/lib/api/assignments';
import { listProjectPositions } from '@/lib/api/project-positions';
import { mapListResponseToDirectory } from '@/features/lean-migration/position-to-assignment-mapper';

export interface PersonSidebarData {
  skills: PersonSkill[];
  openExceptions: ExceptionQueueItem[];
  assignments: AssignmentDirectoryItem[];
  isLoading: boolean;
  error: string | null;
}

const EMPTY: PersonSidebarData = {
  skills: [],
  openExceptions: [],
  assignments: [],
  isLoading: false,
  error: null,
};

const cache = new Map<string, Omit<PersonSidebarData, 'isLoading' | 'error'>>();

export function usePersonSidebarData(personId: string | null): PersonSidebarData {
  const [state, setState] = useState<PersonSidebarData>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!personId) {
      setState(EMPTY);
      return;
    }

    // Return cached data immediately if available
    const cached = cache.get(personId);
    if (cached) {
      setState({ ...cached, isLoading: false, error: null });
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    Promise.all([
      fetchPersonSkills(personId).catch(() => [] as PersonSkill[]),
      fetchExceptions({ targetEntityId: personId, status: 'OPEN', limit: 20 }).catch(() => ({ items: [] as ExceptionQueueItem[] })),
      // LEAN-P2: legacy `status:active` maps to BOOKED/ASSIGNED/ONBOARDING.
      listProjectPositions({ activePersonId: personId, fillStatuses: ['BOOKED', 'ASSIGNED', 'ONBOARDING'], take: 20 })
        .then(mapListResponseToDirectory)
        .catch(() => ({ items: [] as AssignmentDirectoryItem[] })),
    ]).then(([skills, exceptionsRes, assignmentsRes]) => {
      if (controller.signal.aborted) return;

      const data = {
        skills,
        openExceptions: exceptionsRes.items,
        assignments: assignmentsRes.items,
      };

      cache.set(personId, data);
      setState({ ...data, isLoading: false, error: null });
    });

    return () => { controller.abort(); };
  }, [personId]);

  return state;
}
