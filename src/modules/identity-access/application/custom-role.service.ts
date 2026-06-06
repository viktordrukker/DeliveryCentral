import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { isPlatformRole, PLATFORM_ROLES, type PlatformRole } from '../domain/platform-role';

/**
 * NEW-LGL-3 — tenant-defined custom roles.
 *
 * Bank ops add shapes like Squad Lead / Tribe Lead / IT Service Owner
 * without code changes. Built-in PlatformRole values (admin, director,
 * hr_manager, project_manager, resource_manager, delivery_manager,
 * employee) are NOT row-shaped — they remain compile-time constants and
 * cannot be modified or deleted through this surface.
 *
 * `roleKey` is a lowercase-with-underscores slug used as the stable
 * identity in IAM bindings. `inheritedRoles` is the set of built-in
 * platform roles whose permissions the custom role grants; downstream
 * permission resolution (Phase 6+) expands a person's role claims to
 * include the inherited set when they hold the custom role.
 *
 * Deactivation is soft — flips `deactivatedAt` so historical bindings
 * keep resolving. A custom role cannot be deactivated while it is
 * assigned to any person (the in-use check is delegated to the caller
 * for now; this service rejects the explicit `assignedCount > 0` case).
 */

const ROLE_KEY_PATTERN = /^[a-z][a-z0-9_]{1,62}[a-z0-9]$/;

/** Lowercase keys that are reserved for the seven built-in PlatformRole values. */
const RESERVED_KEYS = new Set<string>([...PLATFORM_ROLES]);

export interface CustomRoleDto {
  id: string;
  publicId: string | null;
  roleKey: string;
  displayName: string;
  description: string | null;
  inheritedRoles: PlatformRole[];
  isBuiltIn: boolean;
  active: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByPersonId: string | null;
  updatedByPersonId: string | null;
}

export interface CreateCustomRoleInput {
  roleKey: string;
  displayName: string;
  description?: string | null;
  inheritedRoles: string[];
}

export interface UpdateCustomRoleInput {
  displayName?: string;
  description?: string | null;
  inheritedRoles?: string[];
}

/**
 * The seven built-in role identities surfaced read-only alongside
 * custom roles so the admin UI can show "all roles in the tenant" in a
 * single list.
 */
export interface BuiltInRoleDescriptor {
  roleKey: PlatformRole;
  displayName: string;
  description: string;
  isBuiltIn: true;
  active: true;
}

export const BUILT_IN_ROLES: BuiltInRoleDescriptor[] = [
  { roleKey: 'admin', displayName: 'Administrator', description: 'Full platform access.', isBuiltIn: true, active: true },
  { roleKey: 'director', displayName: 'Director', description: 'Executive governance and approval.', isBuiltIn: true, active: true },
  { roleKey: 'hr_manager', displayName: 'HR Manager', description: 'People data governance and HR workflows.', isBuiltIn: true, active: true },
  { roleKey: 'delivery_manager', displayName: 'Delivery Manager', description: 'Delivery oversight across projects.', isBuiltIn: true, active: true },
  { roleKey: 'project_manager', displayName: 'Project Manager', description: 'Project-level planning and execution.', isBuiltIn: true, active: true },
  { roleKey: 'resource_manager', displayName: 'Resource Manager', description: 'Capacity, allocation, and bench governance.', isBuiltIn: true, active: true },
  { roleKey: 'employee', displayName: 'Employee', description: 'Authenticated baseline access.', isBuiltIn: true, active: true },
];

@Injectable()
export class CustomRoleService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(includeDeactivated = true): Promise<CustomRoleDto[]> {
    const rows = await this.prisma.customRole.findMany({
      where: includeDeactivated ? {} : { deactivatedAt: null },
      orderBy: [{ deactivatedAt: 'asc' }, { displayName: 'asc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  public async findById(id: string): Promise<CustomRoleDto> {
    const row = await this.prisma.customRole.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Custom role ${id} not found.`);
    return this.toDto(row);
  }

  public async create(input: CreateCustomRoleInput, actorId: string): Promise<CustomRoleDto> {
    this.validateRoleKey(input.roleKey);
    const inherited = this.validateInheritedRoles(input.inheritedRoles);

    if (RESERVED_KEYS.has(input.roleKey)) {
      throw new BadRequestException(
        `Role key "${input.roleKey}" is reserved for a built-in platform role and cannot be reused.`,
      );
    }

    const existing = await this.prisma.customRole.findUnique({ where: { roleKey: input.roleKey } });
    if (existing) {
      throw new ConflictException(`Custom role with key "${input.roleKey}" already exists.`);
    }

    const row = await this.prisma.customRole.create({
      data: {
        roleKey: input.roleKey,
        displayName: input.displayName.trim(),
        description: input.description?.trim() || null,
        inheritedRoles: inherited,
        isBuiltIn: false,
        createdByPersonId: actorId,
        updatedByPersonId: actorId,
      },
    });
    return this.toDto(row);
  }

  public async update(
    id: string,
    input: UpdateCustomRoleInput,
    actorId: string,
  ): Promise<CustomRoleDto> {
    const existing = await this.prisma.customRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Custom role ${id} not found.`);
    if (existing.isBuiltIn) {
      throw new BadRequestException(
        `Custom role "${existing.roleKey}" is built-in and cannot be modified.`,
      );
    }

    const data: {
      displayName?: string;
      description?: string | null;
      inheritedRoles?: string[];
      updatedByPersonId: string;
    } = { updatedByPersonId: actorId };

    if (input.displayName !== undefined) {
      data.displayName = input.displayName.trim();
    }
    if (input.description !== undefined) {
      data.description = input.description === null ? null : input.description.trim() || null;
    }
    if (input.inheritedRoles !== undefined) {
      data.inheritedRoles = this.validateInheritedRoles(input.inheritedRoles);
    }

    const row = await this.prisma.customRole.update({ where: { id }, data });
    return this.toDto(row);
  }

  /**
   * Soft-delete via `deactivatedAt`. Caller-supplied `assignedCount`
   * blocks the operation when the role is currently bound to one or
   * more people; the binding store lives outside this service (Phase 6+
   * person↔role mapping table).
   */
  public async deactivate(
    id: string,
    actorId: string,
    assignedCount = 0,
  ): Promise<CustomRoleDto> {
    const existing = await this.prisma.customRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Custom role ${id} not found.`);
    if (existing.isBuiltIn) {
      throw new BadRequestException(
        `Custom role "${existing.roleKey}" is built-in and cannot be deactivated.`,
      );
    }
    if (assignedCount > 0) {
      throw new ConflictException(
        `Cannot deactivate custom role "${existing.roleKey}": ${assignedCount} person(s) currently hold it.`,
      );
    }

    const row = await this.prisma.customRole.update({
      where: { id },
      data: { deactivatedAt: new Date(), updatedByPersonId: actorId },
    });
    return this.toDto(row);
  }

  public async reactivate(id: string, actorId: string): Promise<CustomRoleDto> {
    const existing = await this.prisma.customRole.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Custom role ${id} not found.`);
    if (existing.isBuiltIn) {
      throw new BadRequestException(
        `Custom role "${existing.roleKey}" is built-in and cannot be reactivated.`,
      );
    }
    const row = await this.prisma.customRole.update({
      where: { id },
      data: { deactivatedAt: null, updatedByPersonId: actorId },
    });
    return this.toDto(row);
  }

  /** PlatformRole catalog surfaced to the FE permission-checklist UI. */
  public listAvailablePermissions(): PlatformRole[] {
    return [...PLATFORM_ROLES];
  }

  public listBuiltInRoles(): BuiltInRoleDescriptor[] {
    return BUILT_IN_ROLES;
  }

  private validateRoleKey(roleKey: string): void {
    if (!ROLE_KEY_PATTERN.test(roleKey)) {
      throw new BadRequestException(
        'Role key must be a 3-64 char slug: lowercase letters, digits, underscores; start with a letter, end with a letter or digit.',
      );
    }
  }

  private validateInheritedRoles(raw: string[]): PlatformRole[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new BadRequestException(
        'inheritedRoles must contain at least one built-in platform role.',
      );
    }
    const seen = new Set<string>();
    for (const r of raw) {
      if (!isPlatformRole(r)) {
        throw new BadRequestException(`Unknown platform role: "${r}".`);
      }
      if (seen.has(r)) {
        throw new BadRequestException(`Duplicate role in inheritedRoles: "${r}".`);
      }
      seen.add(r);
    }
    return raw as PlatformRole[];
  }

  private toDto(p: {
    id: string;
    publicId: string | null;
    roleKey: string;
    displayName: string;
    description: string | null;
    inheritedRoles: string[];
    isBuiltIn: boolean;
    deactivatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdByPersonId: string | null;
    updatedByPersonId: string | null;
  }): CustomRoleDto {
    return {
      id: p.id,
      publicId: p.publicId,
      roleKey: p.roleKey,
      displayName: p.displayName,
      description: p.description,
      inheritedRoles: p.inheritedRoles.filter(isPlatformRole),
      isBuiltIn: p.isBuiltIn,
      active: p.deactivatedAt === null,
      deactivatedAt: p.deactivatedAt ? p.deactivatedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      createdByPersonId: p.createdByPersonId,
      updatedByPersonId: p.updatedByPersonId,
    };
  }
}
