import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { STAFFING_ROLES } from '@src/shared/auth/role-presets';

import {
  JqlExecuteResponse,
  JqlParseResponse,
  JqlService,
} from '../application/jql/jql.service';
import { JqlScope } from '../application/jql/jql-types';

class JqlParseBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  query!: string;
}

class JqlExecuteBodyDto extends JqlParseBodyDto {
  @IsIn(['positions', 'people'])
  scope!: JqlScope;
}

/**
 * FE-#268 — first-class JQL parse + execute API.
 *
 * v1 grammar: `field op value` with AND / OR / parens / IN. Field whitelist
 * per scope; see jql-types.ts.
 */
@ApiTags('staffing')
@Controller('staffing/jql')
export class JqlController {
  public constructor(private readonly service: JqlService) {}

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...STAFFING_ROLES)
  @ApiOperation({ summary: 'FE-#268 — parse JQL into AST + validation errors' })
  @ApiOkResponse({ type: Object })
  public parse(@Body() body: JqlParseBodyDto): JqlParseResponse {
    if (!body) throw new BadRequestException('Body required.');
    return this.service.parse(body.query);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...STAFFING_ROLES)
  @ApiOperation({ summary: 'FE-#268 — execute JQL against positions / people scope' })
  @ApiOkResponse({ type: Object })
  public async execute(@Body() body: JqlExecuteBodyDto): Promise<JqlExecuteResponse> {
    if (!body) throw new BadRequestException('Body required.');
    return this.service.execute(body.query, body.scope);
  }
}
