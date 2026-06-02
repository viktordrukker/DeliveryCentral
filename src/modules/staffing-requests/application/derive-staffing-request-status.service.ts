import { Injectable } from '@nestjs/common';
import { ProjectPositionFillStatus, StaffingRequestStatus } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export type DerivedStaffingRequestStatus =
  | 'Open'
  | 'In progress'
  | 'Filled'
  | 'Closed'
  | 'Cancelled';

export interface DerivedStaffingRequestSummary {
  assigned: number;
  booked: number;
  cancelled: number;
  completed: number;
  created: number;
  onHold: number;
  onboarding: number;
  proposed: number;
  rejected: number;
  totalAssignments: number;
}

export interface DerivedStaffingRequestResult {
  derivedStatus: DerivedStaffingRequestStatus;
  summary: DerivedStaffingRequestSummary;
}

function emptySummary(): DerivedStaffingRequestSummary {
  return {
    assigned: 0,
    booked: 0,
    cancelled: 0,
    completed: 0,
    created: 0,
    onHold: 0,
    onboarding: 0,
    proposed: 0,
    rejected: 0,
    totalAssignments: 0,
  };
}

export function classifyFromSummary(
  headcountRequired: number,
  summary: DerivedStaffingRequestSummary,
  rawStatus?: StaffingRequestStatus | null,
): DerivedStaffingRequestStatus {
  // BUG-SR-1 / Layer A — raw `StaffingRequest.status` is authoritative for
  // terminal/lifecycle states the assignment-summary cannot infer. A
  // cancelled SR with zero assignments was rendering as `Open`; a fulfilled
  // SR could regress to `Open` if its booked assignment was later cancelled.
  // Short-circuit here so the raw column is honored when set.
  if (rawStatus === 'CANCELLED') return 'Cancelled';
  if (rawStatus === 'FULFILLED') return 'Filled';

  if (summary.totalAssignments === 0) {
    return 'Open';
  }

  const terminal = summary.rejected + summary.cancelled + summary.completed;
  const inFlight =
    summary.created + summary.proposed + summary.booked + summary.onboarding + summary.assigned + summary.onHold;

  if (inFlight === 0 && terminal > 0) {
    const anyCompleted = summary.completed > 0;
    if (anyCompleted) return 'Closed';
    return 'Cancelled';
  }

  const filling = summary.booked + summary.onboarding + summary.assigned;
  const threshold = headcountRequired > 0 ? headcountRequired : 1;
  if (filling >= threshold && summary.onHold === 0) {
    return 'Filled';
  }

  return 'In progress';
}

/**
 * LEAN-P1-4 — lean equivalent of classifyFromSummary that reads
 * ProjectPosition.fillStatus directly. In the lean model the position row
 * carries the authoritative lifecycle status as a column, so there is no
 * need to count assignments to infer it.
 *
 * Mapping:
 *   DRAFT, OPEN          → 'Open'
 *   PROPOSED             → 'In progress'
 *   BOOKED, ONBOARDING,
 *   ASSIGNED, ON_HOLD    → 'Filled'
 *   RELEASED             → 'Closed'
 */
export function classifyFromProjectPositionFillStatus(
  fillStatus: ProjectPositionFillStatus,
  _headcountRequired: number,
): DerivedStaffingRequestStatus {
  switch (fillStatus) {
    case 'DRAFT':
    case 'OPEN':
      return 'Open';
    case 'PROPOSED':
      return 'In progress';
    case 'BOOKED':
    case 'ONBOARDING':
    case 'ASSIGNED':
    case 'ON_HOLD':
      return 'Filled';
    case 'RELEASED':
      return 'Closed';
    default:
      return 'Open';
  }
}

@Injectable()
export class DeriveStaffingRequestStatusService {
  public constructor(private readonly prisma: PrismaService) {}

  // BUG-SR-1 round 2 — the controller passes `request.id` here, but
  // `StaffingRequest.toResponse()` sets `id` to the publicId (`stf_…`) per
  // DMD-026. The raw findUnique by uuid was returning null for any input
  // that wasn't already a bare UUID, which silently defeated Layer A's
  // short-circuit on `CANCELLED`/`FULFILLED` and also kept the assignments
  // lookup from finding anything (latent bug, but harmless before because
  // the totalAssignments=0 path already returned 'Open'). Resolve the
  // internal uuid up-front so both the SR-status fetch and the
  // assignments-by-FK lookup use the right key.
  private async resolveInternalUuid(idOrPublicId: string): Promise<string | null> {
    if (/^stf_[A-Za-z0-9]{10,}$/.test(idOrPublicId)) {
      const row = await this.prisma.staffingRequest.findUnique({
        where: { publicId: idOrPublicId },
        select: { id: true },
      });
      return row?.id ?? null;
    }
    return idOrPublicId;
  }

  public async deriveForRequest(
    requestId: string,
    headcountRequired: number,
  ): Promise<DerivedStaffingRequestResult> {
    const internalId = await this.resolveInternalUuid(requestId);
    if (!internalId) {
      return {
        derivedStatus: classifyFromSummary(headcountRequired, emptySummary(), null),
        summary: emptySummary(),
      };
    }

    // BUG-SR-1 / Layer A — also fetch raw `status` so the classifier can
    // honor terminal lifecycle states the assignment summary cannot infer.
    const [request, assignments] = await Promise.all([
      this.prisma.staffingRequest.findUnique({
        where: { id: internalId },
        select: { status: true },
      }),
      this.prisma.projectAssignment.findMany({
        where: { staffingRequestId: internalId },
        select: { status: true },
      }),
    ]);

    const summary = emptySummary();
    for (const assignment of assignments) {
      summary.totalAssignments += 1;
      switch (assignment.status) {
        case 'CREATED':
          summary.created += 1;
          break;
        case 'PROPOSED':
          summary.proposed += 1;
          break;
        case 'BOOKED':
          summary.booked += 1;
          break;
        case 'ONBOARDING':
          summary.onboarding += 1;
          break;
        case 'ASSIGNED':
          summary.assigned += 1;
          break;
        case 'ON_HOLD':
          summary.onHold += 1;
          break;
        case 'REJECTED':
          summary.rejected += 1;
          break;
        case 'COMPLETED':
          summary.completed += 1;
          break;
        case 'CANCELLED':
          summary.cancelled += 1;
          break;
      }
    }

    return {
      derivedStatus: classifyFromSummary(headcountRequired, summary, request?.status ?? null),
      summary,
    };
  }

  /**
   * LEAN-P1-4 — lean read path. Looks up the lean ProjectPosition row that
   * mirrors a legacy StaffingRequest and maps its `fillStatus` column to a
   * DerivedStaffingRequestStatus. No assignment-level summary is produced
   * because the lean aggregate stores status as a single column.
   *
   * Falls back to 'Open' when no ProjectPosition row exists for the SR
   * (open SRs that have not yet been backfilled by S2-6 mirror).
   */
  public async deriveProjectPositionFill(
    legacyStaffingRequestId: string,
    headcountRequired: number,
  ): Promise<{ derivedStatus: DerivedStaffingRequestStatus }> {
    const internalId = await this.resolveInternalUuid(legacyStaffingRequestId);
    if (!internalId) return { derivedStatus: 'Open' };
    const position = await this.prisma.projectPosition.findFirst({
      where: { legacyStaffingRequestId: internalId },
      select: { fillStatus: true },
    });
    if (!position) return { derivedStatus: 'Open' };
    return {
      derivedStatus: classifyFromProjectPositionFillStatus(position.fillStatus, headcountRequired),
    };
  }

  /**
   * LEAN-P1-4 — batch counterpart of deriveProjectPositionFill. Resolves
   * each input id (publicId or uuid) to its internal uuid, then issues a
   * single ProjectPosition.findMany keyed by legacyStaffingRequestId. The
   * result Map is keyed by the caller's input id (matching deriveForRequests).
   */
  public async deriveProjectPositionFills(
    requests: readonly { legacyStaffingRequestId: string; headcountRequired: number }[],
  ): Promise<Map<string, { derivedStatus: DerivedStaffingRequestStatus }>> {
    if (requests.length === 0) return new Map();

    // Resolve publicIds → uuids while keeping the caller-supplied id as the result key.
    const publicIds = requests
      .map((r) => r.legacyStaffingRequestId)
      .filter((id) => /^stf_[A-Za-z0-9]{10,}$/.test(id));
    const uuidIds = requests
      .map((r) => r.legacyStaffingRequestId)
      .filter((id) => !/^stf_[A-Za-z0-9]{10,}$/.test(id));
    const orFilters: Array<{ id?: { in: string[] }; publicId?: { in: string[] } }> = [];
    if (uuidIds.length > 0) orFilters.push({ id: { in: uuidIds } });
    if (publicIds.length > 0) orFilters.push({ publicId: { in: publicIds } });

    const srRows = orFilters.length > 0
      ? await this.prisma.staffingRequest.findMany({
          where: { OR: orFilters },
          select: { id: true, publicId: true },
        })
      : [];

    // uuid → caller-supplied input id
    const inputIdByUuid = new Map<string, string>();
    for (const row of srRows) {
      const original = publicIds.includes(row.publicId ?? '') ? row.publicId! : row.id;
      inputIdByUuid.set(row.id, original);
    }
    // uuid → headcountRequired (carried through from caller)
    const headcountByInputId = new Map(
      requests.map((r) => [r.legacyStaffingRequestId, r.headcountRequired]),
    );

    const positions = await this.prisma.projectPosition.findMany({
      where: { legacyStaffingRequestId: { in: srRows.map((r) => r.id) } },
      select: { legacyStaffingRequestId: true, fillStatus: true },
    });

    const result = new Map<string, { derivedStatus: DerivedStaffingRequestStatus }>();
    for (const position of positions) {
      if (!position.legacyStaffingRequestId) continue;
      const inputId = inputIdByUuid.get(position.legacyStaffingRequestId);
      if (!inputId) continue;
      const headcountRequired = headcountByInputId.get(inputId) ?? 1;
      result.set(inputId, {
        derivedStatus: classifyFromProjectPositionFillStatus(position.fillStatus, headcountRequired),
      });
    }
    // Default any caller-supplied id without a ProjectPosition row to 'Open'
    // so the Map shape matches deriveForRequests (entry-per-input).
    for (const req of requests) {
      if (!result.has(req.legacyStaffingRequestId)) {
        result.set(req.legacyStaffingRequestId, { derivedStatus: 'Open' });
      }
    }
    return result;
  }

  /**
   * D-95 — derive `headcountFulfilled` from the live assignment count.
   *
   * The legacy `StaffingRequest.headcountFulfilled` cached counter was a
   * monotonic `+1` per slate pick; it never decremented when an
   * assignment later cancelled or completed back to open. That drift was
   * the root cause behind BUG-SR-1 (cancelled SR rendering as `Filled`
   * because the counter said so).
   *
   * Counts ProjectAssignment rows that genuinely occupy a slot:
   *   BOOKED + ONBOARDING + ASSIGNED + ON_HOLD + COMPLETED.
   * REJECTED / CANCELLED / DRAFT / CREATED / PROPOSED don't occupy a slot
   * — those are either pre-fill states or failures.
   *
   * `headcountRequired` caps the result so a misbehaving over-fill (more
   * actives than required) still presents as fully-filled, never above.
   */
  public async recomputeHeadcountFulfilled(
    requestIdOrPublicId: string,
    headcountRequired: number,
  ): Promise<number> {
    const internalId = await this.resolveInternalUuid(requestIdOrPublicId);
    if (!internalId) return 0;
    const assignments = await this.prisma.projectAssignment.findMany({
      where: { staffingRequestId: internalId },
      select: { status: true },
    });
    const filledCount = assignments.filter((a) =>
      ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD', 'COMPLETED'].includes(a.status),
    ).length;
    const cap = headcountRequired > 0 ? headcountRequired : 1;
    return Math.min(filledCount, cap);
  }

  /**
   * D-95 — recompute + persist the cached counter on the SR row so legacy
   * consumers (workforce-planner, dashboards) reading `headcountFulfilled`
   * directly stay in sync with reality. Call this from any service that
   * mutates an assignment's status (transitions, slate picks, undo).
   */
  public async recomputeAndPersistHeadcount(
    requestIdOrPublicId: string,
  ): Promise<{ headcountFulfilled: number; headcountRequired: number } | null> {
    const internalId = await this.resolveInternalUuid(requestIdOrPublicId);
    if (!internalId) return null;
    const row = await this.prisma.staffingRequest.findUnique({
      where: { id: internalId },
      select: { headcountRequired: true },
    });
    if (!row) return null;
    const headcountFulfilled = await this.recomputeHeadcountFulfilled(
      internalId,
      row.headcountRequired,
    );
    await this.prisma.staffingRequest.update({
      where: { id: internalId },
      data: { headcountFulfilled },
    });
    return { headcountFulfilled, headcountRequired: row.headcountRequired };
  }

  public async deriveForRequests(
    requestIds: readonly string[],
  ): Promise<Map<string, DerivedStaffingRequestResult>> {
    if (requestIds.length === 0) {
      return new Map();
    }

    // BUG-SR-1 round 2 — callers pass response-shape ids which can be
    // either a publicId (`stf_…`) or a uuid. Fetch via OR so both work,
    // then key the result Map by the same id the caller provided.
    const publicIds = requestIds.filter((id) => /^stf_[A-Za-z0-9]{10,}$/.test(id));
    const uuidIds = requestIds.filter((id) => !/^stf_[A-Za-z0-9]{10,}$/.test(id));
    const orFilters: Array<{ id?: { in: string[] }; publicId?: { in: string[] } }> = [];
    if (uuidIds.length > 0) orFilters.push({ id: { in: uuidIds } });
    if (publicIds.length > 0) orFilters.push({ publicId: { in: publicIds } });

    const requests = await this.prisma.staffingRequest.findMany({
      where: orFilters.length > 0 ? { OR: orFilters } : { id: { in: [...requestIds] } },
      // Project publicId so we can re-key the result back to the caller's input.
      select: { id: true, publicId: true, headcountRequired: true, status: true },
    });

    // uuid → original input id (which may be publicId OR uuid).
    const inputIdByUuid = new Map<string, string>();
    for (const r of requests) {
      const original = publicIds.includes(r.publicId ?? '') ? r.publicId! : r.id;
      inputIdByUuid.set(r.id, original);
    }

    const assignments = await this.prisma.projectAssignment.findMany({
      where: { staffingRequestId: { in: requests.map((r) => r.id) } },
      select: { staffingRequestId: true, status: true },
    });

    const summaryByRequest = new Map<string, DerivedStaffingRequestSummary>();
    for (const request of requests) {
      const inputId = inputIdByUuid.get(request.id) ?? request.id;
      summaryByRequest.set(inputId, emptySummary());
    }

    for (const assignment of assignments) {
      if (!assignment.staffingRequestId) continue;
      const inputId = inputIdByUuid.get(assignment.staffingRequestId);
      if (!inputId) continue;
      const summary = summaryByRequest.get(inputId);
      if (!summary) continue;
      summary.totalAssignments += 1;
      const key = (() => {
        switch (assignment.status) {
          case 'CREATED':
            return 'created' as const;
          case 'PROPOSED':
            return 'proposed' as const;
          case 'BOOKED':
            return 'booked' as const;
          case 'ONBOARDING':
            return 'onboarding' as const;
          case 'ASSIGNED':
            return 'assigned' as const;
          case 'ON_HOLD':
            return 'onHold' as const;
          case 'REJECTED':
            return 'rejected' as const;
          case 'COMPLETED':
            return 'completed' as const;
          case 'CANCELLED':
            return 'cancelled' as const;
          default:
            return null;
        }
      })();
      if (key) summary[key] += 1;
    }

    const result = new Map<string, DerivedStaffingRequestResult>();
    for (const request of requests) {
      const inputId = inputIdByUuid.get(request.id) ?? request.id;
      const summary = summaryByRequest.get(inputId) ?? emptySummary();
      result.set(inputId, {
        derivedStatus: classifyFromSummary(request.headcountRequired ?? 1, summary, request.status),
        summary,
      });
    }
    return result;
  }
}
