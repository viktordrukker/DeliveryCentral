# Workload Tracking Platform: Full UI/UX QA + Design System Foundation Package

**Version:** 1.0.0
**Date:** 2026-04-11
**Audit Scope:** All implemented routes, modules, and workflows at localhost:5173
**Auditor Role:** Principal UI/UX QA Engineer, Enterprise Design System Architect, UX Governance Lead

---

## SECTION 1 --- EXECUTIVE UX QA DIAGNOSTIC

### 1.1 Maturity Scores

| Dimension | Score (1-10) | Assessment |
|---|---|---|
| Overall UX Maturity | 3.5 | Functional prototype stage; foundational patterns exist but are inconsistent across modules |
| Enterprise Readiness | 3 | RBAC routing exists but error handling, empty states, and governance flows are incomplete |
| Scalability | 4 | Component reuse is emerging (cards, tables, filters) but no token system or component contracts |
| Design Debt | 7 (high debt) | Inconsistent spacing, mixed component patterns, no loading skeletons, weak error states |
| Accessibility | 2.5 | Dark theme with potential contrast issues, no visible focus rings, no ARIA landmarks observed |

### 1.2 Top 20 UX Risks

| # | Risk | Severity | Module |
|---|---|---|---|
| 1 | **RBAC errors shown as raw error strings** ("Insufficient role for this operation") with no recovery path | CRITICAL | Dashboard, Planned vs Actual |
| 2 | **No loading skeletons anywhere** --- content appears or errors appear instantly with no transition | CRITICAL | All modules |
| 3 | **Sidebar navigation shows items user cannot access** --- clicking yields Access Denied | CRITICAL | My Dashboard, Dashboard |
| 4 | **No breadcrumbs on most pages** --- only visible on Project detail and Person 360 | HIGH | Most modules |
| 5 | **Date format inconsistency** --- DD.MM.YYYY in some places, YYYY-MM-DD in others, locale-mixed placeholders (ДД.ММ.ГГГГ) | HIGH | Assignments, Work Evidence, Timesheet |
| 6 | **No empty state illustrations or guidance** --- tables show blank space or generic text | HIGH | Timesheet, Dashboard |
| 7 | **Notification toast persists indefinitely** ("You have new notifications") blocking content | HIGH | All pages |
| 8 | **Page header bar says "Dashboard" on non-dashboard pages** (e.g., Project detail, Person 360) | HIGH | Project detail, Person 360 |
| 9 | **No confirmation dialogs for destructive actions** --- "Close project", "Remove" member buttons appear to act immediately | HIGH | Projects, Teams |
| 10 | **Tables lack row hover states and click affordances** --- unclear which rows are clickable | HIGH | People, Projects, Assignments |
| 11 | **Filter bar layout inconsistency** --- different filter components, widths, and arrangements on every page | MEDIUM | All list pages |
| 12 | **Action buttons (Export XLSX, Create) have no consistent placement or hierarchy** | MEDIUM | All list pages |
| 13 | **Health indicators on Projects table are emoji-like circles with no legend or tooltip** | MEDIUM | Projects |
| 14 | **KPI cards on PM Dashboard lack click-through or drilldown** | MEDIUM | PM Dashboard |
| 15 | **Timesheet has no visual feedback for unsaved changes** | MEDIUM | Timesheet |
| 16 | **Staffing Requests table has colored role text with no semantic meaning explained** | MEDIUM | Staffing Requests |
| 17 | **Org Chart cards use red/yellow borders with no documented color semantics** | MEDIUM | Org Chart |
| 18 | **Report Builder preview uses placeholder "(sample value)" with no real data preview** | MEDIUM | Report Builder |
| 19 | **Multiple error message styles** --- yellow-bg "Something went wrong", white "Access denied", standard 404 | LOW | Various |
| 20 | **Sidebar collapse arrow at bottom lacks tooltip and is easy to miss** | LOW | App Shell |

### 1.3 Top 20 Usability Bottlenecks

| # | Bottleneck | Impact | Who it affects |
|---|---|---|---|
| 1 | PM must navigate through 4+ clicks to understand staffing gaps across projects | High | PM, RM |
| 2 | No command palette or global search for quick navigation | High | All roles |
| 3 | Dashboard shows error instead of role-appropriate content --- PM must manually go to PM Dashboard | High | PM |
| 4 | Timesheet requires manual row addition even when assignments exist (auto-fill is a separate action) | High | Employee |
| 5 | Exception queue has no bulk resolution --- each exception requires individual Resolve/Suppress | High | Admin, DM |
| 6 | Assignments table shows 22 items with no pagination controls visible | Medium | PM, RM |
| 7 | People directory pagination (10 per page, 32 total) is too low for enterprise scanning | Medium | HR, RM |
| 8 | No saved filter presets on any list page | Medium | All roles |
| 9 | Project detail tabs require scrolling back up to see header context | Medium | PM |
| 10 | Teams page has no search/filter for large member lists | Medium | RM, HR |
| 11 | Work Evidence form is above the evidence list, pushing the list below the fold | Medium | PM, Employee |
| 12 | Utilization chart shows very small bars (0-5% range) with no drill-down on click | Medium | RM, DM |
| 13 | No export options besides XLSX --- no PDF, no CSV | Medium | All roles |
| 14 | Notification dropdown has only 2 items visible --- no way to see historical notifications | Medium | All roles |
| 15 | Staffing Requests have no inline expand for details | Medium | RM, PM |
| 16 | Org Chart has no list/table alternate view for accessibility | Medium | HR, Admin |
| 17 | Budget tab on Project detail not verified (likely placeholder) | Medium | PM, Finance |
| 18 | No keyboard shortcut indicators anywhere in the UI | Low | Power users |
| 19 | "Create assignment" opens inline --- no multi-step wizard for complex assignments | Low | PM, RM |
| 20 | Evidence tab on Project detail uses same error pattern as Timeline --- data not loading | Low | PM |

### 1.4 Architectural UI Inconsistencies

**Layout inconsistency:** The page header banner (gradient bar) shows different contextual titles --- sometimes it matches the page ("Projects"), sometimes it defaults to "Dashboard" even on non-dashboard pages (Project detail, Person 360). This breaks user orientation.

**Card system fragmentation:** KPI stat cards on PM Dashboard use one pattern (title + number), Project detail uses a different card pattern (value + label), Person 360 uses yet another. No unified stat-card component exists.

**Table implementation divergence:** Projects table has Health column with colored circles; People table has green ACTIVE badges; Assignments table has plain text "Active" status; Cases table has white OPEN badges. There are at least 4 different status indicator patterns.

**Filter bar chaos:** Every list page has a different filter arrangement, spacing, and component selection. Some use text inputs, some use dropdowns, some use date pickers. No unified FilterBar component contract exists.

**Action button placement:** "Export XLSX" and "Create X" buttons appear in the top-right of some pages but not others. Some pages group 3 buttons with inconsistent styling (outlined vs filled).

### 1.5 User Frustration Zones by Role

**Employee:** Lands on "Access Denied" My Dashboard. Has to find My Timesheet in sidebar. Timesheet shows empty grid with no guidance. Auto-fill button is non-obvious.

**Project Manager (current user):** Default Dashboard shows role error. Must know to click PM Dashboard. KPI cards are not clickable. Must manually navigate to Projects to see details. No aggregated view of their staffing gaps.

**Resource Manager:** People directory is paginated at 10 rows --- far too sparse for scanning a 500+ person org. No bulk assignment tools visible. Utilization chart shows near-zero bars with no filtering by team/pool.

**HR:** Cases page works but has no workflow stages visible. No case lifecycle visualization. Onboarding/offboarding progress is not tracked visually.

**Admin/Director:** Exception queue lacks prioritization signals. No executive summary dashboard. No cross-module KPI rollup.

---

## SECTION 2 --- DESIGN SYSTEM FOUNDATION

### 2.A Design Principles

**P1: Clarity Over Density**
Every screen must have one clear primary action and one clear data hierarchy. Dense tables are acceptable only when paired with proper column prioritization and scannable visual anchors.
*Implementation:* Max 6 columns visible by default in tables; secondary columns behind "Columns" toggle.

**P2: Progressive Disclosure**
Show summary first, detail on demand. Dashboards show KPIs; clicking drills into filtered lists. Lists show key columns; row click opens detail. Forms show required fields first; advanced fields behind toggle.
*Implementation:* All entity pages follow List > Detail > Edit flow.

**P3: Workflow-First Layouts**
Pages are organized around the job the user is trying to do, not around the data model. A PM's view of a project emphasizes staffing gaps and deadlines, not just metadata fields.
*Implementation:* Role-based landing pages with pre-filtered views.

**P4: Exception-First Visibility**
Anomalies, gaps, and overdue items are surfaced proactively. Normal states are de-emphasized. Red means "needs action now"; yellow means "needs attention soon."
*Implementation:* Dashboard KPI cards highlight exceptions. Tables sort anomalies to top.

**P5: Least-Click Principle**
The most common task for each role must be achievable within 2 clicks from the landing page. Quick actions (assign, approve, resolve) surface inline rather than requiring navigation.
*Implementation:* Contextual action buttons on table rows. Quick-action toolbar on dashboards.

**P6: Role-Sensitive Contextual Actions**
Buttons, menu items, and actions adapt to the user's role. A PM sees "Assign person"; an RM sees "Propose candidate"; an Employee sees "Request assignment change."
*Implementation:* RBAC-driven action rendering. Hidden actions never show then deny --- they simply don't appear.

**P7: Managerial Decision Acceleration**
Every dashboard widget answers one management question: "Do I need to act?" Provide signal, not just data. Use traffic-light indicators, trend arrows, and exception counts rather than raw numbers alone.
*Implementation:* Every KPI card includes delta indicator (up/down arrow + percentage change).

### 2.B Design Tokens

#### Spacing Scale (base unit: 4px)

| Token | Value | Usage |
|---|---|---|
| `space-0` | 0px | Reset |
| `space-1` | 4px | Tight inline spacing, icon-to-text gap |
| `space-2` | 8px | Input padding, badge padding, compact list gap |
| `space-3` | 12px | Card internal padding (compact), filter chip gap |
| `space-4` | 16px | Default card padding, form field gap, section spacing |
| `space-5` | 20px | Page section gap |
| `space-6` | 24px | Card padding (standard), column gutter |
| `space-8` | 32px | Section divider, major layout gaps |
| `space-10` | 40px | Page-level vertical rhythm |
| `space-12` | 48px | Hero/header vertical padding |
| `space-16` | 64px | Major section separation |

**MUST FIX NOW:** Current spacing is arbitrary --- cards use inconsistent padding, table cells vary. Adopt the 4px grid universally.

#### Typography Scale

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `text-xs` | 11px | 400 | 16px | Timestamps, metadata, badge text |
| `text-sm` | 13px | 400 | 20px | Table cells, filter labels, secondary text |
| `text-base` | 14px | 400 | 22px | Default body text, form labels |
| `text-md` | 15px | 500 | 24px | Card titles, table headers |
| `text-lg` | 18px | 600 | 28px | Section headings, page subtitle |
| `text-xl` | 22px | 600 | 32px | Page title |
| `text-2xl` | 28px | 700 | 36px | Dashboard KPI numbers |
| `text-3xl` | 36px | 700 | 44px | Hero stat numbers |

**Font family:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
**Monospace:** `'JetBrains Mono', 'Fira Code', 'Consolas', monospace` (for IDs, codes, technical values)

**MUST FIX NOW:** Current typography has no visible scale --- headings, body text, and labels appear to use arbitrary sizes.

#### Elevation (Box Shadow)

| Token | Value | Usage |
|---|---|---|
| `shadow-none` | none | Flat elements, inline elements |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.15)` | Cards, dropdowns on dark theme |
| `shadow-md` | `0 4px 8px rgba(0,0,0,0.2)` | Floating panels, notification dropdown |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.25)` | Modals, command palette |
| `shadow-xl` | `0 16px 48px rgba(0,0,0,0.3)` | Full-screen overlays |

#### Border Radii

| Token | Value | Usage |
|---|---|---|
| `radius-none` | 0px | Tables, full-width elements |
| `radius-sm` | 4px | Badges, chips, small buttons |
| `radius-md` | 6px | Cards, inputs, standard buttons |
| `radius-lg` | 8px | Modals, large cards |
| `radius-xl` | 12px | Hero cards, feature callouts |
| `radius-full` | 9999px | Avatars, pills, circular buttons |

**MUST FIX NOW:** Current UI uses inconsistent radii --- some cards look square, some have subtle rounding. Standardize all cards to `radius-md`.

#### Color Primitives (Dark Theme)

| Token | Value | Usage |
|---|---|---|
| `gray-950` | `#0a0e17` | App background |
| `gray-900` | `#111827` | Sidebar background |
| `gray-800` | `#1e2736` | Card background, input background |
| `gray-700` | `#2a3444` | Card border, table row hover |
| `gray-600` | `#3d4a5c` | Disabled state, dividers |
| `gray-500` | `#5a6578` | Placeholder text, secondary icons |
| `gray-400` | `#8492a6` | Secondary text, metadata |
| `gray-300` | `#b0bac9` | Body text |
| `gray-200` | `#d1d9e6` | Primary text, headings |
| `gray-100` | `#e8ecf2` | Emphasized text |
| `gray-50` | `#f5f7fa` | White-on-dark text, high emphasis |

#### Semantic Colors

| Token | Dark Value | Usage |
|---|---|---|
| `color-primary` | `#3b82f6` (Blue 500) | Primary buttons, links, active nav |
| `color-primary-hover` | `#2563eb` (Blue 600) | Primary button hover |
| `color-primary-muted` | `#1e3a5f` | Active nav background |
| `color-success` | `#22c55e` (Green 500) | Success states, healthy utilization, approved |
| `color-success-muted` | `#14532d` | Success badge background |
| `color-warning` | `#f59e0b` (Amber 500) | Warning states, overallocation, needs attention |
| `color-warning-muted` | `#78350f` | Warning badge background |
| `color-danger` | `#ef4444` (Red 500) | Error states, critical utilization, destructive actions |
| `color-danger-muted` | `#7f1d1d` | Error badge background |
| `color-info` | `#06b6d4` (Cyan 500) | Informational, links, tips |
| `color-neutral` | `#6b7280` (Gray 500) | Neutral states, draft, inactive |

#### Chart Palette (8 colors, distinguishable in dark theme)

| Slot | Color | Hex |
|---|---|---|
| 1 | Blue | `#3b82f6` |
| 2 | Emerald | `#10b981` |
| 3 | Amber | `#f59e0b` |
| 4 | Rose | `#f43f5e` |
| 5 | Violet | `#8b5cf6` |
| 6 | Cyan | `#06b6d4` |
| 7 | Orange | `#f97316` |
| 8 | Fuchsia | `#d946ef` |

#### Utilization Band Colors (already partially implemented)

| Band | Color | Hex | Meaning |
|---|---|---|---|
| 0-50% | Cyan/Light Blue | `#67e8f9` | Underutilized |
| 51-80% | Blue/Dark Blue | `#3b82f6` | Healthy |
| 81-100% | Green | `#22c55e` | Full |
| 101-120% | Orange | `#f97316` | Warning / Over-allocated |
| 121%+ | Red | `#ef4444` | Critical / Burnout risk |

#### Focus Ring

```
outline: 2px solid #3b82f6;
outline-offset: 2px;
```

**MUST FIX NOW:** No visible focus rings detected in current implementation. This is an accessibility violation.

#### Hover States
- Cards: `background-color` shifts from `gray-800` to `gray-700`; `border-color` shifts from `gray-700` to `gray-600`
- Table rows: `background-color` shifts to `gray-700` with `0.5s` transition
- Buttons: Darken by one shade; add subtle `shadow-sm`
- Links: Underline on hover; color shift to `color-primary-hover`

#### Disabled States
- Opacity: `0.5`
- Cursor: `not-allowed`
- No hover effects
- No focus ring
- Text color: `gray-500`

### 2.C Layout Grammar

#### Page Shell

```
+------------------------------------------+
| Top Header Bar (48px height, fixed)      |
|  [Platform name] [Env] [User] [Bell] [Sign Out] |
+------+-----------------------------------+
| Side | Page Banner (56px, gradient)      |
| bar  |   [Page Title]  [Description]     |
| 200px|-----------------------------------+
|      | Content Area (fluid)              |
|      |   max-width: 1600px              |
|      |   padding: 24px                  |
|      |                                   |
+------+-----------------------------------+
```

**MUST FIX NOW:** Current top header has no consistent height; elements (Environment, user name, role badge, sign out) are laid out without clear spacing rules.

#### Content Max Widths

| Context | Max Width | Rationale |
|---|---|---|
| Form-focused pages | 960px | Comfortable reading/input width |
| Table-focused pages | 100% (fluid) | Maximize data density |
| Dashboard pages | 1600px | Balance density with readability |
| Settings pages | 800px | Single-column forms |

#### Card System

**Standard Card:**
```
background: gray-800
border: 1px solid gray-700
border-radius: radius-md (6px)
padding: space-6 (24px)
margin-bottom: space-4 (16px)
```

**Stat Card (KPI):**
```
Same as standard card +
  display: flex
  flex-direction: column
  gap: space-1 (4px)
  .stat-label: text-sm, gray-400
  .stat-value: text-2xl, gray-50, font-weight-700
  .stat-delta: text-xs, color-success or color-danger
```

**DESIGN SYSTEM FOUNDATION:** Define three card variants: StatCard, ContentCard, ActionCard.

#### Grid Rules

| Layout | Grid | Usage |
|---|---|---|
| KPI row | 4-column equal | Dashboard stat cards |
| Two-column | 60/40 or 50/50 | Person 360, Exception Queue |
| Master-detail | 280px fixed / fluid | Teams, Exceptions |
| Full-width | Single column | Tables, Timesheets |

**Column gutter:** `space-6` (24px)
**Row gap:** `space-4` (16px)

#### Responsive Breakpoints

| Token | Width | Behavior |
|---|---|---|
| `bp-sm` | 640px | Sidebar collapses; single column |
| `bp-md` | 768px | Tables switch to card view |
| `bp-lg` | 1024px | Default desktop; sidebar visible |
| `bp-xl` | 1280px | Wide tables; analytics layout |
| `bp-2xl` | 1536px | Full enterprise density |

#### Sticky Action Bars

For pages with form submission or bulk actions:
```
position: sticky
bottom: 0
background: gray-900
border-top: 1px solid gray-700
padding: space-3 space-6
z-index: 10
```

**FUTURE EVOLUTION:** Implement sticky action bars on Timesheet submit, Assignments bulk actions, and Exception bulk resolution.

### 2.D Component Taxonomy

#### Buttons

| Variant | Style | Usage |
|---|---|---|
| Primary | Filled, `color-primary`, white text | One per page section. Create, Submit, Save. |
| Secondary | Outlined, `color-primary` border and text | Secondary actions. Export, View, Open. |
| Destructive | Filled `color-danger`, white text | Close project, Remove, Delete. Always requires confirmation dialog. |
| Ghost | No border, text only, hover shows bg | Tertiary actions. Cancel, Reset. |
| Icon-only | 32x32px, ghost style | Toolbar icons, table row actions. |

**Size tokens:** `btn-sm` (28px h), `btn-md` (36px h), `btn-lg` (44px h)

**MUST FIX NOW:** Current buttons mix outlined and filled styles without clear hierarchy. "Export XLSX" and "Create project" on Projects page have the same visual weight but different importance.

#### Tab Bars

```
border-bottom: 1px solid gray-700
gap: 0
[Tab] padding: space-2 space-4
  active: border-bottom 2px solid color-primary, text color-primary
  inactive: text gray-400, hover text gray-200
  disabled: text gray-600, no hover
```

**MUST FIX NOW:** Current tabs (Summary, Team, Timeline, etc.) use outlined box styling. Switch to underline tabs (Linear/Stripe pattern) for lower visual noise.

#### Breadcrumbs

```
text-sm, gray-400
separator: ">"
current page: gray-200, no link
hover: underline, color-primary
```

**MUST FIX NOW:** Breadcrumbs are only on 2 pages (Project detail, Person 360). Every page except the top-level landing pages must have breadcrumbs.

#### Page Headers

```
+------------------------------------------------+
| CATEGORY (text-xs, gray-500, uppercase)        |
| Page Title (text-xl, gray-50) [info icon]      |
|                          [Action buttons -->]  |
+------------------------------------------------+
```

**MUST FIX NOW:** The gradient page banner shows a title that doesn't always match the current page. Replace with a consistent page header component. The banner can remain as a decorative element but must always show the correct page context.

#### Data Tables

**Header row:**
```
background: transparent
text: text-sm, gray-400, font-weight-500
border-bottom: 1px solid gray-600
padding: space-2 space-4
position: sticky; top: 0
```

**Body row:**
```
text: text-sm, gray-200
border-bottom: 1px solid gray-700 (subtle)
padding: space-2 space-4
hover: background gray-700
cursor: pointer (if row is clickable)
transition: background 150ms ease
```

**Row actions:** Right-aligned, visible on hover or always-visible for critical actions.

**MUST FIX NOW:** Current tables have no hover states, no clear click affordance, and headers are not sticky.

#### Filter Bars

**Standard Filter Bar layout:**
```
+--------------------------------------------------+
| [Search___] [Dropdown v] [Date___] [Date___] [Reset] |
+--------------------------------------------------+
```

Rules:
- Text search always first (leftmost)
- Dropdowns next
- Date range last (before reset)
- Reset button always rightmost
- Filter bar background: `gray-800`, with `space-4` padding
- Gap between filters: `space-4`
- All filters same height: 36px

**DESIGN SYSTEM FOUNDATION:** Build a composable `FilterBar` component with standardized slots.

#### Stat Tiles (KPI Cards)

```
+-------------------+
| Label (text-sm)   |
| Value (text-2xl)  |
| Delta (text-xs)   |  <-- FUTURE: add trend indicator
+-------------------+
```

**States:** Default, Clickable (hover shadow), Alert (left-border accent color), Loading (skeleton pulse).

**MUST FIX NOW:** Current KPI cards on PM Dashboard lack click targets, delta indicators, and visual hierarchy.

#### Status Badges

| Status | Background | Text | Border |
|---|---|---|---|
| Active / Open | `success-muted` | `color-success` | none |
| Draft | `gray-700` | `gray-300` | none |
| Approved | `color-primary` bg muted | `color-primary` text | none |
| On Hold | `warning-muted` | `color-warning` | none |
| Completed | `gray-600` | `gray-200` | none |
| Cancelled | `danger-muted` | `color-danger` | none |
| Fulfilled | `success-muted` | `color-success` | none |
| In Review | `info` bg muted | `color-info` text | none |

**Size:** `text-xs`, padding `2px 8px`, `radius-sm`.

**MUST FIX NOW:** Current implementation uses at least 4 different badge styles. Unify into one StatusBadge component.

#### Health Indicators

Replace current emoji-circles with a proper component:
```
[Score Circle] + [Tooltip with explanation]
  0-49:  Red circle, "Critical"
  50-69: Orange circle, "At Risk"
  70-84: Yellow circle, "Needs Attention"
  85-100: Green circle, "Healthy"
```

**MUST FIX NOW:** Current health circles on Projects page have no tooltip, no legend, and are visually ambiguous.

#### Notification Bell + Dropdown

```
[Bell icon] + [Badge count: red circle, white text]
  Dropdown (320px wide, max 400px height):
    Header: "Notifications" + "Mark all read"
    List items:
      [Title (text-sm, bold)] [x dismiss]
      [Description (text-xs, gray-400)]
      [Timestamp (text-xs, gray-500)]
    Footer: "View all notifications" link
```

**MUST FIX NOW:** Current notification dropdown is too narrow, items are cramped, and the persistent "You have new notifications" toast at the bottom right is annoying and covers content.

#### Workload / Utilization Cells

For heatmap and workload matrix views:
```
cell size: 32px x 32px (minimum)
background: utilization band color
text: white or dark depending on contrast
hover: tooltip showing exact % and hours
```

**FUTURE EVOLUTION:** Build a WorkloadMatrix component for the heatmap/timeline view.

---

## SECTION 3 --- ROLE-BASED UX BLUEPRINT

### 3.1 Employee

| Attribute | Specification |
|---|---|
| Primary Jobs | Submit timesheets, view assignments, track own workload |
| Default Landing | My Dashboard (personal KPIs, assignments, pending timesheets) |
| Default KPI Cards | Hours this week, Active assignments, Pending approvals, Upcoming deadlines |
| Priority Alerts | Overdue timesheet, Assignment ending soon, Approval required |
| Navigation Emphasis | My Work section highlighted; Governance hidden |
| Quick Actions | Submit timesheet, Log work evidence, View assignment detail |
| Decision Widgets | Weekly timesheet status, Assignment calendar |
| Escalation Pathways | "Request change" on assignments; "Contact manager" link |

**MUST FIX NOW:** Employee currently lands on Access Denied page. My Dashboard must be the RBAC-correct landing page showing personal data only.

### 3.2 Project Manager

| Attribute | Specification |
|---|---|
| Primary Jobs | Monitor project health, manage staffing, track delivery, approve timesheets |
| Default Landing | PM Dashboard (already implemented) |
| Default KPI Cards | Managed projects, Active assignments, Staffing gaps, Evidence anomalies, Closing in 30 days |
| Priority Alerts | Staffing gaps > 0, Evidence anomalies, Budget overrun, Approaching deadline |
| Navigation Emphasis | Dashboards + Work sections; People & Org visible but secondary |
| Quick Actions | Quick assignment, Staffing request, Open project dashboard |
| Decision Widgets | Staffing coverage table, Project health summary, Timeline gantt |
| Escalation Pathways | "Escalate to RM" for staffing, "Flag exception" for anomalies |

**MUST FIX NOW:** PM Dashboard KPI cards must be clickable and drill into filtered views. Staffing Gaps: 4 should link to filtered Staffing Requests.

### 3.3 Resource Manager

| Attribute | Specification |
|---|---|
| Primary Jobs | Manage people allocation, fill staffing requests, optimize utilization |
| Default Landing | RM Dashboard (NEW --- must be built) showing pool utilization, open requests, bench |
| Default KPI Cards | Pool utilization %, Open staffing requests, Bench count, Over-allocated people |
| Priority Alerts | Urgent staffing requests, Critical utilization (>120%), Bench > threshold |
| Navigation Emphasis | People & Org + Staffing Requests + Utilization |
| Quick Actions | Propose candidate, Reassign person, View pool |
| Decision Widgets | Utilization heatmap by pool, Staffing request priority queue |
| Escalation Pathways | "Escalate to Director" for unresolvable gaps |

### 3.4 HR

| Attribute | Specification |
|---|---|
| Primary Jobs | Manage employee lifecycle, process cases, maintain org structure |
| Default Landing | HR Dashboard (NEW) showing open cases, onboarding pipeline, offboarding queue |
| Default KPI Cards | Open cases, Pending onboarding, Active employees, Org changes this month |
| Priority Alerts | Overdue cases, Missing manager assignments, Lifecycle events |
| Navigation Emphasis | People & Org + Cases |
| Quick Actions | Create case, Update person, Assign to org unit |
| Decision Widgets | Case pipeline (kanban or status funnel), Onboarding progress tracker |
| Escalation Pathways | "Assign to specialist" for complex cases |

### 3.5 Delivery Manager

| Attribute | Specification |
|---|---|
| Primary Jobs | Oversee cross-project delivery, resolve exceptions, ensure governance |
| Default Landing | DM Dashboard (NEW) showing exception summary, cross-project health, utilization |
| Default KPI Cards | Open exceptions, Projects at risk, Cross-project utilization, Pending approvals |
| Priority Alerts | Critical exceptions, Multiple projects red, Budget alerts |
| Navigation Emphasis | Dashboards + Governance + Work |
| Quick Actions | Resolve exception, View project dashboard, Approve staffing request |
| Decision Widgets | Exception queue (prioritized), Project health matrix, Delivery pipeline |
| Escalation Pathways | "Escalate to Director" for systemic issues |

### 3.6 Director

| Attribute | Specification |
|---|---|
| Primary Jobs | Strategic oversight, budget governance, org health monitoring |
| Default Landing | Executive Dashboard (NEW) showing org-wide KPIs, budget summary, headcount |
| Default KPI Cards | Total headcount, Utilization %, Budget vs actual, Projects by status |
| Priority Alerts | Budget overruns, Critical projects, Org changes requiring approval |
| Navigation Emphasis | Dashboards (executive view) + Reports |
| Quick Actions | Drill into directorate, View budget summary, Export report |
| Decision Widgets | Org-wide utilization heatmap, Budget burn-down chart, Project portfolio health |
| Escalation Pathways | Direct action authority --- no escalation needed |

### 3.7 Admin

| Attribute | Specification |
|---|---|
| Primary Jobs | System configuration, user management, RBAC governance, audit review |
| Default Landing | Admin Dashboard (NEW) showing system health, user activity, config status |
| Default KPI Cards | Active users, Pending invitations, Config changes this week, Audit flags |
| Priority Alerts | Failed logins, Unauthorized access attempts, Config drift |
| Navigation Emphasis | Governance + Settings (full admin settings panel, not just account) |
| Quick Actions | Manage users, Configure roles, View audit log |
| Decision Widgets | Audit timeline, System activity log, Role distribution chart |
| Escalation Pathways | N/A --- Admin has highest system-level authority |

---

## SECTION 4 --- DASHBOARD DESIGN SYSTEM

### 4.1 KPI Hierarchy

Every dashboard follows this vertical hierarchy:

```
1. KPI Cards Row (4-5 stat tiles, always visible at top)
   - Primary metric: Large number
   - Context: Delta from previous period or target
   - Alert state: Left border accent color when threshold breached

2. Tab Navigation (Overview | Timeline | Staffing | Anomalies | etc.)

3. Primary Visualization (chart or timeline, 60% of content width)
   + Side Panel or Secondary Widget (40% width)

4. Data Table (full-width, below visualizations)
   - Sortable, filterable, exportable
   - Links to detail views
```

### 4.2 Alert Surfacing Rules

| Priority | Trigger | Visual Treatment |
|---|---|---|
| P0 Critical | Metric exceeds danger threshold | Red left-border on KPI card + red badge count + notification |
| P1 Warning | Metric exceeds warning threshold | Amber left-border on KPI card + amber badge count |
| P2 Info | New items requiring attention | Blue dot indicator + count badge |
| P3 Neutral | Normal state | No visual indicator (default) |

**Rule:** Never show more than 3 alert indicators simultaneously per dashboard. Prioritize and show the top 3.

### 4.3 Anomaly Prioritization

Exceptions and anomalies should be scored and sorted:

```
Priority Score = Severity (1-5) * Recency (days-weight) * Impact (affected-entities-count)
```

Display: Sorted by priority score, descending. Visual indicator: severity color + recency badge.

### 4.4 Chart Consistency Rules

| Rule | Standard |
|---|---|
| Chart library | Recharts (React) or ECharts |
| Axis labels | `text-xs`, `gray-400` |
| Grid lines | `gray-700`, dashed, subtle |
| Tooltip | Dark bg, white text, `shadow-md`, `radius-md` |
| Legend | Below chart, horizontal, `text-xs` |
| Responsive | Charts must resize; hide labels at narrow widths |
| Empty state | "No data available" centered in chart area with icon |
| Loading state | Skeleton pulse in chart area dimensions |
| Color | Use chart palette in order; never repeat within same chart |
| Accessibility | Add `aria-label` to chart container; provide data table alternate |

**MUST FIX NOW:** Utilization chart uses direct bar colors without consistent mapping. Apply the utilization band colors defined in Section 2.B.

### 4.5 Filter Persistence

| Scope | Behavior |
|---|---|
| Page-level filters | Persist in URL query params. Bookmark-safe. |
| Dashboard date range | Persist in localStorage per user. |
| Table sort/column | Persist in localStorage per user per table. |
| Cross-page filters | "Apply to all" option for date range across dashboard tabs. |

**MUST FIX NOW:** No filter persistence exists. Navigating away and back resets all filters.

### 4.6 Drilldown Behavior

Every KPI card and chart segment must support drilldown:

```
KPI Card click -> Navigates to filtered list page
  (e.g., "Staffing Gaps: 4" -> /staffing-requests?status=open&priority=high)

Chart bar click -> Filters adjacent table to that segment
  (e.g., clicking "Ethan Brooks" bar in utilization -> scrolls to/highlights that row in table below)

Chart legend click -> Toggles that series on/off
```

### 4.7 Date Range Standards

| Control | Behavior |
|---|---|
| Default range | Last 30 days (for time-series); Current week (for timesheets) |
| Presets | Today, Last 7 days, Last 30 days, This quarter, This year, Custom |
| Format | Display: locale-aware (DD.MM.YYYY for European locale); API: ISO 8601 |
| "As of" snapshots | Single date picker with time; defaults to "now" |

**MUST FIX NOW:** Date format is inconsistent --- some fields show DD.MM.YYYY, some show YYYY-MM-DD, some show locale placeholders in Russian (ДД.ММ.ГГГГ). Standardize to user's locale and store as ISO 8601 internally.

### 4.8 Target vs Actual Patterns

```
+-----------------------------+
| Metric Name                 |
| Actual: 72%  Target: 80%   |
| [==========--------]  72%  |
|          ↑ target marker    |
+-----------------------------+
```

Use inline progress bars with target markers. Color: green when actual >= target, amber when 80-99% of target, red when <80% of target.

### 4.9 Trend Indicators

```
↑ 12% (green) = Improving
↓ 5% (red) = Declining
→ 0% (gray) = Stable
```

Every KPI card should show the trend delta compared to previous period (week-over-week or month-over-month, configurable).

---

## SECTION 5 --- TABLES, FORMS, AND FILTER UX STANDARDS

### 5.1 Enterprise Data Tables

**Column Header Features:**
- Sortable: Click to toggle asc/desc/none. Indicator arrow in header.
- Resizable: Drag column border to resize (FUTURE).
- Reorderable: Drag column header to reorder (FUTURE).
- Visibility toggle: "Columns" button opens checkbox panel (already partially implemented on People page).

**Row Features:**
- Hover highlight: `background: gray-700`
- Click: Navigate to detail page (entire row clickable, except action buttons)
- Selection: Checkbox in first column for bulk actions
- Expandable: Chevron in first column for inline detail (FUTURE)

**Pagination:**
- Default: 25 rows per page (not 10 as currently on People page)
- Options: 10, 25, 50, 100
- Showing "X of Y results"
- Keyboard: Left/Right arrow keys navigate pages

**MUST FIX NOW:** People table shows 10 per page. Increase default to 25. Add row count selector. Assignments table shows no pagination at all for 22 items.

### 5.2 Sticky Headers

```
thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: gray-900; /* Must be opaque, not transparent */
}
```

**MUST FIX NOW:** No tables have sticky headers. For tables with >10 rows, sticky headers are essential.

### 5.3 Row Actions

| Pattern | When to Use |
|---|---|
| Inline buttons (always visible) | Critical actions: Resolve, Suppress, Remove |
| Hover-reveal actions | Secondary actions: Edit, Duplicate, Archive |
| Overflow menu (...) | 3+ actions on a single row |

**Rule:** Max 2 always-visible action buttons per row. Everything else behind overflow menu.

### 5.4 Mass Actions

When rows are selected via checkboxes:
```
+--------------------------------------------------+
| Sticky bar at top or bottom:                     |
| [X] 5 selected   [Bulk Approve] [Bulk Assign] [Deselect all] |
+--------------------------------------------------+
```

**FUTURE EVOLUTION:** Add bulk actions to Assignments, Timesheet Approval, Exceptions.

### 5.5 Inline Edits

For tables that support inline editing (e.g., Timesheet grid):
- Click on cell to activate edit mode
- Cell shows input field with current value
- Tab to move to next cell
- Enter to confirm, Escape to cancel
- Show "Unsaved changes" indicator in page header
- Auto-save after 2 seconds of inactivity OR explicit Save button

**MUST FIX NOW:** Timesheet grid cells need clear edit affordance (pencil icon on hover or dashed border).

### 5.6 Saved Filters

```
Filter Bar:
  [Saved Filters v] [filter fields...] [Reset] [Save current filter]

Saved Filter Dropdown:
  - My staffing gaps
  - Active projects only
  - Overdue timesheets
  [+ Save current as...]
```

**FUTURE EVOLUTION:** Implement saved filter system across all list pages.

### 5.7 Filter Chips

After applying filters, show active filters as dismissible chips below the filter bar:
```
Active filters: [Status: Active ×] [Department: Engineering ×] [Clear all]
```

### 5.8 Async Lookup Fields

For person/project selectors:
- Type-ahead search with 300ms debounce
- Show loading spinner in dropdown during fetch
- Display result with name + secondary info (email, project code)
- Allow clear (X button)
- Recent selections shown before search results

**MUST FIX NOW:** Current "Select a person..." dropdowns appear to be standard selects, not async search fields. Replace with ComboBox/AsyncSelect component.

### 5.9 Destructive Action Confirmation

Every destructive action (Close project, Remove member, Delete, Cancel request) must show:
```
+------------------------------------------+
| Confirmation Dialog                      |
|                                          |
| Are you sure you want to [action]?       |
| [Entity name/detail]                     |
|                                          |
| This action [is/is not] reversible.      |
|                                          |
|            [Cancel]  [Confirm: action]   |
+------------------------------------------+
```

Confirm button text must match the action verb ("Close project", "Remove member", not just "OK").
Confirm button must be `color-danger` style.

**MUST FIX NOW:** "Close project" and "Remove" buttons on current UI appear to have no confirmation dialog.

---

## SECTION 6 --- ACCESSIBILITY + ENTERPRISE USABILITY QA

### 6.1 WCAG 2.2 AA Compliance Audit

| Criterion | Status | Issue | Fix Priority |
|---|---|---|---|
| 1.1.1 Non-text Content | FAIL | Health indicator circles have no alt text or ARIA label | MUST FIX NOW |
| 1.3.1 Info and Relationships | FAIL | Tables lack `<th scope>` attributes; form labels may not be programmatically associated | MUST FIX NOW |
| 1.3.2 Meaningful Sequence | PARTIAL | Sidebar nav order is logical but page content structure needs semantic HTML audit | DESIGN SYSTEM |
| 1.4.3 Contrast (Minimum) | AT RISK | Dark theme `gray-400` text on `gray-800` bg may not meet 4.5:1 for small text. Gradient banner text is very low contrast. | MUST FIX NOW |
| 1.4.11 Non-text Contrast | FAIL | Utilization chart bars may not have 3:1 contrast against dark bg for all colors | MUST FIX NOW |
| 2.1.1 Keyboard | FAIL | No visible focus indicators; tab order not verified; org chart likely not keyboard navigable | MUST FIX NOW |
| 2.4.1 Bypass Blocks | FAIL | No skip-to-content link | MUST FIX NOW |
| 2.4.3 Focus Order | AT RISK | Focus order likely follows DOM order but not verified | DESIGN SYSTEM |
| 2.4.6 Headings and Labels | FAIL | Page headings may not use proper `<h1>`-`<h6>` hierarchy | MUST FIX NOW |
| 2.4.7 Focus Visible | FAIL | No visible focus ring on any interactive element observed | MUST FIX NOW |
| 3.3.1 Error Identification | FAIL | Errors show red text but no icon, no ARIA role="alert", no programmatic association | MUST FIX NOW |
| 4.1.2 Name, Role, Value | AT RISK | Custom components (tabs, dropdown, org chart) need ARIA roles | DESIGN SYSTEM |

### 6.2 Keyboard-First Operation

| Component | Required Keyboard Support |
|---|---|
| Sidebar nav | Arrow keys to navigate items; Enter to select; Home/End for first/last |
| Tabs | Arrow keys to switch tabs; Tab to enter tab panel content |
| Data tables | Tab to reach table; Arrow keys for cell navigation; Enter to activate row |
| Dropdowns | Arrow keys to navigate; Enter to select; Escape to close |
| Modals/Dialogs | Focus trapped within modal; Escape to close; Tab cycles through controls |
| Org chart | Arrow keys to navigate tree; Enter to select node; +/- to expand/collapse |
| Command palette | Ctrl+K to open; type to filter; Arrow keys to navigate; Enter to select |

### 6.3 Screen Reader Semantics

| Area | Required Landmark |
|---|---|
| Sidebar | `<nav aria-label="Main navigation">` |
| Top header | `<header role="banner">` |
| Page content | `<main aria-label="Page content">` |
| Filter bar | `<search>` or `<form aria-label="Filter results">` |
| Notification dropdown | `<section aria-label="Notifications" role="dialog">` |
| Data table | `<table aria-label="[Table name]">` with proper `<thead>`, `<th scope>` |
| KPI cards | `<div role="group" aria-label="Key metrics">` |

### 6.4 Chart Accessibility

Every chart must have:
1. `aria-label` describing what the chart shows
2. A hidden data table equivalent (`<table>` with `sr-only` class)
3. Color + pattern differentiation (not color alone)
4. Keyboard-accessible tooltips via Arrow key navigation

**MUST FIX NOW:** Utilization chart appears to rely on color alone to differentiate utilization bands.

### 6.5 Motion Reduction

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6.6 Dense Table Readability

For tables with >6 columns:
- Alternate row striping: even rows get `gray-800`, odd rows get `gray-850` (subtle)
- Column separators: Optional thin vertical rules for complex tables
- Minimum cell padding: `8px 12px`
- Minimum column width: 80px

---

## SECTION 7 --- DESIGN-TO-CODE IMPLEMENTATION SPEC

### 7.1 React Component Architecture

```
src/
  components/
    ui/                    # Primitive UI components (design system atoms)
      Button/
      Badge/
      Card/
      StatCard/
      Tabs/
      Table/
      FilterBar/
      Input/
      Select/
      AsyncSelect/
      DatePicker/
      Dialog/
      Drawer/
      Tooltip/
      Skeleton/
      Toast/
      DropdownMenu/
      Breadcrumb/
      PageHeader/
      StatusBadge/
      HealthIndicator/
      TrendDelta/
      Avatar/
      EmptyState/
      ErrorState/
      LoadingState/

    layout/                # Layout primitives
      AppShell/
      Sidebar/
      TopHeader/
      PageBanner/
      ContentArea/
      SplitView/
      MasterDetail/

    widgets/               # Composite domain widgets
      KPIRow/
      UtilizationChart/
      StaffingCoverageTable/
      ExceptionQueue/
      TimesheetGrid/
      OrgChartTree/
      NotificationDropdown/
      AssignmentTimeline/
      ProjectHealthMatrix/

    features/              # Feature-level page compositions
      dashboard/
      projects/
      people/
      assignments/
      timesheets/
      cases/
      staffing/
      reports/
      governance/
      settings/
```

### 7.2 shadcn/ui Suitability Matrix

| Component | shadcn/ui | Recommendation |
|---|---|---|
| Button | Yes | Use directly. Extend with enterprise variants. |
| Badge | Yes | Use as base. Create StatusBadge wrapper with semantic colors. |
| Card | Yes | Use as base. Create StatCard, ContentCard, ActionCard variants. |
| Tabs | Yes | Use directly. Configure for underline style. |
| Table | Yes | Use as base. Build EnterpriseTable with sorting, pagination, sticky headers. |
| Dialog | Yes | Use directly. Create ConfirmDialog preset. |
| Dropdown Menu | Yes | Use directly. |
| Select | Yes | Use as base. Build AsyncSelect with search. |
| Input | Yes | Use directly. Add validation states. |
| Tooltip | Yes | Use directly. |
| Skeleton | Yes | Use directly. Build page-level skeleton presets. |
| Toast | Yes | Use directly. Configure positioning (top-right, not bottom-right). |
| Command (palette) | Yes | Use directly. Critical addition --- not yet implemented. |
| Sheet (Drawer) | Yes | Use for mobile nav and inspector panels. |
| Breadcrumb | Yes | Use directly. |
| Avatar | Yes | Use directly. Add role badge overlay. |
| Calendar | Yes | Use as base for DatePicker. |
| Popover | Yes | Use for filter dropdowns and tooltips. |
| Separator | Yes | Use for section dividers. |
| Progress | Yes | Use for utilization bars. |
| Checkbox | Yes | Use for table row selection and form checkboxes. |
| Switch | Yes | Use for notification preferences toggles (replace checkboxes). |

**Verdict:** shadcn/ui is highly suitable as the primitive layer. Build enterprise wrappers on top.

### 7.3 Tailwind Token Mapping

```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Semantic additions
        success: { DEFAULT: '#22c55e', muted: '#14532d' },
        warning: { DEFAULT: '#f59e0b', muted: '#78350f' },
        info: { DEFAULT: '#06b6d4', muted: '#164e63' },
        // Utilization bands
        util: {
          under: '#67e8f9',
          healthy: '#3b82f6',
          full: '#22c55e',
          over: '#f97316',
          critical: '#ef4444',
        },
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      fontSize: {
        'xs': ['11px', '16px'],
        'sm': ['13px', '20px'],
        'base': ['14px', '22px'],
        'md': ['15px', '24px'],
        'lg': ['18px', '28px'],
        'xl': ['22px', '32px'],
        '2xl': ['28px', '36px'],
        '3xl': ['36px', '44px'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      maxWidth: {
        'form': '960px',
        'settings': '800px',
        'dashboard': '1600px',
      },
    },
  },
}
```

### 7.4 Storybook Structure

```
stories/
  Primitives/
    Button.stories.tsx
    Badge.stories.tsx
    StatusBadge.stories.tsx
    Card.stories.tsx
    StatCard.stories.tsx
    ...
  Layout/
    AppShell.stories.tsx
    PageHeader.stories.tsx
    SplitView.stories.tsx
    ...
  Widgets/
    KPIRow.stories.tsx
    EnterpriseTable.stories.tsx
    FilterBar.stories.tsx
    UtilizationChart.stories.tsx
    ...
  Pages/
    Dashboard.stories.tsx
    ProjectsList.stories.tsx
    ProjectDetail.stories.tsx
    PeopleDirectory.stories.tsx
    ...
  States/
    LoadingStates.stories.tsx
    ErrorStates.stories.tsx
    EmptyStates.stories.tsx
    ...
```

### 7.5 Visual Regression Test Strategy

**Tool:** Playwright + `@playwright/test` for screenshot comparison

**Strategy:**
1. Capture baseline screenshots for every page in default state
2. Capture screenshots for every page in loading, error, empty, and populated states
3. Capture screenshots at 3 breakpoints: 1280px, 768px, 1536px
4. Run on every PR with 0.1% pixel threshold for diff detection

**Test file structure:**
```
e2e/
  visual/
    dashboard.spec.ts      # All dashboard variants
    projects.spec.ts       # List + detail + tabs
    people.spec.ts         # Directory + person 360
    tables.spec.ts         # Sort, filter, pagination states
    forms.spec.ts          # Valid, invalid, loading states
    responsive.spec.ts     # Breakpoint snapshots
```

### 7.6 Playwright UI Assertion Patterns

```typescript
// Standard page assertions
await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();

// Table assertions
await expect(page.getByRole('table')).toBeVisible();
await expect(page.getByRole('columnheader')).toHaveCount(expectedColumns);
await expect(page.getByRole('row')).toHaveCount.greaterThan(1);

// Loading state assertion
await page.goto('/projects');
await expect(page.getByTestId('skeleton-table')).toBeVisible();
await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });

// Error state assertion
await page.route('**/api/projects', route => route.abort());
await page.goto('/projects');
await expect(page.getByRole('alert')).toBeVisible();
await expect(page.getByText('Something went wrong')).toBeVisible();
await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();

// RBAC assertion
test('sidebar hides unauthorized items', async ({ page }) => {
  // Login as Employee role
  await expect(page.getByText('Exceptions')).not.toBeVisible();
  await expect(page.getByText('My Timesheet')).toBeVisible();
});

// Accessibility assertion
await expect(page).toPassAxeTests({
  rules: { 'color-contrast': { enabled: true } }
});
```

### 7.7 Token Naming Convention

```
[category]-[property]-[variant]-[state]

Examples:
  color-bg-card-default
  color-bg-card-hover
  color-text-primary
  color-text-muted
  color-border-default
  color-border-focus
  space-gap-card
  space-padding-card
  text-size-heading-page
  text-weight-heading-page
  radius-card
  shadow-card
  shadow-dropdown
```

### 7.8 Chart Abstraction Strategy

```typescript
// Wrap Recharts in enterprise chart components
interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie' | 'stacked-bar';
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  palette?: string[];          // defaults to chart palette
  height?: number;             // defaults to 300
  showGrid?: boolean;          // defaults to true
  showLegend?: boolean;        // defaults to true
  showTooltip?: boolean;       // defaults to true
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  ariaLabel: string;           // required for a11y
  onSegmentClick?: (key: string, value: unknown) => void;
}

<EnterpriseChart config={chartConfig} />
```

### 7.9 Page Composition Pattern

Every page follows a standard composition:

```tsx
export default function ProjectsPage() {
  return (
    <PageShell>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Projects' }]} />
      <PageHeader
        category="PROJECT REGISTRY"
        title="Projects"
        actions={[
          { label: 'Export XLSX', variant: 'secondary', onClick: handleExport },
          { label: 'Create project', variant: 'primary', onClick: handleCreate },
        ]}
      />
      <FilterBar
        filters={[
          { type: 'search', key: 'name', placeholder: 'Search by project name' },
          { type: 'text', key: 'externalSystem', placeholder: 'Example: JIRA' },
        ]}
        onFilterChange={setFilters}
        onReset={resetFilters}
      />
      <EnterpriseTable
        columns={columns}
        data={projects}
        loading={isLoading}
        error={error}
        emptyState={<EmptyState icon={FolderIcon} message="No projects found" action="Create your first project" />}
        pagination={{ page, pageSize, total }}
        onRowClick={(row) => navigate(`/projects/${row.id}`)}
      />
    </PageShell>
  );
}
```

### 7.10 Slot-Based Dashboard Widgets

```tsx
interface DashboardWidget {
  id: string;
  title: string;
  size: '1x1' | '2x1' | '1x2' | '2x2';  // Grid spans
  component: React.ComponentType<{ data: unknown; loading: boolean }>;
  dataSource: () => Promise<unknown>;
  refreshInterval?: number;  // ms, 0 for no auto-refresh
  requiredRole?: Role[];
}

// Dashboard is a grid of widgets
<DashboardGrid widgets={roleFilteredWidgets} columns={4} />
```

### 7.11 Reusable Filter Architecture

```tsx
interface FilterConfig {
  key: string;
  type: 'search' | 'select' | 'async-select' | 'date' | 'date-range' | 'multi-select';
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];  // for select types
  fetchOptions?: (query: string) => Promise<Option[]>;  // for async-select
  defaultValue?: unknown;
}

// FilterBar reads config, manages state, syncs to URL params
<FilterBar
  filters={filterConfig}
  values={currentFilters}
  onChange={handleFilterChange}
  onReset={handleReset}
  persistKey="projects-filters"  // localStorage key for persistence
/>
```

### 7.12 Route-Level Layout Primitives

```tsx
// Routes define their layout wrapper
const routes = [
  { path: '/dashboard/*', layout: 'dashboard', component: DashboardRoutes },
  { path: '/projects', layout: 'table-page', component: ProjectsList },
  { path: '/projects/:id', layout: 'detail-page', component: ProjectDetail },
  { path: '/people', layout: 'table-page', component: PeopleDirectory },
  { path: '/people/:id', layout: 'detail-page', component: PersonDetail },
  { path: '/timesheets', layout: 'form-page', component: MyTimesheet },
  { path: '/settings/*', layout: 'settings-page', component: SettingsRoutes },
  { path: '/org', layout: 'full-canvas', component: OrgChart },
  { path: '/teams', layout: 'master-detail', component: TeamsPage },
  { path: '/exceptions', layout: 'master-detail', component: ExceptionsPage },
];

// Layout wrappers
const layouts = {
  'dashboard': { maxWidth: '1600px', padding: 'space-6' },
  'table-page': { maxWidth: '100%', padding: 'space-6' },
  'detail-page': { maxWidth: '1400px', padding: 'space-6', hasBreadcrumb: true },
  'form-page': { maxWidth: '960px', padding: 'space-6' },
  'settings-page': { maxWidth: '800px', padding: 'space-6' },
  'full-canvas': { maxWidth: '100%', padding: 'space-4', overflow: 'hidden' },
  'master-detail': { maxWidth: '100%', padding: 'space-6', splitRatio: '300px / 1fr' },
};
```

---

## SECTION 8 --- UI/UX QA DEFINITION OF DONE

### Checklist: Every UI Ticket Must Pass ALL Items Before Merge

#### Visual Consistency
- [ ] Uses only design system tokens for colors, spacing, typography, and radii
- [ ] Follows the correct page layout primitive for its route type
- [ ] Card styles match the canonical card variants (StatCard, ContentCard, ActionCard)
- [ ] Buttons follow the hierarchy: one primary, secondary for rest, ghost for cancel
- [ ] Status badges use the standardized StatusBadge component
- [ ] Icons are from the same icon set (Lucide recommended)

#### Spacing Compliance
- [ ] All spacing uses tokens from the 4px grid scale
- [ ] Card padding is `space-6` (24px)
- [ ] Filter bar gap is `space-4` (16px)
- [ ] Page-level padding is `space-6` (24px)
- [ ] No magic numbers or arbitrary pixel values

#### Token Compliance
- [ ] No hardcoded color values --- all colors reference CSS variables or Tailwind tokens
- [ ] No hardcoded font sizes --- all text uses the typography scale
- [ ] No hardcoded shadows --- all elevation uses shadow tokens
- [ ] Dark mode and future light mode both work from the same token set

#### RBAC Compliance
- [ ] Component renders only actions authorized for the current user's role
- [ ] Unauthorized routes redirect to appropriate landing page (not "Access Denied")
- [ ] Sidebar navigation items are hidden (not grayed) for unauthorized routes
- [ ] No "Access Denied" or "Insufficient role" shown in normal user flow

#### Accessibility
- [ ] All interactive elements have visible focus rings (2px solid, blue, offset 2px)
- [ ] All form inputs have associated `<label>` elements
- [ ] All images/icons have `alt` text or `aria-label`
- [ ] Color is not the only means of conveying information
- [ ] Tab order is logical and complete
- [ ] ARIA roles are correct for custom components
- [ ] Passes `axe-core` automated checks with 0 violations

#### Loading States
- [ ] Page shows skeleton loader while data is loading
- [ ] Tables show skeleton rows (3-5 rows of pulsing placeholders)
- [ ] Charts show skeleton rectangle in chart dimensions
- [ ] KPI cards show skeleton with correct dimensions
- [ ] Loading does not cause layout shift when content appears

#### Error States
- [ ] API errors show a clear error message with retry action
- [ ] Error messages are user-friendly (no raw status codes or technical jargon)
- [ ] Error state includes icon (alert triangle), message, and "Try again" button
- [ ] Network errors show "Connection lost" with auto-retry indicator
- [ ] Error state uses `role="alert"` for screen reader announcement

#### Empty States
- [ ] Empty tables show illustration + message + primary action ("Create your first X")
- [ ] Empty charts show "No data available" centered with muted icon
- [ ] Empty dashboards show onboarding guidance
- [ ] Empty filters show "No results match your filters" with "Clear filters" action

#### Skeletons
- [ ] Skeleton shape matches the eventual content shape
- [ ] Skeleton uses subtle pulse animation (respects `prefers-reduced-motion`)
- [ ] Skeleton is the same height as the real content (no layout shift)

#### Optimistic Updates
- [ ] State changes (approve, reject, toggle) update UI immediately before server response
- [ ] If server rejects, revert UI and show error toast
- [ ] During optimistic update, disabled state prevents double-submission

#### Toast Coverage
- [ ] Success actions show green toast: "Assignment created successfully"
- [ ] Error actions show red toast: "Failed to save changes. Please try again."
- [ ] Toasts auto-dismiss after 5 seconds
- [ ] Toasts appear in top-right corner (not bottom-right --- conflicts with content)
- [ ] Max 3 toasts visible simultaneously; older ones auto-dismiss

#### Undo Flows
- [ ] Destructive actions that are reversible show "Undo" link in success toast
- [ ] Undo window: 10 seconds
- [ ] Non-reversible actions require confirmation dialog (Section 5.9)

#### Export Behavior
- [ ] Export buttons show loading spinner during generation
- [ ] File downloads use meaningful names: `projects_export_2026-04-11.xlsx`
- [ ] Large exports (>1000 rows) show progress indicator
- [ ] Export respects currently active filters

#### Keyboard Support
- [ ] All functionality reachable via keyboard
- [ ] Focus order matches visual order
- [ ] Escape closes modals, dropdowns, and panels
- [ ] Enter activates buttons and links
- [ ] Arrow keys navigate within lists, tables, and menus

#### Test Coverage Expectations
- [ ] Component has Storybook story covering all states (default, hover, loading, error, empty, disabled)
- [ ] Component has unit tests for interaction logic (click handlers, state changes)
- [ ] Page has Playwright E2E test covering happy path
- [ ] Page has visual regression screenshot at default breakpoint
- [ ] RBAC behavior tested with at least 2 different role fixtures

---

## APPENDIX A --- PRIORITY IMPLEMENTATION ROADMAP

### Phase 1: MUST FIX NOW (Weeks 1-3)

1. **Fix RBAC routing** --- unauthorized pages redirect to role-appropriate dashboard, sidebar hides unauthorized items
2. **Add loading skeletons** to all pages (table skeleton, card skeleton, chart skeleton)
3. **Standardize error states** with retry action, consistent styling, and ARIA roles
4. **Add breadcrumbs** to all detail pages
5. **Fix page header banner** to always show correct page context
6. **Add visible focus rings** to all interactive elements
7. **Fix date format consistency** (use locale-aware formatting)
8. **Add confirmation dialogs** for all destructive actions
9. **Fix notification toast** (move to top-right, add auto-dismiss)
10. **Increase default table pagination** to 25 rows

### Phase 2: DESIGN SYSTEM FOUNDATION (Weeks 4-8)

1. Implement design tokens in Tailwind config
2. Build core component library: Button, Badge, StatusBadge, Card, StatCard, Tabs, FilterBar, PageHeader, Breadcrumb, EmptyState, ErrorState, LoadingState
3. Build EnterpriseTable component with sorting, pagination, sticky headers, row hover
4. Build AsyncSelect component for person/project lookups
5. Build ConfirmDialog component
6. Build Toast system (top-right, auto-dismiss, max 3)
7. Add CommandPalette (Ctrl+K) using shadcn/ui Command component
8. Set up Storybook with all component stories
9. Set up Playwright visual regression baseline

### Phase 3: FUTURE EVOLUTION (Weeks 9-16+)

1. Build role-specific dashboards (RM, HR, DM, Director, Admin)
2. Implement saved filters and filter persistence
3. Add bulk actions to tables
4. Build WorkloadMatrix / heatmap component
5. Add inline editing to Timesheet and Assignments
6. Implement chart drilldown interactions
7. Add keyboard shortcuts documentation and shortcut indicators
8. Build advanced Report Builder with live preview
9. Add mobile-responsive views for critical pages
10. Implement light theme token set

---

## APPENDIX B --- ANTI-PATTERN CATALOG

| Anti-Pattern | Where Found | Correct Pattern |
|---|---|---|
| Showing nav items that user can't access | Sidebar | Hide unauthorized items entirely |
| Raw technical error messages | Dashboard, Planned vs Actual | User-friendly message + retry button |
| No loading state (content jumps in) | All pages | Skeleton loaders matching content shape |
| Inconsistent date formats | Throughout | Locale-aware formatting + ISO 8601 internal |
| Persistent toast blocking content | Bottom-right toast | Top-right, auto-dismiss after 5s |
| Page banner showing wrong context | Project detail, Person 360 | Banner always matches current page |
| Color-only status indication | Health circles, Utilization bars | Color + text/icon + tooltip |
| Table without pagination | Assignments (22 rows) | Always paginate at 25 rows default |
| Actions without confirmation | Close project, Remove member | Confirmation dialog for all destructive actions |
| Mixed button hierarchy | Projects, PM Dashboard | Clear primary/secondary/ghost hierarchy |
| Form above data list | Work Evidence | Form in drawer/modal, list visible first |
| No empty state guidance | Timesheet, Dashboard | Illustration + message + call-to-action |

---

*This document is the canonical reference for all UI/UX decisions on the Workload Tracking Platform. Every pull request touching UI must reference this document. Every design review must validate against Section 8 Definition of Done. Every new component must follow the taxonomy in Section 2.D and the architecture in Section 7.1.*
