import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  HrActionCardDto,
  HrActionCardKind,
  HrActionCardSeverity,
} from './contracts/hr-action-card.dto';

/**
 * FE-#263 — HR action-cards aggregator.
 *
 * Computes the HR Actions tab payload from operational data. Each card
 * kind has a windowed lookup; rows are scored to a severity from the
 * remaining-days math, then merged + sorted server-side.
 *
 * Source fields (added by the paired migration `20260524_fe_263_hr_action_card_fields`):
 *   - Person.probationEndsAt → probation_ending (≤ 30d)
 *   - Person.contractEndsAt  → contract_expiring (≤ 60d)
 *   - Person.lastHrReviewAt  → hr_review_due (> 12 months ago)
 *   - PersonSkill.certificationExpiresAt + certified=true → certification_stale
 *
 * `missing_documentation` is intentionally not surfaced from this service
 * yet — the upstream HR data source for it is TBD and a "no rows" return
 * is the correct v1 behaviour rather than guessing.
 */
@Injectable()
export class HrActionCardsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async listActionCards(args?: {
    page?: number;
    pageSize?: number;
  }): Promise<HrActionCardDto[]> {
    const page = Math.max(1, args?.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, args?.pageSize ?? 50));

    const today = stripTime(new Date());
    const thirtyDaysOut = addDays(today, 30);
    const sixtyDaysOut = addDays(today, 60);
    const twelveMonthsAgo = addMonths(today, -12);

    const [probationRows, contractRows, reviewRows, certRows] = await Promise.all([
      this.prisma.person.findMany({
        where: {
          deletedAt: null,
          archivedAt: null,
          terminatedAt: null,
          probationEndsAt: { gte: today, lte: thirtyDaysOut },
        },
        select: { id: true, displayName: true, probationEndsAt: true },
        take: 200,
      }),
      this.prisma.person.findMany({
        where: {
          deletedAt: null,
          archivedAt: null,
          terminatedAt: null,
          contractEndsAt: { gte: today, lte: sixtyDaysOut },
        },
        select: { id: true, displayName: true, contractEndsAt: true },
        take: 200,
      }),
      this.prisma.person.findMany({
        where: {
          deletedAt: null,
          archivedAt: null,
          terminatedAt: null,
          OR: [{ lastHrReviewAt: null }, { lastHrReviewAt: { lte: twelveMonthsAgo } }],
        },
        select: { id: true, displayName: true, hiredAt: true, lastHrReviewAt: true },
        take: 200,
      }),
      this.prisma.personSkill.findMany({
        where: {
          certified: true,
          certificationExpiresAt: { lte: today },
          person: { deletedAt: null, archivedAt: null, terminatedAt: null },
        },
        select: {
          personId: true,
          certificationExpiresAt: true,
          person: { select: { displayName: true } },
          skill: { select: { name: true } },
        },
        take: 200,
      }),
    ]);

    const cards: HrActionCardDto[] = [];

    for (const p of probationRows) {
      const due = p.probationEndsAt!;
      cards.push({
        kind: 'probation_ending',
        personId: p.id,
        personName: p.displayName,
        dueAt: isoDate(due),
        severity: severityForRemainingDays(daysBetween(today, due), {
          danger: 7,
          warning: 21,
        }),
        message: `Probation ends in ${daysBetween(today, due)}d`,
        href: hrefForPerson(p.id, 'probation_ending'),
      });
    }

    for (const p of contractRows) {
      const due = p.contractEndsAt!;
      cards.push({
        kind: 'contract_expiring',
        personId: p.id,
        personName: p.displayName,
        dueAt: isoDate(due),
        severity: severityForRemainingDays(daysBetween(today, due), {
          danger: 14,
          warning: 45,
        }),
        message: `Contract expires in ${daysBetween(today, due)}d`,
        href: hrefForPerson(p.id, 'contract_expiring'),
      });
    }

    for (const p of reviewRows) {
      const lastReview = p.lastHrReviewAt ?? p.hiredAt;
      // Without either a hire date or a prior review, we can't meaningfully
      // sort this card — fall back to today so it sits at the top.
      const dueAt = lastReview ?? today;
      const overdueDays = Math.max(0, daysBetween(addMonths(dueAt, 12), today));
      cards.push({
        kind: 'hr_review_due',
        personId: p.id,
        personName: p.displayName,
        dueAt: isoDate(addMonths(dueAt, 12)),
        severity: severityForOverdueDays(overdueDays, { danger: 90, warning: 30 }),
        message:
          p.lastHrReviewAt === null
            ? 'HR review never recorded'
            : `HR review ${overdueDays}d overdue`,
        href: hrefForPerson(p.id, 'hr_review_due'),
      });
    }

    for (const r of certRows) {
      const overdueDays = Math.max(0, daysBetween(r.certificationExpiresAt!, today));
      cards.push({
        kind: 'certification_stale',
        personId: r.personId,
        personName: r.person.displayName,
        dueAt: isoDate(r.certificationExpiresAt!),
        severity: severityForOverdueDays(overdueDays, { danger: 30, warning: 7 }),
        message: `${r.skill.name} certification expired ${overdueDays}d ago`,
        href: hrefForPerson(r.personId, 'certification_stale'),
      });
    }

    cards.sort((a, b) => {
      const sa = severityRank(a.severity);
      const sb = severityRank(b.severity);
      if (sa !== sb) return sb - sa;
      return a.dueAt.localeCompare(b.dueAt);
    });

    const start = (page - 1) * pageSize;
    return cards.slice(start, start + pageSize);
  }
}

function severityRank(s: HrActionCardSeverity): number {
  return s === 'danger' ? 3 : s === 'warning' ? 2 : 1;
}

function severityForRemainingDays(
  daysLeft: number,
  th: { danger: number; warning: number },
): HrActionCardSeverity {
  if (daysLeft <= th.danger) return 'danger';
  if (daysLeft <= th.warning) return 'warning';
  return 'info';
}

function severityForOverdueDays(
  daysOver: number,
  th: { danger: number; warning: number },
): HrActionCardSeverity {
  if (daysOver >= th.danger) return 'danger';
  if (daysOver >= th.warning) return 'warning';
  return 'info';
}

function stripTime(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + n);
  return out;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hrefForPerson(personId: string, action: HrActionCardKind): string {
  return `/people/${personId}?action=${action}`;
}
