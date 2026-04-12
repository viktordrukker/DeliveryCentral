import { bankScaleDataset, bankScaleDatasetSummary } from '../../prisma/seeds/bank-scale-profile';

describe('bank-scale performance profile', () => {
  it('builds a deterministic 10k+ staffing dataset', () => {
    expect(bankScaleDatasetSummary.counts.people).toBeGreaterThanOrEqual(10000);
    expect(bankScaleDatasetSummary.counts.projects).toBeGreaterThanOrEqual(1500);
    expect(bankScaleDatasetSummary.counts.assignments).toBeGreaterThanOrEqual(24000);
    expect(bankScaleDatasetSummary.counts.workEvidence).toBeGreaterThanOrEqual(30000);
    expect(bankScaleDatasetSummary.counts.resourcePools).toBeGreaterThanOrEqual(90);

    expect(bankScaleDataset.people).toHaveLength(bankScaleDatasetSummary.counts.people);
    expect(bankScaleDataset.projects).toHaveLength(bankScaleDatasetSummary.counts.projects);
    expect(bankScaleDataset.assignments).toHaveLength(bankScaleDatasetSummary.counts.assignments);
    expect(bankScaleDataset.workEvidence).toHaveLength(bankScaleDatasetSummary.counts.workEvidence);
  });

  it('keeps representative references stable for smoke runs', () => {
    const refs = bankScaleDatasetSummary.benchmarkReferences;

    expect(bankScaleDataset.people.some((person) => person.id === refs.employeePersonId)).toBe(true);
    expect(bankScaleDataset.people.some((person) => person.id === refs.projectManagerPersonId)).toBe(true);
    expect(bankScaleDataset.people.some((person) => person.id === refs.hrDashboardPersonId)).toBe(true);
    expect(bankScaleDataset.projects.some((project) => project.id === refs.projectId)).toBe(true);
    expect(bankScaleDataset.projects.some((project) => project.id === refs.exceptionProjectId)).toBe(
      true,
    );
    expect(bankScaleDataset.resourcePools.some((team) => team.id === refs.teamId)).toBe(true);
  });

  it('includes explicit anomaly coverage for exception and dashboard smoke checks', () => {
    const closedProjects = new Set(
      bankScaleDataset.projects.filter((project) => project.status === 'CLOSED').map((project) => project.id),
    );

    const closureConflictAssignments = bankScaleDataset.assignments.filter(
      (assignment) => assignment.status === 'ACTIVE' && closedProjects.has(assignment.projectId),
    );
    const orphanEvidence = bankScaleDataset.workEvidence.filter((evidence) => {
      return !bankScaleDataset.assignments.some(
        (assignment) =>
          assignment.personId === evidence.personId && assignment.projectId === evidence.projectId,
      );
    });
    const staleApprovalCandidates = bankScaleDataset.assignments.filter(
      (assignment) =>
        assignment.status === 'REQUESTED' &&
        assignment.requestedAt <= new Date('2026-03-01T00:00:00.000Z'),
    );

    expect(closureConflictAssignments.length).toBeGreaterThan(0);
    expect(orphanEvidence.length).toBeGreaterThan(0);
    expect(staleApprovalCandidates.length).toBeGreaterThan(0);
  });
});
