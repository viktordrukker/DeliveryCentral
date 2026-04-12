import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

import { ReportingLine } from '../domain/entities/reporting-line.entity';
import { PersonRepositoryPort } from '../domain/repositories/person-repository.port';
import { ReportingLineRepositoryPort } from '../domain/repositories/reporting-line-repository.port';
import { EffectiveDateRange } from '../domain/value-objects/effective-date-range';
import { PersonId } from '../domain/value-objects/person-id';
import { ReportingLineType } from '../domain/value-objects/reporting-line-type';

interface AssignLineManagerCommand {
  endDate?: string;
  managerId: string;
  personId: string;
  startDate: string;
  type: 'SOLID';
}

@Injectable()
export class AssignLineManagerService {
  public constructor(
    private readonly personRepository: PersonRepositoryPort,
    private readonly reportingLineRepository: ReportingLineRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(command: AssignLineManagerCommand): Promise<ReportingLine> {
    const startDate = new Date(command.startDate);
    const endDate = command.endDate ? new Date(command.endDate) : undefined;

    if (Number.isNaN(startDate.getTime())) {
      throw new Error('Reporting line start date is invalid.');
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new Error('Reporting line end date is invalid.');
    }

    const effectiveDateRange = EffectiveDateRange.create(startDate, endDate);
    const subjectId = PersonId.from(command.personId);
    const managerId = PersonId.from(command.managerId);

    const subject = await this.personRepository.findByPersonId(subjectId);
    if (!subject) {
      throw new Error('Employee does not exist.');
    }

    const manager = await this.personRepository.findByPersonId(managerId);
    if (!manager) {
      throw new Error('Manager does not exist.');
    }

    const existingSolidLines = await this.reportingLineRepository.findBySubject(subjectId, [
      ReportingLineType.solidLine(),
    ]);

    const overlappingSolidLines = existingSolidLines.filter((line) =>
      this.rangesOverlap(
        line.effectiveDateRange.startsAt,
        line.effectiveDateRange.endsAt,
        effectiveDateRange.startsAt,
        effectiveDateRange.endsAt,
      ),
    );

    const predecessorLine = overlappingSolidLines.find(
      (line) =>
        line.effectiveDateRange.startsAt < effectiveDateRange.startsAt &&
        (!line.effectiveDateRange.endsAt ||
          line.effectiveDateRange.endsAt >= effectiveDateRange.startsAt),
    );
    const nonAdjustableOverlapExists = overlappingSolidLines.some(
      (line) => !predecessorLine || line.id !== predecessorLine.id,
    );

    if (nonAdjustableOverlapExists) {
      throw new Error('Overlapping solid-line manager assignment already exists.');
    }

    if (predecessorLine) {
      const adjustedEndDate = new Date(effectiveDateRange.startsAt.getTime() - 1);
      predecessorLine.endOn(adjustedEndDate);
      await this.reportingLineRepository.save(predecessorLine);
    }

    const reportingLine = ReportingLine.create({
      authority: 'APPROVER',
      effectiveDateRange,
      isPrimary: true,
      managerId,
      subjectId,
      type: ReportingLineType.solidLine(),
    });

    await this.reportingLineRepository.save(reportingLine);
    this.auditLogger?.record({
      actionType: 'reporting_line.changed',
      actorId: command.managerId,
      category: 'organization',
      changeSummary: `Solid-line manager changed for ${command.personId} to ${command.managerId}.`,
      details: {
        endDate: command.endDate,
        managerId: command.managerId,
        personId: command.personId,
        startDate: command.startDate,
        type: command.type,
      },
      metadata: {
        endDate: command.endDate,
        managerId: command.managerId,
        personId: command.personId,
        startDate: command.startDate,
        type: command.type,
      },
      targetEntityId: command.personId,
      targetEntityType: 'REPORTING_LINE',
    });

    return reportingLine;
  }

  private rangesOverlap(
    leftStart: Date,
    leftEnd: Date | undefined,
    rightStart: Date,
    rightEnd: Date | undefined,
  ): boolean {
    const normalizedLeftEnd = leftEnd ?? new Date('9999-12-31T23:59:59.999Z');
    const normalizedRightEnd = rightEnd ?? new Date('9999-12-31T23:59:59.999Z');

    return leftStart <= normalizedRightEnd && rightStart <= normalizedLeftEnd;
  }
}
