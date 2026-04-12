export interface NotificationTestSendResponseDto {
  deliveryId: string;
  notificationRequestId: string;
  status: 'FAILED' | 'SUCCEEDED';
}
