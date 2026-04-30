import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Timeline, type TimelineMarker, type TimelineSegment } from '@/components/ds';
import {
  fetchAssignments,
  type AssignmentDirectoryItem,
} from '@/lib/api/assignments';

export interface PlannedAssignment {
  allocationPercent: number;
  endDate: string;
  projectName: string;
  startDate: string;
}

export interface PreloadedAssignment {
  allocationPercent: number;
  endDate: string | null;
  projectName: string;
  startDate: string;
  status: string;
  /** Optional — when present, segment links to the filtered assignment list */
  assignmentId?: string;
}

export interface WorkloadTimelineProps {
  /** Compact mode: shorter height, no legend, smaller labels — for table embedding */
  compact?: boolean;
  /** Pre-loaded assignments — when provided, skips the API fetch entirely */
  preloadedAssignments?: PreloadedAssignment[];
  /**
   * Optional. When omitted (and no `preloadedAssignments`), the timeline
   * renders only the `planned` segment — useful for previewing an assignment
   * slot before a candidate has been chosen.
   */
  personId?: string;
  personStatus?: string;
  personTerminatedAt?: string | null;
  planned?: PlannedAssignment;
}

interface NormalizedAssignment {
  allocationPercent: number;
  assignmentId?: string;
  endDate: string | null;
  projectName: string;
  startDate: string;
  status: string;
}

export function WorkloadTimeline({
  compact,
  preloadedAssignments,
  personId,
  personStatus,
  personTerminatedAt,
  planned,
}: WorkloadTimelineProps): JSX.Element {
  const navigate = useNavigate();
  const [fetchedAssignments, setFetchedAssignments] = useState<AssignmentDirectoryItem[]>([]);
  const [loading, setLoading] = useState(!preloadedAssignments && Boolean(personId));

  useEffect(() => {
    if (preloadedAssignments) return;
    if (!personId) {
      // Planned-only mode: no person to fetch existing workload for.
      setFetchedAssignments([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void fetchAssignments({ personId, pageSize: 200 })
      .then((r) => { if (active) setFetchedAssignments(r.items); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [personId, preloadedAssignments]);

  const assignments: NormalizedAssignment[] = useMemo(() => {
    if (preloadedAssignments) return preloadedAssignments;
    return fetchedAssignments.map((a) => ({
      allocationPercent: a.allocationPercent,
      assignmentId: a.id,
      endDate: a.endDate,
      projectName: a.project.displayName,
      startDate: a.startDate,
      status: a.approvalState,
    }));
  }, [preloadedAssignments, fetchedAssignments]);

  const segments: TimelineSegment[] = useMemo(() => {
    const items: TimelineSegment[] = assignments.map((a, i) => ({
      allocationPercent: a.allocationPercent,
      endDate: a.endDate,
      href: a.assignmentId ? `/assignments?id=${encodeURIComponent(a.assignmentId)}` : undefined,
      id: a.assignmentId ?? `assn-${i}`,
      label: a.projectName,
      startDate: a.startDate,
      status: a.status,
    }));
    if (planned?.startDate) {
      items.push({
        allocationPercent: planned.allocationPercent,
        endDate: planned.endDate ?? null,
        id: 'planned-new',
        label: `${planned.projectName} (new)`,
        startDate: planned.startDate,
        tone: 'danger',
      });
    }
    return items;
  }, [assignments, planned?.allocationPercent, planned?.endDate, planned?.projectName, planned?.startDate]);

  const markers: TimelineMarker[] = useMemo(() => {
    if (!personStatus || personStatus === 'ACTIVE') return [];
    let date: string | null = null;
    if (personTerminatedAt) {
      date = personTerminatedAt;
    } else {
      const endDates = assignments.filter((a) => a.endDate).map((a) => a.endDate as string);
      if (endDates.length > 0) {
        const maxEnd = endDates.reduce((max, d) => (new Date(d) > new Date(max) ? d : max));
        date = maxEnd;
      }
    }
    if (!date) return [];
    return [{ date, label: personStatus.toLowerCase(), tone: 'danger' }];
  }, [assignments, personStatus, personTerminatedAt]);

  if (loading) {
    return (
      <div style={{ fontSize: compact ? 9 : 11, color: 'var(--color-text-muted)', padding: compact ? '2px 0' : '4px 0' }}>
        Loading workload...
      </div>
    );
  }

  return (
    <Timeline
      ariaLabel="Workload timeline"
      markers={markers}
      onSegmentClick={(s) => { if (s.href) navigate(s.href); }}
      segments={segments}
      showLegend={!compact}
      size={compact ? 'md' : 'lg'}
      variant="stacked"
    />
  );
}
