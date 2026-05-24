/**
 * FE-#268 — translate JQL AST into a Prisma `where` clause.
 *
 * v1 supports the field whitelists in jql-types.ts. Unknown fields error.
 */

import {
  JqlAst,
  JqlPredicate,
  JqlScope,
  PEOPLE_FIELDS,
  POSITION_FIELDS,
} from './jql-types';

export function jqlToPrismaWhere(
  ast: JqlAst,
  scope: JqlScope,
): { where: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const where = visit(ast, scope, errors);
  return { where, errors };
}

function visit(
  node: JqlAst,
  scope: JqlScope,
  errors: string[],
): Record<string, unknown> {
  if (node.type === 'binary') {
    const left = visit(node.left, scope, errors);
    const right = visit(node.right, scope, errors);
    return node.op === 'AND' ? { AND: [left, right] } : { OR: [left, right] };
  }
  return predicateToWhere(node, scope, errors);
}

function predicateToWhere(
  p: JqlPredicate,
  scope: JqlScope,
  errors: string[],
): Record<string, unknown> {
  const allowed = scope === 'positions' ? POSITION_FIELDS : PEOPLE_FIELDS;
  if (!(allowed as readonly string[]).includes(p.field)) {
    errors.push(`Unknown field '${p.field}' for scope '${scope}'.`);
    return {};
  }
  switch (p.op) {
    case '=':
      return { [p.field]: p.value };
    case '!=':
      return { [p.field]: { not: p.value } };
    case '>':
      return { [p.field]: { gt: p.value } };
    case '<':
      return { [p.field]: { lt: p.value } };
    case '>=':
      return { [p.field]: { gte: p.value } };
    case '<=':
      return { [p.field]: { lte: p.value } };
    case 'IN':
      return { [p.field]: { in: Array.isArray(p.value) ? p.value : [p.value] } };
  }
}
