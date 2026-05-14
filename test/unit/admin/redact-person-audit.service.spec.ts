import { RedactPersonAuditService } from '@src/modules/admin/application/redact-person-audit.service';

describe('RedactPersonAuditService (F-5.5 / D-167 v1)', () => {
  interface TxApi {
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
  }

  function makeFixture(emailRows = 2, displayRows = 1, rowsForward: Array<{ id: string }> = []) {
    const tx: TxApi = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
    };
    tx.$executeRaw.mockResolvedValueOnce(emailRows);
    tx.$executeRaw.mockResolvedValueOnce(displayRows);
    // earliest minSeq result
    tx.$queryRaw.mockResolvedValueOnce(rowsForward.length > 0 ? [{ minSeq: BigInt(10) }] : [{ minSeq: null }]);
    // predecessor rowHash
    tx.$queryRaw.mockResolvedValueOnce([{ rowHash: 'prev-hash-abc' }]);
    // rows to rebuild
    tx.$queryRaw.mockResolvedValueOnce(rowsForward);
    // Per-row hash compute + UPDATE
    for (let i = 0; i < rowsForward.length; i++) {
      tx.$queryRaw.mockResolvedValueOnce([{ newHash: `new-hash-${i}` }]);
      tx.$executeRaw.mockResolvedValueOnce(1);
    }

    const prismaMock = {
      $transaction: jest.fn(async (fn: (t: TxApi) => Promise<unknown>) => fn(tx)),
    } as unknown as ConstructorParameters<typeof RedactPersonAuditService>[0];

    const auditMock = { record: jest.fn() } as unknown as ConstructorParameters<
      typeof RedactPersonAuditService
    >[1];
    const svc = new RedactPersonAuditService(prismaMock, auditMock);
    return { svc, tx, prismaMock, auditMock };
  }

  it('returns 0 affected when no rows reference the person', async () => {
    const { svc } = makeFixture(0, 0, []);
    const result = await svc.redact('11111111-1111-1111-1111-111111111111', 'actor-1');
    expect(result.rowsAffected).toBe(0);
    expect(result.rowsRehashed).toBe(0);
  });

  it('redacts rows and re-hashes the forward chain', async () => {
    const rowsForward = [{ id: 'row-a' }, { id: 'row-b' }, { id: 'row-c' }];
    const { svc, auditMock } = makeFixture(2, 1, rowsForward);
    const result = await svc.redact('11111111-1111-1111-1111-111111111111', 'actor-1');
    expect(result.rowsAffected).toBe(3); // 2 email + 1 actorDisplayName
    expect(result.rowsRehashed).toBe(rowsForward.length);
    expect(result.personId).toBe('11111111-1111-1111-1111-111111111111');
    expect((auditMock as unknown as { record: jest.Mock }).record).toHaveBeenCalledTimes(1);
    const meta = (auditMock as unknown as { record: jest.Mock }).record.mock.calls[0][0];
    expect(meta.action).toBe('REDACT');
    expect(meta.actorId).toBe('actor-1');
    expect(meta.targetEntityType).toBe('Person');
    expect(meta.targetEntityId).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('handles null predecessor rowHash (redaction starts at chain head)', async () => {
    const tx: TxApi = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
    };
    tx.$executeRaw.mockResolvedValueOnce(1);
    tx.$executeRaw.mockResolvedValueOnce(0);
    tx.$queryRaw.mockResolvedValueOnce([{ minSeq: BigInt(1) }]);
    tx.$queryRaw.mockResolvedValueOnce([]); // no predecessor row
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'row-a' }]);
    tx.$queryRaw.mockResolvedValueOnce([{ newHash: 'fresh-head-hash' }]);
    tx.$executeRaw.mockResolvedValueOnce(1);

    const prismaMock = {
      $transaction: jest.fn(async (fn: (t: TxApi) => Promise<unknown>) => fn(tx)),
    } as unknown as ConstructorParameters<typeof RedactPersonAuditService>[0];
    const svc = new RedactPersonAuditService(prismaMock, undefined);

    const result = await svc.redact('22222222-2222-2222-2222-222222222222', 'actor-2');
    expect(result.rowsAffected).toBe(1);
    expect(result.rowsRehashed).toBe(1);
  });

  it('idempotent — calling on an already-redacted person finds 0 candidate rows', async () => {
    const { svc } = makeFixture(0, 0, []);
    const first = await svc.redact('33333333-3333-3333-3333-333333333333', 'actor-3');
    expect(first.rowsAffected).toBe(0);
    expect(first.rowsRehashed).toBe(0);
  });

  it('redactedAt is an ISO-8601 string', async () => {
    const { svc } = makeFixture(1, 0, [{ id: 'row-a' }]);
    const result = await svc.redact('44444444-4444-4444-4444-444444444444', 'actor-4');
    expect(() => new Date(result.redactedAt).toISOString()).not.toThrow();
    expect(result.redactedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
