/**
 * FE-#268 — minimal JQL-ish query AST.
 *
 * v1 grammar:
 *   expr      ::= or
 *   or        ::= and (OR and)*
 *   and       ::= unary (AND unary)*
 *   unary     ::= "(" expr ")" | predicate
 *   predicate ::= field op value
 *   op        ::= "=" | "!=" | ">" | "<" | ">=" | "<=" | "IN"
 *   value     ::= bare-word | "double-quoted" | "(" csv-of-values ")"
 *
 * Fields per scope:
 *   positions  → role, fillStatus, projectId
 *   people     → displayName, role, grade, location
 */

export type JqlScope = 'positions' | 'people';

export type JqlOp = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN';

export interface JqlPredicate {
  type: 'predicate';
  field: string;
  op: JqlOp;
  value: string | number | string[];
}

export interface JqlBinary {
  type: 'binary';
  op: 'AND' | 'OR';
  left: JqlAst;
  right: JqlAst;
}

export type JqlAst = JqlPredicate | JqlBinary;

export interface JqlValidationError {
  message: string;
  position?: number;
  expected?: string;
  suggestion?: string;
}

export interface JqlParseResult {
  ast: JqlAst | null;
  errors: JqlValidationError[];
}

export const POSITION_FIELDS = ['role', 'fillStatus', 'projectId'] as const;
export const PEOPLE_FIELDS = ['displayName', 'role', 'grade', 'location'] as const;
