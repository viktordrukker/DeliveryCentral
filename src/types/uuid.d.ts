/**
 * Minimal local declaration for the `uuid` package, sufficient for the
 * subset HD-0.3 uses (deterministic UUIDv5 over a fixed namespace for
 * aggregate IDs that don't have a natural UUID). Replaces the missing
 * `@types/uuid` package without bloating the dev-deps.
 */
declare module 'uuid' {
  export function v5(name: string, namespace: string): string;
  export function v4(): string;
  export function v1(): string;
  export function validate(input: string): boolean;
  export function version(input: string): number;
}
