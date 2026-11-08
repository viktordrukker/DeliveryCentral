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
  Query,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestPrincipal } from '../application/request-principal';
import { RequireRoles } from '../application/roles.decorator';
import type {
  BuiltInRoleDescriptor,
  CustomRoleDto,
} from '../application/custom-role.service';
import { CustomRoleService } from '../application/custom-role.service';
import {
  CreateCustomRoleBodyDto,
  UpdateCustomRoleBodyDto,
} from '../application/contracts/custom-role.dto';
import type { PlatformRole } from '../domain/platform-role';

/**
 * NEW-LGL-3 — admin CRUD surface for tenant-defined custom roles.
 *
 * Mounted under `/api/admin/custom-roles`. Every endpoint gated by the
 * `admin` role. The service layer rejects modify/delete attempts on
 * built-in PlatformRole keys; only custom (user-created) rows are
 * mutable through this surface. Person↔role assignments live in a
 * separate Phase 6 binding store; deactivate accepts an
 * `assignedCount` hint from the caller to block in-use deletion.
 */
@ApiTags('admin-custom-roles')
@Controller('admin/custom-roles')
export class CustomRoleController {
  public constructor(private readonly service: CustomRoleService) {}

  @Get('available-permissions')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List built-in platform roles available as inheritance options (admin only)' })
  @ApiOkResponse({ description: 'Array of PlatformRole identifiers' })
  public listAvailablePermissions(): PlatformRole[] {
    return this.service.listAvailablePermissions();
  }

  @Get('built-in')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List the seven built-in (locked) platform roles surfaced read-only (admin only)' })
  @ApiOkResponse({ description: 'Array of built-in role descriptors' })
  public listBuiltInRoles(): BuiltInRoleDescriptor[] {
    return this.service.listBuiltInRoles();
  }

  @Get()
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List all custom roles, including deactivated (admin only)' })
  @ApiOkResponse({ description: 'Array of custom roles' })
  public async list(): Promise<CustomRoleDto[]> {
    return this.service.list(true);
  }

  @Get(':id')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get a single custom role by id (admin only)' })
  @ApiOkResponse({ description: 'Custom role' })
  public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<CustomRoleDto> {
    return this.service.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Create a custom role (admin only)' })
  @ApiCreatedResponse({ description: 'Created custom role' })
  public async create(
    @Body() body: CreateCustomRoleBodyDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<CustomRoleDto> {
    const actorId = this.resolveActor(req);
    return this.service.create(body, actorId);
  }

  @Patch(':id')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Update a custom role (admin only — built-in roles rejected)' })
  @ApiOkResponse({ description: 'Updated custom role' })
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCustomRoleBodyDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<CustomRoleDto> {
    const actorId = this.resolveActor(req);
    return this.service.update(id, body, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'Deactivate a custom role (admin only). Pass ?assignedCount=N to block when the role is in use.',
  })
  @ApiOkResponse({ description: 'Deactivated custom role' })
  public async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('assignedCount') assignedCount: string | undefined,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<CustomRoleDto> {
    const actorId = this.resolveActor(req);
    const count = assignedCount ? Number.parseInt(assignedCount, 10) : 0;
    return this.service.deactivate(id, actorId, Number.isFinite(count) ? count : 0);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Reactivate a previously deactivated custom role (admin only)' })
  @ApiOkResponse({ description: 'Reactivated custom role' })
  public async reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<CustomRoleDto> {
    const actorId = this.resolveActor(req);
    return this.service.reactivate(id, actorId);
  }

  private resolveActor(req: { principal?: RequestPrincipal }): string {
    const id = req.principal?.personId ?? req.principal?.userId;
    if (!id) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    return id;
  }
}
