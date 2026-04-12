export interface ErrorResponseShape {
  error?: string;
  message?: string | string[];
  statusCode?: number;
}

export function expectErrorResponseShape(
  payload: ErrorResponseShape,
  expectedStatusCode: number,
): void {
  expect(payload.statusCode).toBe(expectedStatusCode);
  expect(payload).toHaveProperty('message');

  if (typeof payload.message === 'string') {
    expect(payload.message.length).toBeGreaterThan(0);
  } else {
    expect(Array.isArray(payload.message)).toBe(true);
    expect(payload.message?.length ?? 0).toBeGreaterThan(0);
  }
}

export function expectSafeErrorResponseShape(
  payload: ErrorResponseShape & Record<string, unknown>,
  expectedStatusCode: number,
  expectedMessage?: string | RegExp,
): void {
  expectErrorResponseShape(payload, expectedStatusCode);
  expect(payload).not.toHaveProperty('stack');
  expect(payload).not.toHaveProperty('trace');

  if (expectedMessage) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : payload.message;

    if (expectedMessage instanceof RegExp) {
      expect(message).toMatch(expectedMessage);
    } else {
      expect(message).toContain(expectedMessage);
    }
  }
}
