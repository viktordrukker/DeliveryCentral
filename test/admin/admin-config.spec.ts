import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { AdminConfigQueryService } from '@src/modules/admin/application/admin-config-query.service';
import { JiraStatusService } from '@src/modules/integrations/jira/application/jira-status.service';
import { JiraSyncStatusStore } from '@src/modules/integrations/jira/application/jira-sync-status.store';
import { M365DirectoryStatusService } from '@src/modules/integrations/m365/application/m365-directory-status.service';
import { RadiusStatusService } from '@src/modules/integrations/radius/application/radius-status.service';
import { InMemoryDirectorySyncStateRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-directory-sync-state.repository';
import { InMemoryPersonExternalIdentityLinkRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-person-external-identity-link.repository';
import { InMemoryExternalAccountLinkRepository } from '@src/modules/integrations/radius/infrastructure/repositories/in-memory/in-memory-external-account-link.repository';
import { InMemoryRadiusSyncStateRepository } from '@src/modules/integrations/radius/infrastructure/repositories/in-memory/in-memory-radius-sync-state.repository';
import { MetadataDictionaryQueryService } from '@src/modules/metadata/application/metadata-dictionary-query.service';
import { createSeededInMemoryMetadataDictionaryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/create-seeded-in-memory-metadata-dictionary.repository';
import { createSeededInMemoryMetadataEntryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/create-seeded-in-memory-metadata-entry.repository';
import { NotificationTemplateQueryService } from '@src/modules/notifications/application/notification-template-query.service';
import { createSeededInMemoryNotificationChannelRepository } from '@src/modules/notifications/infrastructure/repositories/in-memory/create-seeded-in-memory-notification-channel.repository';
import { createSeededInMemoryNotificationTemplateRepository } from '@src/modules/notifications/infrastructure/repositories/in-memory/create-seeded-in-memory-notification-template.repository';
import { InMemoryNotificationChannelRepository } from '@src/modules/notifications/infrastructure/repositories/in-memory/in-memory-notification-channel.repository';
import { InMemoryNotificationTemplateRepository } from '@src/modules/notifications/infrastructure/repositories/in-memory/in-memory-notification-template.repository';
import { PrismaNotificationChannelRepository } from '@src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-channel.repository';
import { AppConfig } from '@src/shared/config/app-config';

import { roleHeaders } from '../helpers/api/auth-headers';

describe('Admin config aggregation', () => {
  it('aggregates dictionaries, integrations config, and system flags', async () => {
    const jiraSyncStatusStore = new JiraSyncStatusStore();
    jiraSyncStatusStore.recordSuccess('Created 2, updated 1.');

    const service = new AdminConfigQueryService(
      new MetadataDictionaryQueryService(
        createSeededInMemoryMetadataDictionaryRepository(),
        createSeededInMemoryMetadataEntryRepository(),
      ),
      new JiraStatusService(jiraSyncStatusStore),
      new M365DirectoryStatusService(
        new InMemoryPersonExternalIdentityLinkRepository(),
        new InMemoryDirectorySyncStateRepository(),
        new AppConfig(),
      ),
      new RadiusStatusService(
        new InMemoryExternalAccountLinkRepository(),
        new InMemoryRadiusSyncStateRepository(),
        new AppConfig(),
      ),
      moduleRefNotificationTemplateQueryService(),
      moduleRefNotificationChannelRepository(),
      new AppConfig(),
    );

    const result = await service.execute();

    expect(result.dictionaries.length).toBeGreaterThan(0);
    expect(result.dictionaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dictionaryKey: 'project-types',
          displayName: 'Project Types',
        }),
      ]),
    );
    expect(result.integrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'jira',
          status: 'configured',
          supportsProjectSync: true,
        }),
        expect.objectContaining({
          provider: 'm365',
          status: 'configured',
          supportsDirectorySync: true,
        }),
        expect.objectContaining({
          provider: 'radius',
          supportsAccountSync: true,
        }),
      ]),
    );
    expect(result.systemFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'development_mode' }),
        expect.objectContaining({ key: 'workspend_summary_enabled' }),
      ]),
    );
  });

  it('aggregates notification templates and channels for the admin panel', async () => {
    const service = new AdminConfigQueryService(
      new MetadataDictionaryQueryService(
        createSeededInMemoryMetadataDictionaryRepository(),
        createSeededInMemoryMetadataEntryRepository(),
      ),
      new JiraStatusService(new JiraSyncStatusStore()),
      new M365DirectoryStatusService(
        new InMemoryPersonExternalIdentityLinkRepository(),
        new InMemoryDirectorySyncStateRepository(),
        new AppConfig(),
      ),
      new RadiusStatusService(
        new InMemoryExternalAccountLinkRepository(),
        new InMemoryRadiusSyncStateRepository(),
        new AppConfig(),
      ),
      moduleRefNotificationTemplateQueryService(),
      moduleRefNotificationChannelRepository(),
      new AppConfig(),
    );

    const result = await service.getNotifications();

    expect(result.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channelKey: 'email',
          displayName: expect.any(String),
        }),
      ]),
    );
    expect(result.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: 'assignment.created',
          templateKey: expect.any(String),
        }),
      ]),
    );
  });
});

describe('Admin config API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /admin/config returns aggregated admin config for admin callers', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/config')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        dictionaries: expect.any(Array),
        integrations: expect.any(Array),
        systemFlags: expect.any(Array),
      }),
    );
    expect(response.body.integrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'jira',
          status: expect.any(String),
        }),
        expect.objectContaining({
          provider: 'm365',
          status: expect.any(String),
        }),
        expect.objectContaining({
          provider: 'radius',
          status: expect.any(String),
        }),
      ]),
    );
  });

  it('GET /admin/config rejects non-admin callers', async () => {
    await request(app.getHttpServer())
      .get('/admin/config')
      .set(roleHeaders('director'))
      .expect(403);
  });

  it('GET /admin/settings returns system flags', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/settings')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        systemFlags: expect.any(Array),
      }),
    );
  });

  it('GET /admin/integrations returns integration summaries', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/integrations')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        integrations: expect.arrayContaining([
          expect.objectContaining({
            provider: 'jira',
          }),
          expect.objectContaining({
            provider: 'm365',
          }),
          expect.objectContaining({
            provider: 'radius',
          }),
        ]),
      }),
    );
  });

  it('GET /admin/notifications returns notification channels and templates', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/notifications')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        channels: expect.any(Array),
        templates: expect.any(Array),
      }),
    );
    expect(response.body.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: expect.any(String),
          templateKey: expect.any(String),
        }),
      ]),
    );
  });
});

function moduleRefNotificationChannelRepository() {
  return new InMemoryNotificationChannelRepository(createSeededInMemoryNotificationChannelRepository()) as unknown as PrismaNotificationChannelRepository;
}

function moduleRefNotificationTemplateQueryService() {
  return new NotificationTemplateQueryService(
    moduleRefNotificationChannelRepository(),
    new InMemoryNotificationTemplateRepository(createSeededInMemoryNotificationTemplateRepository()),
  );
}
