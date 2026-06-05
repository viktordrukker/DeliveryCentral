/**
 * F-27 / D-170 — Webhook event-type registry.
 *
 * Single typed list of every domain event that can fan out through
 * the webhook subscription bus. The list mirrors
 * `NotificationEventTranslatorService.OUTBOX_HANDLERS` because both
 * pipelines consume the same domain-event stream:
 *
 *   domain mutation
 *     → translator.dispatch(eventName, payload)
 *       ├─ in-app notification fan-out
 *       ├─ outbox row written inside the same $transaction
 *       └─ webhook subscribers (per-eventName filter)
 *
 * Keeping the list here (not in notifications/) avoids the admin
 * module depending on notifications just to validate webhook
 * subscriptions. The notifications module also imports from here,
 * so the OUTBOX_HANDLERS list stays in lockstep.
 *
 * Adding a new event:
 *   1. Add the literal to WEBHOOK_EVENT_TYPES below + a one-line
 *      description in WEBHOOK_EVENT_DESCRIPTIONS.
 *   2. Add an `OUTBOX_HANDLERS` entry in
 *      `notification-event-translator.service.ts` pointing at the
 *      dispatchXxx method that fans the event out to email +
 *      in-app channels.
 *   3. The next deploy makes the event subscribable via
 *      `POST /admin/webhooks` with that string in `eventTypes`.
 */
export const WEBHOOK_EVENT_TYPES = [
  // Assignments
  'assignment.created',
  'assignment.approved',
  'assignment.rejected',
  'assignment.amended',
  'assignment.ended',
  'assignment.status_changed',
  'assignment.onboarding_scheduled',
  'assignment.sla_breached',
  'assignment.sla_pre_breach',
  'assignment.escalated_to_case',
  'assignment.proposal_submitted',
  'assignment.proposal_acknowledged',
  'assignment.proposal_director_approval_requested',
  // Position (LEAN-P1-5 — lean-migration ProjectPosition lifecycle events)
  'position.fill_changed',
  // PlannerScenario (LEAN-P4a-1 — Distribution Studio scenario lifecycle)
  'scenario.created',
  'scenario.updated',
  'scenario.cancelled',
  // Project
  'project.submitted_for_approval',
  'project.approved',
  'project.rejected',
  'project.activated',
  'project.closed',
  'project.budget_change.requested',
  'project.budget_change.approved',
  'project.budget_change.rejected',
  // Staffing request
  'staffing_request.submitted',
  'staffing_request.in_review',
  'staffing_request.fulfilled',
  'staffing_request.cancelled',
  // Case
  'case.created',
  'case.step_completed',
  'case.closed',
  'case.approved',
  'case.rejected',
  // Timesheet
  'timesheet.approved',
  'timesheet.rejected',
  // Person
  'employee.terminated',
  'employee.deactivated',
  'person.release.requested',
  'person.release.partially_approved',
  'person.release.approved',
  'person.release.rejected',
  // Integration
  'integration.sync_failed',
  // Nudge (HD-8 / F9b)
  'nudge.proposal_acknowledgment_overdue',
  'nudge.timesheet_submission_overdue',
  'nudge.staffing_request_approval_overdue',
  'nudge.assignment_approval_overdue',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/**
 * Lightweight prose description per event, surfaced via
 * `GET /admin/webhooks/event-types` so integrators can self-discover
 * what each event means without reading the source.
 */
export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEventType, string> = {
  'assignment.created': 'A new project assignment has been proposed.',
  'assignment.approved': 'An assignment was approved by a manager.',
  'assignment.rejected': 'An assignment was rejected by a manager.',
  'assignment.amended': 'An assignment was edited (dates, allocation, role).',
  'assignment.ended': 'An assignment reached its end date or was force-ended.',
  'assignment.status_changed': 'An assignment moved to a new status in the canonical workflow.',
  'assignment.onboarding_scheduled': 'An onboarding case was scheduled for an assignment.',
  'assignment.sla_breached': 'An assignment stayed in a status past its SLA budget.',
  'assignment.sla_pre_breach': 'An assignment is approaching SLA breach.',
  'assignment.escalated_to_case': 'An assignment was escalated to a CaseRecord for investigation.',
  'assignment.proposal_submitted': 'A staffing proposal slate was submitted for the assignment.',
  'assignment.proposal_acknowledged': 'A staffing proposal was acknowledged by the recipient.',
  'assignment.proposal_director_approval_requested': 'A staffing proposal requires director-level approval.',
  'position.fill_changed': 'A ProjectPosition lifecycle changed (lean-migration canonical event — fillStatus or activeFill mutation).',
  'scenario.created': 'A Distribution Studio planner scenario was created (DRAFT).',
  'scenario.updated': 'A planner scenario was modified (name, description, state, or status).',
  'scenario.cancelled': 'A planner scenario was soft-cancelled (status → CANCELLED).',
  'project.submitted_for_approval': 'A project was submitted for activation approval.',
  'project.approved': 'A project activation request was approved.',
  'project.rejected': 'A project activation request was rejected.',
  'project.activated': 'A project transitioned to ACTIVE status.',
  'project.closed': 'A project transitioned to CLOSED status.',
  'project.budget_change.requested': 'A budget change for a project was requested.',
  'project.budget_change.approved': 'A budget change request was approved.',
  'project.budget_change.rejected': 'A budget change request was rejected.',
  'staffing_request.submitted': 'A new staffing request was submitted.',
  'staffing_request.in_review': 'A staffing request entered IN_REVIEW status.',
  'staffing_request.fulfilled': 'A staffing request reached its required headcount.',
  'staffing_request.cancelled': 'A staffing request was cancelled.',
  'case.created': 'A new CaseRecord (incident / onboarding / approval) was opened.',
  'case.step_completed': 'A step on a CaseRecord was marked complete.',
  'case.closed': 'A CaseRecord was closed.',
  'case.approved': 'A CaseRecord was approved.',
  'case.rejected': 'A CaseRecord was rejected.',
  'timesheet.approved': 'A timesheet week was approved.',
  'timesheet.rejected': 'A timesheet week was rejected.',
  'employee.terminated': 'A Person was terminated (TERMINATE EmploymentEvent).',
  'employee.deactivated': 'A Person was deactivated (status moved to INACTIVE).',
  'person.release.requested': 'A person-release approval flow was opened.',
  'person.release.partially_approved': 'A person-release received its first approval (hr_manager OR director).',
  'person.release.approved': 'A person-release received both approvals (hr_manager AND director).',
  'person.release.rejected': 'A person-release was rejected.',
  'integration.sync_failed': 'A connector sync failed (M365 / LDAP / JSM / Jira PPM / LLM).',
  'nudge.proposal_acknowledgment_overdue': 'A proposal slate sat un-acknowledged past the nudge threshold.',
  'nudge.timesheet_submission_overdue': 'A timesheet week passed its submission deadline without being submitted.',
  'nudge.staffing_request_approval_overdue': 'A staffing request sat un-approved past the nudge threshold.',
  'nudge.assignment_approval_overdue': 'An assignment approval sat past the nudge threshold.',
};

export function isWebhookEventType(value: unknown): value is WebhookEventType {
  return typeof value === 'string' && (WEBHOOK_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Returned by `GET /admin/webhooks/event-types` so integrators can
 * self-discover the registry without reading source.
 */
export interface WebhookEventTypeDescriptor {
  eventType: WebhookEventType;
  description: string;
  domain: 'assignment' | 'project' | 'staffing_request' | 'case' | 'timesheet' | 'person' | 'position' | 'scenario' | 'integration' | 'nudge';
}

function domainOf(eventType: WebhookEventType): WebhookEventTypeDescriptor['domain'] {
  const head = eventType.split('.')[0];
  if (head === 'employee') return 'person';
  return head as WebhookEventTypeDescriptor['domain'];
}

export const WEBHOOK_EVENT_REGISTRY: readonly WebhookEventTypeDescriptor[] = WEBHOOK_EVENT_TYPES.map(
  (eventType) => ({
    eventType,
    description: WEBHOOK_EVENT_DESCRIPTIONS[eventType],
    domain: domainOf(eventType),
  }),
);
