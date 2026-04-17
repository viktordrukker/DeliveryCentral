export type TokenType =
  | 'FIELD'
  | 'OPERATOR'
  | 'VALUE'
  | 'STRING'
  | 'AND'
  | 'OR'
  | 'LPAREN'
  | 'RPAREN'
  | 'IN'
  | 'NOT'
  | 'IS'
  | 'EMPTY'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

const KEYWORDS: Record<string, TokenType> = {
  AND: 'AND',
  OR: 'OR',
  IN: 'IN',
  NOT: 'NOT',
  IS: 'IS',
  EMPTY: 'EMPTY',
};

const OPERATORS = new Set(['=', '!=', '~', '!~', '>', '<', '>=', '<=']);

const FIELDS = new Set([
  'kind', 'person', 'project', 'status', 'priority', 'role',
  'allocation', 'pool', 'orgUnit', 'skills', 'startDate', 'endDate',
  'personId', 'projectId',
]);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) { i++; continue; }

    const start = i;

    // Parentheses
    if (input[i] === '(') { tokens.push({ type: 'LPAREN', value: '(', start, end: i + 1 }); i++; continue; }
    if (input[i] === ')') { tokens.push({ type: 'RPAREN', value: ')', start, end: i + 1 }); i++; continue; }

    // Quoted string
    if (input[i] === '"') {
      i++;
      let val = '';
      while (i < input.length && input[i] !== '"') { val += input[i]; i++; }
      if (i < input.length) i++; // skip closing quote
      tokens.push({ type: 'STRING', value: val, start, end: i });
      continue;
    }

    // Multi-char operators
    if (i + 1 < input.length) {
      const two = input[i] + input[i + 1];
      if (OPERATORS.has(two)) {
        tokens.push({ type: 'OPERATOR', value: two, start, end: i + 2 });
        i += 2;
        continue;
      }
    }

    // Single-char operators
    if (OPERATORS.has(input[i])) {
      tokens.push({ type: 'OPERATOR', value: input[i], start, end: i + 1 });
      i++;
      continue;
    }

    // Word (field name, keyword, or unquoted value)
    let word = '';
    while (i < input.length && !/[\s()=!~<>",]/.test(input[i])) { word += input[i]; i++; }

    if (word.length === 0) { i++; continue; } // skip unexpected chars

    const upper = word.toUpperCase();
    if (KEYWORDS[upper]) {
      tokens.push({ type: KEYWORDS[upper], value: upper, start, end: i });
    } else if (FIELDS.has(word)) {
      tokens.push({ type: 'FIELD', value: word, start, end: i });
    } else {
      tokens.push({ type: 'VALUE', value: word, start, end: i });
    }
  }

  tokens.push({ type: 'EOF', value: '', start: i, end: i });
  return tokens;
}
