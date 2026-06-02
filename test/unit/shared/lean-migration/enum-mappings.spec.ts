import {
  AssignmentStatus,
  ProjectPositionCandidateDecision,
  ProjectPositionFillStatus,
  StaffingRequestProposalCandidateDecision,
  StaffingRequestStatus,
} from '@prisma/client';

import {
  UnknownLegacyEnumValueError,
  mapAssignmentStatusToFillStatus,
  mapCandidateDecisionLegacyToLean,
  mapStaffingRequestStatusToFillStatus,
} from '@src/shared/lean-migration/enum-mappings';

describe('lean-migration / enum-mappings', () => {
  describe('mapAssignmentStatusToFillStatus', () => {
    it('returns a defined fill status for every AssignmentStatus value', () => {
      const allValues = Object.values(AssignmentStatus);
      // Guard: the Prisma enum must not be empty (catches stale build).
      expect(allValues.length).toBeGreaterThan(0);

      const fillStatuses = new Set(Object.values(ProjectPositionFillStatus));
      for (const value of allValues) {
        const mapped = mapAssignmentStatusToFillStatus(value);
        expect(fillStatuses.has(mapped)).toBe(true);
      }
    });

    it('maps the 8 documented 1:1 / collapse cases per lean-enum-mapping.md', () => {
      // 1:1
      expect(mapAssignmentStatusToFillStatus(AssignmentStatus.DRAFT)).toBe(
        ProjectPositionFillStatus.DRAFT,
      );
      expect(mapAssignmentStatusToFillStatus(AssignmentStatus.PROPOSED)).toBe(
        ProjectPositionFillStatus.PROPOSED,
      );
      expect(mapAssignmentStatusToFillStatus(AssignmentStatus.BOOKED)).toBe(
        ProjectPositionFillStatus.BOOKED,
      );
      expect(mapAssignmentStatusToFillStatus(AssignmentStatus.ON_HOLD)).toBe(
        ProjectPositionFillStatus.ON_HOLD,
      );

      // Collapses
      expect(mapAssignmentStatusToFillStatus(AssignmentStatus.CREATED)).toBe(
        ProjectPositionFillStatus.OPEN,
      );
      expect(mapAssignmentStatusToFillStatus(AssignmentStatus.IN_REVIEW)).toBe(
        ProjectPositionFillStatus.PROPOSED,
      );
      expect(mapAssignmentStatusToFillStatus(AssignmentStatus.REJECTED)).toBe(
        ProjectPositionFillStatus.RELEASED,
      );
      expect(mapAssignmentStatusToFillStatus(AssignmentStatus.COMPLETED)).toBe(
        ProjectPositionFillStatus.RELEASED,
      );
      expect(mapAssignmentStatusToFillStatus(AssignmentStatus.CANCELLED)).toBe(
        ProjectPositionFillStatus.RELEASED,
      );
    });

    it('throws UnknownLegacyEnumValueError on an invalid value', () => {
      expect(() =>
        mapAssignmentStatusToFillStatus('NOT_A_STATUS' as AssignmentStatus),
      ).toThrow(UnknownLegacyEnumValueError);
    });
  });

  describe('mapStaffingRequestStatusToFillStatus', () => {
    it('returns a defined fill status for every StaffingRequestStatus value', () => {
      const allValues = Object.values(StaffingRequestStatus);
      expect(allValues.length).toBeGreaterThan(0);

      const fillStatuses = new Set(Object.values(ProjectPositionFillStatus));
      for (const value of allValues) {
        const mapped = mapStaffingRequestStatusToFillStatus(value);
        expect(fillStatuses.has(mapped)).toBe(true);
      }
    });

    it('maps documented cases per lean-enum-mapping.md', () => {
      // 1:1
      expect(mapStaffingRequestStatusToFillStatus(StaffingRequestStatus.DRAFT)).toBe(
        ProjectPositionFillStatus.DRAFT,
      );
      expect(mapStaffingRequestStatusToFillStatus(StaffingRequestStatus.OPEN)).toBe(
        ProjectPositionFillStatus.OPEN,
      );

      // Collapses
      expect(mapStaffingRequestStatusToFillStatus(StaffingRequestStatus.IN_REVIEW)).toBe(
        ProjectPositionFillStatus.PROPOSED,
      );
      expect(mapStaffingRequestStatusToFillStatus(StaffingRequestStatus.FULFILLED)).toBe(
        ProjectPositionFillStatus.ASSIGNED,
      );
      expect(mapStaffingRequestStatusToFillStatus(StaffingRequestStatus.CANCELLED)).toBe(
        ProjectPositionFillStatus.RELEASED,
      );
    });

    it('throws UnknownLegacyEnumValueError on an invalid value', () => {
      expect(() =>
        mapStaffingRequestStatusToFillStatus('NOPE' as StaffingRequestStatus),
      ).toThrow(UnknownLegacyEnumValueError);
    });
  });

  describe('mapCandidateDecisionLegacyToLean', () => {
    it('returns a defined lean decision for every legacy candidate decision', () => {
      const allValues = Object.values(StaffingRequestProposalCandidateDecision);
      expect(allValues.length).toBeGreaterThan(0);

      const leanDecisions = new Set(Object.values(ProjectPositionCandidateDecision));
      for (const value of allValues) {
        const mapped = mapCandidateDecisionLegacyToLean(value);
        expect(leanDecisions.has(mapped)).toBe(true);
      }
    });

    it('maps every legacy value 1:1 onto its lean equivalent', () => {
      expect(
        mapCandidateDecisionLegacyToLean(StaffingRequestProposalCandidateDecision.PENDING),
      ).toBe(ProjectPositionCandidateDecision.PENDING);
      expect(
        mapCandidateDecisionLegacyToLean(StaffingRequestProposalCandidateDecision.PICKED),
      ).toBe(ProjectPositionCandidateDecision.PICKED);
      expect(
        mapCandidateDecisionLegacyToLean(StaffingRequestProposalCandidateDecision.DECLINED),
      ).toBe(ProjectPositionCandidateDecision.DECLINED);
      expect(
        mapCandidateDecisionLegacyToLean(
          StaffingRequestProposalCandidateDecision.AUTO_DECLINED,
        ),
      ).toBe(ProjectPositionCandidateDecision.AUTO_DECLINED);
    });

    it('throws UnknownLegacyEnumValueError on an invalid value', () => {
      expect(() =>
        mapCandidateDecisionLegacyToLean(
          'MAYBE' as StaffingRequestProposalCandidateDecision,
        ),
      ).toThrow(UnknownLegacyEnumValueError);
    });
  });
});
