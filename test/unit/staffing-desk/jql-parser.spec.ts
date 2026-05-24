import { parseJql } from '@src/modules/staffing-desk/application/jql/jql-parser';
import { jqlToPrismaWhere } from '@src/modules/staffing-desk/application/jql/jql-to-prisma';

describe('JQL parser (FE-#268)', () => {
  it('parses simple equality', () => {
    const r = parseJql('role = Engineer');
    expect(r.errors).toEqual([]);
    expect(r.ast).toEqual({ type: 'predicate', field: 'role', op: '=', value: 'Engineer' });
  });

  it('parses quoted string value', () => {
    const r = parseJql('displayName = "Alex Chen"');
    expect(r.errors).toEqual([]);
    expect(r.ast).toMatchObject({ field: 'displayName', op: '=', value: 'Alex Chen' });
  });

  it('parses AND composition', () => {
    const r = parseJql('role = Engineer AND grade = L5');
    expect(r.errors).toEqual([]);
    expect(r.ast).toMatchObject({ type: 'binary', op: 'AND' });
  });

  it('parses OR with parens', () => {
    const r = parseJql('(role = Engineer OR role = Architect) AND grade = L5');
    expect(r.errors).toEqual([]);
    expect(r.ast).toMatchObject({ op: 'AND' });
  });

  it('parses IN list', () => {
    const r = parseJql('role IN (Engineer, Architect, "Tech Lead")');
    expect(r.errors).toEqual([]);
    expect(r.ast).toEqual({
      type: 'predicate',
      field: 'role',
      op: 'IN',
      value: ['Engineer', 'Architect', 'Tech Lead'],
    });
  });

  it('parses numeric comparison', () => {
    const r = parseJql('proficiency >= 3');
    expect(r.errors).toEqual([]);
    expect(r.ast).toMatchObject({ field: 'proficiency', op: '>=', value: 3 });
  });

  it('returns errors for unterminated string', () => {
    const r = parseJql('role = "unterm');
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]!.message).toMatch(/Unterminated/);
  });

  it('returns errors for missing operator', () => {
    const r = parseJql('role Engineer');
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('translates AST to Prisma where for positions scope', () => {
    const r = parseJql('role = Engineer AND fillStatus = OPEN');
    expect(r.ast).not.toBeNull();
    const { where, errors } = jqlToPrismaWhere(r.ast!, 'positions');
    expect(errors).toEqual([]);
    expect(where).toEqual({
      AND: [{ role: 'Engineer' }, { fillStatus: 'OPEN' }],
    });
  });

  it('rejects fields outside the scope whitelist', () => {
    const r = parseJql('email = a@b.com');
    expect(r.ast).not.toBeNull();
    const { errors } = jqlToPrismaWhere(r.ast!, 'people');
    expect(errors[0]).toMatch(/Unknown field/);
  });

  it('translates IN to Prisma in clause', () => {
    const r = parseJql('role IN (Engineer, Architect)');
    const { where } = jqlToPrismaWhere(r.ast!, 'positions');
    expect(where).toEqual({ role: { in: ['Engineer', 'Architect'] } });
  });
});
