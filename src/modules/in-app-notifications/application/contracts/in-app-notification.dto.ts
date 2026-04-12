export class InAppNotificationDto {
  id!: string;
  recipientPersonId!: string;
  eventType!: string;
  title!: string;
  body!: string | null;
  link!: string | null;
  readAt!: string | null;
  createdAt!: string;
}
