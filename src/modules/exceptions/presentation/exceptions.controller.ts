import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ExceptionQueueQueryDto } from '../application/contracts/exception-queue.query';
import { ExceptionQueueItemDto, ExceptionQueueResponseDto } from '../application/contracts/exception-queue.dto';
import {
  ExceptionResolutionResponseDto,
  ResolveExceptionRequestDto,
  SuppressExceptionRequestDto,
} from '../application/contracts/exception-resolution.dto';
import { ExceptionQueueQueryService } from '../application/exception-queue-query.service';
import { ResolveExceptionService } from '../application/resolve-exception.service';
import { SuppressExceptionService } from '../application/suppress-exception.service';

@ApiTags('exceptions')
@Controller('exceptions')
export class ExceptionsController {
  public constructor(
    private readonly exceptionQueueQueryService: ExceptionQueueQueryService,
    private readonly resolveExceptionService: ResolveExceptionService,
    private readonly suppressExceptionService: SuppressExceptionService,
  ) {}

  @Get()
  @RequireRoles('admin', 'director', 'hr_manager', 'project_manager', 'resource_manager', 'delivery_manager')
  @ApiOperation({ summary: 'List operational exception queue items derived from current platform truths' })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'provider', required: false, type: String })
  @ApiQuery({ name: 'targetEntityType', required: false, type: String })
  @ApiQuery({ name: 'targetEntityId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiOkResponse({ type: ExceptionQueueResponseDto })
  public async list(@Query() query: ExceptionQueueQueryDto): Promise<ExceptionQueueResponseDto> {
    try {
      return await this.exceptionQueueQueryService.getQueue({
        asOf: query.asOf,
        category: query.category,
        limit: query.limit ? Number(query.limit) : undefined,
        provider: query.provider,
        status: query.status,
        targetEntityId: query.targetEntityId,
        targetEntityType: query.targetEntityType,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Exception queue query failed.',
      );
    }
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Mark an exception as resolved with a resolution note' })
  @ApiOkResponse({ type: ExceptionResolutionResponseDto })
  @ApiNotFoundResponse({ description: 'Exception item not found.' })
  public async resolveException(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: ResolveExceptionRequestDto,
  ): Promise<ExceptionResolutionResponseDto> {
    try {
      const record = await this.resolveExceptionService.execute({
        exceptionId: id,
        resolution: request.resolution,
        resolvedBy: request.resolvedBy,
      });

      return {
        exceptionId: record.exceptionId,
        resolution: record.resolution,
        resolvedAt: record.resolvedAt.toISOString(),
        resolvedBy: record.resolvedBy,
        status: record.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Exception resolution failed.';
      if (message === 'Exception not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':id/suppress')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Suppress an exception with a reason' })
  @ApiOkResponse({ type: ExceptionResolutionResponseDto })
  @ApiNotFoundResponse({ description: 'Exception item not found.' })
  public async suppressException(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: SuppressExceptionRequestDto,
  ): Promise<ExceptionResolutionResponseDto> {
    try {
      const record = await this.suppressExceptionService.execute({
        exceptionId: id,
        reason: request.reason,
        suppressedBy: request.suppressedBy,
      });

      return {
        exceptionId: record.exceptionId,
        resolution: record.resolution,
        resolvedAt: record.resolvedAt.toISOString(),
        resolvedBy: record.resolvedBy,
        status: record.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Exception suppression failed.';
      if (message === 'Exception not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Get(':id')
  @RequireRoles('admin', 'director', 'hr_manager', 'project_manager', 'resource_manager', 'delivery_manager')
  @ApiOperation({ summary: 'Get a specific exception queue item by id' })
  @ApiOkResponse({ type: ExceptionQueueItemDto })
  @ApiNotFoundResponse({ description: 'Exception item not found.' })
  public async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ExceptionQueueQueryDto,
  ): Promise<ExceptionQueueItemDto> {
    try {
      const item = await this.exceptionQueueQueryService.getById(id, {
        asOf: query.asOf,
        category: query.category,
        provider: query.provider,
        status: query.status,
        targetEntityId: query.targetEntityId,
        targetEntityType: query.targetEntityType,
      });

      if (!item) {
        throw new NotFoundException('Exception item not found.');
      }

      return item;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Exception queue lookup failed.',
      );
    }
  }
}

