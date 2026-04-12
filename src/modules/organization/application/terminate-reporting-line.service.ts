import { Injectable } from '@nestjs/common';

import { ReportingLine } from '../domain/entities/reporting-line.entity';
import { ReportingLineRepositoryPort } from '../domain/repositories/reporting-line-repository.port';

interface TerminateReportingLineCommand {
  endDate: string;
  reportingLineId: string;
}

@Injectable()
export class TerminateReportingLineService {
  public constructor(private readonly repository: ReportingLineRepositoryPort) {}

  public async execute(command: TerminateReportingLineCommand): Promise<ReportingLine> {
    const reportingLine = await this.repository.findById(command.reportingLineId);

    if (!reportingLine) {
      throw new Error('Reporting line not found.');
    }

    const endDate = new Date(command.endDate);
    if (Number.isNaN(endDate.getTime())) {
      throw new Error('End date is invalid.');
    }

    reportingLine.endOn(endDate);
    await this.repository.save(reportingLine);

    return reportingLine;
  }
}
