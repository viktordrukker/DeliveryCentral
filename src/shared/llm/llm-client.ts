/**
 * F-4 / NEW C1-LLM-SCAFFOLD — pluggable LLM client interface.
 *
 * No use-cases are wired this sprint. The interface + a single
 * OpenAI-compatible HTTP implementation land here so future AI features
 * (case classification, staffing-match suggestions, work-evidence
 * summarisation — all Cat-3) can target the abstraction rather than a
 * concrete vendor SDK.
 *
 * Bank-IT deployments configure a local endpoint (Ollama / vLLM /
 * LM Studio / on-prem OpenAI-compatible proxy) via the three env vars
 * read by `OpenAiCompatibleLlmClient`.
 */

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatOptions {
  /** Provider-specific model name override (e.g. `llama3.1:8b`). Falls back to LLM_MODEL env. */
  model?: string;
  /** Sampling temperature 0..2. Lower = more deterministic. Default 0.2. */
  temperature?: number;
  /** Max tokens in the response. Default 512. */
  maxTokens?: number;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

export interface LlmChatCompletion {
  /** The model's response message (assistant role). */
  message: LlmChatMessage;
  /** Token usage report when the provider returns it. */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Model name as reported by the provider. */
  model: string;
}

export interface LlmProbeResult {
  /** True when LLM_ENDPOINT is set (regardless of whether the server responds). */
  configured: boolean;
  /** True when a GET /v1/models or equivalent reachability probe responded within timeout. */
  reachable: boolean;
  /** Round-trip latency for the probe in ms, null when not configured or probe failed. */
  latencyMs: number | null;
  /** Failure detail when `reachable: false`. */
  error?: string;
}

export interface LlmClient {
  chat(messages: LlmChatMessage[], options?: LlmChatOptions): Promise<LlmChatCompletion>;
  probe(): Promise<LlmProbeResult>;
}

export const LLM_CLIENT = Symbol('LlmClient');
