import {
  ForbiddenException,
  GoneException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  UndoActionExecutor,
  UndoActionExecutorRegistry,
  UndoActionRow,
} from '@src/modules/undo/application/undo-action-executor.registry';
import { UndoService } from '@src/modules/undo/application/undo.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRow {
  id: string;
  actorId: string;
  actionType: string;
  entityId: string;
  inversePayload: unknown;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

function buildPrisma(rows: FakeRow[]): PrismaService {
  return {
    undoAction: {
      findUnique: async (args: { where: { id: string } }): Promise<FakeRow | null> => {
        return rows.find((r) => r.id === args.where.id) ?? null;
      },
      create: async (args: { data: Partial<FakeRow> & { actorId: string; actionType: string; entityId: string; expiresAt: Date }; select?: unknown }): Promise<FakeRow | { id: string }> => {
        const row: FakeRow = {
          id: `undo-${rows.length + 1}`,
          actorId: args.data.actorId,
          actionType: args.data.actionType,
          entityId: args.data.entityId,
          inversePayload: args.data.inversePayload ?? null,
          expiresAt: args.data.expiresAt,
          consumedAt: null,
          createdAt: new Date(),
        };
        rows.push(row);
        if (args.select) return { id: row.id };
        return row;
      },
      update: async (args: {
        where: { id: string };
        data: Partial<FakeRow>;
      }): Promise<FakeRow> => {
        const row = rows.find((r) => r.id === args.where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, args.data);
        return row;
      },
    },
  } as unknown as PrismaService;
}

class StubExecutor implements UndoActionExecutor {
  public readonly actionType: string;
  public readonly calls: UndoActionRow[] = [];
  private readonly throwOnce: boolean;
  private threw = false;

  public constructor(actionType: string, opts: { throwOnce?: boolean } = {}) {
    this.actionType = actionType;
    this.throwOnce = opts.throwOnce ?? false;
  }

  public async execute(row: UndoActionRow): Promise<void> {
    this.calls.push(row);
    if (this.throwOnce && !this.threw) {
      this.threw = true;
      throw new Error('boom');
    }
  }
}

const ACTOR_A = '11111111-1111-1111-1111-111111111111';
const ACTOR_B = '22222222-2222-2222-2222-222222222222';
const ENTITY = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('UndoService', () => {
  describe('register', () => {
    it('writes a row with the supplied actor + actionType + inversePayload', async () => {
      const rows: FakeRow[] = [];
      const registry = new UndoActionExecutorRegistry();
      const svc = new UndoService(buildPrisma(rows), registry);

      const id = await svc.register({
        actorId: ACTOR_A,
        actionType: 'assignment.cancel',
        entityId: ENTITY,
        inversePayload: { previousStatus: 'BOOKED' },
        ttlSeconds: 60,
      });

      expect(id).toBeDefined();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorId: ACTOR_A,
        actionType: 'assignment.cancel',
        entityId: ENTITY,
        inversePayload: { previousStatus: 'BOOKED' },
      });
      expect(rows[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('defaults TTL to 300 seconds', async () => {
      const rows: FakeRow[] = [];
      const registry = new UndoActionExecutorRegistry();
      const svc = new UndoService(buildPrisma(rows), registry);

      await svc.register({
        actorId: ACTOR_A,
        actionType: 'assignment.cancel',
        entityId: ENTITY,
        inversePayload: { previousStatus: 'BOOKED' },
      });

      const expectedExpiry = Date.now() + 300_000;
      // Allow ±2 seconds of slack.
      expect(rows[0].expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 2_000);
      expect(rows[0].expiresAt.getTime()).toBeLessThan(expectedExpiry + 2_000);
    });
  });

  describe('consume', () => {
    function setup(): {
      svc: UndoService;
      rows: FakeRow[];
      registry: UndoActionExecutorRegistry;
      executor: StubExecutor;
    } {
      const rows: FakeRow[] = [];
      const registry = new UndoActionExecutorRegistry();
      const executor = new StubExecutor('assignment.cancel');
      registry.register(executor);
      const svc = new UndoService(buildPrisma(rows), registry);
      return { svc, rows, registry, executor };
    }

    it('NotFound when the row id does not exist', async () => {
      const { svc } = setup();
      await expect(
        svc.consume('99999999-9999-9999-9999-999999999999', ACTOR_A),
      ).rejects.toThrow(NotFoundException);
    });

    it('Forbidden when the actor does not match the row actor', async () => {
      const { svc, rows } = setup();
      const id = await svc.register({
        actorId: ACTOR_A,
        actionType: 'assignment.cancel',
        entityId: ENTITY,
        inversePayload: { previousStatus: 'BOOKED' },
      });
      void rows;
      await expect(svc.consume(id, ACTOR_B)).rejects.toThrow(ForbiddenException);
    });

    it('Gone when the row has expired', async () => {
      const { svc, rows } = setup();
      const id = await svc.register({
        actorId: ACTOR_A,
        actionType: 'assignment.cancel',
        entityId: ENTITY,
        inversePayload: { previousStatus: 'BOOKED' },
        ttlSeconds: 1,
      });
      // Force the row to look expired by tweaking the in-memory state.
      const row = rows.find((r) => r.id === id);
      if (row) row.expiresAt = new Date(Date.now() - 1000);

      await expect(svc.consume(id, ACTOR_A)).rejects.toThrow(GoneException);
    });

    it('runs the executor + stamps consumedAt on success', async () => {
      const { svc, rows, executor } = setup();
      const id = await svc.register({
        actorId: ACTOR_A,
        actionType: 'assignment.cancel',
        entityId: ENTITY,
        inversePayload: { previousStatus: 'BOOKED' },
      });

      const result = await svc.consume(id, ACTOR_A);
      expect(result.undoActionId).toBe(id);
      expect(result.actionType).toBe('assignment.cancel');
      expect(result.entityId).toBe(ENTITY);
      expect(executor.calls).toHaveLength(1);
      expect(executor.calls[0].inversePayload).toEqual({ previousStatus: 'BOOKED' });
      expect(rows[0].consumedAt).not.toBeNull();
    });

    it('idempotent — re-consuming a consumed row returns the same result without re-running the executor', async () => {
      const { svc, executor } = setup();
      const id = await svc.register({
        actorId: ACTOR_A,
        actionType: 'assignment.cancel',
        entityId: ENTITY,
        inversePayload: { previousStatus: 'BOOKED' },
      });

      const first = await svc.consume(id, ACTOR_A);
      const second = await svc.consume(id, ACTOR_A);
      expect(first.consumedAt.getTime()).toBe(second.consumedAt.getTime());
      expect(executor.calls).toHaveLength(1); // executor ran only once
    });

    it('ServiceUnavailable when no executor is registered for the actionType', async () => {
      const rows: FakeRow[] = [];
      const registry = new UndoActionExecutorRegistry(); // empty
      const svc = new UndoService(buildPrisma(rows), registry);
      const id = await svc.register({
        actorId: ACTOR_A,
        actionType: 'mystery.unknown',
        entityId: ENTITY,
        inversePayload: {},
      });

      await expect(svc.consume(id, ACTOR_A)).rejects.toThrow(ServiceUnavailableException);
      // Row stays unconsumed — caller can retry once the executor lands.
      expect(rows[0].consumedAt).toBeNull();
    });

    it('leaves the row unconsumed when the executor throws so the action is retryable', async () => {
      const rows: FakeRow[] = [];
      const registry = new UndoActionExecutorRegistry();
      const executor = new StubExecutor('assignment.cancel', { throwOnce: true });
      registry.register(executor);
      const svc = new UndoService(buildPrisma(rows), registry);

      const id = await svc.register({
        actorId: ACTOR_A,
        actionType: 'assignment.cancel',
        entityId: ENTITY,
        inversePayload: { previousStatus: 'BOOKED' },
      });

      await expect(svc.consume(id, ACTOR_A)).rejects.toThrow(/boom/);
      expect(rows[0].consumedAt).toBeNull();

      // Second attempt — executor is happy now, row is consumed.
      const result = await svc.consume(id, ACTOR_A);
      expect(result.consumedAt).toBeDefined();
      expect(executor.calls).toHaveLength(2);
      expect(rows[0].consumedAt).not.toBeNull();
    });
  });
});
