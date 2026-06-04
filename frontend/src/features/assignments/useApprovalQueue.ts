import { useCallback, useEffect, useState } from 'react';

import { type AssignmentDirectoryItem } from '@/lib/api/assignments';
import { listProjectPositions } from '@/lib/api/project-positions';
import { mapListResponseToDirectory } from '@/features/lean-migration/position-to-assignment-mapper';

export type ApprovalQueueScope = 'mine' | 'team' | 'breached' | 'all';

interface UseApprovalQueueParams {
  /** Limits to assignments this person requested (PM/DM "Mine" view). */
  ownerPersonId?: string;
  /** Current viewer's roles. Used to widen "Mine" so directors/admins also see
   * BOOKED rows awaiting their sign-off. */
  actorRoles?: readonly string[];
  scope?: ApprovalQueueScope;
  pageSize?: number;
}

interface UseApprovalQueueResult {
  items: AssignmentDirectoryItem[];
  totalCount: number;
  isLoading: boolean;
  error?: string;
  refresh: () => void;
}

/**
 * Reads the approval queue: assignments in `PROPOSED` or `IN_REVIEW`, plus
 * `BOOKED` assignments still awaiting director sign-off (slate-picked work
 * lands at BOOKED + requiresDirectorApproval=true when allocation/duration
 * trips the threshold). The scope filter narrows by:
 *   - 'mine'      → assignments raised by the current PM/DM (uses
 *                   `ownerPersonId` against the requestor field; today
 *                   filtered client-side because the list endpoint doesn't
 *                   filter by requestedByPersonId yet).
 *   - 'team'      → all OPEN-stage assignments (placeholder until team
 *                   relations are wired through).
 *   - 'breached'  → only assignments with `slaBreachedAt` set.
 *   - 'all'       → no narrowing.
 *
 * Sorts client-side by `slaDueAt` ascending so the most urgent rows surface
 * first, with breached rows on top.
 */
export function useApprovalQueue(
  params: UseApprovalQueueParams = {},
): UseApprovalQueueResult {
  const { ownerPersonId, actorRoles, scope = 'all', pageSize = 100 } = params;
  const isDirector = Boolean(
    actorRoles && (actorRoles.includes('director') || actorRoles.includes('admin')),
  );
  const [items, setItems] = useState<AssignmentDirectoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refreshToken, setRefreshToken] = useState<number>(0);

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(undefined);

    void (async () => {
      try {
        // LEAN-P2-2: single /project-positions call with the in-flight fill
        // statuses. The lean enum collapses IN_REVIEW into PROPOSED, so one
        // status bucket covers both legacy states. BOOKED rows are filtered
        // post-fetch by `requiresDirectorApproval` — that flag is the only
        // signal the director has to find them.
        const response = await listProjectPositions({
          fillStatuses: ['PROPOSED', 'BOOKED'],
          take: pageSize,
        });
        if (!active) return;

        const mapped = mapListResponseToDirectory(response);
        const proposedRows = mapped.items.filter((row) => row.approvalState === 'PROPOSED');
        const bookedAwaitingDirector = mapped.items.filter(
          (row) => row.approvalState === 'BOOKED' && row.requiresDirectorApproval === true,
        );

        let merged: AssignmentDirectoryItem[] = [
          ...proposedRows,
          ...bookedAwaitingDirector,
        ];

        if (scope === 'mine') {
          // "Mine" = rows the current viewer can act on. A director/admin owns
          // the BOOKED rows flagged for director sign-off; everyone else is
          // narrowed to rows where they are the assignee (the closest stand-in
          // for "raised by me" until requestedByPersonId is plumbed through
          // the directory DTO).
          merged = merged.filter((row) => {
            if (isDirector && row.requiresDirectorApproval === true) return true;
            return Boolean(ownerPersonId) && row.person.id === ownerPersonId;
          });
        }

        if (scope === 'breached') {
          merged = merged.filter((row) => Boolean(row.slaBreachedAt));
        }

        merged.sort((a, b) => {
          const aBreached = Boolean(a.slaBreachedAt) ? 0 : 1;
          const bBreached = Boolean(b.slaBreachedAt) ? 0 : 1;
          if (aBreached !== bBreached) return aBreached - bBreached;
          const aDue = a.slaDueAt ? new Date(a.slaDueAt).getTime() : Number.POSITIVE_INFINITY;
          const bDue = b.slaDueAt ? new Date(b.slaDueAt).getTime() : Number.POSITIVE_INFINITY;
          return aDue - bDue;
        });

        setItems(merged);
        setTotalCount(merged.length);
        setIsLoading(false);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load approval queue.');
        setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [ownerPersonId, isDirector, scope, pageSize, refreshToken]);

  return { items, totalCount, isLoading, error, refresh };
}
