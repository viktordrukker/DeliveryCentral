import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { ClientService, CreateClientDto, UpdateClientDto } from '../application/client.service';

@ApiTags('clients')
@Controller('clients')
export class ClientController {
  public constructor(private readonly clientService: ClientService) {}

  @Get()
  @ApiOperation({ summary: 'List clients' })
  @ApiOkResponse({ description: 'Client list.' })
  @RequireRoles(...STAFFING_ROLES)
  public async list(@Query('activeOnly') activeOnly?: string) {
    return this.clientService.list(activeOnly !== 'false');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  @ApiOkResponse({ description: 'Client details.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientService.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a client' })
  @ApiCreatedResponse({ description: 'Client created.' })
  @RequireRoles('admin', 'project_manager')
  public async create(@Body() dto: CreateClientDto, @Req() req: { principal?: { personId?: string } }) {
    return this.clientService.create(dto, req.principal?.personId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  @ApiOkResponse({ description: 'Client updated.' })
  @RequireRoles('admin', 'project_manager')
  public async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto, @Req() req: { principal?: { personId?: string } }) {
    return this.clientService.update(id, dto, req.principal?.personId);
  }
}
