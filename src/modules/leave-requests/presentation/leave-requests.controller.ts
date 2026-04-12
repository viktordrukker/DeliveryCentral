import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import {
  CreateLeaveRequestDto,
  LeaveRequestDto,
  LeaveRequestsService,
} from '../application/leave-requests.service';

@ApiTags('leave-requests')
@Controller('leave-requests')
export class LeaveRequestsController {
  public constructor(private readonly service: LeaveRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a leave request' })
  @ApiCreatedResponse({ description: 'Created leave request' })
  public async create(
    @Body() body: CreateLeaveRequestDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeaveRequestDto> {
    const personId = this.resolvePersonId(req);
    return this.service.create({ ...body, personId });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get own leave requests' })
  @ApiOkResponse({ description: 'Own leave requests' })
  public async getMy(
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeaveRequestDto[]> {
    const personId = this.resolvePersonId(req);
    return this.service.findMy(personId);
  }

  @Get()
  @ApiOperation({ summary: 'List leave requests (manager/HR view)' })
  @ApiOkResponse({ description: 'Leave requests list' })
  @RequireRoles('hr_manager', 'director', 'admin')
  public async findAll(
    @Query('personId') personId?: string,
    @Query('status') status?: string,
  ): Promise<LeaveRequestDto[]> {
    return this.service.findAll(personId, status);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a leave request' })
  @ApiOkResponse({ description: 'Approved leave request' })
  @RequireRoles('hr_manager', 'director', 'admin')
  public async approve(
    @Param('id') id: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeaveRequestDto> {
    const reviewerId = this.resolvePersonId(req);
    return this.service.approve(id, reviewerId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a leave request' })
  @ApiOkResponse({ description: 'Rejected leave request' })
  @RequireRoles('hr_manager', 'director', 'admin')
  public async reject(
    @Param('id') id: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeaveRequestDto> {
    const reviewerId = this.resolvePersonId(req);
    return this.service.reject(id, reviewerId);
  }

  private resolvePersonId(req: { principal?: RequestPrincipal }): string {
    const id = req.principal?.personId ?? req.principal?.userId;
    if (!id) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    return id;
  }
}
