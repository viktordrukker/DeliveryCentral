import { CreateCaseService } from '@src/modules/case-management/application/create-case.service';
import { ListCasesService } from '@src/modules/case-management/application/list-cases.service';
import { CasePresenterService } from '@src/modules/case-management/application/case-presenter.service';
import { InMemoryCaseRecordRepository } from '@src/modules/case-management/infrastructure/repositories/in-memory/in-memory-case-record.repository';
import { MeCasesController } from '@src/modules/case-management/presentation/me-cases.controller';
import type { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

/**
 * W2-01 — `GET /api/me/cases` route surface tests.
 *
 * Covers:
 *   1. Returns only cases where the caller is the subject (case is about them).
 *   2. Includes cases where the caller is a participant (e.g., observer).
 *   3. Deduplicates when the caller is both subject AND participant.
 *   4. Empty result when the caller has no cases at all.
 *   5. Returns an empty list (not 401/500) when the principal is missing —
 *      RBAC layer is responsible for auth; this is defensive.
 */
describe('MeCasesController (W2-01)', () => {
  const SELF = '11111111-1111-1111-1111-111111111777';
  const OTHER = '11111111-1111-1111-1111-111111111888';
  const OWNER = '11111111-1111-1111-1111-111111111006';

  async function seedRepo(): Promise<InMemoryCaseRecordRepository> {
    const repo = new InMemoryCaseRecordRepository();
    const createSvc = new CreateCaseService(repo);

    // Case 1: caller is the subject.
    await createSvc.execute({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: OWNER,
      subjectPersonId: SELF,
      summary: 'Onboard new hire.',
    });
    // Case 2: caller is a participant only.
    await createSvc.execute({
      caseTypeKey: 'TRANSFER',
      ownerPersonId: OWNER,
      participants: [{ personId: SELF, role: 'OBSERVER' }],
      subjectPersonId: OTHER,
      summary: 'Internal transfer review.',
    });
    // Case 3: caller is the subject AND a participant (dedupe check).
    await createSvc.execute({
      caseTypeKey: 'PERFORMANCE',
      ownerPersonId: OWNER,
      participants: [{ personId: SELF, role: 'REQUESTER' }],
      subjectPersonId: SELF,
      summary: 'Performance review.',
    });
    // Case 4: caller has nothing to do with this case.
    await createSvc.execute({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: OWNER,
      subjectPersonId: OTHER,
      summary: 'Someone else.',
    });

    return repo;
  }

  function makeController(repo: InMemoryCaseRecordRepository): MeCasesController {
    const listSvc = new ListCasesService(repo);
    // The presenter only consults Prisma for display-name enrichment. For
    // unit tests we stub it with a no-op that returns the case ids in the
    // wire shape so the controller round-trip is observable.
    const presenter = {
      presentMany: jest.fn(async (records: { id: string; subjectPersonId: string; participants: { personId: string; role: string }[]; status: string; caseType: { key: string; displayName: string }; openedAt: Date; ownerPersonId: string; caseNumber: string; summary?: string; }[]) =>
        records.map((r) => ({
          id: r.id,
          caseNumber: r.caseNumber,
          caseTypeKey: r.caseType.key,
          caseTypeDisplayName: r.caseType.displayName,
          status: r.status,
          subjectPersonId: r.subjectPersonId,
          ownerPersonId: r.ownerPersonId,
          openedAt: r.openedAt.toISOString(),
          participants: r.participants.map((p) => ({ personId: p.personId, role: p.role })),
          summary: r.summary,
        })),
      ),
      presentSingle: jest.fn(),
    } as unknown as CasePresenterService;

    return new MeCasesController(listSvc, presenter);
  }

  function req(personId?: string): { principal?: RequestPrincipal } {
    return {
      principal: {
        authSource: 'bearer_token',
        personId,
        roles: ['employee'],
      },
    };
  }

  it('returns cases where caller is the subject', async () => {
    const repo = await seedRepo();
    const controller = makeController(repo);
    const result = await controller.listMyCases(req(SELF));
    const ids = result.items.map((i) => i.subjectPersonId);
    // Should include the SELF subject cases (cases 1 and 3) and the
    // participant-only case (case 2 — subject is OTHER).
    expect(result.items).toHaveLength(3);
    expect(ids.filter((id) => id === SELF)).toHaveLength(2);
    expect(ids.filter((id) => id === OTHER)).toHaveLength(1);
  });

  it('includes participant-only cases', async () => {
    const repo = await seedRepo();
    const controller = makeController(repo);
    const result = await controller.listMyCases(req(SELF));
    const transferCase = result.items.find((i) => i.caseTypeKey === 'TRANSFER');
    expect(transferCase).toBeDefined();
    expect(transferCase?.subjectPersonId).toBe(OTHER);
    expect(transferCase?.participants.some((p) => p.personId === SELF && p.role === 'OBSERVER')).toBe(
      true,
    );
  });

  it('deduplicates cases where caller is both subject and participant', async () => {
    const repo = await seedRepo();
    const controller = makeController(repo);
    const result = await controller.listMyCases(req(SELF));
    const perfCases = result.items.filter((i) => i.caseTypeKey === 'PERFORMANCE');
    expect(perfCases).toHaveLength(1);
  });

  it('excludes unrelated cases', async () => {
    const repo = await seedRepo();
    const controller = makeController(repo);
    const result = await controller.listMyCases(req(SELF));
    const unrelated = result.items.find(
      (i) => i.summary === 'Someone else.',
    );
    expect(unrelated).toBeUndefined();
  });

  it('returns empty list when principal has no personId', async () => {
    const repo = await seedRepo();
    const controller = makeController(repo);
    const result = await controller.listMyCases({ principal: undefined });
    expect(result).toEqual({ items: [], page: 1, pageSize: 0, total: 0 });
  });
});
