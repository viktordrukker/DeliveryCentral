# Microsoft Teams Notification Channel

## Purpose

The Microsoft Teams notification channel provides outbound notification delivery through an incoming webhook. It is an infrastructure adapter inside the Notifications context and does not contain business routing logic.

## Scope

- outbound delivery only
- template-driven message generation
- test-send support through `POST /notifications/test-send`
- auditable delivery state through `NotificationRequest` and `NotificationDelivery`

## Adapter

Implementation:
- `TeamsNotificationChannelAdapter`

Responsibilities:
- validate Teams channel config
- map resolved notification subject/body into a Teams MessageCard payload
- send the payload through a webhook transport

Non-responsibilities:
- selecting recipients
- choosing business events
- deciding which template to use
- embedding business logic into transport mapping

## Payload mapping

The adapter maps already-rendered template output into a Teams webhook payload:

- `title` from resolved subject, optionally prefixed by config
- `summary` from resolved subject or the first body line
- `text` from resolved body
- `themeColor` from channel config

Templates remain the source of content composition. The adapter only wraps rendered content into the Teams transport shape.

## Channel config

Supported config keys:
- `themeColor`
- `titlePrefix`
- `fallbackWebhookUrl`

`fallbackWebhookUrl` is used only when the caller does not provide a direct webhook recipient.

## Test-send

The existing notification API can exercise the Teams path:

- `channelKey = ms_teams_webhook`
- `templateKey = integration-sync-failed-teams` or another Teams-bound template
- `recipient` can be a direct webhook URL

## Delivery audit

Every send attempt records:
- `NotificationRequest`
- `NotificationDelivery`
- success or failure state
- failure reason when delivery fails

## Current transport implementation

Runtime transport:
- `FetchTeamsWebhookTransport`

Test transport:
- `InMemoryTeamsWebhookTransport`

This keeps the Teams adapter isolated from HTTP details while still enabling real outbound webhook posting in the runtime path and deterministic mocked coverage in tests.
