# Backend to Frontend Gap Map

This document maps backend features that exist today against usable frontend workflows.

It is based on:

- implemented backend controllers and routes
- current frontend router and route pages
- current frontend API clients and feature hooks

The earlier version of this document focused on large missing surfaces.
That is no longer the dominant problem.

The current purpose is to show:

- what is fully covered
- what is operational but still incomplete
- what genuinely remains missing for the next iteration

## Legend

- `Missing UI`: backend capability exists but no usable frontend workflow is implemented
- `Partial UI`: a frontend surface exists, but it still omits meaningful backend behavior
- `Covered`: backend feature is already wired to a meaningful frontend flow

## Organization

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| create employee | `POST /org/people` | `Covered` | employee lifecycle admin create flow exists |
| deactivate employee | `POST /org/people/{id}/deactivate` | `Covered` | deactivation action exists in employee details/admin flow |
| assign reporting line | `POST /org/reporting-lines` | `Covered` | effective-dated reporting-line management UI exists |
| person directory | `GET /org/people` | `Covered` | used by employee directory and selectors |
| person detail | `GET /org/people/{id}` | `Covered` | employee details page is operational |
| org chart | `GET /org/chart` | `Covered` | org chart UI exists |
| manager scope | `GET /org/managers/{id}/scope` | `Covered` | manager scope page exists |

## Teams

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| list teams | `GET /teams` | `Covered` | team management page exists |
| create team | `POST /teams` | `Covered` | team management page exists |
| team detail | `GET /teams/{id}` | `Partial UI` | used inside team management flows, but there is still no dedicated team details route |
| team members | `GET /teams/{id}/members` | `Covered` | team management page consumes it |
| add or remove team member | `POST /teams/{id}/members` | `Covered` | add/remove flow exists |
| team dashboard | `GET /teams/{id}/dashboard` | `Covered` | dedicated team dashboard UI exists |

## Assignments

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| list assignments | `GET /assignments` | `Covered` | assignments page exists |
| assignment detail | `GET /assignments/{id}` | `Covered` | detail page now includes lifecycle visibility |
| create assignment | `POST /assignments` | `Covered` | create assignment form exists |
| bulk create assignments | `POST /assignments/bulk` | `Covered` | bulk assignment UI exists |
| approve assignment | `POST /assignments/{id}/approve` | `Covered` | detail flow supports approval |
| reject assignment | `POST /assignments/{id}/reject` | `Covered` | detail flow supports rejection |
| end assignment | `POST /assignments/{id}/end` | `Covered` | end-assignment action exists |
| assignment history and lifecycle trail | backend workflow support | `Covered` | history is visible in assignment details |
| assignment creation override | `POST /assignments/override` | `Covered` | governed override UI exists from assignment create flow |

## Projects

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| list projects | `GET /projects` | `Covered` | project registry page exists |
| project detail | `GET /projects/{id}` | `Covered` | project details page is operational |
| create project | `POST /projects` | `Covered` | create project flow exists |
| activate project | `POST /projects/{id}/activate` | `Covered` | lifecycle action exists in UI |
| close project | `POST /projects/{id}/close` | `Covered` | closure flow exists |
| close override | `POST /projects/{id}/close-override` | `Covered` | governed override UI exists |
| assign team to project | `POST /projects/{id}/assign-team` | `Covered` | assign-team UI exists |
| project dashboard | project reads + analytics APIs | `Covered` | project dashboard UI exists |

## Work Evidence

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| create work evidence | `POST /work-evidence` | `Covered` | work evidence page exists |
| list work evidence | `GET /work-evidence` | `Covered` | work evidence page exists |

## Cases

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| create case | `POST /cases` | `Covered` | create flow exists |
| list cases | `GET /cases` | `Covered` | cases list exists |
| case detail | `GET /cases/{id}` | `Covered` | case detail exists |

## Metadata and admin

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| list dictionaries | `GET /metadata/dictionaries` | `Covered` | dictionary admin UI exists |
| dictionary detail | `GET /metadata/dictionaries/{id}` | `Covered` | dictionary admin UI exists |
| create dictionary entry | `POST /metadata/dictionaries/{type}/entries` | `Covered` | dictionary entry form exists |
| admin config | `GET /admin/config` | `Covered` | admin panel uses it |
| admin settings | `GET /admin/settings` | `Covered` | admin panel uses it |
| admin integrations | `GET /admin/integrations` | `Covered` | integrations admin page uses it |
| admin notifications | `GET /admin/notifications` | `Covered` | notifications admin UI uses it |

## Integrations

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| Jira status | `GET /integrations/jira/status` | `Covered` | integrations admin UI exists |
| Jira project sync | `POST /integrations/jira/projects/sync` | `Covered` | sync action exists |
| integration sync history | `GET /integrations/history` | `Covered` | recent sync runs are visible |
| M365 directory status | `GET /integrations/m365/directory/status` | `Covered` | admin UI supports it |
| M365 directory sync | `POST /integrations/m365/directory/sync` | `Covered` | admin UI supports it |
| M365 reconciliation review | `GET /integrations/m365/directory/reconciliation` | `Covered` | admin UI supports category review |
| RADIUS status | `GET /integrations/radius/status` | `Covered` | admin UI supports it |
| RADIUS account sync | `POST /integrations/radius/accounts/sync` | `Covered` | admin UI supports it |
| RADIUS reconciliation review | `GET /integrations/radius/reconciliation` | `Covered` | admin UI supports category review |

## Notifications

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| list notification templates | `GET /notifications/templates` | `Covered` | notifications admin UI exists |
| recent notification outcomes | `GET /notifications/outcomes` | `Covered` | admin UI shows recent outcomes |
| test send notification | `POST /notifications/test-send` | `Covered` | test send flow exists |

## Dashboard and analytics

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| workload summary | `GET /dashboard/workload/summary` | `Covered` | main dashboard uses it |
| planned vs actual | `GET /dashboard/workload/planned-vs-actual` | `Covered` | comparison page exists |
| generic role summary | `GET /dashboard/{role}` | `Missing UI` | dedicated role dashboards exist, but the generic role endpoint is still not surfaced directly |
| employee dashboard | `GET /dashboard/employee/{personId}` | `Covered` | UI exists |
| PM dashboard | `GET /dashboard/project-manager/{personId}` | `Covered` | UI exists |
| RM dashboard | `GET /dashboard/resource-manager/{personId}` | `Covered` | UI exists |
| HR dashboard | `GET /dashboard/hr-manager/{personId}` | `Covered` | UI exists |

## Audit, exceptions, and observability

| Backend feature | Endpoint | Frontend status | Notes |
|---|---|---|---|
| business audit query | `GET /audit/business` | `Covered` | audit browsing UI exists |
| exception queue list | `GET /exceptions` | `Covered` | exception queue page exists |
| exception detail | `GET /exceptions/{id}` | `Covered` | detail panel exists |
| health | `GET /health` | `Covered` | monitoring page uses it |
| readiness | `GET /readiness` | `Covered` | monitoring page uses it |
| diagnostics | `GET /diagnostics` | `Covered` | monitoring page uses it |

## Highest-value remaining frontend gaps

The biggest remaining backend-to-frontend gaps are now much narrower:

1. dedicated team details route rather than only embedded team-management detail
2. direct UI for the generic role-summary endpoint if it becomes a real product surface
3. richer operator actions on exceptions and reconciliation items:
   - acknowledge
   - mark reviewed
   - attach follow-up actions
4. deeper audit and exception cross-linking between operational records
5. browser-level session/auth experience for protected admin workflows

## Notes for planning

- The largest lifecycle and governance gaps from earlier iterations are now covered.
- The next iteration should not be framed as "finish the missing UI." That work is mostly done.
- The more valuable remaining work is:
  - stronger operator workflow depth
  - auth/session maturity
  - read-model performance and correctness
  - better cross-linking between existing operational surfaces
