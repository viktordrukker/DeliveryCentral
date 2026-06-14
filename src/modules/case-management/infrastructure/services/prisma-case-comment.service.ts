import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface CaseCommentDto {
  authorPersonId: string;
  // SC-7 — resolved author name (list path) so the Author column never shows a UUID.
  authorPersonName?: string;
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
      data: {
        payload: { ...payload, comments } as unknown as Prisma.InputJsonValue,
        // F-130 / D-103-write-path round 40 — track commenter as the editor.
        updatedByPersonId: authorPersonId,
      },
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
    const comments = Array.isArray(payload.comments) ? (payload.comments as CaseCommentDto[]) : [];
    if (comments.length === 0) return comments;

    // SC-7 — batch-resolve author display names (comments are stored in JSON
    // without a name; CaseComment has no relation).
    const authorIds = [...new Set(comments.map((c) => c.authorPersonId).filter(Boolean))];
    const people = await this.prisma.person.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, displayName: true },
    });
    const nameById = new Map(people.map((p) => [p.id, p.displayName]));
    return comments.map((c) => ({ ...c, authorPersonName: nameById.get(c.authorPersonId) }));
  }
}
