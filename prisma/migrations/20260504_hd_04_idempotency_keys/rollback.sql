-- HD-0.4 rollback — drops the idempotency-key store.
DROP INDEX IF EXISTS "idx_idempotency_key_expires_at";
DROP INDEX IF EXISTS "uq_idempotency_key_actor_route";
DROP TABLE IF EXISTS "idempotency_keys";
DROP TYPE IF EXISTS "IdempotencyKeyStatus";
