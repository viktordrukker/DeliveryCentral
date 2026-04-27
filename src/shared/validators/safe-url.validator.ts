import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Class-validator constraint that rejects URLs pointing at private/loopback IPs,
 * link-local cloud metadata endpoints, and non-HTTPS schemes. Use anywhere user
 * input flows into a server-side fetch (webhooks, link-preview fetchers, etc.)
 * to prevent SSRF.
 */
@ValidatorConstraint({ name: 'safeUrl', async: false })
export class SafeUrlConstraint implements ValidatorConstraintInterface {
  public validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.length === 0) return false;

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }

    if (url.protocol !== 'https:') return false;

    const hostname = url.hostname.toLowerCase();

    // Block literal IPv6 loopback and link-local
    if (
      hostname === '[::1]' ||
      hostname.startsWith('[fe80:') ||
      hostname.startsWith('[fc') ||
      hostname.startsWith('[fd')
    ) {
      return false;
    }

    // Block localhost variants
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return false;
    }

    // Block private IPv4 ranges and cloud metadata endpoints
    const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const [, a, b] = ipv4.map(Number);
      // 10.0.0.0/8
      if (a === 10) return false;
      // 127.0.0.0/8 (loopback)
      if (a === 127) return false;
      // 169.254.0.0/16 (link-local — AWS metadata, Azure IMDS)
      if (a === 169 && b === 254) return false;
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return false;
      // 192.168.0.0/16
      if (a === 192 && b === 168) return false;
      // 0.0.0.0/8
      if (a === 0) return false;
    }

    return true;
  }

  public defaultMessage(_args: ValidationArguments): string {
    return 'URL must be a valid https:// URL pointing to a publicly routable host.';
  }
}
