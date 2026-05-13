import { JsmCloudAdapter } from '@src/shared/jsm/jsm-cloud-adapter';

describe('JsmCloudAdapter (F-4.6 / C1-JSM)', () => {
  const originalEnv = {
    JSM_BASE_URL: process.env.JSM_BASE_URL,
    JSM_API_EMAIL: process.env.JSM_API_EMAIL,
    JSM_API_TOKEN: process.env.JSM_API_TOKEN,
    JSM_PROJECT_KEY: process.env.JSM_PROJECT_KEY,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.restoreAllMocks();
  });

  function setEnv(values: Partial<typeof originalEnv>): void {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  it('reports unconfigured when no env vars set', async () => {
    delete process.env.JSM_BASE_URL;
    delete process.env.JSM_API_EMAIL;
    delete process.env.JSM_API_TOKEN;
    const adapter = new JsmCloudAdapter();
    expect(adapter.isConfigured()).toBe(false);
    const probe = await adapter.probe();
    expect(probe).toEqual({ configured: false, reachable: false, latencyMs: null, deployment: null });
  });

  it('throws on createIssue when unconfigured', async () => {
    delete process.env.JSM_BASE_URL;
    const adapter = new JsmCloudAdapter();
    await expect(
      adapter.createIssue({ externalReference: 'CASE-1', summary: 's', description: 'd' }),
    ).rejects.toThrow(/JSM is not configured/);
  });

  it('throws on createIssue when no project key', async () => {
    setEnv({
      JSM_BASE_URL: 'https://bank.atlassian.net',
      JSM_API_EMAIL: 'svc@bank.local',
      JSM_API_TOKEN: 'tok-abc',
    });
    delete process.env.JSM_PROJECT_KEY;
    const adapter = new JsmCloudAdapter();
    await expect(
      adapter.createIssue({ externalReference: 'CASE-1', summary: 's', description: 'd' }),
    ).rejects.toThrow(/No JSM project key set/);
  });

  it('probe reports reachable=true when /myself responds 200', async () => {
    setEnv({
      JSM_BASE_URL: 'https://bank.atlassian.net',
      JSM_API_EMAIL: 'svc@bank.local',
      JSM_API_TOKEN: 'tok-abc',
    });
    const fetchSpy = (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockResolvedValue(
      new Response('{"accountId":"abc"}', { status: 200 }) as never,
    );
    const adapter = new JsmCloudAdapter();
    const probe = await adapter.probe();
    expect(probe.configured).toBe(true);
    expect(probe.reachable).toBe(true);
    expect(probe.deployment).toBe('cloud');
    expect(probe.latencyMs).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://bank.atlassian.net/rest/api/3/myself',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('probe reports reachable=false on network error', async () => {
    setEnv({
      JSM_BASE_URL: 'https://nope.invalid',
      JSM_API_EMAIL: 'svc@bank.local',
      JSM_API_TOKEN: 'tok-abc',
    });
    (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockRejectedValue(
      new Error('fetch failed: ECONNREFUSED'),
    );
    const adapter = new JsmCloudAdapter();
    const probe = await adapter.probe();
    expect(probe.reachable).toBe(false);
    expect(probe.error).toContain('ECONNREFUSED');
  });

  it('createIssue POSTs ADF-shaped body + returns key + url', async () => {
    setEnv({
      JSM_BASE_URL: 'https://bank.atlassian.net',
      JSM_API_EMAIL: 'svc@bank.local',
      JSM_API_TOKEN: 'tok-abc',
      JSM_PROJECT_KEY: 'IT',
    });
    const fetchSpy = (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ id: '10042', key: 'IT-1234' }), { status: 201 }) as never,
    );
    const adapter = new JsmCloudAdapter();
    const out = await adapter.createIssue({
      externalReference: 'CASE-000007',
      summary: 'Laptop wont connect to corp VPN',
      description: 'After updating Windows, the VPN fails. Tried twice.',
    });
    expect(out).toEqual({
      issueId: '10042',
      issueKey: 'IT-1234',
      issueUrl: 'https://bank.atlassian.net/browse/IT-1234',
    });
    const callArgs = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(callArgs.method).toBe('POST');
    const body = JSON.parse(callArgs.body as string);
    expect(body.fields.project.key).toBe('IT');
    expect(body.fields.summary).toBe('Laptop wont connect to corp VPN');
    expect(body.fields.labels).toEqual(['dc-case:CASE-000007']);
    expect(body.fields.description.type).toBe('doc');
    expect(body.fields.description.content[0].content[0].text).toContain('After updating Windows');
  });

  it('createIssue throws when JSM returns non-2xx', async () => {
    setEnv({
      JSM_BASE_URL: 'https://bank.atlassian.net',
      JSM_API_EMAIL: 'svc@bank.local',
      JSM_API_TOKEN: 'tok-abc',
      JSM_PROJECT_KEY: 'IT',
    });
    (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockResolvedValue(
      new Response('Unauthorized', { status: 401 }) as never,
    );
    const adapter = new JsmCloudAdapter();
    await expect(
      adapter.createIssue({ externalReference: 'CASE-1', summary: 's', description: 'd' }),
    ).rejects.toThrow(/HTTP 401/);
  });
});
