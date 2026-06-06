import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestType } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * LEAN-P4-missing-13 — admin LeavePolicy CRUD service.
 *
 * Backs the /admin Leave Policies surface so tenant admins can configure
 * default entitlement, max carry-over, and the approval-chain role list
 * per leave type. `list()` exposes both active and inactive rows so the
 * admin UI can flip a policy back on; consumers that want only the
 * effective configuration filter by `active = true` themselves.
 */

export interface LeavePolicyDto {
  id: string;
  publicId: string | null;
  name: string;
  leaveType: LeaveRequestType;
  accrualPerYear: number;
  maxCarryOver: number;
  approvalChain: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdByPersonId: string | null;
  updatedByPersonId: string | null;
}

export interface CreateLeavePolicyInput {
  name: string;
  leaveType: LeaveRequestType;
  accrualPerYear: number;
  maxCarryOver: number;
  approvalChain: string[];
  active?: boolean;
}

export interface UpdateLeavePolicyInput {
  name?: string;
  leaveType?: LeaveRequestType;
  accrualPerYear?: number;
  maxCarryOver?: number;
  approvalChain?: string[];
  active?: boolean;
}

@Injectable()
export class LeavePolicyService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(includeInactive = true): Promise<LeavePolicyDto[]> {
    const policies = await this.prisma.leavePolicy.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ leaveType: 'asc' }, { createdAt: 'desc' }],
    });
    return policies.map((p) => this.toDto(p));
  }

  public async findById(id: string): Promise<LeavePolicyDto> {
    const policy = await this.prisma.leavePolicy.findUnique({ where: { id } });
    if (!policy) {
      throw new NotFoundException(`Leave policy ${id} not found.`);
    }
    return this.toDto(policy);
  }

  public async create(input: CreateLeavePolicyInput, actorId: string): Promise<LeavePolicyDto> {
    const policy = await this.prisma.leavePolicy.create({
      data: {
        name: input.name,
        leaveType: input.leaveType,
        accrualPerYear: input.accrualPerYear,
        maxCarryOver: input.maxCarryOver,
        approvalChain: input.approvalChain,
        active: input.active ?? true,
        createdByPersonId: actorId,
        updatedByPersonId: actorId,
      },
    });
    return this.toDto(policy);
  }

  public async update(
    id: string,
    input: UpdateLeavePolicyInput,
    actorId: string,
  ): Promise<LeavePolicyDto> {
    const existing = await this.prisma.leavePolicy.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Leave policy ${id} not found.`);
    }
    const policy = await this.prisma.leavePolicy.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.leaveType !== undefined ? { leaveType: input.leaveType } : {}),
        ...(input.accrualPerYear !== undefined ? { accrualPerYear: input.accrualPerYear } : {}),
        ...(input.maxCarryOver !== undefined ? { maxCarryOver: input.maxCarryOver } : {}),
        ...(input.approvalChain !== undefined ? { approvalChain: input.approvalChain } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        updatedByPersonId: actorId,
      },
    });
    return this.toDto(policy);
  }

  /** Soft-delete: flips `active = false`. Hard-delete is intentionally
   *  unsupported; historical data lookups should keep working.
   */
  public async softDelete(id: string, actorId: string): Promise<LeavePolicyDto> {
    const existing = await this.prisma.leavePolicy.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Leave policy ${id} not found.`);
    }
    const policy = await this.prisma.leavePolicy.update({
      where: { id },
      data: { active: false, updatedByPersonId: actorId },
    });
    return this.toDto(policy);
  }

  private toDto(p: {
    id: string;
    publicId: string | null;
    name: string;
    leaveType: LeaveRequestType;
    accrualPerYear: number;
    maxCarryOver: number;
    approvalChain: string[];
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdByPersonId: string | null;
    updatedByPersonId: string | null;
  }): LeavePolicyDto {
    return {
      id: p.id,
      publicId: p.publicId,
      name: p.name,
      leaveType: p.leaveType,
      accrualPerYear: p.accrualPerYear,
      maxCarryOver: p.maxCarryOver,
      approvalChain: p.approvalChain,
      active: p.active,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      createdByPersonId: p.createdByPersonId,
      updatedByPersonId: p.updatedByPersonId,
    };
  }
}
