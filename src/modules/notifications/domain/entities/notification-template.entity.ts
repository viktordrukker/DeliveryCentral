import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface NotificationTemplateProps {
  bodyTemplate: string;
  channelId: string;
  displayName: string;
  eventName: string;
  isSystemManaged: boolean;
  subjectTemplate?: string;
  templateKey: string;
}

export class NotificationTemplate extends AggregateRoot<NotificationTemplateProps> {
  public static create(props: NotificationTemplateProps, id: string = randomUUID()) {
    return new NotificationTemplate(props, id);
  }

  public get bodyTemplate(): string {
    return this.props.bodyTemplate;
  }

  public get channelId(): string {
    return this.props.channelId;
  }

  public get displayName(): string {
    return this.props.displayName;
  }

  public get eventName(): string {
    return this.props.eventName;
  }

  public get isSystemManaged(): boolean {
    return this.props.isSystemManaged;
  }

  public get subjectTemplate(): string | undefined {
    return this.props.subjectTemplate;
  }

  public get templateKey(): string {
    return this.props.templateKey;
  }
}
