# Admin Demo Walk-Through (5 minutes)

**Account:** `admin@deliverycentral.local` / `DeliveryCentral@Admin1`  
**Role:** System Administrator

---

## Step 1 — Admin Panel Overview (1 min)
1. Log in as the system administrator.
2. Navigate to `/admin`.
3. Show the Admin panel grid — all 6 sections: User Accounts, Dictionaries, Integrations, Notifications, Business Audit, Platform Settings.

## Step 2 — User Accounts: All 30 Demo Accounts (1 min)
1. Click **User Accounts**.
2. Show the full list of demo accounts — 30 people across all roles.
3. Point out the role badges: director, hr_manager, resource_manager, project_manager, delivery_manager, employee.
4. Show one account's detail: email, linked person, last login.

## Step 3 — Business Audit Log (1 min)
1. Navigate to **Business Audit** (`/admin/audit`).
2. Show recent activity across all roles — assignment changes, staffing request transitions, case updates.
3. Each record shows: timestamp, actor, action, resource type.

## Step 4 — Integration Status (1 min)
1. Navigate to **Integrations** (`/admin/integrations`).
2. Show the Jira and M365 cards — "Configured" state (mocked in demo seed with valid-looking external IDs).
3. Point out the LDAP and Azure AD cards available for enterprise SSO setup.

## Step 5 — Platform Settings (1 min)
1. Navigate to **Platform Settings** (`/admin/settings`).
2. Show configurable thresholds: exception stale approval days, minutes per manday, token lifetimes.
3. Demo that changing a value and saving returns the demo-mode 200 response with `"demo": true`.

---

**Key messages:** Complete visibility · Audit accountability · Enterprise integration readiness · Configurable governance
