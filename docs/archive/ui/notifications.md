# Notification Template Management UI

## Route
- `/admin/notifications`

## Purpose
- Surface configured notification templates through the notifications API.
- Allow operators to preview template structure and send safe test notifications.
- Keep channel secrets and transport configuration out of the UI.

## Data Sources
- `GET /notifications/templates`
- `GET /notifications/outcomes`
- `POST /notifications/test-send`

## UI Structure
- Template list
  - shows template display name, event name, and channel key
- Template preview
  - shows display name, event, channel, subject template, and body template
- Recent notification outcomes
  - shows channel
  - template and event
  - sanitized target summary
  - status
  - attempt number
  - timestamp
  - error summary when present
- Test send panel
  - recipient
  - payload JSON
  - selected template summary
  - test delivery result

## Components
- `TemplateList`
- `TemplatePreview`
- `SendTestPanel`

## Behavior Notes
- The page is driven by the templates returned by the API.
- Recent outcomes are operator-facing summaries, not raw technical logs.
- Recipient targets are intentionally sanitized so webhook URLs or sensitive targets are not exposed.
- The selected template controls the `templateKey` and `channelKey` used for test-send.
- Channel secrets are never shown in the page.
- The preview displays template content only. It does not try to embed business logic or execute template substitution locally.

## States
- loading
- empty
- error
- successful preview and test-send result

## Test Coverage
- `frontend/src/routes/admin/NotificationsPage.test.tsx`
  - render templates
  - render recent outcomes
  - test-send
