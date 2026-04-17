import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { VendorService, CreateVendorDto, UpdateVendorDto, CreateVendorEngagementDto } from '../application/vendor.service';
import { UpdateVendorEngagementRequestDto } from '../application/contracts/update-vendor-engagement.request';

@ApiTags('vendors')
@Controller('vendors')
export class VendorController {
  public constructor(private readonly vendorService: VendorService) {}

  @Get()
  @ApiOperation({ summary: 'List vendors' })
  @ApiOkResponse({ description: 'Vendor list.' })
  @RequireRoles('admin', 'project_manager', 'resource_manager', 'delivery_manager', 'director')
  public async list(@Query('activeOnly') activeOnly?: string) {
    return this.vendorService.listVendors(activeOnly !== 'false');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiOkResponse({ description: 'Vendor details.' })
  @RequireRoles('admin', 'project_manager', 'resource_manager', 'delivery_manager', 'director')
  public async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorService.getVendorById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a vendor' })
  @ApiCreatedResponse({ description: 'Vendor created.' })
  @RequireRoles('admin', 'project_manager')
  public async create(@Body() dto: CreateVendorDto) {
    return this.vendorService.createVendor(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vendor' })
  @ApiOkResponse({ description: 'Vendor updated.' })
  @RequireRoles('admin', 'project_manager')
  public async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorService.updateVendor(id, dto);
  }
}

@ApiTags('project-vendors')
@Controller('projects')
export class ProjectVendorController {
  public constructor(private readonly vendorService: VendorService) {}

  @Get(':id/vendors')
  @ApiOperation({ summary: 'List vendors on a project' })
  @ApiOkResponse({ description: 'Project vendor engagements.' })
  @RequireRoles('admin', 'project_manager', 'resource_manager', 'delivery_manager', 'director')
  public async listProjectVendors(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.vendorService.listProjectVendors(projectId);
  }

  @Post(':id/vendors')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a vendor to a project' })
  @ApiCreatedResponse({ description: 'Vendor engagement created.' })
  @RequireRoles('admin', 'project_manager')
  public async assignVendor(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateVendorEngagementDto,
  ) {
    return this.vendorService.assignVendor(projectId, dto);
  }

  @Patch(':projectId/vendors/:engagementId')
  @ApiOperation({ summary: 'Update a vendor engagement' })
  @ApiOkResponse({ description: 'Vendor engagement updated.' })
  @RequireRoles('admin', 'project_manager')
  public async updateEngagement(
    @Param('engagementId', ParseUUIDPipe) engagementId: string,
    @Body() dto: Partial<CreateVendorEngagementDto>,
  ) {
    return this.vendorService.updateVendorEngagement(engagementId, dto);
  }

  @Post(':projectId/vendors/:engagementId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End a vendor engagement' })
  @ApiOkResponse({ description: 'Vendor engagement ended.' })
  @RequireRoles('admin', 'project_manager', 'director')
  public async endEngagement(
    @Param('engagementId', ParseUUIDPipe) engagementId: string,
    @Body() body: UpdateVendorEngagementRequestDto,
  ) {
    return this.vendorService.endVendorEngagement(engagementId, body.status);
  }
}
