export interface NotificationOutcomeDto {
  attemptedAt: string;
  attemptNumber: number;
  channelKey: string;
  errorSummary?: string;
  eventName: string;
  notificationRequestId: string;
  status: 'FAILED_TERMINAL' | 'PENDING' | 'RETRYING' | 'SUCCEEDED';
  targetSummary: string;
  templateDisplayName: string;
  templateKey: string;
}
