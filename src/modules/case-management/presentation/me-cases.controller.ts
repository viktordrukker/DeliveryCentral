import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_AUTHENTICATED_ROLES } from '@src/shared/auth/role-presets';

import { CasePresenterService } from '../application/case-presenter.service';
import { ListCasesResponseDto } from '../application/contracts/case.response';
import { ListCasesService } from '../application/list-cases.service';

/**
 * W2-01 — caller-scoped HR case listing.
 *
 * `/api/cases` is restricted to HR_GOVERNANCE_ROLES because it is an
 * operator surface. Employees still need to see HR cases that are about
 * them (offboarding/onboarding/performance/employee-issue) from their
 * /me workspace. This controller exposes a self-scoped read that returns
 * only the cases where the caller is the SUBJECT, or where the caller is
 * listed in the participants set — never the full org-wide list.
 */
@ApiTags('me')
@Controller('me')
export class MeCasesController {
  public constructor(
    private readonly listCasesService: ListCasesService,
    private readonly casePresenter: CasePresenterService,
  ) {}

  @Get('cases')
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({
    summary:
      'W2-01 — list HR cases where the calling person is the subject OR a ' +
      'participant. Self-scoped; does not require HR roles.',
  })
  @ApiOkResponse({ type: ListCasesResponseDto })
  public async listMyCases(
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<ListCasesResponseDto> {
    const personId = req.principal?.personId;
    if (!personId) {
      return { items: [], page: 1, pageSize: 0, total: 0 };
    }

    // Run two filtered lookups and merge on id — covers both "case is about
    // me" (subjectPersonId) and "I'm an approver/observer/operator/etc"
    // (participants[].personId). The Prisma repository hits a single
    // findMany per call so this is two cheap queries.
    const [subjectResult, allResult] = await Promise.all([
      this.listCasesService.execute({ subjectPersonId: personId, pageSize: 200 }),
      this.listCasesService.execute({ pageSize: 200 }),
    ]);

    const participantHits = allResult.items.filter((caseRecord) =>
      caseRecord.participants.some((participant) => participant.personId === personId),
    );

    const byId = new Map<string, (typeof subjectResult.items)[number]>();
    for (const item of subjectResult.items) {
      byId.set(item.id, item);
    }
    for (const item of participantHits) {
      byId.set(item.id, item);
    }
    const merged = Array.from(byId.values()).sort(
      (a, b) => b.openedAt.getTime() - a.openedAt.getTime(),
    );

    return {
      items: await this.casePresenter.presentMany(merged),
      page: 1,
      pageSize: merged.length,
      total: merged.length,
    };
  }
}
