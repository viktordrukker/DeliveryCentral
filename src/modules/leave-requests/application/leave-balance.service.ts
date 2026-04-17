import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { LeaveRequestType } from '@prisma/client';

export interface LeaveBalanceDto {
  id: string;
  personId: string;
  year: number;
  leaveType: string;
  entitlement: number;
  used: number;
  pending: number;
  remaining: number;
}

@Injectable()
export class LeaveBalanceService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getBalances(personId: string, year?: number): Promise<LeaveBalanceDto[]> {
    const targetYear = year ?? new Date().getUTCFullYear();
    const balances = await this.prisma.leaveBalance.findMany({
      where: { personId, year: targetYear },
      orderBy: { leaveType: 'asc' },
    });
    return balances.map((b) => ({
      id: b.id,
      personId: b.personId,
      year: b.year,
      leaveType: b.leaveType,
      entitlement: Number(b.entitlement),
      used: Number(b.used),
      pending: Number(b.pending),
      remaining: Number(b.entitlement) - Number(b.used) - Number(b.pending),
    }));
  }

  /** Ensure a balance record exists for a person/year/type. Creates with default entitlement if missing. */
  public async ensureBalance(personId: string, year: number, leaveType: LeaveRequestType, defaultEntitlement: number): Promise<void> {
    await this.prisma.leaveBalance.upsert({
      where: { personId_year_leaveType: { personId, year, leaveType } },
      create: { personId, year, leaveType, entitlement: defaultEntitlement },
      update: {},
    });
  }

  /** Deduct days from balance when leave is approved. */
  public async deduct(personId: string, year: number, leaveType: LeaveRequestType, days: number): Promise<void> {
    await this.prisma.leaveBalance.update({
      where: { personId_year_leaveType: { personId, year, leaveType } },
      data: {
        used: { increment: days },
        pending: { decrement: days },
      },
    });
  }

  /** Add pending days when leave is requested. */
  public async addPending(personId: string, year: number, leaveType: LeaveRequestType, days: number): Promise<void> {
    await this.prisma.leaveBalance.update({
      where: { personId_year_leaveType: { personId, year, leaveType } },
      data: { pending: { increment: days } },
    });
  }

  /** Restore pending days when leave is rejected or cancelled. */
  public async restorePending(personId: string, year: number, leaveType: LeaveRequestType, days: number): Promise<void> {
    await this.prisma.leaveBalance.update({
      where: { personId_year_leaveType: { personId, year, leaveType } },
      data: { pending: { decrement: days } },
    });
  }

  /** Restore used days when an approved leave is cancelled. */
  public async restoreUsed(personId: string, year: number, leaveType: LeaveRequestType, days: number): Promise<void> {
    await this.prisma.leaveBalance.update({
      where: { personId_year_leaveType: { personId, year, leaveType } },
      data: { used: { decrement: days } },
    });
  }
}
