import { BadRequestException, Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { RadiatorSnapshotDto } from './contracts/radiator.dto';
import { RadiatorNotificationService } from './radiator-notification.service';
import { SUB_DIMENSION_KEYS, SUB_DIMENSION_QUADRANT, SubDimensionKey } from './radiator-scorers';
import { RadiatorScoringService } from './radiator-scoring.service';

const MIN_REASON_LENGTH = 10;

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class RadiatorOverrideService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: RadiatorScoringService,
    private readonly notificationService: RadiatorNotificationService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async applyOverride(
    projectId: string,
    subDimensionKey: string,
    overrideScore: number,
    reason: string,
    personId: string,
  ): Promise<RadiatorSnapshotDto> {
    if (overrideScore < 0 || overrideScore > 4 || !Number.isInteger(overrideScore)) {
      throw new BadRequestException('overrideScore must be an integer between 0 and 4');
    }
    if (!reason || reason.length < MIN_REASON_LENGTH) {
      throw new BadRequestException(`reason must be at least ${MIN_REASON_LENGTH} characters`);
    }
    if (!(SUB_DIMENSION_KEYS as readonly string[]).includes(subDimensionKey)) {
      throw new BadRequestException(`Invalid subDimensionKey: ${subDimensionKey}`);
    }

    const weekStart = startOfIsoWeek(new Date());
    const snapshot = await this.prisma.projectRagSnapshot.upsert({
      where: { projectId_weekStarting: { projectId, weekStarting: weekStart } },
      create: {
        projectId,
        weekStarting: weekStart,
        staffingRag: 'GREEN',
        scheduleRag: 'GREEN',
        budgetRag: 'GREEN',
        overallRag: 'GREEN',
        recordedByPersonId: personId,
      },
      update: { updatedAt: new Date() },
    });

    const current = await this.scoringService.computeRadiator(projectId);
    const sub = current.quadrants.flatMap((q) => q.subs).find((s) => s.key === subDimensionKey);
    const autoScore = sub?.autoScore ?? null;

    await this.prisma.projectRadiatorOverride.create({
      data: {
        snapshotId: snapshot.id,
        subDimensionKey,
        autoScore,
        overrideScore,
        reason,
        overriddenByPersonId: personId,
      },
    });

    this.scoringService.invalidateCache(projectId);
    const updated = await this.scoringService.computeRadiator(projectId);

    await this.prisma.projectRagSnapshot.update({
      where: { id: snapshot.id },
      data: {
        scopeScore: updated.quadrants[0].score,
        scheduleScore: updated.quadrants[1].score,
        budgetScore: updated.quadrants[2].score,
        peopleScore: updated.quadrants[3].score,
        overallScore: updated.overallScore,
      },
    });

    const quadrant = SUB_DIMENSION_QUADRANT[subDimensionKey as SubDimensionKey];

    this.auditLogger?.record({
      actionType: 'radiator.override',
      actorId: personId,
      category: 'project',
      changeSummary: `Override ${subDimensionKey} on project ${projectId}: auto=${autoScore} → override=${overrideScore}`,
      details: { subDimensionKey, autoScore, overrideScore, reason, projectId },
      metadata: { subDimensionKey, autoScore, overrideScore, reason, projectId, quadrant },
      targetEntityId: snapshot.id,
      targetEntityType: 'PROJECT_RADIATOR',
    });

    if (autoScore !== null && autoScore >= 2 && overrideScore <= 1) {
      await this.notificationService.notifyDrop(projectId, subDimensionKey, overrideScore);
    }

    return updated;
  }
}
