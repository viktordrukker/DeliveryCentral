# UI Pages Reference

All frontend pages in DeliveryCentral. Archived per-page specs are in `docs/archive/ui/`.

| Page | Route | Description |
|------|-------|-------------|
| Admin Panel | `/admin` | Consolidated control surface for platform operators (config-driven) |
| Assignment Approval | `/assignments/:id` | Workflow actions for formal staffing approval/rejection |
| Assignment Lifecycle | `/assignments/:id` | Visibility into assignment workflow transitions |
| Assignments Page | `/assignments` | Operational staffing overview of ProjectAssignment records |
| Bulk Assignments | `/assignments/bulk` | Create multiple assignment requests in one batch |
| Business Audit | `/admin/audit` | Business-action investigation surface for operators |
| Cases | `/cases` | Governance/case-management for opening, browsing, reviewing cases |
| Create Assignment Form | `/assignments/new` | Submit staffing assignment requests |
| Dashboard - Employee | `/dashboard/employee` | Self-oriented employee dashboard |
| Dashboard - HR | `/dashboard/hr` | Organization-centric workforce structure view |
| Dashboard - Project Manager | `/dashboard/project-manager` | Project-oriented operational view |
| Dashboard - Resource Manager | `/dashboard/resource-manager` | Capacity-oriented operational view |
| Dictionaries | `/admin/dictionaries` | Admin editor for metadata-backed person dictionaries |
| Employee Details | `/people/:id` | Employee-centric detail view |
| Employee Directory | `/people` | Readable list of people for planners and managers |
| Employee Lifecycle Admin | `/admin/employees` | HR/admin control surface for employee create/deactivate |
| Exception Queue | `/exceptions` | Staffing, project, work-evidence, and integration anomalies |
| Integrations | `/admin/integrations` | Operator-focused integration control surface |
| Jira Integration Status | `/integrations` | Adapter status and project sync outcomes |
| Manager Scope | `/org/managers/:id/scope` | Manager reporting visibility read model |
| Metadata Admin | `/metadata-admin` | Controlled vocabularies as platform configuration |
| Monitoring | `/admin/monitoring` | System monitoring dashboard |
| Notifications | `/admin/notifications` | Notification template management and test sends |
| Org Chart | `/org` | Organizational hierarchy as operational structure |
| Planned vs Actual | `/dashboard/planned-vs-actual` | Compare formal assignments with observed work evidence |
| Project Closure | `/projects/:id/close` | Governed project closure with override for blocking conflicts |
| Project Dashboard | `/projects/:id/dashboard` | Operational project view |
| Project Details | `/projects/:id` | Operational project record with lifecycle controls |
| Project Lifecycle | `/projects` | Project create, activate, and lifecycle transitions |
| Project Registry | `/projects` | Internal projects as first-class business objects |
| Reporting Line Management | `/people/:id` | Assign/change solid-line manager relationships |
| Team Dashboard | `/teams/:id/dashboard` | Team-centric operational view |
| Team Management | `/teams` | Manage operational teams separate from org units |
| UI Foundation | n/a | Frontend shell and UI baseline (layout, nav, theme) |
| Work Evidence | `/work-evidence` | Read-only view of observed work (internal + Jira sources) |
| Workload Dashboard | `/` | Executive summary of current workload state |
