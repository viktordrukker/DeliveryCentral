import { Injectable, Logger } from '@nestjs/common';

import { HrisAdapterPort } from './hris-adapter.port';

export interface HrisSyncResult {
  adapter: string;
  created: number;
  updated: number;
  errors: string[];
  syncedAt: string;
}

export interface HrisConfig {
  activeAdapter: 'bamboohr' | 'workday' | 'none';
  bamboohr: { apiKey: string; subdomain: string };
  workday: { tenantUrl: string; clientId: string; clientSecret: string };
  fieldMapping: Record<string, string>;
}

@Injectable()
export class HrisSyncService {
  private readonly logger = new Logger(HrisSyncService.name);
  private config: HrisConfig = {
    activeAdapter: 'none',
    bamboohr: { apiKey: '', subdomain: '' },
    workday: { tenantUrl: '', clientId: '', clientSecret: '' },
    fieldMapping: {
      givenName: 'givenName',
      familyName: 'familyName',
      primaryEmail: 'primaryEmail',
      jobTitle: 'role',
      departmentName: 'department',
    },
  };
  private adapter: HrisAdapterPort | null = null;

  public getConfig(): HrisConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<HrisConfig>): HrisConfig {
    this.config = { ...this.config, ...partial };
    this.adapter = null; // reset adapter on config change
    return this.getConfig();
  }

  public async runSync(): Promise<HrisSyncResult> {
    const result: HrisSyncResult = {
      adapter: this.config.activeAdapter,
      created: 0,
      updated: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    if (this.config.activeAdapter === 'none') {
      result.errors.push('No active HRIS adapter configured.');
      return result;
    }

    const adapter = await this.resolveAdapter();
    if (!adapter) {
      result.errors.push('Could not resolve HRIS adapter.');
      return result;
    }

    try {
      const employees = await adapter.listEmployees();
      this.logger.log(`HRIS sync: fetched ${employees.length} employees from ${adapter.adapterName}.`);
      // In a real implementation we would upsert into the person table here.
      result.updated = employees.length;
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : 'Sync failed.');
    }

    return result;
  }

  private async resolveAdapter(): Promise<HrisAdapterPort | null> {
    if (this.adapter) return this.adapter;

    if (this.config.activeAdapter === 'bamboohr') {
      const { BambooHrAdapter } = await import('../infrastructure/adapters/bamboohr.adapter');
      this.adapter = new BambooHrAdapter(
        this.config.bamboohr.apiKey,
        this.config.bamboohr.subdomain,
      );
    } else if (this.config.activeAdapter === 'workday') {
      const { WorkdayAdapter } = await import('../infrastructure/adapters/workday.adapter');
      this.adapter = new WorkdayAdapter(
        this.config.workday.tenantUrl,
        this.config.workday.clientId,
        this.config.workday.clientSecret,
      );
    }

    return this.adapter;
  }
}
