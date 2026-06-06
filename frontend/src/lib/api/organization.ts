import { httpPost } from './http-client';

export interface BulkReassignOrgMembershipRequest {
  personIds: string[];
  toOrgUnitId: string;
  effectiveFrom: string;
  reason?: string;
}

export interface BulkReassignOrgMembershipResponse {
  movedPersonIds: string[];
  skippedPersonIds: string[];
  newMembershipIds: string[];
}

/** LEAN-P4-missing-4 — HR bulk org-structure reassignment. */
export async function bulkReassignOrgMembership(
  request: BulkReassignOrgMembershipRequest,
): Promise<BulkReassignOrgMembershipResponse> {
  return httpPost<BulkReassignOrgMembershipResponse, BulkReassignOrgMembershipRequest>(
    '/org/bulk-reassign-membership',
    request,
  );
}
