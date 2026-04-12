# Outlook / SMTP Email Integration

## Purpose

DeliveryCentral can now send outbound notification email through a real SMTP transport instead of relying only on scaffolded in-memory behavior.

The notification domain still owns:

- template resolution
- channel selection
- delivery request tracking
- delivery success and failure recording

Business services do not call SMTP code directly.

## Transport model

The email channel uses a real SMTP transport adapter backed by `nodemailer`.

Current flow:

1. a business service calls `NotificationEventTranslatorService`
2. the translator selects an email template and recipient
3. `NotificationDispatchService` creates a `NotificationRequest`
4. `EmailNotificationChannelAdapter` resolves the final email payload
5. `NodemailerSmtpEmailTransport` sends the mail over SMTP
6. `NotificationDelivery` and `NotificationRequest` are updated with success or failure

## Environment variables

All runtime email configuration is environment-driven.

Required for real SMTP delivery:

- `NOTIFICATIONS_SMTP_HOST`
- `NOTIFICATIONS_SMTP_PORT`
- `NOTIFICATIONS_EMAIL_FROM_ADDRESS`

Optional:

- `NOTIFICATIONS_SMTP_SECURE`
- `NOTIFICATIONS_SMTP_USERNAME`
- `NOTIFICATIONS_SMTP_PASSWORD`
- `NOTIFICATIONS_EMAIL_FROM_NAME`
- `NOTIFICATIONS_EMAIL_REPLY_TO`
- `NOTIFICATIONS_DEFAULT_EMAIL_RECIPIENT`

## Example Outlook / Exchange-style configuration

```env
NOTIFICATIONS_SMTP_HOST=smtp.office365.com
NOTIFICATIONS_SMTP_PORT=587
NOTIFICATIONS_SMTP_SECURE=false
NOTIFICATIONS_SMTP_USERNAME=deliverycentral@example.com
NOTIFICATIONS_SMTP_PASSWORD=change-me
NOTIFICATIONS_EMAIL_FROM_ADDRESS=deliverycentral@example.com
NOTIFICATIONS_EMAIL_FROM_NAME=DeliveryCentral
NOTIFICATIONS_EMAIL_REPLY_TO=support@example.com
NOTIFICATIONS_DEFAULT_EMAIL_RECIPIENT=ops@example.com
```

## Failure behavior

Notification delivery failure must not block the originating business workflow.

Failures are captured in:

- `NotificationRequest.failureReason`
- `NotificationDelivery.failureReason`
- business audit summary entries for notification send results

## Security notes

- SMTP secrets stay in environment configuration only.
- Secrets are not included in notification payloads or audit messages.
- The transport adapter contains transport logic only, not business decision logic.

## Local development

The local Docker runtime stays container-only.

To exercise real email sending locally, set the SMTP variables in `.env` before starting the backend container. If SMTP configuration is missing, the email channel remains structurally available but validation will fail for real delivery attempts.
