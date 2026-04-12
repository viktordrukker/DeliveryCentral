export interface NotificationTemplateDto {
  templateKey: string;
  eventName: string;
  displayName: string;
  channelKey: string;
  subjectTemplate?: string;
  bodyTemplate: string;
}
