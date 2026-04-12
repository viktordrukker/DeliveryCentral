import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface NotificationChannelProps {
  channelKey: string;
  config?: Record<string, unknown>;
  displayName: string;
  isEnabled: boolean;
  kind: string;
}

export class NotificationChannel extends AggregateRoot<NotificationChannelProps> {
  public static create(props: NotificationChannelProps, id: string = randomUUID()) {
    return new NotificationChannel(props, id);
  }

  public get channelKey(): string {
    return this.props.channelKey;
  }

  public get config(): Record<string, unknown> | undefined {
    return this.props.config;
  }

  public get displayName(): string {
    return this.props.displayName;
  }

  public get isEnabled(): boolean {
    return this.props.isEnabled;
  }

  public get kind(): string {
    return this.props.kind;
  }
}
