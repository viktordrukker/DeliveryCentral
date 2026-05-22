import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_AUTHENTICATED_ROLES, HR_GOVERNANCE_ROLES } from '@src/shared/auth/role-presets';

import { CasePresenterService } from '../application/case-presenter.service';

import { CaseResponseDto, ListCasesResponseDto } from '../application/contracts/case.response';
import { CancelCaseRequestDto } from '../application/contracts/cancel-case.request';
import { CreateCaseRequestDto } from '../application/contracts/create-case.request';
import { ListCasesQueryDto } from '../application/contracts/list-cases.query';
import { ApproveCaseService } from '../application/approve-case.service';
import { ApproveCaseRequestDto, RejectCaseRequestDto } from '../application/contracts/approve-case.request';
import { ArchiveCaseService } from '../application/archive-case.service';
import { CancelCaseService } from '../application/cancel-case.service';
import { CloseCaseService } from '../application/close-case.service';
import { CompleteCaseStepService, CaseStepDto } from '../application/complete-case-step.service';
import { CreateCaseService } from '../application/create-case.service';
import { GetCaseByIdService } from '../application/get-case-by-id.service';
import { ListCasesService } from '../application/list-cases.service';
import { ReopenCaseService } from '../application/reopen-case.service';
import { PrismaCaseCommentService, CaseCommentDto } from '../infrastructure/services/prisma-case-comment.service';
import { InMemoryCaseSlaService } from '../infrastructure/services/in-memory-case-sla.service';
import { AddCaseStepRequestDto } from '../application/contracts/add-case-step.request';
import { AddCaseParticipantRequestDto } from '../application/contracts/add-case-participant.request';
import { AddCaseNoteRequestDto } from '../application/contracts/add-case-note.request';
import { UpdateSlaConfigRequestDto } from '../application/contracts/update-sla-config.request';

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  public constructor(
    private readonly approveCaseService: ApproveCaseService,
    private readonly archiveCaseService: ArchiveCaseService,
    private readonly cancelCaseService: CancelCaseService,
    private readonly closeCaseService: CloseCaseService,
    private readonly createCaseService: CreateCaseService,
    private readonly listCasesService: ListCasesService,
    private readonly getCaseByIdService: GetCaseByIdService,
    private readonly completeCaseStepService: CompleteCaseStepService,
    private readonly caseCommentService: PrismaCaseCommentService,
    private readonly caseSlaService: InMemoryCaseSlaService,
    private readonly reopenCaseService: ReopenCaseService,
    private readonly casePresenter: CasePresenterService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an onboarding case' })
  @ApiCreatedResponse({ type: CaseResponseDto })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async createCase(
    @Body() request: CreateCaseRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<CaseResponseDto> {
    try {
      // F-93 / D-103-write-path — thread the request principal into the
      // service command so the new CaseRecord row gets createdByPersonId.
      const actorId =
        httpRequest.principal?.personId ?? httpRequest.principal?.userId;
      const caseRecord = await this.createCaseService.execute({ ...request, actorId });
      await this.completeCaseStepService.initializeSteps(caseRecord.id, caseRecord.caseType.key);
      return this.casePresenter.presentSingle(caseRecord);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Case creation failed.',
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'List cases' })
  @ApiQuery({ name: 'caseTypeKey', required: false, type: String })
  @ApiQuery({ name: 'ownerPersonId', required: false, type: String })
  @ApiQuery({ name: 'subjectPersonId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: ListCasesResponseDto })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async listCases(@Query() query: ListCasesQueryDto): Promise<ListCasesResponseDto> {
    const result = await this.listCasesService.execute(query);
    return {
      items: await this.casePresenter.presentMany(result.items),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a case by id' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse({ description: 'Case not found.' })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async getCaseById(@Param('id', ParseUUIDPipe) id: string): Promise<CaseResponseDto> {
    const caseRecord = await this.getCaseByIdService.execute(id);

    if (!caseRecord) {
      throw new NotFoundException('Case not found.');
    }

    return this.casePresenter.presentSingle(caseRecord);
  }

  @Get(':id/steps')
  @ApiOperation({ summary: 'List steps for a case' })
  @ApiOkResponse({ description: 'Case steps' })
  @ApiNotFoundResponse({ description: 'Case not found.' })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async listCaseSteps(@Param('id', ParseUUIDPipe) id: string): Promise<CaseStepDto[]> {
    return this.completeCaseStepService.listSteps(id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a case (transition to COMPLETED)' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse({ description: 'Case not found.' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async closeCase(@Param('id', ParseUUIDPipe) id: string): Promise<CaseResponseDto> {
    try {
      return this.casePresenter.presentSingle(await this.closeCaseService.execute(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Case close failed.';
      if (message === 'Case not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':id/open')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reopen a closed or cancelled case (transition to OPEN)' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse({ description: 'Case not found.' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async reopenCase(@Param('id', ParseUUIDPipe) id: string): Promise<CaseResponseDto> {
    try {
      return this.casePresenter.presentSingle(await this.reopenCaseService.execute(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Case reopen failed.';
      if (message === 'Case not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a case' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse({ description: 'Case not found.' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async cancelCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: CancelCaseRequestDto,
  ): Promise<CaseResponseDto> {
    try {
      return this.casePresenter.presentSingle(
        await this.cancelCaseService.execute({ caseId: id, reason: request.reason }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Case cancel failed.';
      if (message === 'Case not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a case (transition OPEN/IN_PROGRESS to APPROVED)' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse({ description: 'Case not found.' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async approveCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _request: ApproveCaseRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<CaseResponseDto> {
    try {
      const actorId =
        httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
      return this.casePresenter.presentSingle(
        await this.approveCaseService.approve({ caseId: id, actorId }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Case approve failed.';
      if (message === 'Case not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a case (transition OPEN/IN_PROGRESS to REJECTED)' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse({ description: 'Case not found.' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async rejectCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: RejectCaseRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<CaseResponseDto> {
    try {
      const actorId =
        httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
      return this.casePresenter.presentSingle(
        await this.approveCaseService.reject({ caseId: id, actorId, reason: request.reason }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Case reject failed.';
      if (message === 'Case not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a case' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse({ description: 'Case not found.' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async archiveCase(@Param('id', ParseUUIDPipe) id: string): Promise<CaseResponseDto> {
    try {
      return this.casePresenter.presentSingle(await this.archiveCaseService.execute(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Case archive failed.';
      if (message === 'Case not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':id/steps/:stepKey/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a case step as completed' })
  @ApiOkResponse({ description: 'Step completed' })
  @ApiNotFoundResponse({ description: 'Case step not found.' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async completeCaseStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepKey') stepKey: string,
  ): Promise<CaseStepDto> {
    try {
      return await this.completeCaseStepService.execute(id, stepKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Case step completion failed.';

      if (message === 'Case step not found.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }

  @Post(':id/steps')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a custom step to a case' })
  @ApiCreatedResponse({ description: 'Step added' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async addCaseStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddCaseStepRequestDto,
  ): Promise<CaseStepDto> {
    try {
      return await this.completeCaseStepService.addStep(id, body.displayName, body.stepKey);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Failed to add step.');
    }
  }

  @Post(':id/steps/:stepKey/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a step from a case' })
  @ApiOkResponse({ description: 'Step removed' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async removeCaseStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepKey') stepKey: string,
  ): Promise<{ success: boolean }> {
    try {
      await this.completeCaseStepService.removeStep(id, stepKey);
      return { success: true };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Failed to remove step.');
    }
  }

  @Post(':id/participants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a participant to a case' })
  @ApiCreatedResponse({ description: 'Participant added' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async addParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddCaseParticipantRequestDto,
  ): Promise<{ id: string; participants: Array<{ personId: string; role: string }> }> {
    const caseRecord = await this.getCaseByIdService.execute(id);
    if (!caseRecord) {
      throw new NotFoundException('Case not found.');
    }
    try {
      caseRecord.addParticipant(body.personId, body.role as 'APPROVER' | 'OBSERVER' | 'OPERATOR' | 'REVIEWER' | 'REQUESTER' | 'SUBJECT');
      // Re-save handled by getCaseByIdService for in-memory; in Prisma would need save()
      return { id: caseRecord.id, participants: caseRecord.participants.map((p) => ({ personId: p.personId, role: p.role })) };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Failed to add participant.');
    }
  }

  @Post(':id/participants/:personId/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a participant from a case' })
  @ApiOkResponse({ description: 'Participant removed' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async removeParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('personId') personId: string,
  ): Promise<{ success: boolean }> {
    const caseRecord = await this.getCaseByIdService.execute(id);
    if (!caseRecord) {
      throw new NotFoundException('Case not found.');
    }
    try {
      caseRecord.removeParticipant(personId);
      return { success: true };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Failed to remove participant.');
    }
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List comments on a case' })
  @ApiOkResponse({ description: 'Case comments' })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async listCaseComments(@Param('id', ParseUUIDPipe) id: string): Promise<CaseCommentDto[]> {
    return this.caseCommentService.listComments(id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment to a case' })
  @ApiCreatedResponse({ description: 'Comment added' })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async addCaseComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddCaseNoteRequestDto,
  ): Promise<CaseCommentDto> {
    try {
      return await this.caseCommentService.addComment(id, body.authorPersonId, body.body);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Failed to add comment.');
    }
  }

  @Get(':id/sla')
  @ApiOperation({ summary: 'Get SLA status for a case' })
  @ApiOkResponse({ description: 'SLA status' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async getCaseSlaStatus(@Param('id', ParseUUIDPipe) id: string) {
    const caseRecord = await this.getCaseByIdService.execute(id);
    if (!caseRecord) {
      throw new NotFoundException('Case not found.');
    }
    return this.caseSlaService.computeSlaStatus(
      id,
      caseRecord.caseType.key,
      caseRecord.openedAt.toISOString(),
    );
  }

  @Get('sla/config')
  @ApiOperation({ summary: 'Get SLA hours configuration per case type' })
  @ApiOkResponse({ description: 'SLA config' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public getSlaConfig(): Record<string, number> {
    return this.caseSlaService.getSlaConfig();
  }

  @Post('sla/config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update SLA hours for a case type' })
  @ApiOkResponse({ description: 'Updated SLA config' })
  @RequireRoles('admin')
  public updateSlaConfig(@Body() body: UpdateSlaConfigRequestDto): Record<string, number> {
    this.caseSlaService.updateSlaHours(body.caseType, body.hours);
    return this.caseSlaService.getSlaConfig();
  }

}
