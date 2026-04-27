import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AllowSelfScope } from '@src/modules/identity-access/application/self-scope.decorator';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { PeopleThreeSixtyService, PersonThreeSixtyDto } from '../application/people-360.service';

const MANAGER_ROLES = [
  'hr_manager',
  'delivery_manager',
  'resource_manager',
  'director',
  'admin',
] as const;

@ApiTags('people-360')
@Controller('people')
export class PeopleThreeSixtyController {
  public constructor(private readonly service: PeopleThreeSixtyService) {}

  @Get(':id/360')
  @RequireRoles(...MANAGER_ROLES)
  @AllowSelfScope({ param: 'id' })
  @ApiOperation({ summary: 'Get 360 view for a person (mood, workload, hours trends)' })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiOkResponse({ description: 'Person 360 data' })
  public async get360(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('weeks') weeksStr?: string,
  ): Promise<PersonThreeSixtyDto> {
    const weeks = weeksStr ? parseInt(weeksStr, 10) : 12;
    return this.service.get360(id, weeks);
  }
}
