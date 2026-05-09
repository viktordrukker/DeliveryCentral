/**
 * Opaque transaction-context marker used by repository ports.
 *
 * Domain stays Prisma-free: ports declare an optional `tx?: TransactionContext`
 * argument and infrastructure adapters narrow it to `Prisma.TransactionClient`
 * at call time. Callers that want to compose multiple repository writes into
 * a single atomic unit pass the closure-scoped `tx` from
 * `prismaService.$transaction(async (tx) => { ... })`.
 *
 * The pattern matches `DomainEventService.record(tx, …)` (DM-7-2), which is
 * already the codebase precedent for tx-aware writes.
 */
export type TransactionContext = unknown;
