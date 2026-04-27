import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { OvertimePolicyService } from '../application/overtime-policy.service';
import { OvertimeResolverService } from '../application/overtime-resolver.service';
import { OvertimeSummaryService } from '../application/overtime-summary.service';
import {
  CreateOvertimePolicyDto,
  OvertimePolicyDto,
  OvertimeSummaryResponseDto,
  ResolvedOvertimePolicyDto,
} from '../application/contracts/overtime.dto';

@ApiTags('overtime')
@Controller('overtime')
export class OvertimeController {
  public constructor(
    private readonly policyService: OvertimePolicyService,
    private readonly resolverService: OvertimeResolverService,
    private readonly summaryService: OvertimeSummaryService,
  ) {}

  @Get('policy')
  @RequireRoles('resource_manager', 'delivery_manager', 'hr_manager', 'admin')
  @ApiOperation({ summary: 'List active overtime policies' })
  @ApiOkResponse({ type: [OvertimePolicyDto] })
  public async listPolicies(): Promise<OvertimePolicyDto[]> {
    return this.policyService.list();
  }

  @Post('policy')
  @RequireRoles('resource_manager', 'delivery_manager')
  @ApiOperation({ summary: 'Create or update overtime policy for a department or resource pool' })
  @ApiOkResponse({ type: OvertimePolicyDto })
  public async createPolicy(
    @Body() dto: CreateOvertimePolicyDto,
    @Req() req: { principal?: { personId?: string; userId?: string } },
  ): Promise<OvertimePolicyDto> {
    const actorId = req.principal?.personId ?? req.principal?.userId;
    if (!actorId) throw new BadRequestException('Actor identity required.');
    return this.policyService.create(dto, actorId);
  }

  @Delete('policy/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRoles('resource_manager', 'delivery_manager', 'admin')
  @ApiOperation({ summary: 'Retire an overtime policy' })
  public async removePolicy(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.policyService.remove(id);
  }

  @Get('resolve/:personId')
  @RequireRoles('employee', 'resource_manager', 'delivery_manager', 'project_manager', 'hr_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get effective overtime policy for a person' })
  @ApiOkResponse({ type: ResolvedOvertimePolicyDto })
  public async resolve(@Param('personId') personId: string): Promise<ResolvedOvertimePolicyDto> {
    const policy = await this.resolverService.resolve(personId, new Date());
    return policy;
  }

  @Get('summary')
  @RequireRoles('resource_manager', 'delivery_manager', 'hr_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get overtime summary for dashboards' })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: OvertimeSummaryResponseDto })
  public async getSummary(
    @Query('weeks') weeks?: string,
    @Query('asOf') asOf?: string,
  ): Promise<OvertimeSummaryResponseDto> {
    return this.summaryService.execute({
      weeks: weeks ? parseInt(weeks, 10) : undefined,
      asOf,
    });
  }
}
