import { useEffect, useState } from 'react';

import { fetchBusinessAudit, type BusinessAuditRecord } from '@/lib/api/business-audit';

export type RecentActivityRole = 'director' | 'pm' | 'rm' | 'hr';

interface UseRecentActivityOptions {
  role: RecentActivityRole;
  limit?: number;
}

const TARGET_SETS: Record<RecentActivityRole, Set<string>> = {
  director: new Set(['Project', 'ProjectHealth', 'Budget']),
  pm: new Set(['Project', 'Assignment', 'StaffingRequest']),
  rm: new Set(['ResourcePool', 'StaffingRequest', 'Assignment', 'Person']),
  hr: new Set(['Person', 'Case', 'LeaveRequest']),
};

/**
 * Fetches last 20 business-audit records and filters by role-specific target types.
 * Returns the top N events relevant to the role's dashboard.
 */
export function useRecentActivity({ role, limit = 5 }: UseRecentActivityOptions): {
  events: BusinessAuditRecord[];
  isLoading: boolean;
  error: string | null;
} {
  const [events, setEvents] = useState<BusinessAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    void fetchBusinessAudit({ pageSize: 20 })
      .then((response) => {
        if (!active) return;
        const targets = TARGET_SETS[role];
        const filtered = response.items
          .filter((event) => targets.has(event.targetEntityType))
          .slice(0, limit);
        setEvents(filtered);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setEvents([]);
        setError(reason instanceof Error ? reason.message : 'Failed to load recent activity.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role, limit]);

  return { events, isLoading, error };
}
