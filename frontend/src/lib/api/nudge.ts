import { httpPost } from './http-client';

export interface NudgeResponse {
  status: string;
  notificationRequestId: string;
}

export class NudgeRateLimitError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'NudgeRateLimitError';
  }
}

export async function sendNudge(params: { requestId: string; approverId: string }): Promise<NudgeResponse> {
  try {
    return await httpPost<NudgeResponse, { requestId: string; approverId: string }>(
      '/notifications/nudge',
      params,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('429') || /already sent/i.test(message)) {
      throw new NudgeRateLimitError(message);
    }
    throw err;
  }
}
