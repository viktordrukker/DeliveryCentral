import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

// HD-3 — bill-rate resolution per J2.
//
// At BOOKED transition the resolver picks ONE rate-card entry and pins
// `appliedRateCardEntryId` + `effectiveBillRate` on the assignment row.
// The 5-layer precedence (highest → lowest):
//
//   1. EXPLICIT      — caller supplies an entry id (admin override).
//   2. CLIENT_FULL   — client-scoped card, role + grade match, all
//                      requiredSkills held by the person.
//   3. CLIENT_BASIC  — client-scoped card, role + grade match, no
//                      requiredSkills constraint (or empty list).
//   4. TENANT_FULL   — tenant-default card (clientId NULL), role + grade
//                      match, all requiredSkills held by the person.
//   5. TENANT_BASIC  — tenant-default card, role + grade match, no
//                      requiredSkills constraint.
//
// "Active" means `isActive=true`, not archived, and the assignment's
// `validFrom` falls inside the card's [validFrom, validTo] window.
// Multiple equally-specific matches in the same layer break by the
// most-recently-updated entry (then by entry id for determinism).

export interface BillRateResolutionInput {
  // The assignment we're booking. Pin happens against this row.
  staffingRole: string;
  // Person grade key from the tenant's `grade` MetadataDictionary.
  personGrade: string | null;
  // Skill keys the person currently holds. Used to filter
  // requiredSkills-bearing entries.
  personSkills: readonly string[];
  // The project's client. NULL → only tenant-default cards considered.
  clientId: string | null;
  // The assignment's start date — controls which cards are "active".
  assignmentValidFrom: Date;
  // Tenant scope. Cards with NULL tenantId are visible across tenants
  // (single-tenant deployments per J1). When supplied, the resolver
  // matches both NULL and the supplied tenantId.
  tenantId?: string | null;
  // Optional explicit override (Layer 1).
  explicitEntryId?: string | null;
}

export interface BillRateResolution {
  // The chosen entry row. NULL when nothing matched.
  entryId: string | null;
  rateCardId: string | null;
  hourlyRate: Prisma.Decimal | null;
  currencyCode: string | null;
  // Which precedence layer fired. Useful for audit + the missing-rate
  // banner ('NONE' = no match found).
  resolvedBy:
    | 'EXPLICIT'
    | 'CLIENT_FULL'
    | 'CLIENT_BASIC'
    | 'TENANT_FULL'
    | 'TENANT_BASIC'
    | 'NONE';
}

interface CardWithEntries {
  id: string;
  currencyCode: string;
  clientId: string | null;
  validFrom: Date;
  validTo: Date | null;
  entries: EntryRow[];
}

interface EntryRow {
  id: string;
  rateCardId: string;
  staffingRole: string;
  grade: string;
  requiredSkills: string[];
  hourlyRate: Prisma.Decimal;
  isActive: boolean;
  archivedAt: Date | null;
  updatedAt: Date;
}

const NONE: BillRateResolution = {
  entryId: null,
  rateCardId: null,
  hourlyRate: null,
  currencyCode: null,
  resolvedBy: 'NONE',
};

@Injectable()
export class EffectiveBillRateResolverService {
  private readonly logger = new Logger(EffectiveBillRateResolverService.name);

  public constructor(private readonly prisma: PrismaService) {}

  public async resolve(input: BillRateResolutionInput): Promise<BillRateResolution> {
    // Layer 1 — explicit override.
    if (input.explicitEntryId) {
      const entry = await this.prisma.rateCardEntry.findUnique({
        where: { id: input.explicitEntryId },
        include: { rateCard: true },
      });
      if (entry && entry.isActive && entry.archivedAt === null) {
        return {
          entryId: entry.id,
          rateCardId: entry.rateCardId,
          hourlyRate: entry.hourlyRate,
          currencyCode: entry.rateCard.currencyCode,
          resolvedBy: 'EXPLICIT',
        };
      }
      this.logger.warn(
        `Explicit rate card entry ${input.explicitEntryId} is missing or inactive; falling through to layered resolution.`,
      );
    }

    if (!input.personGrade) return NONE;

    // Pull all active cards in scope (tenant + client). One query, then
    // filter in memory — a tenant should never have more than O(10²)
    // cards so this is cheaper than juggling four findMany calls.
    const cards = await this.fetchCandidateCards(input);
    if (cards.length === 0) return NONE;

    const personSkillSet = new Set(input.personSkills);
    // Client-scoped cards only count when the assignment HAS a client.
    // When input.clientId is null, all in-scope cards are tenant defaults
    // and resolve at the TENANT_* layers (not CLIENT_*).
    const clientCards = input.clientId
      ? cards.filter((c) => c.clientId === input.clientId)
      : [];
    const tenantCards = cards.filter((c) => c.clientId === null);

    // Layers 2 → 5.
    return (
      this.bestMatch(clientCards, input, personSkillSet, true, 'CLIENT_FULL') ??
      this.bestMatch(clientCards, input, personSkillSet, false, 'CLIENT_BASIC') ??
      this.bestMatch(tenantCards, input, personSkillSet, true, 'TENANT_FULL') ??
      this.bestMatch(tenantCards, input, personSkillSet, false, 'TENANT_BASIC') ??
      NONE
    );
  }

  private async fetchCandidateCards(
    input: BillRateResolutionInput,
  ): Promise<CardWithEntries[]> {
    const tenantWhere =
      input.tenantId !== undefined
        ? { OR: [{ tenantId: null }, { tenantId: input.tenantId }] }
        : {};
    const clientWhere = input.clientId
      ? { OR: [{ clientId: null }, { clientId: input.clientId }] }
      : { clientId: null };

    return this.prisma.rateCard.findMany({
      where: {
        isActive: true,
        archivedAt: null,
        validFrom: { lte: input.assignmentValidFrom },
        OR: [{ validTo: null }, { validTo: { gte: input.assignmentValidFrom } }],
        ...tenantWhere,
        ...clientWhere,
      },
      include: {
        entries: {
          where: {
            staffingRole: input.staffingRole,
            grade: input.personGrade ?? undefined,
            isActive: true,
            archivedAt: null,
          },
        },
      },
    });
  }

  private bestMatch(
    cards: CardWithEntries[],
    input: BillRateResolutionInput,
    personSkillSet: Set<string>,
    requireSkills: boolean,
    layer: BillRateResolution['resolvedBy'],
  ): BillRateResolution | null {
    const candidates: Array<{ card: CardWithEntries; entry: EntryRow }> = [];
    for (const card of cards) {
      for (const entry of card.entries) {
        const hasSkills = entry.requiredSkills.length > 0;
        if (requireSkills) {
          if (!hasSkills) continue;
          if (!entry.requiredSkills.every((s) => personSkillSet.has(s))) continue;
        } else {
          if (hasSkills) continue;
        }
        candidates.push({ card, entry });
      }
    }
    if (candidates.length === 0) return null;
    // Tie-break: most recently updated entry first, then entry id desc
    // for determinism when the timestamps collide (e.g., bulk seed).
    candidates.sort((a, b) => {
      const t = b.entry.updatedAt.getTime() - a.entry.updatedAt.getTime();
      if (t !== 0) return t;
      return b.entry.id.localeCompare(a.entry.id);
    });
    const winner = candidates[0];
    return {
      entryId: winner.entry.id,
      rateCardId: winner.entry.rateCardId,
      hourlyRate: winner.entry.hourlyRate,
      currencyCode: winner.card.currencyCode,
      resolvedBy: layer,
    };
  }
}
