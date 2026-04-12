import { Injectable, Logger } from '@nestjs/common';

import { HrisAdapterPort, HrisEmployee, HrisTerminationPayload } from '../../application/hris-adapter.port';

@Injectable()
export class BambooHrAdapter implements HrisAdapterPort {
  public readonly adapterName = 'bamboohr';
  private readonly logger = new Logger(BambooHrAdapter.name);

  public constructor(
    private readonly apiKey: string = '',
    private readonly subdomain: string = '',
  ) {}

  public async listEmployees(): Promise<HrisEmployee[]> {
    if (!this.apiKey || !this.subdomain) {
      this.logger.warn('BambooHR adapter not configured — returning empty employee list.');
      return [];
    }
    // Real implementation would call:
    // GET https://api.bamboohr.com/api/gateway.php/{subdomain}/v1/employees/directory
    this.logger.log('BambooHR listEmployees called (stub).');
    return [];
  }

  public async getEmployee(externalId: string): Promise<HrisEmployee | null> {
    if (!this.apiKey || !this.subdomain) return null;
    this.logger.log(`BambooHR getEmployee ${externalId} called (stub).`);
    return null;
  }

  public async pushTermination(payload: HrisTerminationPayload): Promise<void> {
    if (!this.apiKey || !this.subdomain) {
      this.logger.warn('BambooHR adapter not configured — termination not pushed.');
      return;
    }
    // Real implementation would POST to BambooHR termination endpoint
    this.logger.log(`BambooHR pushTermination for person ${payload.personId} called (stub).`);
  }
}
