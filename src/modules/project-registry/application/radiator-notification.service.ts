import { Injectable } from '@nestjs/common';

import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

@Injectable()
export class RadiatorNotificationService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly inAppNotifications: InAppNotificationService,
  ) {}

  public async notifyDrop(
    projectId: string,
    subDimensionKey: string,
    newScore: number,
  ): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || !project.projectManagerId) return;

    const severity = newScore === 0 ? 'Critical' : 'Red';
    await this.inAppNotifications.createNotification(
      project.projectManagerId,
      'radiator.score.drop',
      `Score drop: ${project.name}`,
      `${subDimensionKey} dropped to ${severity}`,
      `/projects/${projectId}?tab=radiator`,
    );
  }

  public async notifySnapshotDrops(
    projectId: string,
    prevScores: Record<string, number>,
    newScores: Record<string, number>,
  ): Promise<void> {
    for (const [key, newScore] of Object.entries(newScores)) {
      const prev = prevScores[key];
      if (prev !== undefined && prev >= 2 && newScore <= 1) {
        await this.notifyDrop(projectId, key, newScore);
      }
    }
  }
}
