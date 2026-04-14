Atten# DeliveryCentral: Claude Code Task Backlog v2

**Source:** UX Operating System v2.0 + Live Codebase Audit
**Repo:** github.com/viktordrukker/DeliveryCentral
**Stack:** React 18 + Vite 5 + TypeScript + MUI v7 + Emotion + Custom CSS Variables + Recharts + date-fns
**Total Tasks:** 38 (across 6 phases)
**Estimated Effort:** ~120 Claude Code sessions

> **How to use this file:** Each task is a self-contained Claude Code prompt.
> Copy the prompt into Claude Code in VS Code (WSL). Tasks are dependency-ordered.
> Complete Phase 0 first. Within a phase, same-numbered tasks can run in parallel.
>
> **Critical:** This app uses MUI (Material UI), NOT shadcn/ui. It uses custom CSS
> with CSS variables in `frontend/src/styles/global.css`, NOT Tailwind. All existing
> components are in `frontend/src/components/`. API layer is in `frontend/src/lib/api/`.
> Route pages are in `frontend/src/routes/` with `*Page.tsx` naming convention.

---

## CODEBASE MAP (Reference for all tasks)

```
DeliveryCentral/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx                    # Root component
│   │   │   ├── router.tsx                 # React Router config (70+ routes)
│   │   │   ├── role-routing.ts            # getDashboardPath() per role
│   │   │   ├── navigation.ts              # appRoutes[] with titles, groups, allowedRoles
│   │   │   ├── auth-context.tsx           # AuthProvider, useAuth(), JWT/refresh
│   │   │   ├── impersonation-context.tsx  # Admin "View as" feature
│   │   │   └── theme.ts                  # MUI theme (light + dark)
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Breadcrumb.tsx         # EXISTS (basic, needs upgrade)
│   │   │   │   ├── CommandPalette.tsx     # EXISTS (cmdk, needs enhancement)
│   │   │   │   ├── ConfirmDialog.tsx      # EXISTS (modal, needs InlineConfirm addition)
│   │   │   │   ├── DataTable.tsx          # EXISTS (basic, no sort/paginate/bulk)
│   │   │   │   ├── EmptyState.tsx         # EXISTS (basic, needs icons/actions)
│   │   │   │   ├── ErrorBoundary.tsx      # EXISTS
│   │   │   │   ├── FilterBar.tsx          # EXISTS (layout only, no state mgmt)
│   │   │   │   ├── LoadingState.tsx       # EXISTS (spinner only, needs skeletons)
│   │   │   │   ├── PageContainer.tsx      # EXISTS
│   │   │   │   ├── PageHeader.tsx         # EXISTS (title/subtitle/actions)
│   │   │   │   ├── SectionCard.tsx        # EXISTS (collapsible, chart export)
│   │   │   │   ├── VirtualTable.tsx       # EXISTS (custom windowing)
│   │   │   │   ├── ColumnVisibilityMenu.tsx # EXISTS
│   │   │   │   ├── PersonSelect.tsx       # EXISTS
│   │   │   │   └── ProjectSelect.tsx      # EXISTS
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx           # Main layout (sidebar+header+content)
│   │   │   │   ├── SidebarNav.tsx         # Role-filtered nav with favorites/pins
│   │   │   │   ├── TopHeader.tsx          # User info, impersonation, notifications
│   │   │   │   ├── DashboardGrid.tsx      # CSS grid with container queries
│   │   │   │   └── NotificationBell.tsx   # Notification dropdown
│   │   │   ├── dashboard/                 # Dashboard-specific widgets
│   │   │   ├── exceptions/                # Exception UI components
│   │   │   ├── assignments/               # Assignment components
│   │   │   ├── projects/                  # Project components
│   │   │   ├── people/                    # People directory components
│   │   │   ├── staffing/                  # Staffing board components
│   │   │   └── ...                        # cases, teams, work-evidence, etc.
│   │   ├── routes/
│   │   │   ├── dashboard/
│   │   │   │   ├── DashboardPage.tsx              # Main (role-redirect + KPIs)
│   │   │   │   ├── ProjectManagerDashboardPage.tsx # PM dashboard
│   │   │   │   ├── ResourceManagerDashboardPage.tsx
│   │   │   │   ├── DirectorDashboardPage.tsx
│   │   │   │   ├── HrDashboardPage.tsx
│   │   │   │   ├── DeliveryManagerDashboardPage.tsx
│   │   │   │   ├── EmployeeDashboardPage.tsx
│   │   │   │   └── PlannedVsActualPage.tsx
│   │   │   ├── timesheets/
│   │   │   │   ├── TimesheetPage.tsx              # Weekly grid entry
│   │   │   │   └── TimesheetApprovalPage.tsx      # Approval queue
│   │   │   ├── exceptions/
│   │   │   │   └── ExceptionsPage.tsx             # Exception queue + detail
│   │   │   ├── projects/
│   │   │   │   ├── ProjectsPage.tsx               # List + health scores
│   │   │   │   ├── ProjectDashboardPage.tsx       # Project detail
│   │   │   │   └── CreateProjectPage.tsx
│   │   │   ├── people/                            # Person directory + 360
│   │   │   ├── assignments/                       # Assignment CRUD
│   │   │   ├── staffing-requests/                 # Staffing demand
│   │   │   ├── cases/                             # Case management
│   │   │   └── ...                                # 15+ more route dirs
│   │   ├── features/                    # Feature hooks/logic per domain
│   │   ├── hooks/                       # Shared hooks
│   │   ├── lib/
│   │   │   ├── api/                     # 52 API client modules
│   │   │   │   ├── http-client.ts       # Centralized fetch with interceptors
│   │   │   │   ├── dashboard-project-manager.ts
│   │   │   │   ├── dashboard-resource-manager.ts
│   │   │   │   ├── dashboard-director.ts
│   │   │   │   ├── timesheets.ts
│   │   │   │   ├── exceptions.ts
│   │   │   │   ├── assignments.ts
│   │   │   │   ├── staffing-requests.ts
│   │   │   │   └── ...                  # 44 more API modules
│   │   │   └── hooks/                   # More shared hooks
│   │   ├── styles/
│   │   │   └── global.css               # ~1500 lines, CSS variables, all component styles
│   │   └── types/                       # Type definitions
│   └── package.json                     # MUI v7, cmdk, sonner, recharts, date-fns, etc.
├── src/                                 # NestJS backend
│   └── modules/                         # 18+ NestJS modules (DDD)
├── prisma/
│   └── schema.prisma                    # 53 models (PostgreSQL)
├── e2e/                                 # Playwright tests
└── test/                                # Backend tests (Jest)
```

**Installed libraries already available:**
- `@mui/material` v7, `@mui/x-data-grid`, `@mui/x-date-pickers`
- `cmdk` (command palette), `sonner` (toasts), `recharts`, `d3`
- `date-fns`, `xlsx`, `@dnd-kit/core`, `@xyflow/react`
- `vitest`, `@testing-library/react`, Playwright

---

## PHASE 0: PROJECT FOUNDATION

### TASK 0.1 — Create CLAUDE.md Project Configuration

**Priority:** P0 | **Depends on:** Nothing | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

Read the project structure and create a CLAUDE.md file in the project root.

This is a monorepo: NestJS backend in /src, React frontend in /frontend/src.
The frontend uses React 18 + Vite + TypeScript + MUI v7 + Emotion + custom CSS
variables (in frontend/src/styles/global.css). It does NOT use Tailwind or shadcn/ui.

Document in CLAUDE.md:

1. PROJECT CONTEXT:
   Enterprise "Delivery Central" workforce operations platform. Staffing, project
   delivery, evidence tracking, org governance. Multi-role RBAC: employee,
   project_manager, resource_manager, hr_manager, delivery_manager, director, admin.

2. FRONTEND ARCHITECTURE:
   - Components: frontend/src/components/ (common/, layout/, dashboard/, etc.)
   - Pages: frontend/src/routes/*Page.tsx naming convention
   - Features: frontend/src/features/ (domain hooks/logic)
   - API layer: frontend/src/lib/api/ (52 modules, centralized http-client.ts)
   - Auth: frontend/src/app/auth-context.tsx (JWT + refresh + impersonation)
   - Router: frontend/src/app/router.tsx (React Router v6, lazy-loaded dashboards)
   - Navigation: frontend/src/app/navigation.ts (appRoutes with roles/groups)
   - Role routing: frontend/src/app/role-routing.ts (getDashboardPath)
   - Styling: MUI theme (frontend/src/app/theme.ts) + CSS variables (frontend/src/styles/global.css)
   - Toasts: sonner (already installed)
   - Command palette: cmdk (already installed, at components/common/CommandPalette.tsx)
   - Charts: recharts + d3
   - Date formatting: date-fns (already installed)
   - Tables: MUI X Data Grid + custom DataTable + VirtualTable

3. BACKEND ARCHITECTURE:
   - NestJS with DDD modules in src/modules/
   - Prisma ORM with PostgreSQL (schema at prisma/schema.prisma)
   - JWT auth with Passport (local, LDAP, Azure AD strategies)
   - API prefix: /api

4. CODING RULES:
   - TypeScript strict mode, no `any`
   - Functional components with hooks
   - New CSS goes in global.css using CSS custom properties (--color-*, --space-*)
   - MUI components for UI, NOT shadcn/ui or raw HTML
   - date-fns for all date formatting (never raw .toLocaleDateString())
   - sonner toast() for all notifications
   - React Router useNavigate/useSearchParams for navigation
   - All page components must handle: loading, error, empty states

5. COMMANDS:
   - Frontend dev: cd frontend && npm run dev
   - Frontend build: cd frontend && npm run build
   - Frontend test: cd frontend && npm run test
   - Backend dev: npm run start:dev
   - Backend build: npm run build
   - E2E tests: npx playwright test

Also create .claude/rules/ux-laws.md with the 10 UX Operating Laws as
enforceable rules:
- Law 1: Max 3 clicks for core business actions
- Law 2: No dead-end screens (every page has a next action)
- Law 3: No context loss after actions (stay in working context)
- Law 4: Action-data adjacency (<200px from data to its action)
- Law 5: Filters persist via URL params until explicit reset
- Law 6: No duplicated user input (pre-fill from context)
- Law 7: One-screen approval (all context + action visible)
- Law 8: One-screen exception resolution
- Law 9: Every KPI is a clickable drilldown
- Law 10: Workspace continuity (remember last state)

Run the frontend build after creating these files to verify nothing breaks.
```

---

### TASK 0.2 — Audit and Extend CSS Design Tokens

**Priority:** P0 | **Depends on:** 0.1 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

Open frontend/src/styles/global.css. It already has CSS custom properties
(variables) for colors, spacing, typography, and layout. Audit what exists
and ADD any missing tokens needed by the UX Operating System.

DO NOT remove or rename existing tokens — only ADD new ones.

CHECK IF THESE EXIST, ADD IF MISSING:

Semantic status colors (for StatusBadge patterns):
  --color-status-active, --color-status-pending, --color-status-warning,
  --color-status-danger, --color-status-info, --color-status-neutral

Utilization band colors:
  --color-util-critical (>100%, red), --color-util-over (90-100%, amber),
  --color-util-optimal (70-89%, green), --color-util-under (50-69%, cyan),
  --color-util-idle (<50%, gray)

Chart palette (8 distinguishable colors for recharts):
  --color-chart-1 through --color-chart-8

Threshold indicator colors:
  --color-threshold-healthy (green left border on KPI cards)
  --color-threshold-warning (amber left border)
  --color-threshold-danger (red left border)

Elevation/shadow tokens:
  --shadow-card, --shadow-dropdown, --shadow-modal

Animation tokens:
  --transition-fast: 150ms ease, --transition-normal: 300ms ease

Also verify that the dark theme ([data-theme="dark"]) overrides ALL these
new tokens appropriately.

THEN: Search the codebase (frontend/src/components/ and frontend/src/routes/)
for hardcoded hex color values (e.g., #3b82f6, #ef4444, direct color strings).
Add TODO comments at the top of global.css listing files with hardcoded colors
for future migration.

Run the frontend build to verify.
```

---

## PHASE 1: CRITICAL INFRASTRUCTURE FIXES

### TASK 1.1 — Fix RBAC Dead-Ends: Redirect Instead of Error Screens

**Priority:** P0 | **Depends on:** 0.1 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

Users currently see "Access Denied" or "Insufficient role" error screens when
they navigate to pages their role can't access. The sidebar also shows some
items users can't use.

FIX:

1. Open frontend/src/routes/RoleGuard.tsx (and ProtectedRoute.tsx).
   When a user fails the role check, instead of rendering an error screen,
   REDIRECT them to their role-appropriate dashboard using getDashboardPath()
   from frontend/src/app/role-routing.ts. Show a sonner toast:
   toast.info("You've been redirected to your dashboard")

2. Open frontend/src/components/layout/SidebarNav.tsx.
   It already filters by allowedRoles — verify this filtering works correctly.
   If any nav items slip through without proper role checks, fix them.
   Nav items the user can't access should be REMOVED, never shown grayed out.

3. Open frontend/src/app/router.tsx.
   Verify that the default "/" route redirects each role to their appropriate
   dashboard via getDashboardPath(). Currently DashboardPage.tsx handles some
   role routing — make sure there are no cases where a user lands on a generic
   dashboard that shows an error.

4. Open frontend/src/routes/dashboard/DashboardPage.tsx.
   This page does role-based redirection. Verify it handles ALL roles cleanly
   without showing error states for any role.

Test by checking the routing logic for each of the 7 roles. Run the build.
```

---

### TASK 1.2 — Upgrade LoadingState to Skeleton System

**Priority:** P0 | **Depends on:** 0.2 | **Est:** 1-2 sessions

```
PROMPT FOR CLAUDE CODE:

frontend/src/components/common/LoadingState.tsx currently shows only a spinner
with a text label. Enterprise apps need content-shaped skeleton loaders.

1. UPGRADE LoadingState.tsx — keep the existing component but ADD new variants:

   Add a `variant` prop: 'spinner' (default, current behavior) | 'skeleton'
   Add a `skeletonType` prop: 'table' | 'cards' | 'page' | 'detail' | 'chart'

   When variant='skeleton', render MUI Skeleton components:
   - 'table': 5 rows of animated bars matching table layout
   - 'cards': 4 card-shaped skeletons in a row (for KPI strips)
   - 'page': header skeleton + cards row + table skeleton
   - 'detail': header + tabs + content area skeleton
   - 'chart': rectangular area with shimmer

   Use MUI's <Skeleton variant="rectangular" /> and <Skeleton variant="text" />.
   Import from '@mui/material/Skeleton'.

   Style using CSS classes in global.css — add a .skeleton-* section.

2. FIND every page that fetches data and shows LoadingState:
   Search frontend/src/routes/ for imports of LoadingState.
   Update each to use variant='skeleton' with the appropriate skeletonType:
   - Dashboard pages -> skeletonType='page'
   - List pages (Projects, People, Assignments, etc.) -> skeletonType='table'
   - Detail pages -> skeletonType='detail'

   Also search for any raw "Loading..." text or MUI CircularProgress that
   isn't wrapped in LoadingState, and replace those too.

Run the frontend build and verify.
```

---

### TASK 1.3 — Build Unified Error Recovery Component

**Priority:** P0 | **Depends on:** 0.2 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

The app has ErrorBoundary.tsx but page-level errors show inconsistent patterns:
yellow "Something went wrong", raw "Insufficient role" strings, generic errors.

1. CREATE frontend/src/components/common/ErrorState.tsx:

   Props:
   - title?: string (default "Something went wrong")
   - message?: string (the error details)
   - onRetry?: () => void (shows Retry button)
   - variant?: 'page' | 'inline' | 'card' (default 'page')
   - icon?: MUI icon component (default ErrorOutline)

   Use MUI components: Box, Typography, Button, Icon.
   Add CSS classes in global.css (.error-state, .error-state--page, etc.)

   Design:
   - page: centered, large icon, title, message, Retry button, "Go to Dashboard" fallback
   - inline: compact row with icon + message + retry button
   - card: fits inside a SectionCard

   CRITICAL (UX Law 2): Every error MUST have a recovery action.
   If onRetry is missing, show a "Go to Dashboard" link using react-router Link.

2. FIND AND REPLACE all error displays in frontend/src/routes/**:
   Search for:
   - "Something went wrong" text
   - "Access Denied" / "Insufficient role" strings
   - Direct error.message renders
   - MUI Alert components used for errors
   Replace with <ErrorState onRetry={refetch} message={error.message} />.

3. UPDATE frontend/src/components/common/ErrorBoundary.tsx to use <ErrorState>
   as its fallback UI.

Run the build and verify no raw error strings remain.
```

---

### TASK 1.4 — Upgrade EmptyState with Icons and Actions

**Priority:** P1 | **Depends on:** 0.2 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

frontend/src/components/common/EmptyState.tsx is basic — just title, description,
and a single link-based action. Upgrade it.

1. OPEN frontend/src/components/common/EmptyState.tsx and ADD:

   New props:
   - icon?: React.ElementType (MUI icon, e.g., InboxOutlined)
   - actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>
   - showClearFilters?: boolean (if true, renders "Clear all filters" button)
   - onClearFilters?: () => void

   Keep backward compatibility — existing title/description/action props still work.

   Design: centered in parent, large icon (48px) in muted color, title in
   subtitle style, description in body2, action buttons below.
   Use MUI: Box, Typography, Button, SvgIcon.

2. APPLY improved EmptyState to all list pages in frontend/src/routes/:
   Search for existing EmptyState usage and verify each one has:
   - An appropriate icon (e.g., FolderOpenOutlined for Projects, PeopleOutlined for People)
   - A "Create [entity]" action button if the user has create permission
   - showClearFilters={true} if the page has active URL filter params

   Also handle TWO empty states per page:
   - "No results match your filters" (when filters active) + clear filters button
   - "No [entities] yet" (when truly empty) + create button

Run the build and verify.
```

---

### TASK 1.5 — Build InlineConfirm Component

**Priority:** P1 | **Depends on:** 0.1 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

frontend/src/components/common/ConfirmDialog.tsx is a modal dialog. Keep it,
but also build an INLINE confirmation pattern for simple destructive actions.

1. CREATE frontend/src/components/common/InlineConfirm.tsx:

   The pattern: button transforms into confirm/cancel pair inline — no modal.

   Props:
   - trigger: ReactNode (the button to wrap)
   - confirmLabel?: string (default "Confirm")
   - cancelLabel?: string (default "Cancel")
   - onConfirm: () => void
   - message?: string (e.g., "Remove this member?")
   - variant?: 'destructive' | 'warning' | 'default'
   - autoRevertMs?: number (default 5000, auto-cancel if no action)

   Behavior:
   - Click trigger -> 300ms CSS transition -> shows "[message] [Confirm] [Cancel]"
   - Confirm uses MUI Button color="error" for destructive variant
   - Cancel or timeout reverts to original trigger
   - Use React state + CSS transitions (add .inline-confirm-* to global.css)

2. FIND destructive actions in the codebase:
   Search frontend/src/routes/ and frontend/src/components/ for buttons that
   perform delete, remove, close, cancel, reject actions. Look for:
   - onClick handlers named handleDelete, handleRemove, handleClose
   - Buttons with "destructive" or "error" styling
   - Calls to ConfirmDialog for simple single-click confirmations

   For SIMPLE confirmations (one-click, no reason required), replace
   ConfirmDialog with InlineConfirm. Keep ConfirmDialog for complex
   confirmations that need a reason/textarea.

Run the build and verify.
```

---

### TASK 1.6 — Build NextAction Post-Mutation Feedback

**Priority:** P1 | **Depends on:** 0.1 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

After create/update/delete actions, the app either navigates away or shows
nothing. Build a NextAction system for workflow continuity.

1. CREATE frontend/src/components/common/NextAction.tsx:

   Props:
   - message: string ("Assignment created successfully")
   - actions: Array<{ label: string; href?: string; onClick?: () => void; variant: 'primary' | 'secondary' }>
   - autoDismissMs?: number (default 8000)

   Design: toast-like bar with green left accent, message on left, action
   buttons on right. Use sonner's custom toast or build as a standalone
   component that renders inline.

   Add .next-action-* styles in global.css.

2. CREATE frontend/src/hooks/useNextAction.ts:

   A thin wrapper that displays NextAction after a mutation succeeds:
   ```tsx
   function useNextAction() {
     const [nextAction, setNextAction] = useState<NextActionProps | null>(null);
     const showNextAction = (props: NextActionProps) => setNextAction(props);
     const dismiss = () => setNextAction(null);
     return { nextAction, showNextAction, dismiss, NextActionRenderer };
   }
   ```

3. APPLY to 3 existing mutations as proof of concept:
   Find the timesheet submit action in frontend/src/routes/timesheets/TimesheetPage.tsx
   and add: NextAction "Timesheet submitted" -> [View next week] [Back to Dashboard]

   Find assignment creation (somewhere in routes/assignments/) and add:
   NextAction "Assignment created" -> [View assignment] [Create another]

   Find any approval action and add appropriate next actions.

Run the build and verify.
```

---

### TASK 1.7 — Implement Filter Persistence via URL Search Params

**Priority:** P0 | **Depends on:** 0.1 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Filters reset when navigating away and back. This is the most impactful
quality-of-life fix (UX Law 5).

1. CREATE frontend/src/hooks/useFilterParams.ts:

   ```tsx
   function useFilterParams<T extends Record<string, string | undefined>>(
     defaults: T
   ): [T, (updates: Partial<T>) => void, () => void]
   ```
   Uses react-router's useSearchParams to read/write URL query params.
   Returns [currentFilters, setFilters, resetFilters].

2. FIND every list page that has local filter state:
   Search frontend/src/routes/ for useState calls related to filtering
   (search text, status dropdowns, date ranges, etc.).

   Key pages to update:
   - routes/projects/ProjectsPage.tsx (search, external system filter)
   - routes/people/ (directory search, department, status)
   - routes/assignments/ (search, status, project, dates)
   - routes/exceptions/ExceptionsPage.tsx (category, provider, status, dates)
   - routes/staffing-requests/ (status, project)
   - routes/cases/ (status, type)
   - routes/timesheets/TimesheetApprovalPage.tsx (status filter)
   - routes/work-evidence/ (project, person, dates)

   For each: replace useState filter state with useFilterParams.
   Connect the FilterBar inputs to read from and write to URL params.

3. ADD a "Clear all filters" button:
   In each FilterBar, show a button that calls resetFilters() when
   any filter differs from defaults.

4. VERIFY: apply filters, navigate to detail, press Back -> filters restored.

Run the build and verify.
```

---

### TASK 1.8 — Upgrade Breadcrumb with Filter-Preserving Back Links

**Priority:** P1 | **Depends on:** 1.7 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

frontend/src/components/common/Breadcrumb.tsx exists but is basic. Upgrade it
to preserve filter state and show everywhere.

1. OPEN frontend/src/components/common/Breadcrumb.tsx:

   ADD to BreadcrumbItem interface:
   - preserveParams?: boolean (if true, href includes current URL query params)
   - filterCount?: string (e.g., "3 of 12 filtered")

   When preserveParams is true, the link should carry the originating page's
   URL search params so clicking "Back to Projects" restores the filtered view.

2. CREATE a route-to-breadcrumb mapping:
   Either in a new file (frontend/src/lib/breadcrumb-config.ts) or inside
   the Breadcrumb component, define the hierarchy for each route using
   the appRoutes from frontend/src/app/navigation.ts.

   Key mappings:
   /projects -> [Dashboard, Projects]
   /projects/:id -> [Dashboard, Projects, {project.name}]
   /people -> [Dashboard, People]
   /people/:id -> [Dashboard, People, {person.name}]
   /assignments -> [Dashboard, Assignments]
   etc.

3. ADD breadcrumbs to the page layout:
   Open frontend/src/components/common/PageContainer.tsx (or PageHeader.tsx).
   Add a breadcrumb slot that auto-renders based on the current route.
   Or: add <Breadcrumb> to each route page individually (less DRY but
   allows page-specific customization).

4. Store the previous list URL in sessionStorage when navigating from
   list -> detail, so the breadcrumb "Back to [list]" link includes filters.

Run the build and verify.
```

---

### TASK 1.9 — Fix Date Format Consistency

**Priority:** P1 | **Depends on:** 0.1 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

Dates are inconsistent: DD.MM.YYYY, YYYY-MM-DD, and Cyrillic placeholders
(ДД.ММ.ГГГГ) appear in different places. date-fns is already installed.

1. CREATE frontend/src/lib/format-date.ts:

   Using date-fns (already in package.json):
   - formatDate(date): "Apr 12, 2026" (for display)
   - formatDateShort(date): "12 Apr 2026" (for compact tables)
   - formatDateISO(date): "2026-04-12" (for API/sorting)
   - formatRelative(date): "2 days ago" / "in 3 hours" (for recent items)
   - formatDateRange(start, end): "Apr 12 – Apr 18, 2026"
   - formatWeek(date): "Week 15, Apr 6 – 12, 2026" (for timesheets)

   Handle null/undefined gracefully (return "—" dash).

2. SEARCH the entire frontend/src/ for:
   - .toLocaleDateString() calls
   - .toISOString().split('T')[0] patterns
   - Manual date string manipulation
   - Cyrillic date placeholders (ДД.ММ.ГГГГ, etc.)
   - new Date().toLocale* calls
   - Direct date-fns format() calls with inconsistent format strings

   Replace ALL with the appropriate format-date.ts function.

3. For MUI DatePicker components (from @mui/x-date-pickers), ensure they
   use a consistent display format. Check their format props.

Run the build and verify dates look consistent.
```

---

## PHASE 2: COMPONENT UPGRADES (Improve what already exists)

### TASK 2.1 — Upgrade DataTable with Sorting, Pagination, Bulk Actions

**Priority:** P0 | **Depends on:** 1.2, 1.3, 1.4, 1.7 | **Est:** 2-3 sessions

```
PROMPT FOR CLAUDE CODE:

frontend/src/components/common/DataTable.tsx is basic — no sorting, pagination,
column visibility, or bulk actions. The app also has VirtualTable.tsx and uses
MUI X DataGrid in some places. We need ONE powerful table for new development.

DECISION: Since @mui/x-data-grid is already installed (v8.28.2), build an
EnterpriseTable wrapper around it rather than extending the custom DataTable.

1. CREATE frontend/src/components/common/EnterpriseTable.tsx:

   A wrapper around MUI X DataGrid that enforces our UX standards.

   Props (simplified from DataGrid):
   - rows: any[]
   - columns: GridColDef[]
   - loading?: boolean (shows skeleton overlay)
   - error?: Error (shows ErrorState overlay)
   - onRetry?: () => void
   - emptyMessage?: string
   - emptyIcon?: React.ElementType
   - emptyAction?: { label: string; onClick: () => void }
   - onRowClick?: (row: any) => void
   - bulkActions?: Array<{ label: string; onClick: (selectedIds: string[]) => void; color?: string }>
   - defaultPageSize?: number (default 25)
   - stickyHeader?: boolean (default true)
   - filterParams?: ReturnType<typeof useFilterParams> (for URL sync)
   - defaultSort?: { field: string; sort: 'asc' | 'desc' }

   Built-in behavior:
   - Dark theme styling via MUI theme overrides
   - Pagination: 25 default, options [10, 25, 50, 100]
   - Sorting with URL param sync
   - Row hover highlight
   - Clickable rows (cursor: pointer when onRowClick provided)
   - Empty state using EmptyState component
   - Loading state using skeleton overlay
   - Error state using ErrorState component
   - Bulk selection: checkboxes + sticky bottom action bar
   - Column visibility toggle (using ColumnVisibilityMenu.tsx or DataGrid's built-in)

2. ADD global.css styles for .enterprise-table to match dark theme:
   Override MUI DataGrid's default styling for dark backgrounds.

3. DON'T replace existing tables yet — just build the component and
   export it. Create a simple usage example as a comment in the file.

Run the frontend build and verify.
```

---

### TASK 2.2 — Build Clickable KPI StatCard Component

**Priority:** P0 | **Depends on:** 0.2 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

Dashboard KPI cards are not clickable drilldowns (violates Law 9). Check what
exists in frontend/src/components/dashboard/ or in the dashboard route pages.

1. Look at how KPI cards are currently rendered:
   Open frontend/src/routes/dashboard/DashboardPage.tsx and the role-specific
   dashboard pages. Find the KPI/stat card rendering pattern.

2. CREATE frontend/src/components/dashboard/StatCard.tsx:

   Props:
   - label: string ("Staffing Gaps")
   - value: string | number (4)
   - href: string (REQUIRED — drilldown link, e.g., "/staffing-requests?status=open")
   - delta?: { value: number; direction: 'up' | 'down' | 'stable'; label?: string }
   - threshold?: { warning: number; danger: number; above?: boolean }
     (determines left-border color: green/amber/red)
   - icon?: React.ElementType (MUI icon)
   - loading?: boolean (shows MUI Skeleton)

   Use MUI: Card, CardActionArea, Typography, Box + react-router Link.
   Entire card is clickable (CardActionArea wrapping Link).

   Design (dark theme):
   - Card background: var(--color-surface) / MUI theme surface
   - Left border: 3px solid based on threshold
   - Label: body2 muted color
   - Value: h4 bold
   - Delta: caption, green/red/gray with ↑/↓/→ arrow
   - Hover: elevated shadow

   If href is missing, log console.warn in development mode (Law 9 enforcement).

3. REPLACE the existing KPI card rendering in PM Dashboard
   (frontend/src/routes/dashboard/ProjectManagerDashboardPage.tsx) with StatCard.
   Wire each card's href to the appropriate filtered list page.
   Do the same for DashboardPage.tsx if it has KPI cards.

Add .stat-card-* styles in global.css.
Run the build and verify cards are clickable.
```

---

### TASK 2.3 — Build Inspector Panel for Master-Detail Workflows

**Priority:** P1 | **Depends on:** 1.2, 1.3 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Many workflows need a master-detail layout: select item from list, see detail
in a side panel without losing list context. Build this as a reusable component.

1. CREATE frontend/src/components/layout/InspectorPanel.tsx:

   Props (generic over T):
   - selectedItem: T | null
   - onClose: () => void
   - title: (item: T) => string
   - subtitle?: (item: T) => string
   - sections: Array<{ label: string; render: (item: T) => ReactNode; loading?: boolean }>
   - actions: Array<{
       label: string; variant: 'primary' | 'secondary' | 'destructive';
       icon?: React.ElementType; onClick: (item: T) => void;
       requiresConfirm?: boolean; confirmMessage?: string;
     }>
   - emptyState?: ReactNode
   - onNext?: () => void
   - onPrevious?: () => void
   - width?: string (default "60%")

   Use MUI: Box, Typography, Button, IconButton, Divider, Skeleton.

   Layout:
   ```
   [Title          [←] [→] [×]]
   [Subtitle                   ]
   [――――――――――――――――――――――――――――]
   [Section 1 Label            ]
   [section 1 content          ]
   [――――――――――――――――――――――――――――]
   [Section 2 Label            ]
   [section 2 content          ]
   [――――――――――――――――――――――――――――]
   [[Action 1] [Action 2]      ]
   ```

   Behavior:
   - Slides in from right (300ms CSS transition)
   - ← / → arrows for previous/next item (keyboard: j/k or ↑/↓)
   - × close button + Escape key
   - Actions with requiresConfirm use InlineConfirm
   - Loading sections show MUI Skeleton

2. CREATE frontend/src/components/layout/MasterDetailLayout.tsx:

   Splits the page into list (left) + inspector (right):
   ```
   +------ list (40%) -------+---- inspector (60%) ----+
   ```
   When nothing selected, list takes full width.
   When selected, splits with smooth transition.

   Props:
   - listContent: ReactNode
   - inspectorProps: InspectorPanelProps<T>
   - listWidth?: string (default "40%")

3. Add .inspector-panel-*, .master-detail-* styles in global.css.

Run the build and verify.
```

---

### TASK 2.4 — Enhance Command Palette

**Priority:** P1 | **Depends on:** 0.1 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

frontend/src/components/common/CommandPalette.tsx already exists with cmdk.
It searches pages, people, and projects. Enhance it.

1. OPEN frontend/src/components/common/CommandPalette.tsx and ADD:

   a. ACTIONS CATEGORY: Add "Create assignment", "Create staffing request",
      "Submit timesheet", "Create project" as action commands. Each should
      navigate to the appropriate creation page/form. Filter by user role.

   b. KEYBOARD SHORTCUT DISPLAY: Show shortcut badges on items that have
      keyboard shortcuts (e.g., "g p" next to "Projects").

   c. RECENT ITEMS IMPROVEMENT: The component already tracks recent pages
      in localStorage. Make sure recent items appear at the TOP of results
      when the search query is empty.

   d. VISUAL POLISH: Check the .command-palette-* CSS classes in global.css.
      If they look incomplete, improve them: proper dark theme, highlight
      on selected item, category headers styled.

2. OPEN frontend/src/components/layout/AppShell.tsx:
   The Cmd+K shortcut is already wired up here. Verify it works correctly.
   If it doesn't open the palette, debug the event listener.

3. REGISTER more keyboard shortcuts in AppShell.tsx for navigation:
   Add a simple key sequence handler for:
   - g then d: navigate to dashboard
   - g then p: navigate to /projects
   - g then a: navigate to /assignments
   - g then t: navigate to /timesheets
   - g then e: navigate to /exceptions

   Use a simple two-key combo: on first 'g' press, set a flag with 500ms
   timeout. On second keypress within 500ms, navigate. Don't fire when
   focused in an input/textarea.

Run the build and verify the palette opens with Ctrl+K and shows all categories.
```

---

### TASK 2.5 — Build Anomaly Strip + "What Needs You Now" Widget

**Priority:** P1 | **Depends on:** 2.2 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Build two dashboard-level components that surface urgent items.

1. CREATE frontend/src/components/dashboard/AnomalyStrip.tsx:

   Props:
   - alerts: Array<{ id: string; severity: 'critical' | 'high'; message: string; href: string }>
   - onDismiss: (id: string) => void

   Only renders when alerts.length > 0. Full-width bar above KPI cards.
   Red background for critical, amber for high. Shows alert icon + message
   + "View all →" link. Dismiss button (× on right) suppresses per session
   (sessionStorage). Use MUI: Alert, Box, IconButton, Typography, Link.

2. CREATE frontend/src/components/dashboard/WhatNeedsYouNow.tsx:

   Props:
   - items: Array<{
       id: string;
       severity: 'overdue' | 'due-today' | 'due-this-week' | 'info';
       message: string;
       actionLabel: string;
       actionHref: string;
     }>
   - loading?: boolean
   - maxItems?: number (default 5)

   Card with header "What Needs You Now" + [View all] link.
   Items sorted by severity. Each row: icon + message + action button.
   Empty state: "You're all caught up" with MUI CheckCircleOutline icon.

   Use MUI: Card, CardHeader, List, ListItem, ListItemIcon, ListItemText,
   Button, Typography, Chip.

3. CREATE frontend/src/hooks/useWhatNeedsYouNow.ts:

   Hook that aggregates urgencies for the current role. Check which API
   modules exist in frontend/src/lib/api/:
   - dashboard-project-manager.ts (PM KPIs)
   - dashboard-resource-manager.ts (RM KPIs)
   - dashboard-director.ts (Director KPIs)
   - dashboard-hr-manager.ts (HR KPIs)
   - dashboard-delivery-manager.ts (DM KPIs)
   - dashboard-employee.ts (Employee KPIs)

   Call the appropriate API based on the user's role (from useAuth()).
   Transform the response into ActionItem format. If the API doesn't return
   enough data, return mock/placeholder items.

4. ADD both components to the PM Dashboard page
   (frontend/src/routes/dashboard/ProjectManagerDashboardPage.tsx).
   Place AnomalyStrip at the very top, WhatNeedsYouNow below it, above KPIs.

Add styles in global.css. Run the build and verify.
```

---

### TASK 2.6 — Build Unified Status Badge Component

**Priority:** P1 | **Depends on:** 0.2 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

Status indicators are inconsistent: colored circles, text badges, MUI Chips
with different colors across pages. Build ONE component.

1. CREATE frontend/src/components/common/StatusBadge.tsx:

   Props:
   - status: string
   - variant?: 'dot' | 'chip' | 'text' (default 'chip')
   - size?: 'small' | 'medium' (default 'small')

   Built-in color mapping using CSS variables:
   - active, open, approved, healthy -> green (var(--color-status-active))
   - in_progress, pending, submitted -> blue (var(--color-accent))
   - warning, at_risk, needs_attention -> amber (var(--color-status-warning))
   - critical, rejected, overdue, closed -> red (var(--color-status-danger))
   - draft, planned, cancelled -> gray (var(--color-status-neutral))

   Variants:
   - dot: small colored circle (8px) + text
   - chip: MUI Chip with colored background
   - text: just colored text, no background

   Normalize status strings: handle snake_case, camelCase, UPPERCASE.

2. DON'T replace existing status displays yet — this is just creating the
   component. Document the existing patterns found in the codebase
   (search for Chip, status, badge, indicator in components/) as TODO items.

Add .status-badge-* styles in global.css. Run the build.
```

---

### TASK 2.7 — Build Data Freshness Footer

**Priority:** P2 | **Depends on:** 0.2 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

Dashboards should show when data was last refreshed.

1. CREATE frontend/src/components/dashboard/DataFreshness.tsx:

   Props:
   - lastUpdated?: Date | null
   - onRefresh: () => void
   - isRefreshing: boolean

   Sticky bottom bar on dashboards. Shows "Data as of: Apr 12, 2026 15:30"
   with a Refresh button (MUI IconButton with RefreshOutlined).
   Stale data (>30 min) shows amber warning. Failed refresh shows red.

   Use MUI: Box, Typography, IconButton, CircularProgress.
   Use format-date.ts for formatting.

2. ADD to all dashboard pages. Wire onRefresh to reload the page's data.

Add styles in global.css. Run the build.
```

---

## PHASE 3: PAGE-LEVEL UPGRADES

### TASK 3.1 — Rebuild PM Dashboard with 7-Zone Layout

**Priority:** P0 | **Depends on:** 2.2, 2.5, 2.7 | **Est:** 2-3 sessions

```
PROMPT FOR CLAUDE CODE:

Rebuild frontend/src/routes/dashboard/ProjectManagerDashboardPage.tsx
following the 7-zone canonical dashboard layout.

Read the file first to understand the current implementation and what
API data is available (check frontend/src/lib/api/dashboard-project-manager.ts).

TARGET LAYOUT (top to bottom):
1. ZONE 1: <AnomalyStrip> — critical exceptions (conditional, only if alerts exist)
2. ZONE 2: <WhatNeedsYouNow> — top 3-5 action items for this PM
3. ZONE 3: KPI Row — 4-5 <StatCard> components, ALL clickable drilldowns:
   - Active Projects -> /projects?status=active
   - Staffing Gaps -> /staffing-requests?status=open
   - Team Size -> /people?manager={currentUserId}
   - Pending Approvals -> /timesheets/approval?status=pending
   - Exceptions -> /exceptions
   Each with delta (vs last period) and threshold coloring.
4. ZONE 4: Tabs (MUI Tabs) — [Overview] [Staffing] [Timeline]
5. ZONE 5: Primary content — use DashboardGrid for responsive layout.
   Charts from recharts (keep existing charts if they work, just improve layout).
6. ZONE 6: Projects table — show PM's projects with health, staffing %, actions.
   Use EnterpriseTable or existing DataGrid.
7. ZONE 7: <DataFreshness> — sticky bottom bar

IMPORTANT: Keep all existing API calls and data. Only restructure the layout
and add the new components. Don't break working functionality.

Run the build and verify the dashboard renders correctly.
```

---

### TASK 3.2 — Upgrade Timesheet: Auto-Fill Default + Better Submit

**Priority:** P1 | **Depends on:** 1.5, 1.6, 1.9 | **Est:** 1-2 sessions

```
PROMPT FOR CLAUDE CODE:

Open frontend/src/routes/timesheets/TimesheetPage.tsx. It's a complex component
with weekly grid, auto-populate from assignments, and submit flow.

CHANGES:

1. AUTO-FILL BY DEFAULT:
   The page has an "Auto-populate from assignments" feature. Find where this
   is triggered (currently requires a button click). Change it to auto-execute
   on page load when the timesheet is in DRAFT status and has no entries yet.
   Keep the manual button as "Refresh from assignments" for re-sync.

2. SUBMIT FLOW:
   Find the submit action. Replace with InlineConfirm:
   "Submit [total]h for week of [date range]? [Submit] [Cancel]"
   After submit success: show NextAction "Timesheet submitted" ->
   [View next week] [Back to Dashboard]

3. VISUAL IMPROVEMENTS (if not already present):
   - Current day column: subtle highlight (different background)
   - Weekend columns: slightly muted background
   - Hours > 8 per day: amber cell background
   - Hours > 12 per day: red cell background
   - "Unsaved changes" indicator when edits exist

4. FIX date formats: ensure all dates in the timesheet use format-date.ts.

Run the build and verify.
```

---

### TASK 3.3 — Build Timesheet Approval Queue with Inspector

**Priority:** P1 | **Depends on:** 2.3 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Open frontend/src/routes/timesheets/TimesheetApprovalPage.tsx.
Upgrade it to use MasterDetailLayout with InspectorPanel.

1. Read the current implementation. Understand what API it calls
   (check frontend/src/lib/api/timesheets.ts for approval endpoints).

2. UPGRADE to MasterDetailLayout:
   - LEFT: List of pending timesheets (person name, week, total hours)
   - RIGHT: InspectorPanel showing the selected timesheet details

3. INSPECTOR SECTIONS:
   - "Submitted Hours": Read-only grid showing hours per project per day
   - "Comparison": Submitted hours vs assigned allocation
   - "Anomalies": Flag unusual entries (weekend hours, >10h days, etc.)

4. INSPECTOR ACTIONS:
   - [Approve] (primary) — approves, auto-advances to next pending
   - [Request Revision] (secondary) — opens inline comment field
   - [Reject] (destructive with InlineConfirm)

5. AUTO-ADVANCE: After approve, select next pending. Show counter "1 of N".
   When all done: "All timesheets approved" empty state.

Run the build and verify.
```

---

### TASK 3.4 — Upgrade Exceptions Page with Inspector + Inline Resolve

**Priority:** P1 | **Depends on:** 2.3 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Open frontend/src/routes/exceptions/ExceptionsPage.tsx.
It already has a filter system and detail panel. Upgrade to use
MasterDetailLayout + InspectorPanel.

1. Read the current implementation. Check:
   - frontend/src/lib/api/exceptions.ts for available API endpoints
   - frontend/src/components/exceptions/ for existing sub-components
   - frontend/src/features/exceptions/ for feature hooks

2. UPGRADE to MasterDetailLayout:
   - LEFT: Exception list sorted by severity, with color-coded left borders
   - RIGHT: InspectorPanel for selected exception

3. INSPECTOR SECTIONS:
   - "Description": Full exception details
   - "Related Context": Show person, project, assignment info as inline
     cards (NOT as links that navigate away). Use the API to load related
     entity data and display it in-panel.
   - "Evidence": Work evidence data that triggered the exception
   - "History": Previous similar exceptions and their resolutions

4. INSPECTOR ACTIONS:
   - [Resolve] — with resolution type dropdown (create assignment, adjust, etc.)
   - [Suppress: False Positive] — InlineConfirm with required reason
   - [Escalate] — route to director

5. After resolution: remove from list (optimistic), auto-select next.
   Show "Resolve all N similar" for bulk operations if applicable.

Run the build and verify.
```

---

### TASK 3.5 — Upgrade Staffing Requests with Inspector Panel

**Priority:** P1 | **Depends on:** 2.3 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Find the staffing requests page in frontend/src/routes/staffing-requests/.
Check the API at frontend/src/lib/api/staffing-requests.ts.
Upgrade to MasterDetailLayout.

1. Read current implementation and available API data.

2. UPGRADE to MasterDetailLayout:
   - LEFT: Request list sorted by priority/age
   - RIGHT: InspectorPanel for selected request

3. INSPECTOR SECTIONS:
   - "Project Context": project name, dates, team size
   - "Role Details": title, allocation %, duration, skills needed
   - "Candidates": Use PersonSelect or the person-directory API to suggest
     available people. Show name, utilization, skills match.
   - "Current Team": people already assigned to this project

4. INSPECTOR ACTIONS:
   - [Propose Candidate] — person picker + confirm
   - [Escalate] — route to director
   - [Close Request] — InlineConfirm

5. After filling: NextAction [View assignment] [Fill next request].
   Auto-advance to next open request.

Run the build and verify.
```

---

### TASK 3.6 — Upgrade Projects Detail with Inline Actions

**Priority:** P1 | **Depends on:** 1.5, 1.6, 2.2 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Open frontend/src/routes/projects/ProjectDashboardPage.tsx (the project detail).
Check what tabs and data it shows. Also check ProjectsPage.tsx (the list).

UPGRADE:

1. HEADER CARD:
   Add a Quick Actions row below the project name:
   [Create Staffing Request] [Quick Assign] [Export Report]
   These buttons should only render if the user's role permits them.
   Check auth context for role.

2. KPI ROW:
   Add 4 StatCards below the header: Budget Status, Staffing Coverage,
   Evidence Freshness, Days Remaining. Each clickable (drill into the
   relevant tab on this same page).

3. INLINE ACTIONS:
   In the staffing/team tab: each member row should have hover actions
   [Adjust allocation] [End assignment] using InlineConfirm for destructive ones.

   Any "Create staffing request" action should open a drawer (MUI Drawer)
   pre-filled with the current project context, not navigate to a new page.

4. CONTEXT PRESERVATION:
   After any action (drawer submit, inline edit), stay on the project detail.
   Show success toast (sonner) with NextAction suggestions.

Run the build and verify.
```

---

### TASK 3.7 — Upgrade People Directory + Person 360

**Priority:** P1 | **Depends on:** 2.1, 1.7 | **Est:** 1-2 sessions

```
PROMPT FOR CLAUDE CODE:

Find the people directory page in frontend/src/routes/people/ and the
Person 360 detail page. Check frontend/src/lib/api/person-directory.ts.

1. DIRECTORY PAGE:
   - If using DataTable, consider switching to EnterpriseTable for sort/paginate/bulk
   - Default page size: 25 (not 10)
   - Add FilterBar with: search, department, status, utilization range
   - Add "Show my team" toggle (filter to people under current user)
   - Row click -> navigate to Person 360

2. PERSON 360 DETAIL:
   - Ensure the Overview tab shows assignments + utilization ABOVE THE FOLD
   - Add Previous/Next navigation arrows for moving between people in
     the filtered list (store filtered IDs in sessionStorage)
   - Add breadcrumb: "People (3 of 32 filtered) / Ethan Brooks"

3. Connect all filters to URL params via useFilterParams.

Run the build and verify.
```

---

## PHASE 4: ADVANCED WORKFLOWS

### TASK 4.1 — Upgrade Director Dashboard

**Priority:** P2 | **Depends on:** 3.1, 2.5 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Open frontend/src/routes/dashboard/DirectorDashboardPage.tsx.
Check frontend/src/lib/api/dashboard-director.ts for available data.
Rebuild with 7-zone layout.

ZONE 1: AnomalyStrip (critical project alerts, budget overruns)
ZONE 2: WhatNeedsYouNow (critical projects, budget issues, stale staffing requests)
ZONE 3: KPI Cards: Headcount, Org Utilization, Budget %, Projects At Risk, Exceptions
ZONE 4: Tabs [Overview] [Projects] [People] [Budget]
ZONE 5: Charts (project health distribution, utilization trend)
ZONE 6: Projects table sorted by health (worst first)
ZONE 7: DataFreshness

This is the SCAN dashboard — director identifies top 3 actions in 10 seconds.
Bold numbers, red/amber indicators, clear clickable paths.

Run the build and verify.
```

---

### TASK 4.2 — Upgrade Resource Manager Dashboard

**Priority:** P2 | **Depends on:** 3.1, 2.5 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Open frontend/src/routes/dashboard/ResourceManagerDashboardPage.tsx.
Check frontend/src/lib/api/dashboard-resource-manager.ts.
Rebuild with 7-zone layout.

KPI Cards: Total People, Avg Utilization, Open Staffing Requests,
Over-Allocated Count, Assignments Ending Soon.

Primary content: Utilization distribution chart (horizontal bars sorted by
utilization descending, color-coded by band). Right panel: top staffing requests.

Table: People in RM's pool with utilization indicators.

Run the build and verify.
```

---

### TASK 4.3 — Build Saved Views System

**Priority:** P2 | **Depends on:** 1.7 | **Est:** 1-2 sessions

```
PROMPT FOR CLAUDE CODE:

Build a saved views system for filter presets on list pages.

1. CREATE frontend/src/hooks/useSavedViews.ts:

   Uses localStorage (key: `saved-views-${pathname}`).
   - getSavedViews(): SavedView[]
   - saveView(name, params): SavedView
   - deleteView(id): void
   - setDefault(id): void

2. ADD "Save view" button to FilterBar:
   Small popover with name input + Save button.
   Saved views appear as clickable chips above the filter bar.
   Clicking a chip applies its filter params to the URL.

3. Apply to 2-3 key list pages as proof of concept.

Run the build and verify.
```

---

### TASK 4.4 — Build Entity Previous/Next Navigation

**Priority:** P2 | **Depends on:** 1.7 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

When navigating from a filtered list to a detail, add Previous/Next arrows.

1. CREATE frontend/src/hooks/useEntityNavigation.ts:

   On list pages: when clicking a row, store the filtered entity IDs in
   sessionStorage before navigating.
   On detail pages: read the stored IDs, compute previous/next.

2. CREATE frontend/src/components/common/EntityNav.tsx:

   Renders: [← Previous] [3 of 12] [Next →]
   Keyboard: Alt+Left, Alt+Right.
   Uses MUI: IconButton, Typography, Box.

3. Add to Project detail page and Person 360 page.

Run the build and verify.
```

---

## PHASE 5: ACCESSIBILITY AND TESTING

### TASK 5.1 — Accessibility Fixes: Focus, ARIA, Contrast

**Priority:** P0 | **Depends on:** 0.2 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

The accessibility score is 2.5/10. Fix critical WCAG 2.2 AA issues.

1. FOCUS RINGS:
   In frontend/src/styles/global.css, add:
   *:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
   Verify it doesn't get overridden by MUI styles.

2. ARIA LANDMARKS:
   Open frontend/src/components/layout/AppShell.tsx:
   - Wrap sidebar in <nav aria-label="Main navigation">
   - Wrap content in <main>
   - Add aria-live="polite" to toast container

   Open SidebarNav.tsx:
   - Add role="navigation" if not using <nav>
   - Add aria-current="page" to active nav item

3. CONTRAST CHECK:
   Review global.css dark theme colors. Verify text colors pass 4.5:1
   against their backgrounds. Common issues:
   - Muted text on dark backgrounds
   - Placeholder text in inputs
   - Breadcrumb text
   Bump to lighter shades where needed.

4. TABLE ACCESSIBILITY:
   Find DataTable.tsx and VirtualTable.tsx — add <caption> (visually hidden),
   scope="col" on <th>, aria-sort on sortable headers.

5. SKIP LINK:
   In AppShell.tsx, add "Skip to main content" as first focusable element.

Run the build. If axe-core is available, run it.
```

---

### TASK 5.2 — Set Up Playwright UX Law Tests

**Priority:** P1 | **Depends on:** Phase 3 | **Est:** 2-3 sessions

```
PROMPT FOR CLAUDE CODE:

Playwright is already configured (e2e/ directory, playwright.config.ts).
Add UX law enforcement tests.

1. CREATE e2e/ux-laws/ directory with these test files:

   filter-persistence.spec.ts:
   For each major list page: apply filter -> navigate to detail -> go back
   -> assert URL params preserved.

   kpi-drilldown.spec.ts:
   On PM dashboard: find all stat cards -> assert each is a link -> click
   -> assert navigation to filtered page.

   error-recovery.spec.ts:
   Mock API errors -> load pages -> assert retry button visible.

   loading-states.spec.ts:
   Slow network mock -> assert skeletons visible before data.

   empty-states.spec.ts:
   Mock empty responses -> assert EmptyState component renders with action.

2. CREATE e2e/helpers/login.ts:
   Helper to log in as any role using the demo accounts
   (check prisma/seed.ts for test user credentials).

3. ADD script to package.json: "test:ux": "playwright test e2e/ux-laws/"

Run the tests. Document which pass and which fail.
```

---

### TASK 5.3 — Add axe-core Accessibility Tests

**Priority:** P1 | **Depends on:** 5.1 | **Est:** 1 session

```
PROMPT FOR CLAUDE CODE:

Install @axe-core/playwright and add a11y tests.

npm install -D @axe-core/playwright

CREATE e2e/accessibility/a11y.spec.ts:

For each major page, run axe-core with WCAG 2.2 AA tags and assert
zero critical violations. Test at minimum: login, dashboard, projects,
people, assignments, exceptions, timesheets, staffing-requests, cases.

Use the login helper from e2e/helpers/login.ts to authenticate first.

Run the tests and document all violations found.
```

---

## PHASE 6: POLISH

### TASK 6.1 — Notification System Overhaul

**Priority:** P2 | **Depends on:** Phase 1 | **Est:** 1-2 sessions

```
PROMPT FOR CLAUDE CODE:

The notification toast persists indefinitely blocking content.
Sonner (already installed) should handle this properly.

1. FIND all toast/notification calls in the codebase.
   Search for: toast(, toast.success, toast.error, any custom notification
   system, and the NotificationBell component.

2. ENSURE all toasts use sonner properly:
   - Success toasts: auto-dismiss 5 seconds
   - Error toasts: auto-dismiss 8 seconds, with close button
   - Position: top-right, max 3 visible, stack vertically

3. UPGRADE frontend/src/components/layout/NotificationBell.tsx:
   Check frontend/src/lib/api/notifications.ts for available endpoints.
   - Show more than 2 items (scrollable list, at least 10)
   - Group by: Today, Yesterday, This Week
   - Mark as read (individual + mark all)
   - Unread count badge on bell icon
   - Click notification -> navigate to relevant page

Run the build and verify toasts auto-dismiss.
```

---

### TASK 6.2 — Migrate Hardcoded Colors to CSS Variables

**Priority:** P2 | **Depends on:** 0.2 | **Est:** 2 sessions

```
PROMPT FOR CLAUDE CODE:

Search frontend/src/components/ and frontend/src/routes/ for hardcoded color
values: hex (#xxx), direct color names in inline styles, sx={{color: '...'}}
props with literal values.

Replace each with the appropriate CSS variable or MUI theme token.
Before/after should look identical. Run build and verify.
```

---

## DEPENDENCY GRAPH

```
PHASE 0 ─── 0.1 ──── 0.2 (tokens)
                │
PHASE 1 ──┬─ 1.1 (RBAC fix)
           ├─ 1.2 (skeletons)
           ├─ 1.3 (error states)
           ├─ 1.4 (empty states)
           ├─ 1.5 (inline confirm)
           ├─ 1.6 (next action)
           ├─ 1.7 (filter persistence) ── 1.8 (breadcrumbs)
           └─ 1.9 (dates)

PHASE 2 ──┬─ 2.1 (enterprise table)
           ├─ 2.2 (stat card)
           ├─ 2.3 (inspector panel)
           ├─ 2.4 (command palette upgrade)
           ├─ 2.5 (anomaly strip + what needs you now)
           ├─ 2.6 (status badge)
           └─ 2.7 (data freshness)

PHASE 3 ──┬─ 3.1 (PM dashboard) ← needs 2.2, 2.5, 2.7
           ├─ 3.2 (timesheet) ← needs 1.5, 1.6
           ├─ 3.3 (timesheet approval) ← needs 2.3
           ├─ 3.4 (exceptions) ← needs 2.3
           ├─ 3.5 (staffing requests) ← needs 2.3
           ├─ 3.6 (projects detail) ← needs 1.5, 1.6, 2.2
           └─ 3.7 (people directory) ← needs 2.1, 1.7

PHASE 4 ──── (all after Phase 3)
PHASE 5 ──── 5.1 (a11y) can run anytime; 5.2-5.3 after Phase 3
PHASE 6 ──── (polish, anytime after Phase 2)
```

---

## QUICK WIN SEQUENCE (maximum impact, fastest)

1. **0.1** — CLAUDE.md (5 min, makes every session smarter)
2. **0.2** — Design tokens audit (foundation)
3. **1.1** — RBAC fix (removes #1 frustration)
4. **1.2** — Skeletons (whole app feels polished)
5. **1.3** — Error states (no more raw strings)
6. **1.7** — Filter persistence (biggest QoL win)
7. **2.2** — StatCard (dashboards become actionable)
8. **2.4** — Command palette enhancement (already 80% done)
9. **3.1** — PM Dashboard rebuild (most visible impact)
10. **5.1** — Accessibility basics (focus rings + ARIA)

---

## NOTES FOR CLAUDE CODE SESSIONS

- **Start each session** by telling Claude Code to read CLAUDE.md
- **Run `cd frontend && npm run build` after every task** — build failure = world ends
- **One task = one Claude Code session** (use /compact if context grows)
- **After each task**, update a PROGRESS.md in the project root
- **The app uses MUI, not shadcn/ui** — if Claude Code tries to install shadcn, stop it
- **CSS goes in global.css** using CSS custom properties, not Tailwind utilities
- **Test in browser** at localhost:5173 after each change (npm run dev in frontend/)
- **Login credentials**: check prisma/seed.ts for demo users per role
