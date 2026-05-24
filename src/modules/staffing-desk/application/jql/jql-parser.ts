/**
 * FE-#268 — minimal recursive-descent JQL-ish parser.
 *
 * Hand-rolled to avoid pulling in a parser-generator dep for a v1 surface.
 * Returns partial AST + validation errors instead of throwing so the FE
 * can render typed-while-incomplete hints.
 */

import {
  JqlAst,
  JqlOp,
  JqlParseResult,
  JqlPredicate,
  JqlValidationError,
} from './jql-types';

interface Token {
  kind: 'word' | 'string' | 'op' | 'lparen' | 'rparen' | 'comma' | 'kw';
  value: string;
  position: number;
}

const OPS: ReadonlySet<string> = new Set(['=', '!=', '>', '<', '>=', '<=']);
const KEYWORDS: ReadonlySet<string> = new Set(['AND', 'OR', 'IN']);

function tokenize(input: string): { tokens: Token[]; errors: JqlValidationError[] } {
  const tokens: Token[] = [];
  const errors: JqlValidationError[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i]!;
    if (c === ' ' || c === '\t' || c === '\n') {
      i += 1;
      continue;
    }
    if (c === '(' || c === ')' || c === ',') {
      tokens.push({
        kind: c === '(' ? 'lparen' : c === ')' ? 'rparen' : 'comma',
        value: c,
        position: i,
      });
      i += 1;
      continue;
    }
    if (c === '"') {
      const start = i + 1;
      let end = start;
      while (end < input.length && input[end] !== '"') end += 1;
      if (end >= input.length) {
        errors.push({ message: 'Unterminated string literal', position: i });
        break;
      }
      tokens.push({ kind: 'string', value: input.slice(start, end), position: i });
      i = end + 1;
      continue;
    }
    if (c === '!' || c === '=' || c === '<' || c === '>') {
      const two = input.slice(i, i + 2);
      if (OPS.has(two)) {
        tokens.push({ kind: 'op', value: two, position: i });
        i += 2;
      } else if (OPS.has(c)) {
        tokens.push({ kind: 'op', value: c, position: i });
        i += 1;
      } else {
        errors.push({ message: `Unexpected character '${c}'`, position: i });
        i += 1;
      }
      continue;
    }
    // word — runs until whitespace, paren, comma, op, or eof
    let end = i;
    while (
      end < input.length &&
      !/[\s(),=!<>"]/.test(input[end]!)
    ) {
      end += 1;
    }
    const word = input.slice(i, end);
    if (KEYWORDS.has(word.toUpperCase())) {
      tokens.push({ kind: 'kw', value: word.toUpperCase(), position: i });
    } else {
      tokens.push({ kind: 'word', value: word, position: i });
    }
    i = end;
  }
  return { tokens, errors };
}

class Parser {
  private cursor = 0;
  private readonly errors: JqlValidationError[] = [];
  public constructor(private readonly tokens: Token[]) {}

  public parse(): JqlParseResult {
    const ast = this.parseOr();
    if (this.cursor < this.tokens.length) {
      this.errors.push({
        message: `Unexpected token after expression: '${this.tokens[this.cursor]!.value}'`,
        position: this.tokens[this.cursor]!.position,
      });
    }
    return { ast, errors: this.errors };
  }

  private peek(): Token | undefined {
    return this.tokens[this.cursor];
  }
  private consume(): Token | undefined {
    return this.tokens[this.cursor++];
  }

  private parseOr(): JqlAst | null {
    let left = this.parseAnd();
    while (left && this.peek()?.kind === 'kw' && this.peek()?.value === 'OR') {
      this.consume();
      const right = this.parseAnd();
      if (!right) break;
      left = { type: 'binary', op: 'OR', left, right };
    }
    return left;
  }

  private parseAnd(): JqlAst | null {
    let left = this.parseUnary();
    while (left && this.peek()?.kind === 'kw' && this.peek()?.value === 'AND') {
      this.consume();
      const right = this.parseUnary();
      if (!right) break;
      left = { type: 'binary', op: 'AND', left, right };
    }
    return left;
  }

  private parseUnary(): JqlAst | null {
    const t = this.peek();
    if (!t) {
      this.errors.push({ message: 'Unexpected end of input', expected: 'field name or (' });
      return null;
    }
    if (t.kind === 'lparen') {
      this.consume();
      const inner = this.parseOr();
      const close = this.consume();
      if (close?.kind !== 'rparen') {
        this.errors.push({ message: 'Expected closing paren', position: close?.position });
      }
      return inner;
    }
    return this.parsePredicate();
  }

  private parsePredicate(): JqlPredicate | null {
    const field = this.consume();
    if (!field || field.kind !== 'word') {
      this.errors.push({
        message: 'Expected field name',
        position: field?.position,
        expected: 'identifier',
      });
      return null;
    }
    const opToken = this.consume();
    if (!opToken) {
      this.errors.push({ message: 'Expected operator after field', expected: '= != > < >= <= IN' });
      return null;
    }
    let op: JqlOp;
    if (opToken.kind === 'op') {
      op = opToken.value as JqlOp;
    } else if (opToken.kind === 'kw' && opToken.value === 'IN') {
      op = 'IN';
    } else {
      this.errors.push({
        message: `Unexpected operator '${opToken.value}'`,
        position: opToken.position,
        expected: '= != > < >= <= IN',
      });
      return null;
    }
    const value = this.parseValue(op === 'IN');
    if (value === undefined) return null;
    return { type: 'predicate', field: field.value, op, value };
  }

  private parseValue(isList: boolean): string | number | string[] | undefined {
    if (isList) {
      const lp = this.consume();
      if (lp?.kind !== 'lparen') {
        this.errors.push({
          message: 'Expected ( after IN',
          position: lp?.position,
          expected: '(',
        });
        return undefined;
      }
      const values: string[] = [];
      while (true) {
        const t = this.consume();
        if (!t) {
          this.errors.push({ message: 'Unexpected end of IN list' });
          return undefined;
        }
        if (t.kind === 'rparen') break;
        if (t.kind === 'word' || t.kind === 'string') {
          values.push(t.value);
        } else if (t.kind === 'comma') {
          continue;
        } else {
          this.errors.push({
            message: `Unexpected token in IN list: '${t.value}'`,
            position: t.position,
          });
        }
      }
      return values;
    }
    const t = this.consume();
    if (!t) {
      this.errors.push({ message: 'Expected value after operator' });
      return undefined;
    }
    if (t.kind === 'word' || t.kind === 'string') {
      const asNumber = Number(t.value);
      if (!Number.isNaN(asNumber) && t.kind === 'word' && /^-?\d+(\.\d+)?$/.test(t.value)) {
        return asNumber;
      }
      return t.value;
    }
    this.errors.push({
      message: `Unexpected value token '${t.value}'`,
      position: t.position,
      expected: 'word or "string"',
    });
    return undefined;
  }
}

export function parseJql(input: string): JqlParseResult {
  const { tokens, errors: tokenErrors } = tokenize(input);
  if (tokens.length === 0) {
    return {
      ast: null,
      errors: [
        ...tokenErrors,
        { message: 'Empty query', expected: 'field op value' },
      ],
    };
  }
  const parser = new Parser(tokens);
  const result = parser.parse();
  return {
    ast: result.ast,
    errors: [...tokenErrors, ...result.errors],
  };
}
