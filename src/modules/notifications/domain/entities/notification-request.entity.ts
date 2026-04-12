import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

export type NotificationRequestStatus = 'FAILED_TERMINAL' | 'QUEUED' | 'RETRYING' | 'SENT';

interface NotificationRequestProps {
  attemptCount: number;
  channelId: string;
  deliveredAt?: Date;
  eventName: string;
  failureReason?: string;
  maxAttempts: number;
  nextAttemptAt?: Date;
  payload: Record<string, unknown>;
  recipient: string;
  requestedAt: Date;
  status: NotificationRequestStatus;
  templateId: string;
}

export class NotificationRequest extends AggregateRoot<NotificationRequestProps> {
  public static create(
    props: Omit<NotificationRequestProps, 'attemptCount' | 'requestedAt' | 'status'> & {
      attemptCount?: number;
      requestedAt?: Date;
      status?: NotificationRequestStatus;
    },
    id: string = randomUUID(),
  ) {
    return new NotificationRequest(
      {
        ...props,
        attemptCount: props.attemptCount ?? 0,
        requestedAt: props.requestedAt ?? new Date(),
        status: props.status ?? 'QUEUED',
      },
      id,
    );
  }

  public markFailedTerminal(reason: string, attemptCount: number): void {
    this.props.attemptCount = attemptCount;
    this.props.failureReason = reason;
    this.props.nextAttemptAt = undefined;
    this.props.status = 'FAILED_TERMINAL';
  }

  public requeue(): void {
    if (this.props.status !== 'FAILED_TERMINAL') {
      throw new Error('Only FAILED_TERMINAL notifications can be requeued.');
    }

    this.props.attemptCount = 0;
    this.props.failureReason = undefined;
    this.props.nextAttemptAt = undefined;
    this.props.status = 'QUEUED';
  }

  public markRetrying(reason: string, attemptCount: number, nextAttemptAt: Date): void {
    this.props.attemptCount = attemptCount;
    this.props.failureReason = reason;
    this.props.nextAttemptAt = nextAttemptAt;
    this.props.status = 'RETRYING';
  }

  public markSent(deliveredAt: Date, attemptCount: number): void {
    this.props.attemptCount = attemptCount;
    this.props.deliveredAt = deliveredAt;
    this.props.failureReason = undefined;
    this.props.nextAttemptAt = undefined;
    this.props.status = 'SENT';
  }

  public get attemptCount(): number {
    return this.props.attemptCount;
  }

  public get channelId(): string {
    return this.props.channelId;
  }

  public get deliveredAt(): Date | undefined {
    return this.props.deliveredAt;
  }

  public get eventName(): string {
    return this.props.eventName;
  }

  public get failureReason(): string | undefined {
    return this.props.failureReason;
  }

  public get maxAttempts(): number {
    return this.props.maxAttempts;
  }

  public get nextAttemptAt(): Date | undefined {
    return this.props.nextAttemptAt;
  }

  public get payload(): Record<string, unknown> {
    return this.props.payload;
  }

  public get recipient(): string {
    return this.props.recipient;
  }

  public get requestedAt(): Date {
    return this.props.requestedAt;
  }

  public get status(): NotificationRequestStatus {
    return this.props.status;
  }

  public get templateId(): string {
    return this.props.templateId;
  }
}
