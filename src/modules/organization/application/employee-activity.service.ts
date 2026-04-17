import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface RecordActivityCommand {
  actorId?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
  personId: string;
  relatedEntityId?: string;
  summary: string;
}

export interface EmployeeActivityEventDto {
  actorId: string | null;
  createdAt: string;
  eventType: string;
  id: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  personId: string;
  relatedEntityId: string | null;
  summary: string;
}

@Injectable()
export class EmployeeActivityService {
  public constructor(private readonly prisma: PrismaService) {}

  public async record(command: RecordActivityCommand): Promise<void> {
    await this.prisma.employeeActivityEvent.create({
      data: {
        actorId: command.actorId ?? null,
        eventType: command.eventType,
        metadata: command.metadata ? JSON.parse(JSON.stringify(command.metadata)) : undefined,
        occurredAt: command.occurredAt ?? new Date(),
        personId: command.personId,
        relatedEntityId: command.relatedEntityId ?? null,
        summary: command.summary,
      },
    });
  }

  public async listByPerson(personId: string, limit = 50): Promise<EmployeeActivityEventDto[]> {
    const events = await this.prisma.employeeActivityEvent.findMany({
      where: { personId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });

    return events.map((e) => ({
      actorId: e.actorId,
      createdAt: e.createdAt.toISOString(),
      eventType: e.eventType,
      id: e.id,
      metadata: e.metadata as Record<string, unknown> | null,
      occurredAt: e.occurredAt.toISOString(),
      personId: e.personId,
      relatedEntityId: e.relatedEntityId,
      summary: e.summary,
    }));
  }
}
