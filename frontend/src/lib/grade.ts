/**
 * F-11.8 / D-132 — type-safe Grade const + helpers.
 *
 * The authoritative grade list lives in the `grade` MetadataDictionary
 * (per J8 / `prisma/seed.ts:195-202`), so admins can extend it at
 * runtime. This module exports the canonical seeded values for use in
 * type-safe DTOs, forms, and matching code where the developer wants
 * compile-time guarantees that a string belongs to the known set —
 * without having to reach for the dictionary API on every render.
 *
 * Tenants that extend the dictionary at runtime can still use the
 * dictionary entries; this const is a strongly-typed *subset* anchor.
 * Pages that need the live list should fetch via the dictionary API.
 */

export const GRADE_LEVELS = ['g7', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14'] as const;

export type Grade = (typeof GRADE_LEVELS)[number];

const GRADE_SET: ReadonlySet<string> = new Set(GRADE_LEVELS);

export function isGrade(value: unknown): value is Grade {
  return typeof value === 'string' && GRADE_SET.has(value);
}

/**
 * Display labels matching the `displayName` column on the seeded
 * MetadataDictionary entries (see `prisma/seed.ts:195-202`). Kept in
 * sync manually; tenants that want a different label should override
 * via the dictionary admin UI.
 */
export const GRADE_LABELS: Readonly<Record<Grade, string>> = {
  g7: 'G7 — Junior',
  g8: 'G8 — Associate',
  g9: 'G9 — Consultant',
  g10: 'G10 — Senior Consultant',
  g11: 'G11 — Manager',
  g12: 'G12 — Senior Manager',
  g13: 'G13 — Director',
  g14: 'G14 — Partner',
};

export function formatGrade(value: string | null | undefined): string {
  if (!value) return '—';
  return isGrade(value) ? GRADE_LABELS[value] : value;
}
