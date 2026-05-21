import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface CaseCommentDto {
  authorPersonId: string;
  body: string;
  createdAt: string;
  id: string;
}

@Injectable()
export class PrismaCaseCommentService {
  public constructor(private readonly prisma: PrismaService) {}

  public async addComment(caseId: string, authorPersonId: string, body: string): Promise<CaseCommentDto> {
    const comment: CaseCommentDto = {
      authorPersonId,
      body,
      createdAt: new Date().toISOString(),
      id: randomUUID(),
    };

    const caseRecord = await this.prisma.caseRecord.findUnique({
      select: { payload: true },
      where: { id: caseId },
    });

    const payload = (caseRecord?.payload as Record<string, unknown>) ?? {};
    const comments = Array.isArray(payload.comments) ? (payload.comments as CaseCommentDto[]) : [];
    comments.push(comment);

    await this.prisma.caseRecord.update({
      // F-65 / 20c-11 — the merged comments-array payload is structurally
      // compatible with `Prisma.InputJsonValue`; drop the `as unknown as`
      // indirection in favour of a direct cast.
      data: { payload: { ...payload, comments } as Prisma.InputJsonValue },
      where: { id: caseId },
    });

    return comment;
  }

  public async listComments(caseId: string): Promise<CaseCommentDto[]> {
    const caseRecord = await this.prisma.caseRecord.findUnique({
      select: { payload: true },
      where: { id: caseId },
    });

    const payload = (caseRecord?.payload as Record<string, unknown>) ?? {};
    return Array.isArray(payload.comments) ? (payload.comments as CaseCommentDto[]) : [];
  }
}
