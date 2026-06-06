/**
 * W1-19 — verify `fetchMetadataDictionaryByKey` hits the key-based
 * `/metadata/dictionaries/by-key/:entityType/:dictionaryKey` endpoint
 * with URL-encoded segments so the FE never embeds a hardcoded UUID.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as httpClient from './http-client';
import { fetchMetadataDictionaryByKey } from './metadata';

vi.mock('./http-client', async () => {
  const actual = await vi.importActual<typeof httpClient>('./http-client');
  return {
    ...actual,
    httpGet: vi.fn(),
  };
});

const httpGet = httpClient.httpGet as unknown as ReturnType<typeof vi.fn>;

describe('fetchMetadataDictionaryByKey', () => {
  beforeEach(() => {
    httpGet.mockReset();
  });

  it('GETs the natural-key URL with both segments encoded', async () => {
    httpGet.mockResolvedValueOnce({
      id: 'opaque-id',
      dictionaryKey: 'timesheet-rejection-reasons',
      displayName: 'Timesheet Rejection Reasons',
      entityType: 'TimesheetWeek',
      isSystemManaged: false,
      isArchived: false,
      entryCount: 4,
      enabledEntryCount: 4,
      relatedCustomFieldCount: 0,
      workflowUsageCount: 0,
      entries: [],
      relatedCustomFields: [],
      relatedWorkflows: [],
      relatedLayouts: [],
    });

    const result = await fetchMetadataDictionaryByKey(
      'TimesheetWeek',
      'timesheet-rejection-reasons',
    );

    expect(httpGet).toHaveBeenCalledWith(
      '/metadata/dictionaries/by-key/TimesheetWeek/timesheet-rejection-reasons',
    );
    expect(result.dictionaryKey).toBe('timesheet-rejection-reasons');
  });

  it('URL-encodes characters that need escaping in path segments', async () => {
    httpGet.mockResolvedValueOnce({
      id: 'opaque-id',
      dictionaryKey: 'key with space',
      displayName: 'x',
      entityType: 'Entity/Type',
      isSystemManaged: false,
      isArchived: false,
      entryCount: 0,
      enabledEntryCount: 0,
      relatedCustomFieldCount: 0,
      workflowUsageCount: 0,
      entries: [],
      relatedCustomFields: [],
      relatedWorkflows: [],
      relatedLayouts: [],
    });

    await fetchMetadataDictionaryByKey('Entity/Type', 'key with space');

    expect(httpGet).toHaveBeenCalledWith(
      '/metadata/dictionaries/by-key/Entity%2FType/key%20with%20space',
    );
  });
});
