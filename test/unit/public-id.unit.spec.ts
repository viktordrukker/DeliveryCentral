import { BadRequestException } from '@nestjs/common';

import {
  AggregateType,
  aggregateTypeForPrefix,
  MODEL_TO_AGGREGATE_TYPE,
} from '../../src/infrastructure/public-id/aggregate-type';
import { ParsePublicId, ParsePublicIdOrUuid } from '../../src/infrastructure/public-id/parse-public-id.pipe';
import { PublicIdService } from '../../src/infrastructure/public-id/public-id.service';

describe('PublicIdService (DM-2.5)', () => {
  const service = new PublicIdService();

  describe('generate()', () => {
    it('returns the aggregate prefix followed by an underscore and a sqid', () => {
      const publicId = service.generate(AggregateType.Project);
      expect(publicId).toMatch(/^prj_[A-Za-z0-9]{10,}$/);
    });

    it('produces distinct values across consecutive calls', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 2000; i++) {
        seen.add(service.generate(AggregateType.Skill));
      }
      expect(seen.size).toBe(2000);
    });

    it('uses the lookalike-safe alphabet (no 0/O/1/I/l)', () => {
      for (let i = 0; i < 200; i++) {
        const publicId = service.generate(AggregateType.Person);
        const sqidPart = publicId.slice('usr_'.length);
        expect(sqidPart).not.toMatch(/[0O1Il]/);
      }
    });

    it('spans every aggregate type in the registry', () => {
      for (const type of Object.values(AggregateType)) {
        const publicId = service.generate(type);
        expect(publicId.startsWith(`${type}_`)).toBe(true);
        expect(service.isValidShape(publicId, type)).toBe(true);
      }
    });
  });

  describe('isValidShape()', () => {
    it('accepts a well-formed publicId for the expected aggregate', () => {
      const publicId = service.generate(AggregateType.Project);
      expect(service.isValidShape(publicId, AggregateType.Project)).toBe(true);
    });

    it('rejects a well-formed publicId that belongs to a different aggregate', () => {
      const publicId = service.generate(AggregateType.Project);
      expect(service.isValidShape(publicId, AggregateType.Person)).toBe(false);
    });

    it('rejects unknown prefixes', () => {
      expect(service.isValidShape('xyz_ABCDefgh12')).toBe(false);
    });

    it('rejects malformed shapes', () => {
      expect(service.isValidShape('not-a-publicid')).toBe(false);
      expect(service.isValidShape('prj_short')).toBe(false);
      expect(service.isValidShape('')).toBe(false);
      expect(service.isValidShape(null as unknown as string)).toBe(false);
      expect(service.isValidShape(42 as unknown as string)).toBe(false);
    });

    it('rejects raw UUIDs outright (heavy security vulnerability per DMD-026)', () => {
      expect(service.isValidShape('6a5c7f2a-9e0d-4c1b-82f9-3f41d9a6f9e2')).toBe(false);
    });
  });

  describe('extractPrefix() / extractAggregateType()', () => {
    it('returns the prefix on a well-formed publicId', () => {
      const publicId = service.generate(AggregateType.Project);
      expect(service.extractPrefix(publicId)).toBe('prj');
      expect(service.extractAggregateType(publicId)).toBe(AggregateType.Project);
    });

    it('returns null on malformed input', () => {
      expect(service.extractPrefix('not-a-publicid')).toBe(null);
      expect(service.extractAggregateType('not-a-publicid')).toBe(null);
    });

    it('returns null when the prefix is not registered', () => {
      expect(service.extractAggregateType('xyz_ABCDefgh12')).toBe(null);
    });
  });

  describe('looksLikeUuid()', () => {
    it('matches canonical UUID shape', () => {
      expect(service.looksLikeUuid('6a5c7f2a-9e0d-4c1b-82f9-3f41d9a6f9e2')).toBe(true);
      expect(service.looksLikeUuid('6A5C7F2A-9E0D-4C1B-82F9-3F41D9A6F9E2')).toBe(true);
    });

    it('does not match publicIds', () => {
      const publicId = service.generate(AggregateType.Project);
      expect(service.looksLikeUuid(publicId)).toBe(false);
    });
  });
});

describe('aggregateTypeForPrefix()', () => {
  it('resolves known prefixes to the matching AggregateType', () => {
    expect(aggregateTypeForPrefix('prj')).toBe(AggregateType.Project);
    expect(aggregateTypeForPrefix('usr')).toBe(AggregateType.Person);
    expect(aggregateTypeForPrefix('bud')).toBe(AggregateType.ProjectBudget);
  });

  it('returns null for unknown prefixes', () => {
    expect(aggregateTypeForPrefix('xyz')).toBe(null);
    expect(aggregateTypeForPrefix('')).toBe(null);
  });
});

describe('MODEL_TO_AGGREGATE_TYPE registry', () => {
  it('only references AggregateType values that exist in the enum', () => {
    const allTypes = new Set(Object.values(AggregateType));
    for (const [model, type] of Object.entries(MODEL_TO_AGGREGATE_TYPE)) {
      expect(allTypes.has(type)).toBe(true);
      expect(typeof model).toBe('string');
    }
  });

  it('covers every aggregate root whose table has a publicId column under DM-2 expand', () => {
    expect(MODEL_TO_AGGREGATE_TYPE).toEqual(
      expect.objectContaining({
        Skill: AggregateType.Skill,
        PeriodLock: AggregateType.PeriodLock,
        ProjectBudget: AggregateType.ProjectBudget,
        PersonCostRate: AggregateType.PersonCostRate,
        InAppNotification: AggregateType.Notification,
        LeaveRequest: AggregateType.LeaveRequest,
        StaffingRequest: AggregateType.StaffingRequest,
        TimesheetWeek: AggregateType.TimesheetWeek,
      }),
    );
  });
});

describe('ParsePublicId() pipe factory (DM-2.5)', () => {
  const service = new PublicIdService();
  const PipeClass = ParsePublicId(AggregateType.Project);
  const pipe = new PipeClass(service);

  it('returns the input unchanged when well-formed', () => {
    const publicId = service.generate(AggregateType.Project);
    expect(pipe.transform(publicId, { type: 'param' })).toBe(publicId);
  });

  it('throws BadRequest on a raw UUID — the core security guardrail', () => {
    expect(() =>
      pipe.transform('6a5c7f2a-9e0d-4c1b-82f9-3f41d9a6f9e2', { type: 'param' }),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequest on a malformed shape', () => {
    expect(() => pipe.transform('prj_short', { type: 'param' })).toThrow(BadRequestException);
  });

  it('throws BadRequest on a wrong-aggregate publicId', () => {
    const personPublicId = service.generate(AggregateType.Person);
    expect(() => pipe.transform(personPublicId, { type: 'param' })).toThrow(BadRequestException);
  });

  it('throws BadRequest on empty / non-string input', () => {
    expect(() => pipe.transform('', { type: 'param' })).toThrow(BadRequestException);
    expect(() => pipe.transform(undefined as unknown as string, { type: 'param' })).toThrow(
      BadRequestException,
    );
  });
});

describe('ParsePublicIdOrUuid() transitional pipe factory (DM-2.5-8 sub-phase B)', () => {
  const service = new PublicIdService();
  const PipeClass = ParsePublicIdOrUuid(AggregateType.Skill);
  const pipe = new PipeClass(service);

  it('passes through a well-formed publicId for the expected aggregate', () => {
    const publicId = service.generate(AggregateType.Skill);
    expect(pipe.transform(publicId, { type: 'param' })).toBe(publicId);
  });

  it('passes through a raw UUID (legacy identifier, accepted during transition)', () => {
    const uuid = '6a5c7f2a-9e0d-4c1b-82f9-3f41d9a6f9e2';
    expect(pipe.transform(uuid, { type: 'param' })).toBe(uuid);
  });

  it('throws BadRequest on a publicId that belongs to a different aggregate', () => {
    const wrongAggregate = service.generate(AggregateType.Project);
    expect(() => pipe.transform(wrongAggregate, { type: 'param' })).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequest on a malformed identifier', () => {
    expect(() => pipe.transform('skl_short', { type: 'param' })).toThrow(BadRequestException);
    expect(() => pipe.transform('neither-uuid-nor-publicid', { type: 'param' })).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequest on empty / non-string input', () => {
    expect(() => pipe.transform('', { type: 'param' })).toThrow(BadRequestException);
    expect(() => pipe.transform(undefined as unknown as string, { type: 'param' })).toThrow(
      BadRequestException,
    );
  });
});
