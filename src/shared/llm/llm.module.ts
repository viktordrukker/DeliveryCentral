import { Global, Module } from '@nestjs/common';

import { LLM_CLIENT } from './llm-client';
import { OpenAiCompatibleLlmClient } from './openai-compatible-client';

/**
 * F-4 / NEW C1-LLM-SCAFFOLD — global LLM module.
 *
 * Exports both the symbol token `LLM_CLIENT` and the concrete
 * `OpenAiCompatibleLlmClient` class so consumers can `@Inject(LLM_CLIENT)`
 * against the interface OR ask for the concrete class when they need
 * provider-specific introspection (e.g. health probe).
 *
 * @Global() so future modules don't need to add LlmModule to imports.
 */
@Global()
@Module({
  providers: [
    OpenAiCompatibleLlmClient,
    {
      provide: LLM_CLIENT,
      useExisting: OpenAiCompatibleLlmClient,
    },
  ],
  exports: [LLM_CLIENT, OpenAiCompatibleLlmClient],
})
export class LlmModule {}
