import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { NotificationDispatchService } from '@src/modules/notifications/application/notification-dispatch.service';
import { NotificationDeliveryFailure } from '@src/modules/notifications/application/notification-channel-adapter';
import { NotificationRetryPolicy } from '@src/modules/notifications/application/notification-retry-policy';
import { NotificationTemplateResolver } from '@src/modules/notifications/application/notification-template-resolver.service';
import { EmailNotificationChannelAdapter } from '@src/modules/notifications/infrastructure/adapters/email-notification-channel.adapter';
import { InMemoryEmailTransport } from '@src/modules/notifications/infrastructure/adapters/in-memory-email.transport';
import { FetchTeamsWebhookTransport } from '@src/modules/notifications/infrastructure/adapters/fetch-teams-webhook.transport';
import { InMemoryTeamsWebhookTransport } from '@src/modules/notifications/infrastructure/adapters/in-memory-teams-webhook.transport';
import { InMemoryTeamsWebhookNotificationChannelAdapter } from '@src/modules/notifications/infrastructure/adapters/in-memory-teams-webhook-notification-channel.adapter';
import { NodemailerSmtpEmailTransport } from '@src/modules/notifications/infrastructure/adapters/nodemailer-smtp-email.transport';
import { PrismaNotificationDeliveryRepository } from '@src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-delivery.repository';
import { PrismaNotificationRequestRepository } from '@src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-request.repository';

import { roleHeaders } from '../helpers/api/auth-headers';

class RetryThenSucceedEmailTransport extends InMemoryEmailTransport {
  private attempts = 0;

  public override async send(message: Parameters<InMemoryEmailTransport['send']>[0]) {
    this.attempts += 1;

    if (this.attempts === 1) {
      throw new NotificationDeliveryFailure('Email delivery temporarily failed.', true, 'EMAIL_RETRYABLE');
    }

    return super.send(message);
  }
}

describe('Notification infrastructure', () => {
  it('resolves templates with payload variables', () => {
    const resolver = new NotificationTemplateResolver();

    const output = resolver.resolve('Assignment {{assignmentId}} for {{project.name}}.', {
      assignmentId: 'ASN-001',
      project: {
        name: 'Atlas ERP Rollout',
      },
    });

    expect(output).toBe('Assignment ASN-001 for Atlas ERP Rollout.');
  });

  it('maps rendered template content into an email payload', () => {
    const adapter = new EmailNotificationChannelAdapter(new InMemoryEmailTransport(), {
      fromAddress: 'noreply@example.com',
      fromName: 'DeliveryCentral',
      replyTo: 'support@example.com',
    });

    const payload = adapter.buildMessagePayload(
      {
        body: 'Assignment ASN-001 was created for project PRJ-101 with role Lead Engineer.',
        recipient: 'ops@example.com',
        subject: 'Assignment created: ASN-001',
      },
      {
        fromName: 'DeliveryCentral Notifications',
      },
    );

    expect(payload).toEqual({
      from: 'DeliveryCentral Notifications <noreply@example.com>',
      replyTo: 'support@example.com',
      subject: 'Assignment created: ASN-001',
      text: 'Assignment ASN-001 was created for project PRJ-101 with role Lead Engineer.',
      to: 'ops@example.com',
    });
  });

  it('selects the email adapter and persists delivery records', async () => {
    const emailTransport = new InMemoryEmailTransport();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NodemailerSmtpEmailTransport)
      .useValue(emailTransport)
      .compile();

    const dispatchService = moduleRef.get(NotificationDispatchService);
    const requestRepository = moduleRef.get(PrismaNotificationRequestRepository);
    const deliveryRepository = moduleRef.get(PrismaNotificationDeliveryRepository);

    const result = await dispatchService.dispatch({
      channelKey: 'email',
      eventName: 'assignment.created',
      payload: {
        assignmentId: 'ASN-001',
        projectId: 'PRJ-101',
        staffingRole: 'Lead Engineer',
      },
      recipient: 'ops@example.com',
      templateKey: 'assignment-created-email',
    });

    const requests = await requestRepository.listAll();
    const deliveries = await deliveryRepository.listAll();

    expect(result.status).toBe('SUCCEEDED');
    expect(emailTransport.getMessages()).toHaveLength(1);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.status).toBe('SENT');
    expect(requests[0]?.attemptCount).toBe(1);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.status).toBe('SUCCEEDED');
    expect(deliveries[0]?.attemptNumber).toBe(1);
  });

  it('marks retryable failures as RETRYING before terminal exhaustion', async () => {
    const emailTransport = new InMemoryEmailTransport();
    const retryPolicy = {
      calculateNextAttempt: (attemptedAt: Date) => new Date(attemptedAt.getTime() + 5000),
      maxAttempts: 2,
      retryDelayMs: 0,
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NodemailerSmtpEmailTransport)
      .useValue(emailTransport)
      .overrideProvider(NotificationRetryPolicy)
      .useValue(retryPolicy)
      .compile();

    const dispatchService = moduleRef.get(NotificationDispatchService);
    const requestRepository = moduleRef.get(PrismaNotificationRequestRepository);
    const deliveryRepository = moduleRef.get(PrismaNotificationDeliveryRepository);

    const result = await dispatchService.dispatch({
      channelKey: 'email',
      eventName: 'assignment.created',
      payload: {
        assignmentId: 'ASN-010',
        projectId: 'PRJ-110',
        staffingRole: 'Engineer',
      },
      recipient: 'retry@example.com',
      templateKey: 'assignment-created-email',
    });

    const requests = await requestRepository.listAll();
    const deliveries = await deliveryRepository.listAll();
    const requestRecord = requests[requests.length - 1];
    const requestDeliveries = deliveries.filter(
      (delivery) => delivery.notificationRequestId === requestRecord?.id,
    );

    expect(result.status).toBe('FAILED');
    expect(requestRecord?.status).toBe('FAILED_TERMINAL');
    expect(requestRecord?.attemptCount).toBe(2);
    expect(requestDeliveries).toHaveLength(2);
    expect(requestDeliveries[0]?.status).toBe('RETRYING');
    expect(requestDeliveries[0]?.nextAttemptAt).toBeInstanceOf(Date);
    expect(requestDeliveries[1]?.status).toBe('FAILED_TERMINAL');
  });

  it('records terminal failure state without retrying', async () => {
    const emailTransport = new InMemoryEmailTransport();
    const retryPolicy = {
      calculateNextAttempt: (attemptedAt: Date) => new Date(attemptedAt.getTime() + 5000),
      maxAttempts: 3,
      retryDelayMs: 0,
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NodemailerSmtpEmailTransport)
      .useValue(emailTransport)
      .overrideProvider(NotificationRetryPolicy)
      .useValue(retryPolicy)
      .compile();

    const dispatchService = moduleRef.get(NotificationDispatchService);
    const requestRepository = moduleRef.get(PrismaNotificationRequestRepository);
    const deliveryRepository = moduleRef.get(PrismaNotificationDeliveryRepository);

    const result = await dispatchService.dispatch({
      channelKey: 'email',
      eventName: 'assignment.created',
      payload: {
        assignmentId: 'ASN-002',
        projectId: 'PRJ-102',
        staffingRole: 'Engineer',
      },
      recipient: 'fail@example.com',
      templateKey: 'assignment-created-email',
    });

    const requests = await requestRepository.listAll();
    const deliveries = await deliveryRepository.listAll();
    const latestRequest = requests[requests.length - 1];
    const requestDeliveries = deliveries.filter(
      (delivery) => delivery.notificationRequestId === latestRequest?.id,
    );
    const latestDelivery = requestDeliveries[requestDeliveries.length - 1];

    expect(result.status).toBe('FAILED');
    expect(latestRequest?.status).toBe('FAILED_TERMINAL');
    expect(latestRequest?.failureReason).toBe('Email delivery failed.');
    expect(latestRequest?.attemptCount).toBe(1);
    expect(requestDeliveries).toHaveLength(1);
    expect(latestDelivery?.status).toBe('FAILED_TERMINAL');
    expect(latestDelivery?.failureReason).toBe('Email delivery failed.');
  });

  it('succeeds after a retryable email failure', async () => {
    const emailTransport = new RetryThenSucceedEmailTransport();
    const retryPolicy = {
      calculateNextAttempt: (attemptedAt: Date) => new Date(attemptedAt.getTime() + 5000),
      maxAttempts: 3,
      retryDelayMs: 0,
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NodemailerSmtpEmailTransport)
      .useValue(emailTransport)
      .overrideProvider(NotificationRetryPolicy)
      .useValue(retryPolicy)
      .compile();

    const dispatchService = moduleRef.get(NotificationDispatchService);
    const requestRepository = moduleRef.get(PrismaNotificationRequestRepository);
    const deliveryRepository = moduleRef.get(PrismaNotificationDeliveryRepository);

    const result = await dispatchService.dispatch({
      channelKey: 'email',
      eventName: 'assignment.created',
      payload: {
        assignmentId: 'ASN-020',
        projectId: 'PRJ-120',
        staffingRole: 'Lead Engineer',
      },
      recipient: 'ops@example.com',
      templateKey: 'assignment-created-email',
    });

    const requests = await requestRepository.listAll();
    const deliveries = await deliveryRepository.listAll();
    const requestRecord = requests[requests.length - 1];
    const requestDeliveries = deliveries.filter(
      (delivery) => delivery.notificationRequestId === requestRecord?.id,
    );

    expect(result.status).toBe('SUCCEEDED');
    expect(requestRecord?.status).toBe('SENT');
    expect(requestRecord?.attemptCount).toBe(2);
    expect(requestDeliveries).toHaveLength(2);
    expect(requestDeliveries[0]?.status).toBe('RETRYING');
    expect(requestDeliveries[1]?.status).toBe('SUCCEEDED');
  });

  it('maps rendered template content into a Teams webhook payload', async () => {
    const teamsAdapter = new InMemoryTeamsWebhookNotificationChannelAdapter(
      new InMemoryTeamsWebhookTransport(),
    );

    const payload = teamsAdapter.buildMessagePayload(
      {
        body: 'Integration sync failed for jira projects.',
        recipient: 'https://contoso.example/webhook',
        subject: 'Integration sync failed',
      },
      {
        themeColor: '005A9C',
        titlePrefix: '[Ops]',
      },
    );

    expect(payload).toEqual(
      expect.objectContaining({
        '@context': 'https://schema.org/extensions',
        '@type': 'MessageCard',
        summary: 'Integration sync failed',
        text: 'Integration sync failed for jira projects.',
        themeColor: '005A9C',
        title: '[Ops] Integration sync failed',
      }),
    );
  });

  it('sends successfully through the Teams webhook adapter', async () => {
    const teamsAdapter = new InMemoryTeamsWebhookNotificationChannelAdapter(
      new InMemoryTeamsWebhookTransport(),
    );

    const result = await teamsAdapter.send(
      {
        body: 'Integration sync failed for jira projects.',
        recipient: 'https://contoso.example/webhook',
        subject: 'Integration sync failed',
      },
      {
        themeColor: '005A9C',
        titlePrefix: '[Ops]',
      },
    );

    const sentPayloads = teamsAdapter.getSentPayloads();

    expect(result.providerMessageId).toBe('teams-1');
    expect(sentPayloads).toHaveLength(1);
    expect(sentPayloads[0]?.webhookUrl).toBe('https://contoso.example/webhook');
    expect(sentPayloads[0]?.payload.title).toBe('[Ops] Integration sync failed');
  });

  it('records terminal failure state when Teams webhook sending fails', async () => {
    const transport = new InMemoryTeamsWebhookTransport();
    const emailTransport = new InMemoryEmailTransport();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NodemailerSmtpEmailTransport)
      .useValue(emailTransport)
      .overrideProvider(FetchTeamsWebhookTransport)
      .useValue(transport)
      .compile();

    const dispatchService = moduleRef.get(NotificationDispatchService);
    const requestRepository = moduleRef.get(PrismaNotificationRequestRepository);
    const deliveryRepository = moduleRef.get(PrismaNotificationDeliveryRepository);

    const result = await dispatchService.dispatch({
      channelKey: 'ms_teams_webhook',
      eventName: 'integration.sync_failed',
      payload: {
        errorMessage: 'Timed out calling Jira.',
        provider: 'jira',
        resourceType: 'projects',
      },
      recipient: 'https://fail.example/webhook',
      templateKey: 'integration-sync-failed-teams',
    });

    const requests = await requestRepository.listAll();
    const deliveries = await deliveryRepository.listAll();
    const latestRequest = requests[requests.length - 1];
    const latestDelivery = deliveries[deliveries.length - 1];

    expect(result.status).toBe('FAILED');
    expect(latestRequest?.status).toBe('FAILED_TERMINAL');
    expect(latestDelivery?.status).toBe('FAILED_TERMINAL');
    expect(latestDelivery?.failureReason).toBe('Teams webhook delivery failed.');
  });
});

describe('Notifications API', () => {
  it('lists templates, exposes recent outcomes, and sends a test notification', async () => {
    const emailTransport = new InMemoryEmailTransport();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NodemailerSmtpEmailTransport)
      .useValue(emailTransport)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const templatesResponse = await request(app.getHttpServer())
      .get('/notifications/templates')
      .set(roleHeaders('admin'))
      .expect(200);

    const sendResponse = await request(app.getHttpServer())
      .post('/notifications/test-send')
      .set(roleHeaders('admin'))
      .send({
        channelKey: 'email',
        payload: {
          assignmentId: 'ASN-003',
          projectId: 'PRJ-103',
          staffingRole: 'Architect',
        },
        recipient: 'ops@example.com',
        templateKey: 'assignment-created-email',
      })
      .expect(201);

    const outcomesResponse = await request(app.getHttpServer())
      .get('/notifications/outcomes')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(templatesResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channelKey: 'email',
          templateKey: 'assignment-created-email',
        }),
      ]),
    );
    expect(sendResponse.body).toEqual(
      expect.objectContaining({
        status: 'SUCCEEDED',
      }),
    );
    expect(outcomesResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channelKey: 'email',
          eventName: 'test.assignment-created-email',
          status: 'SUCCEEDED',
          targetSummary: 'op***@example.com',
          templateKey: 'assignment-created-email',
        }),
      ]),
    );
    expect(emailTransport.getMessages()).toHaveLength(1);

    await app.close();
  });

  it('sends a Teams test notification through the existing test-send endpoint', async () => {
    const transport = new InMemoryTeamsWebhookTransport();
    const emailTransport = new InMemoryEmailTransport();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NodemailerSmtpEmailTransport)
      .useValue(emailTransport)
      .overrideProvider(FetchTeamsWebhookTransport)
      .useValue(transport)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const sendResponse = await request(app.getHttpServer())
      .post('/notifications/test-send')
      .set(roleHeaders('admin'))
      .send({
        channelKey: 'ms_teams_webhook',
        payload: {
          errorMessage: 'Timed out calling Jira.',
          provider: 'jira',
          resourceType: 'projects',
        },
        recipient: 'https://contoso.example/webhook',
        templateKey: 'integration-sync-failed-teams',
      })
      .expect(201);

    expect(sendResponse.body).toEqual(
      expect.objectContaining({
        status: 'SUCCEEDED',
      }),
    );

    await app.close();
  });
});
