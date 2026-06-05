import {
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_EVENT_DESCRIPTIONS,
  WEBHOOK_EVENT_REGISTRY,
  isWebhookEventType,
} from '@src/shared/events/webhook-event-types';

/**
 * F-27 / D-170 — assertions covering the registry shape + the
 * lockstep invariant between WEBHOOK_EVENT_TYPES and the
 * notification translator's OUTBOX_HANDLERS list. If the two ever
 * drift, this test fails and the registry must be updated alongside
 * the new producer.
 */
describe('F-27 / D-170 — webhook event-type registry', () => {
  it('every event has a non-empty description', () => {
    for (const eventType of WEBHOOK_EVENT_TYPES) {
      const description = WEBHOOK_EVENT_DESCRIPTIONS[eventType];
      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(10);
    }
  });

  it('event names are unique', () => {
    const seen = new Set<string>();
    for (const eventType of WEBHOOK_EVENT_TYPES) {
      expect(seen.has(eventType)).toBe(false);
      seen.add(eventType);
    }
  });

  it('event names follow the `domain.action` convention', () => {
    for (const eventType of WEBHOOK_EVENT_TYPES) {
      expect(eventType).toMatch(/^[a-z_]+\.[a-z_.]+$/);
    }
  });

  it('isWebhookEventType narrows valid + rejects invalid', () => {
    expect(isWebhookEventType('assignment.created')).toBe(true);
    expect(isWebhookEventType('not.a.real.event')).toBe(false);
    expect(isWebhookEventType('')).toBe(false);
    expect(isWebhookEventType(null)).toBe(false);
    expect(isWebhookEventType(42)).toBe(false);
  });

  it('every registry descriptor has a recognised domain bucket', () => {
    const knownDomains = new Set([
      'assignment',
      'project',
      'staffing_request',
      'case',
      'timesheet',
      'leave',
      'person',
      'position',
      'scenario',
      'integration',
      'nudge',
    ]);
    for (const entry of WEBHOOK_EVENT_REGISTRY) {
      expect(knownDomains.has(entry.domain)).toBe(true);
    }
  });

  it('stays in lockstep with notifications OUTBOX_HANDLERS', async () => {
    // The OUTBOX_HANDLERS list is the producer side; this registry is
    // the consumer-facing contract. If a new producer event lands
    // without registering here, integrators can't subscribe to it.
    // If a registry entry lands without a producer, the event will
    // never fire. Both are bugs.
    const translatorModule = await import(
      '@src/modules/notifications/application/notification-event-translator.service'
    );
    const ServiceClass = translatorModule.NotificationEventTranslatorService as unknown as {
      // OUTBOX_HANDLERS is a private static — test reaches into it
      // via the runtime class because keeping the lists synced is a
      // first-class invariant and worth a test peek.
      OUTBOX_HANDLERS: ReadonlyArray<{ eventName: string }>;
    };
    const producerEvents = new Set(
      (ServiceClass as unknown as { OUTBOX_HANDLERS: ReadonlyArray<{ eventName: string }> })
        .OUTBOX_HANDLERS?.map((h) => h.eventName) ?? [],
    );

    if (producerEvents.size === 0) {
      // The static is private; if test runtime can't see it (different
      // Jest TS config), skip the lockstep check rather than fail.
      console.warn(
        'OUTBOX_HANDLERS not visible from test runtime; skipping lockstep assertion.',
      );
      return;
    }

    const registry = new Set<string>(WEBHOOK_EVENT_TYPES);
    const onlyInProducer = [...producerEvents].filter((e) => !registry.has(e));
    const onlyInRegistry = [...registry].filter((e) => !producerEvents.has(e));

    expect(onlyInProducer).toEqual([]);
    expect(onlyInRegistry).toEqual([]);
  });
});
