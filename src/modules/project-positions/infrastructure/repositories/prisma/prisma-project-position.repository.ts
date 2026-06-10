import { Prisma, ProjectPositionFillStatus as PrismaProjectPositionFillStatus } from '@prisma/client';

import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import {
  ListProjectPositionsQuery,
  OptimisticConcurrencyConflictError,
  ProjectPositionRepositoryPort,
} from '@src/modules/project-positions/domain/repositories/project-position-repository.port';
import { PositionId } from '@src/modules/project-positions/domain/value-objects/position-id';
import { TransactionContext } from '@src/shared/domain/transaction-context';

import { ProjectPositionPrismaMapper } from './project-position-prisma.mapper';

// 20c-10 — typed Prisma delegate slice.
type ProjectPositionGateway = Pick<
  Prisma.ProjectPositionDelegate,
  'create' | 'delete' | 'findFirst' | 'findMany' | 'updateMany' | 'count'
>;

interface TxClientWithProjectPositionTable {
  projectPosition?: ProjectPositionGateway;
}

const ACTIVE_FILL_STATUSES: PrismaProjectPositionFillStatus[] = [
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
  'ON_HOLD',
];

export class PrismaProjectPositionRepository implements ProjectPositionRepositoryPort {
  public constructor(private readonly gateway: ProjectPositionGateway) {}

  private resolveGateway(tx?: TransactionContext): ProjectPositionGateway {
    if (tx && typeof tx === 'object' && tx !== null && 'projectPosition' in tx) {
      const fromTx = (tx as TxClientWithProjectPositionTable).projectPosition;
      if (fromTx) return fromTx;
    }
    return this.gateway;
  }

  public async save(aggregate: ProjectPosition, tx?: TransactionContext): Promise<void> {
    const gateway = this.resolveGateway(tx);
    const data = ProjectPositionPrismaMapper.toPersistence(aggregate);
    const existing = await gateway.findFirst({ where: { id: aggregate.positionId.value } });
    if (!existing) {
      await gateway.create({ data });
      return;
    }
    // Optimistic concurrency: only update if the stored version matches the
    // aggregate's version before mutation (one less than the post-mutation
    // version held on the aggregate now).
    const expectedPriorVersion = aggregate.version - 1;
    const updated = await gateway.updateMany({
      where: { id: aggregate.positionId.value, version: expectedPriorVersion },
      data,
    });
    if (updated.count === 0) {
      throw new OptimisticConcurrencyConflictError(
        `Optimistic concurrency conflict on ProjectPosition ${aggregate.positionId.value} (expected version ${expectedPriorVersion}).`,
      );
    }
  }

  public async delete(id: string, tx?: TransactionContext): Promise<void> {
    const gateway = this.resolveGateway(tx);
    await gateway.delete({ where: { id } });
  }

  public async findById(idOrPublicId: string): Promise<ProjectPosition | null> {
    // W1-11 — transitional ingress accepting either the legacy uuid or the
    // `pos_…` publicId. Detection is by prefix so we don't pay the cost of a
    // failed UUID lookup before retrying. Drops once frontend stops emitting
    // raw UUIDs (Wave 2 strict-publicId flip).
    const where = /^pos_[A-Za-z0-9]{10,}$/.test(idOrPublicId)
      ? { publicId: idOrPublicId }
      : { id: idOrPublicId };
    const row = await this.gateway.findFirst({ where });
    return row ? ProjectPositionPrismaMapper.toDomain(row) : null;
  }

  public async findByPositionId(positionId: PositionId): Promise<ProjectPosition | null> {
    return this.findById(positionId.value);
  }

  public async findByQuery(query: ListProjectPositionsQuery): Promise<ProjectPosition[]> {
    const where = this.buildWhere(query);
    const rows = await this.gateway.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: [{ priority: 'desc' }, { startDate: 'asc' }],
    });
    return rows.map((row) => ProjectPositionPrismaMapper.toDomain(row));
  }

  public async countByQuery(
    query: Omit<ListProjectPositionsQuery, 'skip' | 'take'>,
  ): Promise<number> {
    const where = this.buildWhere(query);
    return this.gateway.count({ where });
  }

  public async findActiveByPersonId(personId: string, asOf: Date): Promise<ProjectPosition[]> {
    const rows = await this.gateway.findMany({
      where: {
        activePersonId: personId,
        fillStatus: { in: ACTIVE_FILL_STATUSES },
        AND: [
          { OR: [{ activeValidFrom: null }, { activeValidFrom: { lte: asOf } }] },
          { OR: [{ activeValidTo: null }, { activeValidTo: { gt: asOf } }] },
        ],
      },
    });
    return rows.map((row) => ProjectPositionPrismaMapper.toDomain(row));
  }

  private buildWhere(query: ListProjectPositionsQuery): Prisma.ProjectPositionWhereInput {
    const where: Prisma.ProjectPositionWhereInput = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.activePersonId) where.activePersonId = query.activePersonId;
    if (query.fillStatuses && query.fillStatuses.length > 0) {
      where.fillStatus = { in: query.fillStatuses as PrismaProjectPositionFillStatus[] };
    }
    if (query.asOf) {
      where.AND = [
        { OR: [{ activeValidFrom: null }, { activeValidFrom: { lte: query.asOf } }] },
        { OR: [{ activeValidTo: null }, { activeValidTo: { gt: query.asOf } }] },
      ];
    }
    return where;
  }
}
