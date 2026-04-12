import { Injectable, Logger } from '@nestjs/common';

import { HrisAdapterPort, HrisEmployee, HrisTerminationPayload } from '../../application/hris-adapter.port';

@Injectable()
export class WorkdayAdapter implements HrisAdapterPort {
  public readonly adapterName = 'workday';
  private readonly logger = new Logger(WorkdayAdapter.name);

  public constructor(
    private readonly tenantUrl: string = '',
    private readonly clientId: string = '',
    private readonly clientSecret: string = '',
  ) {}

  public async listEmployees(): Promise<HrisEmployee[]> {
    if (!this.tenantUrl || !this.clientId) {
      this.logger.warn('Workday adapter not configured — returning empty employee list.');
      return [];
    }
    // Real implementation would use Workday REST/SOAP API
    this.logger.log('Workday listEmployees called (stub).');
    return [];
  }

  public async getEmployee(externalId: string): Promise<HrisEmployee | null> {
    if (!this.tenantUrl) return null;
    this.logger.log(`Workday getEmployee ${externalId} called (stub).`);
    return null;
  }

  public async pushTermination(payload: HrisTerminationPayload): Promise<void> {
    if (!this.tenantUrl) {
      this.logger.warn('Workday adapter not configured — termination not pushed.');
      return;
    }
    this.logger.log(`Workday pushTermination for person ${payload.personId} called (stub).`);
  }
}
