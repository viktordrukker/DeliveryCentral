import { OpenAiCompatibleLlmClient } from '@src/shared/llm/openai-compatible-client';

describe('OpenAiCompatibleLlmClient (F-4 / NEW C1-LLM-SCAFFOLD)', () => {
  const originalEndpoint = process.env.LLM_ENDPOINT;
  const originalApiKey = process.env.LLM_API_KEY;
  const originalModel = process.env.LLM_MODEL;

  afterEach(() => {
    process.env.LLM_ENDPOINT = originalEndpoint;
    process.env.LLM_API_KEY = originalApiKey;
    process.env.LLM_MODEL = originalModel;
    jest.restoreAllMocks();
  });

  it('reports unconfigured when LLM_ENDPOINT is unset', async () => {
    delete process.env.LLM_ENDPOINT;
    const client = new OpenAiCompatibleLlmClient();

    expect(client.isConfigured()).toBe(false);

    const probe = await client.probe();
    expect(probe).toEqual({ configured: false, reachable: false, latencyMs: null });
  });

  it('throws on chat() when unconfigured', async () => {
    delete process.env.LLM_ENDPOINT;
    const client = new OpenAiCompatibleLlmClient();
    await expect(client.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      /LLM_ENDPOINT is not configured/,
    );
  });

  it('throws on chat() when configured but no model is set', async () => {
    process.env.LLM_ENDPOINT = 'http://localhost:1234/v1';
    delete process.env.LLM_MODEL;
    const client = new OpenAiCompatibleLlmClient();
    await expect(client.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      /No LLM model specified/,
    );
  });

  it('probes /models and reports reachable=true on any HTTP response', async () => {
    process.env.LLM_ENDPOINT = 'http://llm-mock:11434/v1';
    const fetchSpy = (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockResolvedValue(
      new Response('{"object":"list","data":[]}', { status: 200 }) as never,
    );

    const client = new OpenAiCompatibleLlmClient();
    const probe = await client.probe();

    expect(probe.configured).toBe(true);
    expect(probe.reachable).toBe(true);
    expect(probe.latencyMs).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://llm-mock:11434/v1/models',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('probes /models and reports reachable=true with error string on non-OK HTTP', async () => {
    process.env.LLM_ENDPOINT = 'http://llm-mock:11434/v1';
    (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockResolvedValue(
      new Response('Unauthorized', { status: 401 }) as never,
    );

    const client = new OpenAiCompatibleLlmClient();
    const probe = await client.probe();

    expect(probe.reachable).toBe(true);
    expect(probe.error).toContain('HTTP 401');
  });

  it('probes /models and reports reachable=false on network error', async () => {
    process.env.LLM_ENDPOINT = 'http://nope.invalid/v1';
    (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockRejectedValue(
      new Error('fetch failed: ECONNREFUSED'),
    );

    const client = new OpenAiCompatibleLlmClient();
    const probe = await client.probe();

    expect(probe.configured).toBe(true);
    expect(probe.reachable).toBe(false);
    expect(probe.latencyMs).toBeNull();
    expect(probe.error).toContain('ECONNREFUSED');
  });

  it('sends Bearer token when LLM_API_KEY is set', async () => {
    process.env.LLM_ENDPOINT = 'http://llm-mock:11434/v1';
    process.env.LLM_API_KEY = 'sk-test-token';
    const fetchSpy = (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockResolvedValue(
      new Response('{"data":[]}', { status: 200 }) as never,
    );

    const client = new OpenAiCompatibleLlmClient();
    await client.probe();

    const lastCall = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect((lastCall.headers as Record<string, string>).Authorization).toBe('Bearer sk-test-token');
  });

  it('chat() POSTs the OpenAI-shaped request and returns the parsed completion', async () => {
    process.env.LLM_ENDPOINT = 'http://llm-mock:11434/v1';
    process.env.LLM_MODEL = 'llama3.1:8b';
    const fetchSpy = (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: 'Hi there.' } }],
          model: 'llama3.1:8b',
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
        { status: 200 },
      ) as never,
    );

    const client = new OpenAiCompatibleLlmClient();
    const out = await client.chat(
      [
        { role: 'system', content: 'Be terse.' },
        { role: 'user', content: 'Say hi.' },
      ],
      { temperature: 0.1, maxTokens: 50 },
    );

    expect(out.message.role).toBe('assistant');
    expect(out.message.content).toBe('Hi there.');
    expect(out.usage).toEqual({ promptTokens: 5, completionTokens: 3, totalTokens: 8 });
    const body = JSON.parse((fetchSpy.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body).toEqual({
      model: 'llama3.1:8b',
      messages: [
        { role: 'system', content: 'Be terse.' },
        { role: 'user', content: 'Say hi.' },
      ],
      temperature: 0.1,
      max_tokens: 50,
    });
  });

  it('chat() throws when the server returns non-OK', async () => {
    process.env.LLM_ENDPOINT = 'http://llm-mock:11434/v1';
    process.env.LLM_MODEL = 'llama3.1:8b';
    (jest.spyOn(globalThis, 'fetch' as never) as unknown as jest.Mock).mockResolvedValue(
      new Response('boom', { status: 500 }) as never,
    );

    const client = new OpenAiCompatibleLlmClient();
    await expect(client.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      /HTTP 500/,
    );
  });
});
