import type { PositionFillStatusValue } from '../value-objects/position-fill-status';

/**
 * Sprint 2 / S2-7 hook — emitted by `TransitionProjectPositionFillService`
 * for every state transition. Subscribers: notification translator,
 * outbox publisher, RM dashboard cache invalidator.
 *
 * Full outbox wiring lands with S2-7.
 */
export interface ProjectPositionFillChangedEvent {
  positionId: string;
  projectId: string;
  fromStatus: PositionFillStatusValue;
  toStatus: PositionFillStatusValue;
  actorPersonId: string;
  activePersonId?: string;
  reason?: string;
  occurredAt: Date;
}
