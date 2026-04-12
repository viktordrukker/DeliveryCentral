import { Module } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { InAppNotificationsModule } from '@src/modules/in-app-notifications/in-app-notifications.module';
import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { NotificationDispatchService } from './application/notification-dispatch.service';
import { NotificationEventTranslatorService } from './application/notification-event-translator.service';
import { NotificationOutcomeQueryService } from './application/notification-outcome-query.service';
import { NotificationRetryPolicy } from './application/notification-retry-policy';
import { NotificationTemplateQueryService } from './application/notification-template-query.service';
import { NotificationTemplateResolver } from './application/notification-template-resolver.service';
import { NotificationQueueQueryService } from './application/notification-queue-query.service';
import { RequeueNotificationService } from './application/requeue-notification.service';
import { NotificationTestSendService } from './application/notification-test-send.service';
import { EmailNotificationChannelAdapter } from './infrastructure/adapters/email-notification-channel.adapter';
import { FetchTeamsWebhookTransport } from './infrastructure/adapters/fetch-teams-webhook.transport';
import { InMemoryGenericNotificationChannelAdapter } from './infrastructure/adapters/in-memory-generic-notification-channel.adapter';
import { InMemoryTeamsWebhookNotificationChannelAdapter } from './infrastructure/adapters/in-memory-teams-webhook-notification-channel.adapter';
import { NodemailerSmtpEmailTransport } from './infrastructure/adapters/nodemailer-smtp-email.transport';
import { PrismaNotificationChannelRepository } from './infrastructure/repositories/prisma/prisma-notification-channel.repository';
import { PrismaNotificationDeliveryRepository } from './infrastructure/repositories/prisma/prisma-notification-delivery.repository';
import { PrismaNotificationRequestRepository } from './infrastructure/repositories/prisma/prisma-notification-request.repository';
import { PrismaNotificationTemplateRepository } from './infrastructure/repositories/prisma/prisma-notification-template.repository';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  imports: [InAppNotificationsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationTemplateResolver,
    NotificationRetryPolicy,
    {
      provide: PrismaNotificationChannelRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaNotificationChannelRepository(prisma.notificationChannel),
      inject: [PrismaService],
    },
    {
      provide: PrismaNotificationTemplateRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaNotificationTemplateRepository(prisma.notificationTemplate),
      inject: [PrismaService],
    },
    {
      provide: PrismaNotificationRequestRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaNotificationRequestRepository(prisma.notificationRequest),
      inject: [PrismaService],
    },
    {
      provide: PrismaNotificationDeliveryRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaNotificationDeliveryRepository(prisma.notificationDelivery),
      inject: [PrismaService],
    },
    {
      provide: NodemailerSmtpEmailTransport,
      useClass: NodemailerSmtpEmailTransport,
    },
    {
      provide: EmailNotificationChannelAdapter,
      useFactory: (transport: NodemailerSmtpEmailTransport, appConfig: AppConfig) =>
        new EmailNotificationChannelAdapter(transport, {
          fromAddress: appConfig.notificationsEmailFromAddress,
          fromName: appConfig.notificationsEmailFromName,
          replyTo: appConfig.notificationsEmailReplyTo,
        }),
      inject: [NodemailerSmtpEmailTransport, AppConfig],
    },
    {
      provide: FetchTeamsWebhookTransport,
      useClass: FetchTeamsWebhookTransport,
    },
    {
      provide: InMemoryTeamsWebhookNotificationChannelAdapter,
      useFactory: (transport: FetchTeamsWebhookTransport) =>
        new InMemoryTeamsWebhookNotificationChannelAdapter(transport),
      inject: [FetchTeamsWebhookTransport],
    },
    {
      provide: InMemoryGenericNotificationChannelAdapter,
      useValue: new InMemoryGenericNotificationChannelAdapter(),
    },
    {
      provide: NotificationDispatchService,
      useFactory: (
        emailAdapter: EmailNotificationChannelAdapter,
        teamsAdapter: InMemoryTeamsWebhookNotificationChannelAdapter,
        genericAdapter: InMemoryGenericNotificationChannelAdapter,
        channelRepository: PrismaNotificationChannelRepository,
        templateRepository: PrismaNotificationTemplateRepository,
        requestRepository: PrismaNotificationRequestRepository,
        deliveryRepository: PrismaNotificationDeliveryRepository,
        templateResolver: NotificationTemplateResolver,
        retryPolicy: NotificationRetryPolicy,
        auditLogger: AuditLoggerService,
      ) =>
        new NotificationDispatchService(
          [emailAdapter, teamsAdapter, genericAdapter],
          channelRepository,
          templateRepository,
          requestRepository,
          deliveryRepository,
          templateResolver,
          retryPolicy,
          auditLogger,
        ),
      inject: [
        EmailNotificationChannelAdapter,
        InMemoryTeamsWebhookNotificationChannelAdapter,
        InMemoryGenericNotificationChannelAdapter,
        PrismaNotificationChannelRepository,
        PrismaNotificationTemplateRepository,
        PrismaNotificationRequestRepository,
        PrismaNotificationDeliveryRepository,
        NotificationTemplateResolver,
        NotificationRetryPolicy,
        AuditLoggerService,
      ],
    },
    {
      provide: NotificationOutcomeQueryService,
      useFactory: (
        channelRepository: PrismaNotificationChannelRepository,
        templateRepository: PrismaNotificationTemplateRepository,
        requestRepository: PrismaNotificationRequestRepository,
        deliveryRepository: PrismaNotificationDeliveryRepository,
      ) =>
        new NotificationOutcomeQueryService(
          channelRepository,
          templateRepository,
          requestRepository,
          deliveryRepository,
        ),
      inject: [
        PrismaNotificationChannelRepository,
        PrismaNotificationTemplateRepository,
        PrismaNotificationRequestRepository,
        PrismaNotificationDeliveryRepository,
      ],
    },
    {
      provide: NotificationTemplateQueryService,
      useFactory: (
        channelRepository: PrismaNotificationChannelRepository,
        templateRepository: PrismaNotificationTemplateRepository,
      ) => new NotificationTemplateQueryService(channelRepository, templateRepository),
      inject: [PrismaNotificationChannelRepository, PrismaNotificationTemplateRepository],
    },
    {
      provide: NotificationQueueQueryService,
      useFactory: (
        requestRepository: PrismaNotificationRequestRepository,
        deliveryRepository: PrismaNotificationDeliveryRepository,
      ) => new NotificationQueueQueryService(requestRepository, deliveryRepository),
      inject: [PrismaNotificationRequestRepository, PrismaNotificationDeliveryRepository],
    },
    {
      provide: RequeueNotificationService,
      useFactory: (requestRepository: PrismaNotificationRequestRepository) =>
        new RequeueNotificationService(requestRepository),
      inject: [PrismaNotificationRequestRepository],
    },
    {
      provide: NotificationTestSendService,
      useFactory: (dispatchService: NotificationDispatchService) =>
        new NotificationTestSendService(dispatchService),
      inject: [NotificationDispatchService],
    },
    {
      provide: NotificationEventTranslatorService,
      useFactory: (
        dispatchService: NotificationDispatchService,
        appConfig: AppConfig,
        inAppNotificationService: InAppNotificationService,
      ) => new NotificationEventTranslatorService(dispatchService, appConfig, inAppNotificationService),
      inject: [NotificationDispatchService, AppConfig, InAppNotificationService],
    },
  ],
  exports: [
    NotificationDispatchService,
    NotificationEventTranslatorService,
    NotificationOutcomeQueryService,
    NotificationQueueQueryService,
    NotificationTemplateQueryService,
    NotificationTestSendService,
    RequeueNotificationService,
    PrismaNotificationChannelRepository,
    PrismaNotificationTemplateRepository,
    PrismaNotificationRequestRepository,
    PrismaNotificationDeliveryRepository,
    EmailNotificationChannelAdapter,
    InMemoryTeamsWebhookNotificationChannelAdapter,
    FetchTeamsWebhookTransport,
    NodemailerSmtpEmailTransport,
    InMemoryGenericNotificationChannelAdapter,
  ],
})
export class NotificationsModule {}
