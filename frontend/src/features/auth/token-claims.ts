export interface StoredAuthClaims {
  personId?: string;
  roles: string[];
  subject?: string;
}

export function readStoredAuthClaims(token: string): StoredAuthClaims | null {
  const trimmed = token.trim();

  if (!trimmed) {
    return null;
  }

  const segments = trimmed.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(segments[1])) as {
      person_id?: string;
      roles?: unknown;
      sub?: string;
    };

    return {
      personId: typeof payload.person_id === 'string' ? payload.person_id : undefined,
      roles: Array.isArray(payload.roles)
        ? payload.roles.filter((value): value is string => typeof value === 'string')
        : [],
      subject: typeof payload.sub === 'string' ? payload.sub : undefined,
    };
  } catch {
    return null;
  }
}

export function hasAnyStoredRole(token: string, roles: string[]): boolean {
  const claims = readStoredAuthClaims(token);

  if (!claims) {
    return false;
  }

  return roles.some((role) => claims.roles.includes(role));
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof atob === 'function') {
    return decodeURIComponent(
      Array.from(atob(padded))
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
  }

  throw new Error('Base64 decoding is unavailable.');
}
