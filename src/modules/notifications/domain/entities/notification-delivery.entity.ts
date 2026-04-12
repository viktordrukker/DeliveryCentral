import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

export type NotificationDeliveryStatus = 'FAILED_TERMINAL' | 'PENDING' | 'RETRYING' | 'SUCCEEDED';

interface NotificationDeliveryProps {
  attemptNumber: number;
  attemptedAt: Date;
  channelId: string;
  failureReason?: string;
  nextAttemptAt?: Date;
  notificationRequestId: string;
  providerMessageId?: string;
  recipient: string;
  renderedBody: string;
  renderedSubject?: string;
  status: NotificationDeliveryStatus;
}

export class NotificationDelivery extends AggregateRoot<NotificationDeliveryProps> {
  public static create(
    props: Omit<NotificationDeliveryProps, 'attemptedAt' | 'status'> & {
      attemptedAt?: Date;
      status?: NotificationDeliveryStatus;
    },
    id: string = randomUUID(),
  ) {
    return new NotificationDelivery(
      {
        ...props,
        attemptedAt: props.attemptedAt ?? new Date(),
        status: props.status ?? 'PENDING',
      },
      id,
    );
  }

  public markFailedTerminal(reason: string): void {
    this.props.failureReason = reason;
    this.props.nextAttemptAt = undefined;
    this.props.status = 'FAILED_TERMINAL';
  }

  public markRetrying(reason: string, nextAttemptAt: Date): void {
    this.props.failureReason = reason;
    this.props.nextAttemptAt = nextAttemptAt;
    this.props.status = 'RETRYING';
  }

  public markSucceeded(providerMessageId?: string): void {
    this.props.failureReason = undefined;
    this.props.nextAttemptAt = undefined;
    this.props.providerMessageId = providerMessageId;
    this.props.status = 'SUCCEEDED';
  }

  public get attemptNumber(): number {
    return this.props.attemptNumber;
  }

  public get attemptedAt(): Date {
    return this.props.attemptedAt;
  }

  public get channelId(): string {
    return this.props.channelId;
  }

  public get failureReason(): string | undefined {
    return this.props.failureReason;
  }

  public get nextAttemptAt(): Date | undefined {
    return this.props.nextAttemptAt;
  }

  public get notificationRequestId(): string {
    return this.props.notificationRequestId;
  }

  public get providerMessageId(): string | undefined {
    return this.props.providerMessageId;
  }

  public get recipient(): string {
    return this.props.recipient;
  }

  public get renderedBody(): string {
    return this.props.renderedBody;
  }

  public get renderedSubject(): string | undefined {
    return this.props.renderedSubject;
  }

  public get status(): NotificationDeliveryStatus {
    return this.props.status;
  }
}
