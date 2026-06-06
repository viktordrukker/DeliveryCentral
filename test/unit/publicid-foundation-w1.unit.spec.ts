/**
 * W1-07 / W1-08 — publicId foundation tests.
 *
 * Covers:
 *   1. AggregateType registry includes the 6 W1-foundation aggregates
 *      (Person, Project, ProjectPosition, OrgUnit, Client, CaseRecord)
 *      plus the prior LeaveRequest entry that was already in place.
 *   2. The backfill formula in 20260607_publicid_foundation/migration.sql
 *      is deterministic: same uuid → same publicId → same prefix.
 *   3. Generated runtime publicIds have the expected prefix.
 */

import {
  AggregateType,
  MODEL_TO_AGGREGATE_TYPE,
  ALL_AGGREGATE_PREFIXES,
  aggregateTypeForPrefix,
} from '../../src/infrastructure/public-id/aggregate-type';
import { PublicIdService } from '../../src/infrastructure/public-id/public-id.service';

/**
 * Mirror of the SQL backfill expression
 *   'prefix_' || substr(replace(id::text, '-', ''), 1, 12)
 * — exercised against the same input the DB sees during the W1 migration.
 */
function backfillExpression(prefix: string, uuid: string): string {
  return `${prefix}_${uuid.replace(/-/g, '').slice(0, 12)}`;
}

describe('W1-07 / W1-08 publicId foundation', () => {
  const service = new PublicIdService();

  describe('AggregateType registry', () => {
    it('contains every W1-foundation aggregate', () => {
      const required = [
        AggregateType.Person,
        AggregateType.Project,
        AggregateType.ProjectPosition,
        AggregateType.OrgUnit,
        AggregateType.Client,
        AggregateType.CaseRecord,
        AggregateType.LeaveRequest,
      ];
      for (const aggregate of required) {
        expect(ALL_AGGREGATE_PREFIXES).toContain(aggregate);
      }
    });

    it('emits the canonical prefix per aggregate', () => {
      expect(AggregateType.Person).toBe('usr');
      expect(AggregateType.Project).toBe('prj');
      expect(AggregateType.ProjectPosition).toBe('pos');
      expect(AggregateType.OrgUnit).toBe('org');
      expect(AggregateType.Client).toBe('cli');
      expect(AggregateType.CaseRecord).toBe('case');
      expect(AggregateType.LeaveRequest).toBe('lvr');
    });

    it('maps every W1-foundation Prisma model to its AggregateType', () => {
      expect(MODEL_TO_AGGREGATE_TYPE.Person).toBe(AggregateType.Person);
      expect(MODEL_TO_AGGREGATE_TYPE.Project).toBe(AggregateType.Project);
      expect(MODEL_TO_AGGREGATE_TYPE.ProjectPosition).toBe(AggregateType.ProjectPosition);
      expect(MODEL_TO_AGGREGATE_TYPE.OrgUnit).toBe(AggregateType.OrgUnit);
      expect(MODEL_TO_AGGREGATE_TYPE.Client).toBe(AggregateType.Client);
      expect(MODEL_TO_AGGREGATE_TYPE.CaseRecord).toBe(AggregateType.CaseRecord);
      expect(MODEL_TO_AGGREGATE_TYPE.LeaveRequest).toBe(AggregateType.LeaveRequest);
    });
  });

  describe('backfill determinism (matches migration.sql)', () => {
    const cases: Array<{ aggregate: string; prefix: string; uuid: string; expected: string }> = [
      {
        aggregate: 'Person',
        prefix: 'usr',
        uuid: '12345678-90ab-cdef-1234-567890abcdef',
        expected: 'usr_1234567890ab',
      },
      {
        aggregate: 'Project',
        prefix: 'prj',
        uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        expected: 'prj_aaaaaaaabbbb',
      },
      {
        aggregate: 'OrgUnit',
        prefix: 'org',
        uuid: '00000001-0000-4000-8000-000000000001',
        expected: 'org_000000010000',
      },
      {
        aggregate: 'Client',
        prefix: 'cli',
        uuid: '99999999-8888-4444-aaaa-bbbbbbbbbbbb',
        expected: 'cli_999999998888',
      },
      {
        aggregate: 'CaseRecord',
        prefix: 'case',
        uuid: 'ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb',
        expected: 'case_ffffffffeeee',
      },
    ];

    for (const { aggregate, prefix, uuid, expected } of cases) {
      it(`${aggregate}: ${uuid} → ${expected}`, () => {
        expect(backfillExpression(prefix, uuid)).toBe(expected);
      });
    }

    it('is idempotent — repeated calls produce identical output', () => {
      const uuid = '12345678-90ab-cdef-1234-567890abcdef';
      const a = backfillExpression('usr', uuid);
      const b = backfillExpression('usr', uuid);
      const c = backfillExpression('usr', uuid);
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it('produces a publicId whose prefix the registry recognises', () => {
      const uuid = '12345678-90ab-cdef-1234-567890abcdef';
      for (const { prefix } of cases) {
        const publicId = backfillExpression(prefix, uuid);
        const extractedPrefix = publicId.slice(0, publicId.indexOf('_'));
        expect(aggregateTypeForPrefix(extractedPrefix)).not.toBeNull();
      }
    });
  });

  describe('runtime generator (PublicIdService) — middleware path', () => {
    it('emits the W1 prefix on freshly-generated ids', () => {
      expect(service.generate(AggregateType.Person)).toMatch(/^usr_[A-Za-z0-9]{10,}$/);
      expect(service.generate(AggregateType.Project)).toMatch(/^prj_[A-Za-z0-9]{10,}$/);
      expect(service.generate(AggregateType.ProjectPosition)).toMatch(/^pos_[A-Za-z0-9]{10,}$/);
      expect(service.generate(AggregateType.OrgUnit)).toMatch(/^org_[A-Za-z0-9]{10,}$/);
      expect(service.generate(AggregateType.Client)).toMatch(/^cli_[A-Za-z0-9]{10,}$/);
      expect(service.generate(AggregateType.CaseRecord)).toMatch(/^case_[A-Za-z0-9]{10,}$/);
    });

    it('produces structurally valid publicIds the parser accepts', () => {
      for (const aggregate of [
        AggregateType.Person,
        AggregateType.Project,
        AggregateType.ProjectPosition,
        AggregateType.OrgUnit,
        AggregateType.Client,
        AggregateType.CaseRecord,
      ]) {
        const publicId = service.generate(aggregate);
        expect(service.isValidShape(publicId, aggregate)).toBe(true);
        expect(service.extractAggregateType(publicId)).toBe(aggregate);
      }
    });
  });
});
