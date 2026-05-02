// Best-effort secret redaction for setup_run_logs.payload_redacted and
// the diagnostic bundle.
//
// The wizard logs verbosely on purpose (so an operator can ship logs back
// to support and we can root-cause without touching the host). We MUST NOT
// surface plaintext passwords / tokens / JWT secrets in those logs even
// though the backend code briefly handles them.

const SECRET_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /bearer/i,
  /jwt/i,
  /credential/i,
  /private[_-]?key/i,
];

const SECRET_VALUE_PATTERNS: RegExp[] = [
  // Postgres connection string with embedded password
  /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi,
];

const REDACTED = '[REDACTED]';

function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((rx) => rx.test(key));
}

function redactString(value: string): string {
  let out = value;
  for (const rx of SECRET_VALUE_PATTERNS) {
    out = out.replace(rx, (_m, prefix, _password, suffix) => `${prefix}${REDACTED}${suffix}`);
  }
  return out;
}

/**
 * Deep-clone the input with any field whose key matches a known secret
 * pattern blanked to `[REDACTED]`. String values are also scanned for
 * embedded credentials (e.g. `postgres://user:p@host`).
 *
 * Pure: never mutates the input.
 */
export function redactSecrets<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input === 'string') {
    return redactString(input) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactSecrets(item)) as unknown as T;
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (isSecretKey(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = redactSecrets(value);
      }
    }
    return out as unknown as T;
  }
  return input;
}

// For convenience — most callers pass a known shape but want strict typing
// preserved through the redactor.
export function redactSecretsAsJson(input: unknown): Record<string, unknown> {
  const result = redactSecrets(input);
  if (result === null || result === undefined || typeof result !== 'object' || Array.isArray(result)) {
    return { value: result };
  }
  return result as Record<string, unknown>;
}
