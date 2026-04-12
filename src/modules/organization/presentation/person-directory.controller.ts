import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { CreateEmployeeRequestDto } from '../application/contracts/create-employee.request';
import { EmployeeResponseDto } from '../application/contracts/employee.response';
import {
  PaginatedPersonDirectoryResponseDto,
  PersonDirectoryItemDto,
} from '../application/contracts/person-directory.dto';
import { CreateEmployeeService } from '../application/create-employee.service';
import { DeactivateEmployeeService } from '../application/deactivate-employee.service';
import { TerminateEmployeeService } from '../application/terminate-employee.service';
import { PersonDirectoryQueryService } from '../application/person-directory-query.service';
import { Person } from '../domain/entities/person.entity';

@ApiTags('person-directory')
@Controller('org/people')
export class PersonDirectoryController {
  public constructor(
    private readonly personDirectoryQueryService: PersonDirectoryQueryService,
    private readonly createEmployeeService: CreateEmployeeService,
    private readonly deactivateEmployeeService: DeactivateEmployeeService,
    private readonly terminateEmployeeService: TerminateEmployeeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an employee in the organization domain' })
  @ApiCreatedResponse({ type: EmployeeResponseDto })
  @ApiConflictResponse({ description: 'Employee email already exists.' })
  @ApiNotFoundResponse({ description: 'Org unit not found.' })
  @RequireRoles('hr_manager', 'director', 'admin')
  public async createEmployee(
    @Body() request: CreateEmployeeRequestDto,
  ): Promise<EmployeeResponseDto> {
    return this.mapEmployeeResponse(
      await this.withEmployeeErrors(() => this.createEmployeeService.execute(request)),
    );
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate an employee without deleting history' })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @RequireRoles('hr_manager', 'director', 'admin')
  public async deactivateEmployee(@Param('id') id: string): Promise<EmployeeResponseDto> {
    return this.mapEmployeeResponse(
      await this.withEmployeeErrors(() => this.deactivateEmployeeService.execute(id)),
    );
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate an employee and end all active assignments' })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @RequireRoles('hr_manager', 'director', 'admin')
  public async terminateEmployee(
    @Param('id') id: string,
    @Body() body: { actorId?: string; reason?: string; terminatedAt?: string },
  ): Promise<EmployeeResponseDto> {
    return this.mapEmployeeResponse(
      await this.withEmployeeErrors(() =>
        this.terminateEmployeeService.execute({
          actorId: body.actorId,
          personId: id,
          reason: body.reason,
          terminatedAt: body.terminatedAt,
        }),
      ),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List people for workload and org visibility' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'resourcePoolId', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiOkResponse({ type: PaginatedPersonDirectoryResponseDto })
  public async listPeople(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('departmentId') departmentId?: string,
    @Query('resourcePoolId') resourcePoolId?: string,
    @Query('role') role?: string,
  ): Promise<PaginatedPersonDirectoryResponseDto> {
    const numericPage = Number(page);
    const numericPageSize = Number(pageSize);
    const result = await this.personDirectoryQueryService.listPeople({
      departmentId,
      page: Number.isNaN(numericPage) ? 1 : numericPage,
      pageSize: Number.isNaN(numericPageSize) ? 10 : numericPageSize,
      resourcePoolId,
      role,
    });

    return {
      items: result.items,
      page: Number.isNaN(numericPage) ? 1 : numericPage,
      pageSize: Number.isNaN(numericPageSize) ? 10 : numericPageSize,
      total: result.total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a person directory record by id' })
  @ApiOkResponse({ type: PersonDirectoryItemDto })
  @ApiNotFoundResponse({ description: 'Person not found.' })
  public async getPersonById(@Param('id') id: string): Promise<PersonDirectoryItemDto> {
    const person = await this.personDirectoryQueryService.getPersonById(id);

    if (!person) {
      throw new NotFoundException('Person not found.');
    }

    return person;
  }

  private mapEmployeeResponse(person: Person): EmployeeResponseDto {
    return {
      email: person.primaryEmail ?? '',
      grade: person.grade,
      id: person.personId.value,
      name: person.name,
      orgUnitId: person.orgUnitId?.value ?? '',
      role: person.role,
      skillsets: person.skillsets,
      status: person.status,
    };
  }

  private async withEmployeeErrors(work: () => Promise<Person>): Promise<Person> {
    try {
      return await work();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Employee creation failed.';

      if (message === 'Employee email already exists.') {
        throw new ConflictException(message);
      }

      if (message === 'Org unit does not exist.') {
        throw new NotFoundException(message);
      }

      if (message === 'Employee does not exist.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }
}
