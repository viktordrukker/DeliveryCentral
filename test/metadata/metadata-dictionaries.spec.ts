import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { CreateDictionaryEntryService } from '@src/modules/metadata/application/create-dictionary-entry.service';
import { MetadataDictionaryQueryService } from '@src/modules/metadata/application/metadata-dictionary-query.service';
import { createSeededInMemoryMetadataDictionaryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/create-seeded-in-memory-metadata-dictionary.repository';
import { createSeededInMemoryMetadataEntryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/create-seeded-in-memory-metadata-entry.repository';

describe('Metadata dictionaries', () => {
  it('lists available dictionaries with summary counts', async () => {
    const service = new MetadataDictionaryQueryService(
      createSeededInMemoryMetadataDictionaryRepository(),
      createSeededInMemoryMetadataEntryRepository(),
    );

    const result = await service.listDictionaries({});

    expect(result.items).toHaveLength(6);
    expect(result.items.find((item) => item.dictionaryKey === 'project-types')?.entryCount).toBe(3);
  });

  it('gets dictionary details with entries and related configuration', async () => {
    const service = new MetadataDictionaryQueryService(
      createSeededInMemoryMetadataDictionaryRepository(),
      createSeededInMemoryMetadataEntryRepository(),
    );

    const result = await service.getDictionaryById('42222222-0000-0000-0000-000000000001');

    expect(result?.displayName).toBe('Project Types');
    expect(result?.entries).toHaveLength(3);
    expect(result?.relatedCustomFields).toHaveLength(1);
    expect(result?.relatedLayouts.length).toBeGreaterThan(0);
  });

  it('creates a dictionary entry for a supported metadata-backed type', async () => {
    const dictionaryRepository = createSeededInMemoryMetadataDictionaryRepository();
    const entryRepository = createSeededInMemoryMetadataEntryRepository();
    const createService = new CreateDictionaryEntryService(
      dictionaryRepository,
      entryRepository,
    );
    const queryService = new MetadataDictionaryQueryService(dictionaryRepository, entryRepository);

    const entry = await createService.execute({
      dictionaryType: 'grade',
      displayName: 'Grade 8',
      entryKey: 'grade-8',
      entryValue: 'GRADE_8',
    });

    const dictionary = await queryService.getDictionaryById(
      '42222222-0000-0000-0000-000000000101',
    );

    expect(entry.entryKey).toBe('grade-8');
    expect(dictionary?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayName: 'Grade 8',
          entryKey: 'grade-8',
          entryValue: 'GRADE_8',
        }),
      ]),
    );
  });
});

describe('Metadata API', () => {
  it('GET /metadata/dictionaries returns metadata dictionaries', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/metadata/dictionaries?entityType=Project')
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toHaveProperty('dictionaryKey', 'project-types');

    await app.close();
  });

  it('GET /metadata/dictionaries/{id} returns dictionary details', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/metadata/dictionaries/42222222-0000-0000-0000-000000000001')
      .expect(200);

    expect(response.body.displayName).toBe('Project Types');
    expect(response.body.entries).toHaveLength(3);

    await app.close();
  });

  it('POST /metadata/dictionaries/{type}/entries creates a dictionary entry', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const createResponse = await request(app.getHttpServer())
      .post('/metadata/dictionaries/skillset/entries')
      .send({
        displayName: 'Systems Thinking',
        entryKey: 'systems-thinking',
        entryValue: 'SYSTEMS_THINKING',
      })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        displayName: 'Systems Thinking',
        entryKey: 'systems-thinking',
        entryValue: 'SYSTEMS_THINKING',
      }),
    );

    const dictionaryResponse = await request(app.getHttpServer())
      .get('/metadata/dictionaries/42222222-0000-0000-0000-000000000103')
      .expect(200);

    expect(dictionaryResponse.body.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayName: 'Systems Thinking',
          entryKey: 'systems-thinking',
        }),
      ]),
    );

    await app.close();
  });
});
