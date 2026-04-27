import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ResourcePoolDto, ResourcePoolListDto } from '../application/resource-pool.dto';
import { InMemoryResourcePoolRepository, ResourcePoolRecord } from '../infrastructure/in-memory-resource-pool.repository';

class CreateResourcePoolRequestDto {
  code!: string;
  description?: string;
  name!: string;
  orgUnitId?: string;
}

class UpdateResourcePoolRequestDto {
  description?: string;
  name?: string;
}

class AddResourcePoolMemberRequestDto {
  personId!: string;
}

@ApiTags('resource-pools')
@Controller('resource-pools')
export class ResourcePoolsController {
  public constructor(
    private readonly repository: InMemoryResourcePoolRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all resource pools' })
  @ApiOkResponse({ type: ResourcePoolListDto })
  @RequireRoles('resource_manager', 'admin', 'director', 'hr_manager')
  public async listResourcePools(): Promise<ResourcePoolListDto> {
    const pools = await this.repository.findAll();
    return { items: pools.map(this.toDto) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a resource pool by id' })
  @ApiOkResponse({ type: ResourcePoolDto })
  @ApiNotFoundResponse({ description: 'Resource pool not found.' })
  @RequireRoles('resource_manager', 'admin', 'director', 'hr_manager')
  public async getResourcePoolById(@Param('id', ParseUUIDPipe) id: string): Promise<ResourcePoolDto> {
    const pool = await this.repository.findById(id);
    if (!pool) throw new NotFoundException('Resource pool not found.');
    return this.toDto(pool);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a resource pool' })
  @ApiCreatedResponse({ type: ResourcePoolDto })
  @RequireRoles('resource_manager', 'admin')
  public async createResourcePool(@Body() request: CreateResourcePoolRequestDto): Promise<ResourcePoolDto> {
    if (!request.code?.trim() || !request.name?.trim()) {
      throw new BadRequestException('Code and name are required.');
    }
    const pool = await this.repository.create({
      code: request.code.trim(),
      description: request.description,
      name: request.name.trim(),
      orgUnitId: request.orgUnitId,
    });
    return this.toDto(pool);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a resource pool name or description' })
  @ApiOkResponse({ type: ResourcePoolDto })
  @ApiNotFoundResponse({ description: 'Resource pool not found.' })
  @RequireRoles('resource_manager', 'admin')
  public async updateResourcePool(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateResourcePoolRequestDto,
  ): Promise<ResourcePoolDto> {
    const pool = await this.repository.update(id, {
      description: request.description,
      name: request.name,
    });
    if (!pool) throw new NotFoundException('Resource pool not found.');
    return this.toDto(pool);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a person to a resource pool' })
  @ApiCreatedResponse({ type: ResourcePoolDto })
  @ApiNotFoundResponse({ description: 'Resource pool not found.' })
  @RequireRoles('resource_manager', 'admin')
  public async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: AddResourcePoolMemberRequestDto,
  ): Promise<ResourcePoolDto> {
    if (!request.personId?.trim()) {
      throw new BadRequestException('personId is required.');
    }
    const pool = await this.repository.addMember(id, request.personId.trim());
    if (!pool) throw new NotFoundException('Resource pool not found.');
    return this.toDto(pool);
  }

  @Delete(':id/members/:personId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a person from a resource pool' })
  @ApiOkResponse({ type: ResourcePoolDto })
  @ApiNotFoundResponse({ description: 'Resource pool not found.' })
  @RequireRoles('resource_manager', 'admin')
  public async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('personId') personId: string,
  ): Promise<ResourcePoolDto> {
    const pool = await this.repository.removeMember(id, personId);
    if (!pool) throw new NotFoundException('Resource pool not found.');
    return this.toDto(pool);
  }

  private toDto = (pool: ResourcePoolRecord): ResourcePoolDto => {
    return {
      code: pool.code,
      description: pool.description,
      id: pool.id,
      members: pool.members.map((m) => ({
        displayName: m.displayName,
        personId: m.personId,
        validFrom: m.validFrom,
      })),
      name: pool.name,
      orgUnitId: pool.orgUnitId,
    };
  };
}
