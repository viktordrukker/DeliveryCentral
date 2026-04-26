import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { AssignmentStatus } from '@src/modules/assignments/domain/value-objects/assignment-status';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceLink } from '@src/modules/work-evidence/domain/entities/work-evidence-link.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';

describe('work evidence domain invariants', () => {
  it('stores actual work independently from assignment state', () => {
    const assignment = ProjectAssignment.create(
      {
        allocationPercent: AllocationPercent.from(40),
        personId: 'person-1',
        projectId: 'project-1',
        requestedAt: new Date('2025-01-01T00:00:00.000Z'),
        staffingRole: 'Consultant',
        status: AssignmentStatus.booked(),
        validFrom: new Date('2025-02-01T00:00:00.000Z'),
      },
      AssignmentId.from('assignment-1'),
    );
    const evidence = WorkEvidence.create({
      details: { taskCategory: 'analysis' },
      durationMinutes: 180,
      evidenceType: 'TIMESHEET_ENTRY',
      occurredOn: new Date('2025-03-10T00:00:00.000Z'),
      personId: 'person-2',
      projectId: 'project-1',
      recordedAt: new Date('2025-03-11T00:00:00.000Z'),
      source: WorkEvidenceSource.create(
        {
          displayName: 'Internal Timesheet',
          provider: 'INTERNAL',
          sourceType: 'TIMESHEET',
        },
        'source-1',
      ),
      sourceRecordKey: 'TS-ENTRY-1',
      trace: { importedBy: 'qa-suite' },
    });

    evidence.addLink(
      WorkEvidenceLink.create({
        externalKey: 'trace-1',
        externalUrl: 'https://timesheets.example.com/entries/trace-1',
        linkType: 'TIMESHEET_ENTRY',
        provider: 'INTERNAL',
      }, 'link-1'),
    );

    expect(evidence.personId).toBe('person-2');
    expect(evidence.projectId).toBe('project-1');
    expect(evidence.links).toHaveLength(1);
    expect(assignment.personId).toBe('person-1');
    expect(assignment.status.value).toBe('APPROVED');
  });

  it('preserves explicit source identity and traceability', () => {
    const source = WorkEvidenceSource.create(
      {
        connectionKey: 'jira-cloud-primary',
        displayName: 'Jira Cloud Worklogs',
        provider: 'JIRA',
        sourceType: 'WORKLOG',
      },
      'source-2',
    );
    const evidence = WorkEvidence.create({
      evidenceType: 'JIRA_WORKLOG',
      personId: 'person-3',
      projectId: 'project-2',
      recordedAt: new Date('2025-03-12T00:00:00.000Z'),
      source,
      sourceRecordKey: 'ATLAS-42-WL-1',
      trace: { issueKey: 'ATLAS-42', providerEnvironment: 'cloud' },
    });

    expect(evidence.source.provider).toBe('JIRA');
    expect(evidence.source.sourceType).toBe('WORKLOG');
    expect(evidence.sourceRecordKey).toBe('ATLAS-42-WL-1');
    expect(evidence.trace).toEqual({ issueKey: 'ATLAS-42', providerEnvironment: 'cloud' });
  });
});
