import { NotificationChannel } from '../../../domain/entities/notification-channel.entity';

export function createSeededInMemoryNotificationChannelRepository() {
  return [
    NotificationChannel.create(
      {
        channelKey: 'email',
        displayName: 'Email',
        isEnabled: true,
        kind: 'email',
      },
      '71111111-1111-1111-1111-111111111001',
    ),
    NotificationChannel.create(
      {
        channelKey: 'ms_teams_webhook',
        config: {
          themeColor: '2F6FEB',
          titlePrefix: '[DeliveryCentral]',
        },
        displayName: 'Microsoft Teams Webhook',
        isEnabled: true,
        kind: 'webhook',
      },
      '71111111-1111-1111-1111-111111111002',
    ),
    NotificationChannel.create(
      {
        channelKey: 'generic',
        displayName: 'Generic Channel',
        isEnabled: true,
        kind: 'generic',
      },
      '71111111-1111-1111-1111-111111111003',
    ),
  ];
}
