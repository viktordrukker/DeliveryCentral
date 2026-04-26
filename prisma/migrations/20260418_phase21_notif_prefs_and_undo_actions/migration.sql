-- Phase 21-07: Server-side notification preferences
-- Phase 21-11: Server-side undo support for reversible destructive actions

CREATE TABLE "person_notification_preferences" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "channelKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "person_notification_preferences_personId_channelKey_key"
    ON "person_notification_preferences"("personId", "channelKey");

CREATE INDEX "person_notification_preferences_personId_idx"
    ON "person_notification_preferences"("personId");

ALTER TABLE "person_notification_preferences"
    ADD CONSTRAINT "person_notification_preferences_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE TABLE "undo_actions" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "inversePayload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "undo_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "undo_actions_actorId_expiresAt_idx" ON "undo_actions"("actorId", "expiresAt");
CREATE INDEX "undo_actions_entityId_idx" ON "undo_actions"("entityId");

ALTER TABLE "undo_actions"
    ADD CONSTRAINT "undo_actions_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
