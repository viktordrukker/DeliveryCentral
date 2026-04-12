# Notifications Domain

## Purpose

The notification subsystem owns notification requests, templates, channel abstraction, and delivery records. Business contexts publish intent through application services instead of calling email or webhook implementations directly.

## Supported channels now

- email
- Microsoft Teams webhook
- generic future channel placeholder

## Core models

### NotificationChannel

Represents an enabled delivery channel and its configuration envelope.

### NotificationTemplate

Stores reusable subject/body templates keyed by business event and channel.

### NotificationRequest

Represents the auditable request to send a notification for a business event.

### NotificationDelivery

Represents an actual delivery attempt, rendered content, and provider outcome.

## Template resolution

Templates use `{{variable}}` placeholders and are resolved by the notification subsystem before dispatch. Message bodies stay in the template model, not inside assignment/project/integration services.

## Delivery flow

1. A business service calls `NotificationEventTranslatorService`.
2. The translator maps the business event to a template key and channel.
3. `NotificationDispatchService` creates a `NotificationRequest`.
4. The selected adapter renders and sends through the configured channel.
5. A `NotificationDelivery` record is stored with success or failure state.

## Delivery reliability

Notification delivery now supports bounded retry behavior.

Config-driven controls:

- `NOTIFICATIONS_DELIVERY_MAX_ATTEMPTS`
- `NOTIFICATIONS_DELIVERY_RETRY_DELAY_MS`

Request-level states:

- `QUEUED`
- `RETRYING`
- `SENT`
- `FAILED_TERMINAL`

Delivery-attempt states:

- `PENDING`
- `RETRYING`
- `SUCCEEDED`
- `FAILED_TERMINAL`

Retry behavior is intentionally simple:

- retryable transport failures can schedule another attempt inside the same dispatch flow
- terminal failures stop immediately
- every attempt remains auditable as its own delivery record

Retry classification stays transport-adapter specific. The notifications domain consumes a typed failure contract instead of hardcoding SMTP or webhook rules in business services.

## Email transport

The email channel now uses a real SMTP-backed transport adapter.

- `EmailNotificationChannelAdapter` stays inside the notifications context
- `NodemailerSmtpEmailTransport` owns SMTP delivery details
- all SMTP configuration is environment-driven
- message bodies still come from notification templates, not business services

If SMTP configuration is missing or invalid, delivery fails cleanly and the failure is captured in notification delivery state and business audit summaries.

## Supported business events now

- assignment created
- assignment approved
- assignment rejected
- project activated
- project closed
- integration sync failed

## Boundaries

- business services do not call email or Teams adapters directly
- notification delivery is auditable
- channel choice and templates remain inside the notifications context
- future channels can be added through the shared adapter interface
- transport adapters must not log secrets or embed business rules

## API

- `GET /notifications/templates`
- `POST /notifications/test-send`
