/**
 * LEAN-P2-2 — ProjectPosition → legacy Assignment shape mapper.
 *
 * Phase 2 of the lean migration moves the FE hooks layer off the legacy
 * `/assignments` + `/staffing-requests` endpoints onto `/project-positions`.
 * The external return shapes of the hooks (`useAssignments`,
 * `useApprovalQueue`, `useAssignmentDetails`, etc.) must stay identical so
 * the dozens of consuming components don't change.
 *
 * This file is the bridge: it accepts a `ProjectPosition` DTO from the new
 * endpoint and flattens it back into the legacy `AssignmentDirectoryItem` /
 * `AssignmentDetails` / `ProjectAssignmentResponse` shapes.
 *
 * KNOWN LOSSES — the current BE DTO at `ProjectPositionResponseDto` is a
 * subset of the underlying schema. Fields not yet exposed by the DTO are
 * filled with sensible defaults; LEAN-P2-1 (BE DTO enrichment) will fill
 * them in:
 *  - `person.displayName` / `project.displayName` (no joins exposed) → ID
 *  - `startDate` / `endDate` / SLA timestamps → empty/undefined
 *  - `approvalState` is derived from `fillStatus` via the inverse enum map
 *  - `requestedAt` falls back to the empty string
 *
 * Enum mapping for `approvalState` mirrors the canonical lean→legacy mapping
 * documented in `docs/planning/lean-enum-mapping.md`. The lossy collapse
 * (RELEASED → CANCELLED) is the most pragmatic single-value reverse — page
 * code already tolerates RELEASED-tagged history rows separately.
 */

import type {
  AssignmentDetails,
  AssignmentDirectoryItem,
  AssignmentDirectoryResponse,
  AssignmentStatusValue,
  ProjectAssignmentResponse,
} from '@/lib/api/assignments';
import type {
  ListProjectPositionsResponse,
  PositionFillStatus,
  ProjectPosition,
} from '@/lib/api/project-positions';

const FILL_TO_ASSIGNMENT_STATUS: Record<PositionFillStatus, AssignmentStatusValue> = {
  DRAFT: 'DRAFT',
  OPEN: 'CREATED',
  PROPOSED: 'PROPOSED',
  BOOKED: 'BOOKED',
  ONBOARDING: 'ONBOARDING',
  ASSIGNED: 'ASSIGNED',
  ON_HOLD: 'ON_HOLD',
  RELEASED: 'CANCELLED',
};

const ASSIGNMENT_TO_FILL_STATUS: Record<AssignmentStatusValue, PositionFillStatus> = {
  DRAFT: 'DRAFT',
  CREATED: 'OPEN',
  PROPOSED: 'PROPOSED',
  IN_REVIEW: 'PROPOSED',
  REJECTED: 'RELEASED',
  BOOKED: 'BOOKED',
  ONBOARDING: 'ONBOARDING',
  ASSIGNED: 'ASSIGNED',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'RELEASED',
  CANCELLED: 'RELEASED',
};

export function mapFillStatusToAssignmentStatus(status: PositionFillStatus): AssignmentStatusValue {
  return FILL_TO_ASSIGNMENT_STATUS[status];
}

export function mapAssignmentStatusToFillStatus(status: AssignmentStatusValue): PositionFillStatus {
  return ASSIGNMENT_TO_FILL_STATUS[status];
}

/**
 * Flatten a single `ProjectPosition` into the legacy directory shape.
 *
 * Display names default to the underlying ID when the DTO doesn't carry the
 * joined record. Consumers tolerate this — the directory page already shows
 * IDs in some fall-through paths.
 */
export function mapPositionToDirectoryItem(position: ProjectPosition): AssignmentDirectoryItem {
  const personId = position.activePersonId ?? '';
  // LEAN-P2 exit-gate: when the BE DTO exposes the position's demand window
  // (`startDate` / `endDate`) or the active fill's validity window
  // (`activeValidFrom` / `activeValidTo`), surface those onto the legacy
  // shape so callers that filter by date (e.g. LeaveDecisionDrawer overlap
  // check) keep working. Otherwise fall back to empty / null so the call
  // site can tolerate the absence.
  const startDate =
    position.activeValidFrom ?? position.startDate ?? '';
  const endDate =
    position.activeValidTo ?? position.endDate ?? null;
  // W1-10 — prefer enriched display names from the BE projection. When the
  // DTO carries `activePersonName` / `projectName` / `projectCode` (post
  // D-103 round 40), surface them instead of the raw id placeholder. Callers
  // that still need to back-fill names from /org/people/:id do so in their
  // own effect (see TeamVendorsTab).
  const personDisplayName = position.activePersonName ?? personId;
  const projectDisplayName =
    position.projectName ??
    position.projectCode ??
    position.projectId;
  return {
    id: position.id,
    allocationPercent: position.activeAllocationPercent ?? 0,
    approvalState: mapFillStatusToAssignmentStatus(position.fillStatus),
    endDate,
    person: {
      id: personId,
      displayName: personDisplayName,
    },
    project: {
      id: position.projectId,
      displayName: projectDisplayName,
    },
    staffingRole: position.role,
    startDate,
    slaStage: null,
    slaDueAt: null,
    slaBreachedAt: null,
    requiresDirectorApproval: false,
  };
}

export function mapListResponseToDirectory(
  response: ListProjectPositionsResponse,
): AssignmentDirectoryResponse {
  return {
    items: response.positions.map(mapPositionToDirectoryItem),
    totalCount: response.total,
  };
}

/**
 * Flatten a single `ProjectPosition` into the legacy detail shape. Detail-
 * only fields (`approvals`, `history`, `canApprove`, `canEnd`, `canReject`,
 * `note`, `requestedAt`) are filled with safe defaults until LEAN-P2-1
 * enriches the BE DTO.
 */
export function mapPositionToDetails(position: ProjectPosition): AssignmentDetails {
  const base = mapPositionToDirectoryItem(position);
  return {
    ...base,
    approvals: [],
    canApprove: position.fillStatus === 'PROPOSED',
    canEnd:
      position.fillStatus === 'BOOKED' ||
      position.fillStatus === 'ONBOARDING' ||
      position.fillStatus === 'ASSIGNED' ||
      position.fillStatus === 'ON_HOLD',
    canReject: position.fillStatus === 'PROPOSED',
    history: [],
    requestedAt: '',
  };
}

/**
 * Flatten a `ProjectPosition` into the legacy `ProjectAssignmentResponse`
 * envelope used by write paths. The legacy `undoActionId` is unsupported in
 * the lean transition handler — the operator can re-transition manually.
 */
export function mapPositionToAssignmentResponse(
  position: ProjectPosition,
): ProjectAssignmentResponse {
  return {
    allocationPercent: position.activeAllocationPercent ?? 0,
    id: position.id,
    personId: position.activePersonId ?? '',
    projectId: position.projectId,
    requestedAt: '',
    staffingRole: position.role,
    startDate: position.activeValidFrom ?? position.startDate ?? '',
    ...(position.activeValidTo ?? position.endDate
      ? { endDate: position.activeValidTo ?? position.endDate }
      : {}),
    status: mapFillStatusToAssignmentStatus(position.fillStatus),
    version: position.version,
  };
}
