import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import {
  InAppNotificationRepository,
  InAppNotificationRecord,
} from '@src/modules/in-app-notifications/infrastructure/in-app-notification.repository';

function makeRecord(overrides: Partial<InAppNotificationRecord> = {}): InAppNotificationRecord {
  return {
    id: 'notif-1',
    recipientPersonId: 'person-1',
    eventType: 'assignment.approved',
    title: 'Your assignment was approved',
    body: 'Assignment to Project Alpha approved.',
    link: '/assignments/asgn-1',
    readAt: null,
    createdAt: new Date('2026-04-06T10:00:00Z'),
    ...overrides,
  };
}

function buildMockRepo(overrides: Partial<InAppNotificationRepository> = {}): InAppNotificationRepository {
  return {
    create: jest.fn().mockResolvedValue(makeRecord()),
    findForRecipient: jest.fn().mockResolvedValue([]),
    markRead: jest.fn().mockResolvedValue(makeRecord({ readAt: new Date() })),
    markAllRead: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as InAppNotificationRepository;
}

describe('InAppNotificationService — delivery', () => {
  it('creates notification via repository', async () => {
    const createMock = jest.fn().mockResolvedValue(makeRecord());
    const repo = buildMockRepo({ create: createMock });
    const svc = new InAppNotificationService(repo);

    await svc.createNotification('person-1', 'assignment.approved', 'Approved', 'Body', '/assignments/1');

    expect(createMock).toHaveBeenCalledWith({
      recipientPersonId: 'person-1',
      eventType: 'assignment.approved',
      title: 'Approved',
      body: 'Body',
      link: '/assignments/1',
    });
  });

  it('does not throw if repository create fails (silent suppression)', async () => {
    const repo = buildMockRepo({
      create: jest.fn().mockRejectedValue(new Error('DB connection failed')),
    });
    const svc = new InAppNotificationService(repo);

    // Must not throw — business workflow must not be blocked
    await expect(
      svc.createNotification('person-1', 'some.event', 'Title'),
    ).resolves.toBeUndefined();
  });

  it('getInbox delegates to repository with passed options', async () => {
    const records = [makeRecord(), makeRecord({ id: 'notif-2' })];
    const findMock = jest.fn().mockResolvedValue(records);
    const repo = buildMockRepo({ findForRecipient: findMock });
    const svc = new InAppNotificationService(repo);

    const result = await svc.getInbox('person-1', { unreadOnly: true, limit: 10 });

    expect(findMock).toHaveBeenCalledWith('person-1', { unreadOnly: true, limit: 10 });
    expect(result).toHaveLength(2);
  });

  it('getInbox with unreadOnly=true returns only unread items', async () => {
    // The service delegates filtering to the repo; test that the option is passed through
    const findMock = jest.fn().mockResolvedValue([makeRecord()]);
    const repo = buildMockRepo({ findForRecipient: findMock });
    const svc = new InAppNotificationService(repo);

    await svc.getInbox('person-1', { unreadOnly: true });

    expect(findMock).toHaveBeenCalledWith('person-1', { unreadOnly: true });
  });
});

describe('InAppNotificationService — read state', () => {
  it('markRead calls repository and returns updated record', async () => {
    const updatedRecord = makeRecord({ readAt: new Date('2026-04-06T12:00:00Z') });
    const markReadMock = jest.fn().mockResolvedValue(updatedRecord);
    const repo = buildMockRepo({ markRead: markReadMock });
    const svc = new InAppNotificationService(repo);

    const result = await svc.markRead('notif-1', 'person-1');

    expect(markReadMock).toHaveBeenCalledWith('notif-1', 'person-1');
    expect(result).not.toBeNull();
    expect(result!.readAt).toBeDefined();
  });

  it('markRead returns null if notification not found or not owned by recipient', async () => {
    const repo = buildMockRepo({ markRead: jest.fn().mockResolvedValue(null) });
    const svc = new InAppNotificationService(repo);

    const result = await svc.markRead('unknown-id', 'person-1');

    expect(result).toBeNull();
  });

  it('markAllRead calls repository with correct recipient', async () => {
    const markAllReadMock = jest.fn().mockResolvedValue(undefined);
    const repo = buildMockRepo({ markAllRead: markAllReadMock });
    const svc = new InAppNotificationService(repo);

    await svc.markAllRead('person-1');

    expect(markAllReadMock).toHaveBeenCalledWith('person-1');
  });
});

describe('NotificationDelivery entity — status transitions', () => {
  // Test the delivery entity domain logic directly
  it('starts with PENDING status', async () => {
    const { NotificationDelivery } = await import(
      '@src/modules/notifications/domain/entities/notification-delivery.entity'
    );
    const delivery = NotificationDelivery.create({
      attemptNumber: 1,
      channelId: 'ch-1',
      notificationRequestId: 'req-1',
      recipient: 'user@example.com',
      renderedBody: 'Hello',
    });
    expect(delivery.status).toBe('PENDING');
  });

  it('markSucceeded transitions to SUCCEEDED', async () => {
    const { NotificationDelivery } = await import(
      '@src/modules/notifications/domain/entities/notification-delivery.entity'
    );
    const delivery = NotificationDelivery.create({
      attemptNumber: 1,
      channelId: 'ch-1',
      notificationRequestId: 'req-1',
      recipient: 'user@example.com',
      renderedBody: 'Hello',
    });
    delivery.markSucceeded('provider-msg-1');
    expect(delivery.status).toBe('SUCCEEDED');
    expect(delivery.providerMessageId).toBe('provider-msg-1');
    expect(delivery.failureReason).toBeUndefined();
  });

  it('markRetrying sets status, reason and nextAttemptAt', async () => {
    const { NotificationDelivery } = await import(
      '@src/modules/notifications/domain/entities/notification-delivery.entity'
    );
    const delivery = NotificationDelivery.create({
      attemptNumber: 1,
      channelId: 'ch-1',
      notificationRequestId: 'req-1',
      recipient: 'user@example.com',
      renderedBody: 'Hello',
    });
    const next = new Date('2026-04-06T13:00:00Z');
    delivery.markRetrying('Temporary failure', next);
    expect(delivery.status).toBe('RETRYING');
    expect(delivery.failureReason).toBe('Temporary failure');
    expect(delivery.nextAttemptAt).toBe(next);
  });

  it('markFailedTerminal sets status and reason, clears nextAttemptAt', async () => {
    const { NotificationDelivery } = await import(
      '@src/modules/notifications/domain/entities/notification-delivery.entity'
    );
    const delivery = NotificationDelivery.create({
      attemptNumber: 1,
      channelId: 'ch-1',
      notificationRequestId: 'req-1',
      recipient: 'user@example.com',
      renderedBody: 'Hello',
    });
    delivery.markRetrying('Retrying...', new Date());
    delivery.markFailedTerminal('Max attempts exceeded');
    expect(delivery.status).toBe('FAILED_TERMINAL');
    expect(delivery.failureReason).toBe('Max attempts exceeded');
    expect(delivery.nextAttemptAt).toBeUndefined();
  });
});
