import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface ClientDto {
  id: string;
  name: string;
  industry: string | null;
  accountManagerPersonId: string | null;
  accountManagerDisplayName: string | null;
  notes: string | null;
  isActive: boolean;
  projectCount: number;
}

export interface CreateClientDto {
  name: string;
  industry?: string;
  accountManagerPersonId?: string;
  notes?: string;
}

export interface UpdateClientDto {
  name?: string;
  industry?: string;
  accountManagerPersonId?: string;
  notes?: string;
  isActive?: boolean;
}

@Injectable()
export class ClientService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(activeOnly = true): Promise<ClientDto[]> {
    const clients = await this.prisma.client.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: {
        accountManager: { select: { id: true, displayName: true } },
        _count: { select: { projects: true } },
      },
      orderBy: { name: 'asc' },
    });

    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      accountManagerPersonId: c.accountManagerPersonId,
      accountManagerDisplayName: c.accountManager?.displayName ?? null,
      notes: c.notes,
      isActive: c.isActive,
      projectCount: c._count.projects,
    }));
  }

  public async getById(id: string): Promise<ClientDto> {
    const c = await this.prisma.client.findUnique({
      where: { id },
      include: {
        accountManager: { select: { id: true, displayName: true } },
        _count: { select: { projects: true } },
      },
    });

    if (!c) throw new NotFoundException('Client not found.');

    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      accountManagerPersonId: c.accountManagerPersonId,
      accountManagerDisplayName: c.accountManager?.displayName ?? null,
      notes: c.notes,
      isActive: c.isActive,
      projectCount: c._count.projects,
    };
  }

  public async create(dto: CreateClientDto): Promise<ClientDto> {
    const c = await this.prisma.client.create({
      data: {
        name: dto.name,
        industry: dto.industry ?? null,
        accountManagerPersonId: dto.accountManagerPersonId ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        accountManager: { select: { id: true, displayName: true } },
        _count: { select: { projects: true } },
      },
    });

    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      accountManagerPersonId: c.accountManagerPersonId,
      accountManagerDisplayName: c.accountManager?.displayName ?? null,
      notes: c.notes,
      isActive: c.isActive,
      projectCount: c._count.projects,
    };
  }

  public async update(id: string, dto: UpdateClientDto): Promise<ClientDto> {
    const c = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
        ...(dto.accountManagerPersonId !== undefined ? { accountManagerPersonId: dto.accountManagerPersonId } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        accountManager: { select: { id: true, displayName: true } },
        _count: { select: { projects: true } },
      },
    });

    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      accountManagerPersonId: c.accountManagerPersonId,
      accountManagerDisplayName: c.accountManager?.displayName ?? null,
      notes: c.notes,
      isActive: c.isActive,
      projectCount: c._count.projects,
    };
  }
}
