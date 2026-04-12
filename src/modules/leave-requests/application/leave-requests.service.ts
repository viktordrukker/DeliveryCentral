import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface CreateLeaveRequestDto {
  endDate: string;
  notes?: string;
  personId: string;
  startDate: string;
  type: 'ANNUAL' | 'SICK' | 'OTHER';
}

export interface LeaveRequestDto {
  createdAt: string;
  endDate: string;
  id: string;
  notes: string | null;
  personId: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  startDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  type: 'ANNUAL' | 'SICK' | 'OTHER';
}

@Injectable()
export class LeaveRequestsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async create(dto: CreateLeaveRequestDto): Promise<LeaveRequestDto> {
    const record = await this.prisma.leaveRequest.create({
      data: {
        endDate: new Date(dto.endDate),
        notes: dto.notes ?? null,
        personId: dto.personId,
        startDate: new Date(dto.startDate),
        type: dto.type,
      },
    });
    return this.toDto(record);
  }

  public async findMy(personId: string): Promise<LeaveRequestDto[]> {
    const records = await this.prisma.leaveRequest.findMany({
      orderBy: { createdAt: 'desc' },
      where: { personId },
    });
    return records.map((r) => this.toDto(r));
  }

  public async findAll(personId?: string, status?: string): Promise<LeaveRequestDto[]> {
    const records = await this.prisma.leaveRequest.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        ...(personId ? { personId } : {}),
        ...(status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}),
      },
    });
    return records.map((r) => this.toDto(r));
  }

  public async approve(id: string, reviewerId: string): Promise<LeaveRequestDto> {
    const record = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Leave request not found');
    if (record.status !== 'PENDING') {
      throw new ForbiddenException('Only pending requests can be approved');
    }
    const updated = await this.prisma.leaveRequest.update({
      data: { reviewedAt: new Date(), reviewedBy: reviewerId, status: 'APPROVED' },
      where: { id },
    });
    return this.toDto(updated);
  }

  public async reject(id: string, reviewerId: string): Promise<LeaveRequestDto> {
    const record = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Leave request not found');
    if (record.status !== 'PENDING') {
      throw new ForbiddenException('Only pending requests can be rejected');
    }
    const updated = await this.prisma.leaveRequest.update({
      data: { reviewedAt: new Date(), reviewedBy: reviewerId, status: 'REJECTED' },
      where: { id },
    });
    return this.toDto(updated);
  }

  private toDto(record: {
    createdAt: Date;
    endDate: Date;
    id: string;
    notes: string | null;
    personId: string;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    startDate: Date;
    status: string;
    type: string;
  }): LeaveRequestDto {
    return {
      createdAt: record.createdAt.toISOString(),
      endDate: record.endDate.toISOString().slice(0, 10),
      id: record.id,
      notes: record.notes,
      personId: record.personId,
      reviewedAt: record.reviewedAt?.toISOString() ?? null,
      reviewedBy: record.reviewedBy,
      startDate: record.startDate.toISOString().slice(0, 10),
      status: record.status as 'PENDING' | 'APPROVED' | 'REJECTED',
      type: record.type as 'ANNUAL' | 'SICK' | 'OTHER',
    };
  }
}
