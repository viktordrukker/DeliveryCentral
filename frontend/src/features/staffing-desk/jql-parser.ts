import { tokenize, type Token } from './jql-tokenizer';

export interface FilterClause {
  field: string;
  operator: string;
  value: string | string[] | null;
}

export interface FilterGroup {
  operator: 'AND' | 'OR';
  clauses: (FilterClause | FilterGroup)[];
}

export class JqlParseError extends Error {
  public constructor(message: string, public readonly position: number) {
    super(message);
  }
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  public constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', start: 0, end: 0 };
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private expect(type: string): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new JqlParseError(`Expected ${type} but got ${t.type} ("${t.value}")`, t.start);
    }
    return this.advance();
  }

  public parse(): FilterGroup {
    const group = this.parseOr();
    if (this.peek().type !== 'EOF') {
      throw new JqlParseError(`Unexpected token: "${this.peek().value}"`, this.peek().start);
    }
    return group;
  }

  private parseOr(): FilterGroup {
    const left = this.parseAnd();
    const clauses: (FilterClause | FilterGroup)[] = [...left.clauses];
    let op: 'AND' | 'OR' = left.operator;

    while (this.peek().type === 'OR') {
      this.advance();
      const right = this.parseAnd();
      op = 'OR';
      clauses.push(...right.clauses);
    }

    return { operator: op, clauses };
  }

  private parseAnd(): FilterGroup {
    const clauses: (FilterClause | FilterGroup)[] = [this.parseClause()];

    while (this.peek().type === 'AND') {
      this.advance();
      clauses.push(this.parseClause());
    }

    return { operator: 'AND', clauses };
  }

  private parseClause(): FilterClause | FilterGroup {
    // Handle parenthesized groups
    if (this.peek().type === 'LPAREN') {
      this.advance();
      const group = this.parseOr();
      this.expect('RPAREN');
      return group;
    }

    // Expect FIELD OPERATOR VALUE
    const fieldToken = this.peek();
    if (fieldToken.type !== 'FIELD') {
      throw new JqlParseError(`Expected field name but got "${fieldToken.value}"`, fieldToken.start);
    }
    this.advance();
    const field = fieldToken.value;

    // IS EMPTY / IS NOT EMPTY
    if (this.peek().type === 'IS') {
      this.advance();
      if (this.peek().type === 'NOT') {
        this.advance();
        this.expect('EMPTY');
        return { field, operator: 'IS NOT EMPTY', value: null };
      }
      this.expect('EMPTY');
      return { field, operator: 'IS EMPTY', value: null };
    }

    // NOT IN (...)
    if (this.peek().type === 'NOT') {
      this.advance();
      this.expect('IN');
      const values = this.parseValueList();
      return { field, operator: 'NOT IN', value: values };
    }

    // IN (...)
    if (this.peek().type === 'IN') {
      this.advance();
      const values = this.parseValueList();
      return { field, operator: 'IN', value: values };
    }

    // Regular operator
    const opToken = this.peek();
    if (opToken.type !== 'OPERATOR') {
      throw new JqlParseError(`Expected operator but got "${opToken.value}"`, opToken.start);
    }
    this.advance();
    const operator = opToken.value;

    // Value
    const valToken = this.peek();
    if (valToken.type === 'STRING' || valToken.type === 'VALUE') {
      this.advance();
      return { field, operator, value: valToken.value };
    }

    throw new JqlParseError(`Expected value but got "${valToken.value}"`, valToken.start);
  }

  private parseValueList(): string[] {
    this.expect('LPAREN');
    const values: string[] = [];

    while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
      const t = this.peek();
      if (t.type === 'VALUE' || t.type === 'STRING' || t.type === 'FIELD') {
        values.push(t.value);
        this.advance();
      } else {
        // Skip commas and other separators
        this.advance();
      }
    }

    this.expect('RPAREN');
    return values;
  }
}

export function parseJql(input: string): FilterGroup {
  if (!input.trim()) return { operator: 'AND', clauses: [] };
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parse();
}
