import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

const NUDGE_TEMPLATE_KEY = 'approval-pending-nudge-email';
const NUDGE_EVENT_NAME = 'approval.pending.nudge';
const RATE_LIMIT_HOURS = 24;

export interface NudgeResult {
  notificationRequestId: string;
  status: string;
}

@Injectable()
export class NudgeService {
  public constructor(private readonly prisma: PrismaService) {}

  public async send(params: { requestId: string; approverId: string }): Promise<NudgeResult> {
    const { requestId, approverId } = params;

    const approver = await this.prisma.person.findUnique({
      where: { id: approverId },
      select: { id: true, primaryEmail: true, displayName: true },
    });
    if (!approver) {
      throw new NotFoundException('Approver not found.');
    }
    if (!approver.primaryEmail) {
      throw new HttpException('Approver has no email address on file.', HttpStatus.BAD_REQUEST);
    }

    const since = new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000);
    const recent = await this.prisma.notificationRequest.findFirst({
      where: {
        eventName: NUDGE_EVENT_NAME,
        recipient: approver.primaryEmail,
        requestedAt: { gte: since },
        payload: { path: ['requestId'], equals: requestId },
      },
      orderBy: { requestedAt: 'desc' },
      select: { id: true, requestedAt: true },
    });
    if (recent) {
      throw new HttpException(
        `Nudge for this approver was already sent within the last ${RATE_LIMIT_HOURS}h.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { templateKey: NUDGE_TEMPLATE_KEY },
      select: { id: true, channelId: true },
    });
    if (!template) {
      throw new NotFoundException(`Nudge template "${NUDGE_TEMPLATE_KEY}" not found. Run seed-notif-templates.js.`);
    }

    const created = await this.prisma.notificationRequest.create({
      data: {
        eventName: NUDGE_EVENT_NAME,
        templateId: template.id,
        channelId: template.channelId,
        recipient: approver.primaryEmail,
        payload: {
          requestId,
          approverId,
          approverDisplayName: approver.displayName,
        },
      },
      select: { id: true, status: true },
    });

    return { notificationRequestId: created.id, status: created.status };
  }
}
