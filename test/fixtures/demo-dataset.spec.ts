import {
  demoAssignments,
  demoPeople,
  demoProjects,
  demoReportingLines,
  demoResourcePools,
  demoWorkEvidence,
  demoOrgUnits,
} from '../../prisma/seeds/demo-dataset';

describe('Demo dataset', () => {
  it('covers the required organization and staffing scenarios', () => {
    const directorates = demoOrgUnits.filter((item) => item.kind === 'DIRECTORATE');
    const departments = demoOrgUnits.filter((item) => item.kind === 'DEPARTMENT');
    const peopleWithoutAssignments = demoPeople.filter(
      (person) => !demoAssignments.some((assignment) => assignment.personId === person.id),
    );
    const projectsWithoutAssignments = demoProjects.filter(
      (project) => !demoAssignments.some((assignment) => assignment.projectId === project.id),
    );
    const dottedLineReports = demoReportingLines.filter(
      (line) => line.relationshipType === 'DOTTED_LINE',
    );
    const unassignedEvidence = demoWorkEvidence.filter(
      (evidence) =>
        evidence.personId &&
        !demoAssignments.some(
          (assignment) =>
            assignment.personId === evidence.personId &&
            assignment.projectId === evidence.projectId &&
            assignment.status === 'APPROVED',
        ),
    );
    const approvedWithoutEvidence = demoAssignments.filter(
      (assignment) =>
        assignment.status === 'APPROVED' &&
        !demoWorkEvidence.some(
          (evidence) =>
            evidence.personId === assignment.personId &&
            evidence.projectId === assignment.projectId,
        ),
    );

    expect(directorates).toHaveLength(2);
    expect(departments).toHaveLength(4);
    expect(demoResourcePools).toHaveLength(2);
    expect(demoPeople.length).toBeGreaterThanOrEqual(12);
    expect(demoProjects.length).toBeGreaterThanOrEqual(6);
    expect(peopleWithoutAssignments.length).toBeGreaterThanOrEqual(1);
    expect(projectsWithoutAssignments.length).toBeGreaterThanOrEqual(1);
    expect(dottedLineReports.length).toBeGreaterThanOrEqual(1);
    expect(unassignedEvidence.length).toBeGreaterThanOrEqual(1);
    expect(approvedWithoutEvidence.length).toBeGreaterThanOrEqual(1);
  });
});
