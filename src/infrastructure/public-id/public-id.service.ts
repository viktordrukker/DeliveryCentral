import { Injectable } from '@nestjs/common';
import Sqids from 'sqids';
import * as crypto from 'node:crypto';

import { AggregateType, aggregateTypeForPrefix } from './aggregate-type';

/**
 * PublicIdService is the single source of truth for the opaque external
 * identifiers every user-facing aggregate carries (DMD-026, schema-conventions §20).
 *
 * A publicId has the shape `<prefix>_<sqid>` where prefix is the AggregateType
 * enum value and sqid is an alphanumeric, lookalike-safe Sqid of length 10.
 *
 * Why Sqids: short, URL-safe, reversible if needed for future cursor-based
 * pagination, and the per-tenant salt we will introduce in DM-7.5 is a single
 * alphabet rotation (no re-encoding of stored values).
 */
@Injectable()
export class PublicIdService {
  /**
   * Lookalike-safe alphabet: removes 0/O/o/1/I/l to avoid ambiguity in
   * handwriting, screenshots, printed reports. 54 symbols of entropy.
   */
  private static readonly ALPHABET =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

  /**
   * Minimum length of the Sqid segment. 10 chars at base-54 ≈ 2.5e17 codes,
   * well above the birthday-paradox threshold for collisions at our scale.
   */
  private static readonly MIN_LENGTH = 10;

  private readonly sqids: Sqids;

  public constructor() {
    this.sqids = new Sqids({
      alphabet: PublicIdService.ALPHABET,
      minLength: PublicIdService.MIN_LENGTH,
    });
  }

  /**
   * Generate a fresh publicId for a given aggregate.
   *
   * Uses 48 bits of cryptographically-random entropy, encoded as two
   * 24-bit integers via Sqids. 48 bits gives ~2.8e14 codes per aggregate
   * type; collision probability at 1M rows per tenant is ~1 in 280 billion.
   * The unique constraint on the `publicId` column is the last-line guard;
   * on a collision the caller retries. Retries are not handled here — the
   * Prisma middleware catches the unique-constraint violation and calls
   * `generate` again.
   */
  public generate(aggregateType: AggregateType): string {
    const bytes = crypto.randomBytes(6);
    const hi = bytes.readUIntBE(0, 3); // 24 bits
    const lo = bytes.readUIntBE(3, 3); // 24 bits
    const encoded = this.sqids.encode([hi, lo]);
    return `${aggregateType}_${encoded}`;
  }

  /**
   * Validate the format shape of a publicId. Does not check existence in DB.
   * Used by `ParsePublicIdPipe` to reject malformed inputs early (e.g. a
   * raw UUID accidentally slipped into a publicId-typed path param).
   */
  public isValidShape(value: unknown, expectedType?: AggregateType): boolean {
    if (typeof value !== 'string') return false;
    const match = /^([a-z]+)_([A-Za-z0-9]{8,})$/.exec(value);
    if (!match) return false;
    const prefix = match[1];
    if (expectedType && prefix !== expectedType) return false;
    return aggregateTypeForPrefix(prefix) !== null;
  }

  /** Extract the entity-type prefix from a publicId; null if malformed. */
  public extractPrefix(value: string): string | null {
    const match = /^([a-z]+)_/.exec(value);
    return match ? match[1] : null;
  }

  /** Extract the AggregateType from a publicId; null if malformed or unregistered. */
  public extractAggregateType(value: string): AggregateType | null {
    const prefix = this.extractPrefix(value);
    return prefix ? aggregateTypeForPrefix(prefix) : null;
  }

  /**
   * Looks like a raw UUID. Used by runtime guardrails that reject UUIDs
   * sneaking into response payloads (see DMD-026 — UUIDs never leave the API
   * boundary). Also used by the `controller-uuid-leak` lint that DM-2.5-7
   * will add.
   */
  public looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}
