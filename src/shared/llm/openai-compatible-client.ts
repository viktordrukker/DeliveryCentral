import { Injectable, Logger } from '@nestjs/common';

import {
  LlmChatCompletion,
  LlmChatMessage,
  LlmChatOptions,
  LlmClient,
  LlmProbeResult,
} from './llm-client';

const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_TIMEOUT_MS = 30_000;
const PROBE_TIMEOUT_MS = 1_000;

interface OpenAiCompletionResponse {
  choices: Array<{ message: { role: string; content: string } }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * OpenAI-compatible HTTP client. Targets any endpoint that speaks the
 * `POST /chat/completions` request/response shape:
 *
 *   - Ollama (set LLM_ENDPOINT=http://localhost:11434/v1)
 *   - vLLM
 *   - LM Studio
 *   - On-prem OpenAI proxies / Azure OpenAI through a compatibility shim
 *
 * Env-driven, no DI for credentials:
 *
 *   LLM_ENDPOINT  Base URL ending in /v1. When unset, the client reports
 *                 itself as unconfigured and every call throws.
 *   LLM_API_KEY   Optional bearer token. Sent as `Authorization: Bearer`
 *                 when present.
 *   LLM_MODEL     Default model name when callers don't pass options.model.
 *                 No default — chat() throws if neither is set.
 */
@Injectable()
export class OpenAiCompatibleLlmClient implements LlmClient {
  private readonly logger = new Logger(OpenAiCompatibleLlmClient.name);
  private readonly endpoint = process.env.LLM_ENDPOINT?.replace(/\/$/, '') ?? null;
  private readonly apiKey = process.env.LLM_API_KEY ?? null;
  private readonly defaultModel = process.env.LLM_MODEL ?? null;

  public isConfigured(): boolean {
    return this.endpoint !== null;
  }

  public async chat(
    messages: LlmChatMessage[],
    options: LlmChatOptions = {},
  ): Promise<LlmChatCompletion> {
    if (!this.endpoint) {
      throw new Error('LLM_ENDPOINT is not configured; cannot send chat request.');
    }
    const model = options.model ?? this.defaultModel;
    if (!model) {
      throw new Error('No LLM model specified; set LLM_MODEL or pass options.model.');
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '<no body>');
      throw new Error(`LLM call failed: HTTP ${response.status} — ${body.slice(0, 200)}`);
    }
    const data = (await response.json()) as OpenAiCompletionResponse;
    const choice = data.choices?.[0]?.message;
    if (!choice || typeof choice.content !== 'string') {
      throw new Error('LLM response missing choices[0].message.content.');
    }

    return {
      message: {
        role: choice.role === 'assistant' || choice.role === 'system' || choice.role === 'user'
          ? choice.role
          : 'assistant',
        content: choice.content,
      },
      model: data.model ?? model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  public async probe(): Promise<LlmProbeResult> {
    if (!this.endpoint) {
      return { configured: false, reachable: false, latencyMs: null };
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
      const response = await fetch(`${this.endpoint}/models`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      // Reachability is binary: any HTTP response means the endpoint is up,
      // even 401/404 (the server is alive, just doesn't authorise /models).
      // True ssh-level / connection-refused / DNS errors raise here.
      return {
        configured: true,
        reachable: true,
        latencyMs: Date.now() - startedAt,
        ...(response.ok ? {} : { error: `Probe responded with HTTP ${response.status}` }),
      };
    } catch (error) {
      return {
        configured: true,
        reachable: false,
        latencyMs: null,
        error: error instanceof Error ? error.message : 'Unknown probe error.',
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
