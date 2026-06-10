import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { SetRolePresetOverrideRequestDto } from '@src/modules/admin/application/contracts/set-role-preset-override.request';
import {
  CreateReportTemplateRequestDto,
  ReportFilterDto,
} from '@src/modules/reports/application/contracts/create-report-template.request';
import { UpdateHrisConfigRequestDto } from '@src/modules/integrations/hris/application/contracts/update-hris-config.request';

/**
 * F-19 / 20c-09 — assert each DTO accepts the canonical payload
 * shape and rejects the obvious malformed ones.
 */
describe('F-19 / 20c-09 — typed DTOs for previously inline @Body() type aliases', () => {
  it('SetRolePresetOverrideRequestDto accepts a role list', async () => {
    const dto = plainToInstance(SetRolePresetOverrideRequestDto, {
      roles: ['admin', 'project_manager'],
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('SetRolePresetOverrideRequestDto accepts null roles (clear override)', async () => {
    const dto = plainToInstance(SetRolePresetOverrideRequestDto, { roles: null });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('SetRolePresetOverrideRequestDto rejects empty array', async () => {
    const dto = plainToInstance(SetRolePresetOverrideRequestDto, { roles: [] });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('CreateReportTemplateRequestDto accepts a full template payload', async () => {
    const dto = plainToInstance(CreateReportTemplateRequestDto, {
      name: 'Quarterly utilisation',
      ownerPersonId: '00000000-0000-0000-0000-000000000003',
      dataSource: 'timesheets',
      selectedColumns: ['personId', 'allocationPercent'],
      filters: [{ field: 'status', operator: 'eq', value: 'APPROVED' }],
      isShared: true,
    });
    expect(await validate(dto, { whitelist: false })).toHaveLength(0);
  });

  it('CreateReportTemplateRequestDto rejects an unknown dataSource', async () => {
    const dto = plainToInstance(CreateReportTemplateRequestDto, {
      name: 'X',
      ownerPersonId: '00000000-0000-0000-0000-000000000003',
      dataSource: 'unknown_source',
      selectedColumns: ['c'],
      isShared: false,
    });
    const errors = await validate(dto);
    const props = errors.map((e) => e.property);
    expect(props).toContain('dataSource');
  });

  it('ReportFilterDto rejects an unknown operator', async () => {
    const dto = plainToInstance(ReportFilterDto, {
      field: 'status',
      operator: 'matches',
      value: 'X',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'operator')).toBe(true);
  });

  it('UpdateHrisConfigRequestDto accepts a partial subset', async () => {
    const dto = plainToInstance(UpdateHrisConfigRequestDto, {
      activeAdapter: 'bamboohr',
      bamboohr: { apiKey: 'k' },
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('UpdateHrisConfigRequestDto rejects an unknown activeAdapter', async () => {
    const dto = plainToInstance(UpdateHrisConfigRequestDto, {
      activeAdapter: 'sap',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'activeAdapter')).toBe(true);
  });
});
