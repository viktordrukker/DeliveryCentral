import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface VendorDto {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contractType: string;
  skillAreas: string[];
  notes: string | null;
  isActive: boolean;
  engagementCount: number;
}

export interface CreateVendorDto {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contractType?: string;
  skillAreas?: string[];
  notes?: string;
}

export interface UpdateVendorDto {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contractType?: string;
  skillAreas?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface ProjectVendorEngagementDto {
  id: string;
  projectId: string;
  vendorId: string;
  vendorName: string;
  roleSummary: string;
  headcount: number;
  monthlyRate: number | null;
  blendedDayRate: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  notes: string | null;
}

export interface CreateVendorEngagementDto {
  vendorId: string;
  roleSummary: string;
  headcount?: number;
  monthlyRate?: number;
  blendedDayRate?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

@Injectable()
export class VendorService {
  public constructor(private readonly prisma: PrismaService) {}

  // ── Vendor Registry ─────────────────────────────────────────────────────

  public async listVendors(activeOnly = true): Promise<VendorDto[]> {
    const vendors = await this.prisma.vendor.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: { _count: { select: { engagements: true } } },
      orderBy: { name: 'asc' },
    });

    return vendors.map((v) => ({
      id: v.id,
      name: v.name,
      contactName: v.contactName,
      contactEmail: v.contactEmail,
      contractType: v.contractType,
      skillAreas: v.skillAreas,
      notes: v.notes,
      isActive: v.isActive,
      engagementCount: v._count.engagements,
    }));
  }

  public async getVendorById(id: string): Promise<VendorDto> {
    const v = await this.prisma.vendor.findUnique({
      where: { id },
      include: { _count: { select: { engagements: true } } },
    });
    if (!v) throw new NotFoundException('Vendor not found.');
    return {
      id: v.id, name: v.name, contactName: v.contactName, contactEmail: v.contactEmail,
      contractType: v.contractType, skillAreas: v.skillAreas, notes: v.notes,
      isActive: v.isActive, engagementCount: v._count.engagements,
    };
  }

  public async createVendor(dto: CreateVendorDto): Promise<VendorDto> {
    const v = await this.prisma.vendor.create({
      data: {
        name: dto.name,
        contactName: dto.contactName ?? null,
        contactEmail: dto.contactEmail ?? null,
        contractType: (dto.contractType as any) ?? 'STAFF_AUGMENTATION',
        skillAreas: dto.skillAreas ?? [],
        notes: dto.notes ?? null,
      },
      include: { _count: { select: { engagements: true } } },
    });
    return {
      id: v.id, name: v.name, contactName: v.contactName, contactEmail: v.contactEmail,
      contractType: v.contractType, skillAreas: v.skillAreas, notes: v.notes,
      isActive: v.isActive, engagementCount: v._count.engagements,
    };
  }

  public async updateVendor(id: string, dto: UpdateVendorDto): Promise<VendorDto> {
    const v = await this.prisma.vendor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
        ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail } : {}),
        ...(dto.contractType !== undefined ? { contractType: dto.contractType as any } : {}),
        ...(dto.skillAreas !== undefined ? { skillAreas: dto.skillAreas } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { _count: { select: { engagements: true } } },
    });
    return {
      id: v.id, name: v.name, contactName: v.contactName, contactEmail: v.contactEmail,
      contractType: v.contractType, skillAreas: v.skillAreas, notes: v.notes,
      isActive: v.isActive, engagementCount: v._count.engagements,
    };
  }

  // ── Project Vendor Engagements ──────────────────────────────────────────

  public async listProjectVendors(projectId: string): Promise<ProjectVendorEngagementDto[]> {
    const engagements = await this.prisma.projectVendorEngagement.findMany({
      where: { projectId },
      include: { vendor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return engagements.map((e) => ({
      id: e.id,
      projectId: e.projectId,
      vendorId: e.vendorId,
      vendorName: e.vendor.name,
      roleSummary: e.roleSummary,
      headcount: e.headcount,
      monthlyRate: e.monthlyRate ? Number(e.monthlyRate) : null,
      blendedDayRate: e.blendedDayRate ? Number(e.blendedDayRate) : null,
      startDate: e.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: e.endDate?.toISOString().slice(0, 10) ?? null,
      status: e.status,
      notes: e.notes,
    }));
  }

  public async assignVendor(projectId: string, dto: CreateVendorEngagementDto): Promise<ProjectVendorEngagementDto> {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found.');
    if (!vendor.isActive) throw new BadRequestException('Cannot assign an inactive vendor.');

    const e = await this.prisma.projectVendorEngagement.create({
      data: {
        projectId,
        vendorId: dto.vendorId,
        roleSummary: dto.roleSummary,
        headcount: dto.headcount ?? 1,
        monthlyRate: dto.monthlyRate ?? null,
        blendedDayRate: dto.blendedDayRate ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes ?? null,
      },
      include: { vendor: { select: { name: true } } },
    });

    return {
      id: e.id, projectId: e.projectId, vendorId: e.vendorId, vendorName: e.vendor.name,
      roleSummary: e.roleSummary, headcount: e.headcount,
      monthlyRate: e.monthlyRate ? Number(e.monthlyRate) : null,
      blendedDayRate: e.blendedDayRate ? Number(e.blendedDayRate) : null,
      startDate: e.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: e.endDate?.toISOString().slice(0, 10) ?? null,
      status: e.status, notes: e.notes,
    };
  }

  public async updateVendorEngagement(engagementId: string, dto: Partial<CreateVendorEngagementDto>): Promise<ProjectVendorEngagementDto> {
    const e = await this.prisma.projectVendorEngagement.update({
      where: { id: engagementId },
      data: {
        ...(dto.roleSummary !== undefined ? { roleSummary: dto.roleSummary } : {}),
        ...(dto.headcount !== undefined ? { headcount: dto.headcount } : {}),
        ...(dto.monthlyRate !== undefined ? { monthlyRate: dto.monthlyRate } : {}),
        ...(dto.blendedDayRate !== undefined ? { blendedDayRate: dto.blendedDayRate } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: { vendor: { select: { name: true } } },
    });

    return {
      id: e.id, projectId: e.projectId, vendorId: e.vendorId, vendorName: e.vendor.name,
      roleSummary: e.roleSummary, headcount: e.headcount,
      monthlyRate: e.monthlyRate ? Number(e.monthlyRate) : null,
      blendedDayRate: e.blendedDayRate ? Number(e.blendedDayRate) : null,
      startDate: e.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: e.endDate?.toISOString().slice(0, 10) ?? null,
      status: e.status, notes: e.notes,
    };
  }

  public async endVendorEngagement(engagementId: string, status: 'COMPLETED' | 'TERMINATED' = 'COMPLETED'): Promise<ProjectVendorEngagementDto> {
    const e = await this.prisma.projectVendorEngagement.update({
      where: { id: engagementId },
      data: { status, endDate: new Date() },
      include: { vendor: { select: { name: true } } },
    });

    return {
      id: e.id, projectId: e.projectId, vendorId: e.vendorId, vendorName: e.vendor.name,
      roleSummary: e.roleSummary, headcount: e.headcount,
      monthlyRate: e.monthlyRate ? Number(e.monthlyRate) : null,
      blendedDayRate: e.blendedDayRate ? Number(e.blendedDayRate) : null,
      startDate: e.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: e.endDate?.toISOString().slice(0, 10) ?? null,
      status: e.status, notes: e.notes,
    };
  }
}
