import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { parseJql } from './jql-parser';
import { jqlToPrismaWhere } from './jql-to-prisma';
import { JqlAst, JqlScope, JqlValidationError } from './jql-types';

export interface JqlParseResponse {
  ast: JqlAst | null;
  errors: JqlValidationError[];
}

export interface JqlExecuteResponse {
  rows: unknown[];
  errors: JqlValidationError[];
}

@Injectable()
export class JqlService {
  public constructor(private readonly prisma: PrismaService) {}

  public parse(query: string): JqlParseResponse {
    return parseJql(query);
  }

  public async execute(query: string, scope: JqlScope): Promise<JqlExecuteResponse> {
    const parsed = parseJql(query);
    if (!parsed.ast) {
      return { rows: [], errors: parsed.errors };
    }
    const { where, errors: translateErrors } = jqlToPrismaWhere(parsed.ast, scope);
    if (translateErrors.length > 0) {
      return {
        rows: [],
        errors: [...parsed.errors, ...translateErrors.map((m) => ({ message: m }))],
      };
    }
    const rows =
      scope === 'positions'
        ? await this.prisma.projectPosition.findMany({ where, take: 200 })
        : await this.prisma.person.findMany({ where, take: 200 });
    return { rows, errors: parsed.errors };
  }
}
