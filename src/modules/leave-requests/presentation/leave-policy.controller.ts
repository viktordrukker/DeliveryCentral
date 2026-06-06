import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import {
  CreateLeavePolicyBodyDto,
  UpdateLeavePolicyBodyDto,
} from '../application/contracts/leave-policy.dto';
import {
  LeavePolicyDto,
  LeavePolicyService,
} from '../application/leave-policy.service';

/**
 * LEAN-P4-missing-13 — admin-only CRUD surface for LeavePolicy.
 *
 * Mounted under the global `/api` prefix → `/api/admin/leave-policies`.
 * All endpoints gated by the `admin` role; no other role can read or
 * mutate. Consumers of the effective policy list (e.g. the public
 * `/leave-requests/my-balance` endpoint) read directly from the
 * `LeavePolicyService.list()` on a per-tenant basis — that surface is
 * not exposed by this controller.
 */
@ApiTags('admin-leave-policies')
@Controller('admin/leave-policies')
export class LeavePolicyController {
  public constructor(private readonly service: LeavePolicyService) {}

  @Get()
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List all leave policies (admin only)' })
  @ApiOkResponse({ description: 'Array of leave policies' })
  public async list(): Promise<LeavePolicyDto[]> {
    return this.service.list(true);
  }

  @Get(':id')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get a single leave policy by id (admin only)' })
  @ApiOkResponse({ description: 'Leave policy' })
  public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<LeavePolicyDto> {
    return this.service.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Create a leave policy (admin only)' })
  @ApiCreatedResponse({ description: 'Created leave policy' })
  public async create(
    @Body() body: CreateLeavePolicyBodyDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeavePolicyDto> {
    const actorId = this.resolveActor(req);
    return this.service.create(body, actorId);
  }

  @Patch(':id')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Update a leave policy (admin only)' })
  @ApiOkResponse({ description: 'Updated leave policy' })
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateLeavePolicyBodyDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeavePolicyDto> {
    const actorId = this.resolveActor(req);
    return this.service.update(id, body, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Soft-delete a leave policy by flipping active=false (admin only)' })
  @ApiOkResponse({ description: 'Deactivated leave policy' })
  public async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeavePolicyDto> {
    const actorId = this.resolveActor(req);
    return this.service.softDelete(id, actorId);
  }

  private resolveActor(req: { principal?: RequestPrincipal }): string {
    const id = req.principal?.personId ?? req.principal?.userId;
    if (!id) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    return id;
  }
}
