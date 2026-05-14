import { Injectable, Logger } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface RedactPersonResult {
  personId: string;
  rowsAffected: number;
  rowsRehashed: number;
  redactedAt: string;
}

/**
 * F-5.5 / D-167 redact-payload v1 — GDPR Article 17 right-to-erasure.
 *
 * Strategy: surgical payload edit + forward hash-chain rebuild.
 *   1. UPDATE every AuditLog row that references the person (as
 *      `aggregateType='PERSON' AND aggregateId=:personId` OR
 *      `actorId=:personId`) — set `payload.email = '[redacted]'` and
 *      `payload.actorDisplayName = '[redacted]'` when those keys exist.
 *   2. Find the earliest affected `chainSeq`. Pull the rowHash of the
 *      row immediately preceding it (or NULL at chain head).
 *   3. Walk forward from that point in chainSeq order. For each row,
 *      recompute the hash using the SAME formula as the
 *      `dm_r_22_audit_hash_chain` trigger:
 *        rowHash = sha256(COALESCE(prevHash, '') || '|' || jsonb(row - {prevHash, rowHash}))
 *      Update prevHash + rowHash in lockstep.
 *
 * After this runs the chain is internally consistent (the existing
 * verifier `scripts/verify-audit-hash-chain.cjs` still passes). External
 * observers who snapshotted the old chain root will see it no longer
 * matches — that's the deliberate v1 trade-off versus the cryptographic
 * v2 (D-167 v2; not yet shipped) which would never modify the payload
 * at all and instead destroy a per-row encryption key.
 *
 * All of step 1+2+3 runs inside a single `prisma.$transaction` so
 * partial redactions cannot leak. A meta-audit row is written to record
 * the redaction event itself (admin actor + count of affected rows);
 * that row sits at the new chain head with its own integrity hash.
 */
@Injectable()
export class RedactPersonAuditService {
  private readonly logger = new Logger(RedactPersonAuditService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async redact(personId: string, actorId: string | null): Promise<RedactPersonResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Step 1a — redact `payload.email` on every matching row.
      const emailUpdated = await tx.$executeRaw`
        UPDATE "AuditLog"
        SET payload = jsonb_set(payload, '{email}', '"[redacted]"', false)
        WHERE (
          ("aggregateType"::text = 'PERSON' AND "aggregateId" = ${personId}::uuid)
          OR "actorId" = ${personId}::uuid
        )
          AND payload ? 'email'
          AND payload->>'email' <> '[redacted]'
      `;

      // Step 1b — redact `payload.actorDisplayName` on every matching row.
      const displayUpdated = await tx.$executeRaw`
        UPDATE "AuditLog"
        SET payload = jsonb_set(payload, '{actorDisplayName}', '"[redacted]"', false)
        WHERE (
          ("aggregateType"::text = 'PERSON' AND "aggregateId" = ${personId}::uuid)
          OR "actorId" = ${personId}::uuid
        )
          AND payload ? 'actorDisplayName'
          AND payload->>'actorDisplayName' <> '[redacted]'
      `;

      const rowsAffected = Number(emailUpdated) + Number(displayUpdated);
      if (rowsAffected === 0) {
        return { rowsAffected: 0, rowsRehashed: 0 };
      }

      // Step 2 — earliest affected chainSeq.
      const earliest = await tx.$queryRaw<Array<{ minSeq: bigint | null }>>`
        SELECT min("chainSeq") AS "minSeq"
        FROM "AuditLog"
        WHERE (
          ("aggregateType"::text = 'PERSON' AND "aggregateId" = ${personId}::uuid)
          OR "actorId" = ${personId}::uuid
        )
          AND (
            payload->>'email' = '[redacted]'
            OR payload->>'actorDisplayName' = '[redacted]'
          )
      `;
      const minSeq = earliest[0]?.minSeq;
      if (minSeq === null || minSeq === undefined) {
        return { rowsAffected, rowsRehashed: 0 };
      }

      // Step 3 — predecessor row's rowHash (null at chain head).
      const prevRow = await tx.$queryRaw<Array<{ rowHash: string | null }>>`
        SELECT "rowHash"
        FROM "AuditLog"
        WHERE "chainSeq" < ${minSeq}
        ORDER BY "chainSeq" DESC
        LIMIT 1
      `;
      let prevHash: string | null = prevRow[0]?.rowHash ?? null;

      // Step 3 — walk forward, re-hashing in chainSeq order.
      const rowsToRebuild = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id::text AS id
        FROM "AuditLog"
        WHERE "chainSeq" >= ${minSeq}
        ORDER BY "chainSeq" ASC
      `;

      let rowsRehashed = 0;
      for (const row of rowsToRebuild) {
        const computed = await tx.$queryRaw<Array<{ newHash: string }>>`
          SELECT encode(
            sha256(convert_to(
              COALESCE(${prevHash}, '') || '|' ||
              ((to_jsonb(t.*) - 'prevHash' - 'rowHash')::text),
              'UTF8'
            )),
            'hex'
          ) AS "newHash"
          FROM "AuditLog" t
          WHERE id = ${row.id}::uuid
        `;
        const newHash = computed[0]?.newHash;
        if (!newHash) continue;

        await tx.$executeRaw`
          UPDATE "AuditLog"
          SET "prevHash" = ${prevHash},
              "rowHash" = ${newHash}
          WHERE id = ${row.id}::uuid
        `;
        prevHash = newHash;
        rowsRehashed++;
      }

      return { rowsAffected, rowsRehashed };
    });

    const redactedAt = new Date().toISOString();

    // Meta-audit — the redaction itself is an admin action that lands on
    // the new chain head, signed by the admin who triggered it.
    if (this.auditLogger) {
      this.auditLogger.record({
        action: 'REDACT',
        actionType: 'UPDATE',
        actorId,
        category: 'settings',
        targetEntityType: 'Person',
        targetEntityId: personId,
        changeSummary: `Redacted email + actorDisplayName from ${result.rowsAffected} AuditLog row(s).`,
        details: { ...result, redactedAt },
        metadata: { ...result, redactedAt },
      });
    }

    this.logger.log(
      `Redacted person ${personId}: ${result.rowsAffected} rows touched, ${result.rowsRehashed} chain entries re-hashed.`,
    );

    return {
      personId,
      rowsAffected: result.rowsAffected,
      rowsRehashed: result.rowsRehashed,
      redactedAt,
    };
  }
}
