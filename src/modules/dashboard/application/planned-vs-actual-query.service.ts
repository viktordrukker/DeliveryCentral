import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

interface PlannedVsActualQuery {
  asOf?: string;
  personId?: string;
  projectId?: string;
}

interface PersonSummary {
  displayName: string;
  id: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  projectCode: string;
}

@Injectable()
export class PlannedVsActualQueryService {
  private readonly prisma = new PrismaClient();

  public async execute(query: PlannedVsActualQuery) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Planned vs actual asOf is invalid.');
    }

    // Fetch assignments from DB with person + project names
    const assignmentWhere: Record<string, unknown> = {
      validFrom: { lte: asOf },
    };
    if (query.projectId) assignmentWhere.projectId = query.projectId;
    if (query.personId) assignmentWhere.personId = query.personId;

    const dbAssignments = await this.prisma.projectAssignment.findMany({
      where: assignmentWhere,
      select: {
        id: true,
        personId: true,
        projectId: true,
        staffingRole: true,
        status: true,
        allocationPercent: true,
        validFrom: true,
        validTo: true,
        person: { select: { id: true, displayName: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    // Fetch work evidence from DB with person + project names
    const evidenceWhere: Record<string, unknown> = {
      recordedAt: { lte: asOf },
    };
    if (query.projectId) evidenceWhere.projectId = query.projectId;
    if (query.personId) evidenceWhere.personId = query.personId;

    const dbEvidence = await this.prisma.workEvidence.findMany({
      where: evidenceWhere,
      select: {
        id: true,
        personId: true,
        projectId: true,
        evidenceType: true,
        durationMinutes: true,
        recordedAt: true,
        occurredOn: true,
        person: { select: { id: true, displayName: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    const approvedOrActive = dbAssignments.filter(
      (a) => a.status === 'APPROVED' || a.status === 'ACTIVE',
    );

    // Matched: evidence that has a matching approved/active assignment
    const matchedRecords = dbEvidence
      .map((ev) => {
        const assignment = approvedOrActive.find(
          (a) => a.personId === ev.personId && a.projectId === ev.projectId,
        );
        if (!assignment) return null;
        return {
          allocationPercent: Number(assignment.allocationPercent ?? 0),
          assignmentId: assignment.id,
          effortHours: Number(((ev.durationMinutes ?? 0) / 60).toFixed(2)),
          person: this.toPersonSummary(ev.person, ev.personId),
          project: this.toProjectSummary(ev.project, ev.projectId),
          staffingRole: assignment.staffingRole,
          workEvidenceId: ev.id,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Assigned but no evidence
    const assignedButNoEvidence = approvedOrActive
      .filter(
        (a) =>
          !dbEvidence.some(
            (ev) => ev.personId === a.personId && ev.projectId === a.projectId,
          ),
      )
      .map((a) => ({
        allocationPercent: Number(a.allocationPercent ?? 0),
        assignmentId: a.id,
        person: this.toPersonSummary(a.person, a.personId),
        project: this.toProjectSummary(a.project, a.projectId),
        staffingRole: a.staffingRole,
      }));

    // Evidence without approved assignment
    const evidenceButNoApprovedAssignment = dbEvidence
      .filter(
        (ev) =>
          !approvedOrActive.some(
            (a) => a.personId === ev.personId && a.projectId === ev.projectId,
          ),
      )
      .map((ev) => ({
        activityDate: (ev.occurredOn ?? ev.recordedAt).toISOString(),
        effortHours: Number(((ev.durationMinutes ?? 0) / 60).toFixed(2)),
        person: this.toPersonSummary(ev.person, ev.personId),
        project: this.toProjectSummary(ev.project, ev.projectId),
        sourceType: ev.evidenceType,
        workEvidenceId: ev.id,
      }));

    // Anomalies: evidence after assignment end, evidence without assignment
    const anomalies = [
      ...dbEvidence
        .filter((ev) => {
          const assignment = dbAssignments.find(
            (a) => a.personId === ev.personId && a.projectId === ev.projectId,
          );
          return Boolean(assignment && assignment.validTo && ev.recordedAt > assignment.validTo);
        })
        .map((ev) => ({
          message: 'Observed work exists after the assignment end date.',
          person: this.toPersonSummary(ev.person, ev.personId),
          project: this.toProjectSummary(ev.project, ev.projectId),
          type: 'EVIDENCE_AFTER_ASSIGNMENT_END',
        })),
      ...evidenceButNoApprovedAssignment.map((item) => ({
        message: 'Observed work exists without an approved assignment match.',
        person: item.person,
        project: item.project,
        type: 'EVIDENCE_WITHOUT_APPROVED_ASSIGNMENT',
      })),
    ];

    return {
      anomalies,
      asOf: asOf.toISOString(),
      assignedButNoEvidence,
      evidenceButNoApprovedAssignment,
      matchedRecords,
    };
  }

  private toPersonSummary(
    person: { id: string; displayName: string } | null,
    fallbackId: string | null,
  ): PersonSummary {
    if (person) {
      return { displayName: person.displayName, id: person.id };
    }
    return { displayName: fallbackId ?? 'Unknown', id: fallbackId ?? '' };
  }

  private toProjectSummary(
    project: { id: string; name: string; projectCode: string } | null,
    fallbackId: string | null,
  ): ProjectSummary {
    if (project) {
      return { id: project.id, name: project.name, projectCode: project.projectCode };
    }
    return { id: fallbackId ?? '', name: fallbackId ?? 'Unknown', projectCode: 'UNKNOWN' };
  }
}
