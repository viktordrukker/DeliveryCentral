--
--
--
--
CREATE SCHEMA read_models;
--
--
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;
--
--
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
--
--
CREATE TYPE public."AggregateType" AS ENUM (
    'Person',
    'Tenant',
    'Project',
    'Client',
    'Vendor',
    'OrgUnit',
    'ResourcePool',
    'ProjectAssignment',
    'StaffingRequest',
    'CaseRecord',
    'TimesheetWeek',
    'LeaveRequest',
    'Notification',
    'DomainEvent',
    'Skill',
    'PeriodLock',
    'PersonCostRate',
    'ProjectBudget',
    'ProjectRisk',
    'ProjectRagSnapshot',
    'EmploymentEvent',
    'Contact',
    'BudgetApproval',
    'Migration',
    'ProjectChangeRequest',
    'ProjectMilestone',
    'ProjectRadiatorOverride',
    'ProjectPosition'
);
--
--
CREATE TYPE public."ApprovalDecision" AS ENUM (
    'REQUESTED',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);
--
--
CREATE TYPE public."AssignmentSlaStage" AS ENUM (
    'PROPOSAL',
    'REVIEW',
    'APPROVAL',
    'RM_FINALIZE'
);
--
--
CREATE TYPE public."AssignmentStatus" AS ENUM (
    'DRAFT',
    'CREATED',
    'PROPOSED',
    'IN_REVIEW',
    'REJECTED',
    'BOOKED',
    'ONBOARDING',
    'ASSIGNED',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED'
);
--
--
CREATE TYPE public."BudgetApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);
--
--
CREATE TYPE public."CaseParticipantRole" AS ENUM (
    'SUBJECT',
    'REQUESTER',
    'APPROVER',
    'REVIEWER',
    'OBSERVER',
    'OPERATOR'
);
--
--
CREATE TYPE public."CaseStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED',
    'ARCHIVED'
);
--
--
CREATE TYPE public."CaseTypeKey" AS ENUM (
    'OFFBOARDING',
    'ONBOARDING',
    'PERFORMANCE',
    'TRANSFER',
    'OVERTIME_EXCEPTION',
    'EMPLOYEE_ISSUE'
);
--
--
CREATE TYPE public."ChangeRequestSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);
--
--
CREATE TYPE public."ChangeRequestStatus" AS ENUM (
    'PROPOSED',
    'APPROVED',
    'REJECTED',
    'WITHDRAWN'
);
--
--
CREATE TYPE public."ContactKind" AS ENUM (
    'EMAIL',
    'PHONE',
    'ADDRESS'
);
--
--
CREATE TYPE public."DigestSchedule" AS ENUM (
    'IMMEDIATE',
    'DAILY_9AM',
    'WEEKLY_MON_9AM'
);
--
--
CREATE TYPE public."EmploymentEventKind" AS ENUM (
    'HIRE',
    'TERMINATE',
    'LEAVE_START',
    'LEAVE_END',
    'REHIRE'
);
--
--
CREATE TYPE public."EngagementModel" AS ENUM (
    'TIME_AND_MATERIAL',
    'FIXED_PRICE',
    'MANAGED_SERVICE',
    'INTERNAL'
);
--
--
CREATE TYPE public."ExternalAccountPresenceState" AS ENUM (
    'PRESENT',
    'ABSENT',
    'SUSPENDED',
    'UNKNOWN'
);
--
--
CREATE TYPE public."ExternalAccountSourceType" AS ENUM (
    'LDAP',
    'AZURE_AD',
    'GOOGLE_WORKSPACE',
    'RADIUS',
    'MANUAL'
);
--
--
CREATE TYPE public."IdempotencyKeyStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED'
);
--
--
CREATE TYPE public."LeaveRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);
--
--
CREATE TYPE public."LeaveRequestType" AS ENUM (
    'ANNUAL',
    'SICK',
    'PARENTAL',
    'COMPASSIONATE',
    'UNPAID',
    'OTHER',
    'OT_OFF',
    'PERSONAL',
    'BEREAVEMENT',
    'STUDY'
);
--
--
CREATE TYPE public."LocalAccountSource" AS ENUM (
    'local',
    'ldap',
    'azure_ad',
    'google',
    'okta'
);
--
--
CREATE TYPE public."MetadataDataType" AS ENUM (
    'TEXT',
    'LONG_TEXT',
    'NUMBER',
    'DECIMAL',
    'BOOLEAN',
    'DATE',
    'DATETIME',
    'ENUM',
    'JSON'
);
--
--
CREATE TYPE public."MilestoneStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'HIT',
    'MISSED'
);
--
--
CREATE TYPE public."NotificationDeliveryStatus" AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED_TERMINAL',
    'RETRYING'
);
--
--
CREATE TYPE public."NotificationRequestStatus" AS ENUM (
    'QUEUED',
    'SENT',
    'FAILED_TERMINAL',
    'RETRYING'
);
--
--
CREATE TYPE public."OrgUnitStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ARCHIVED'
);
--
--
CREATE TYPE public."OutboxEventStatus" AS ENUM (
    'PENDING',
    'PUBLISHED',
    'FAILED',
    'RETRY'
);
--
--
CREATE TYPE public."PersonCostRateType" AS ENUM (
    'INTERNAL'
);
--
--
CREATE TYPE public."PersonEmploymentStatus" AS ENUM (
    'ACTIVE',
    'LEAVE',
    'INACTIVE',
    'TERMINATED'
);
--
--
CREATE TYPE public."PersonReleaseStatus" AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'COMPLETED'
);
--
--
CREATE TYPE public."ProjectActivationDecision" AS ENUM (
    'APPROVED',
    'REJECTED'
);
--
--
CREATE TYPE public."ProjectPositionCandidateDecision" AS ENUM (
    'PENDING',
    'PICKED',
    'DECLINED',
    'AUTO_DECLINED'
);
--
--
CREATE TYPE public."ProjectPositionFillChangeType" AS ENUM (
    'DRAFTED',
    'OPENED',
    'PROPOSED',
    'BOOKED',
    'ONBOARDED',
    'ASSIGNED',
    'HELD',
    'RELEASED',
    'CANDIDATES_ADDED',
    'CANDIDATE_PICKED',
    'CANDIDATE_DECLINED',
    'RATE_PINNED',
    'ALLOCATION_CHANGED',
    'DATES_CHANGED'
);
--
--
CREATE TYPE public."ProjectPositionFillStatus" AS ENUM (
    'DRAFT',
    'OPEN',
    'PROPOSED',
    'BOOKED',
    'ONBOARDING',
    'ASSIGNED',
    'ON_HOLD',
    'RELEASED'
);
--
--
CREATE TYPE public."ProjectPriority" AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
);
--
--
CREATE TYPE public."ProjectShape" AS ENUM (
    'SMALL',
    'STANDARD',
    'ENTERPRISE',
    'PROGRAM'
);
--
--
CREATE TYPE public."ProjectStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'ARCHIVED',
    'CLOSED',
    'PENDING_APPROVAL'
);
--
--
CREATE TYPE public."RagRating" AS ENUM (
    'GREEN',
    'AMBER',
    'RED'
);
--
--
CREATE TYPE public."ReleaseApprovalDecision" AS ENUM (
    'APPROVED',
    'REJECTED'
);
--
--
CREATE TYPE public."ReportingAuthority" AS ENUM (
    'APPROVER',
    'REVIEWER',
    'VIEWER'
);
--
--
CREATE TYPE public."ReportingLineType" AS ENUM (
    'SOLID_LINE',
    'DOTTED_LINE',
    'FUNCTIONAL',
    'PROJECT'
);
--
--
CREATE TYPE public."ResponsibilityActionKind" AS ENUM (
    'PROJECT_ACTIVATION_APPROVAL',
    'BUDGET_CHANGE_APPROVAL',
    'ASSIGNMENT_DIRECTOR_APPROVAL',
    'ASSIGNMENT_OVERRIDE_APPROVAL',
    'PERSON_RELEASE_HR_APPROVAL',
    'PERSON_RELEASE_DIRECTOR_APPROVAL',
    'PROJECT_CLOSE_APPROVAL'
);
--
--
CREATE TYPE public."ResponsibilityResolutionMode" AS ENUM (
    'ROLE',
    'PERSON',
    'PM_SOLO',
    'SKIP'
);
--
--
CREATE TYPE public."ResponsibilityScope" AS ENUM (
    'TENANT',
    'ORG_UNIT',
    'CLIENT',
    'PROJECT',
    'PROJECT_TYPE',
    'THRESHOLD_AMOUNT',
    'ROLE_GRADE'
);
--
--
CREATE TYPE public."RiskCategory" AS ENUM (
    'SCOPE',
    'SCHEDULE',
    'BUDGET',
    'BUSINESS',
    'TECHNICAL',
    'OPERATIONAL'
);
--
--
CREATE TYPE public."RiskReviewCadence" AS ENUM (
    'WEEKLY',
    'FORTNIGHTLY',
    'MONTHLY',
    'QUARTERLY'
);
--
--
CREATE TYPE public."RiskStatus" AS ENUM (
    'IDENTIFIED',
    'ASSESSED',
    'MITIGATING',
    'RESOLVED',
    'CLOSED',
    'CONVERTED_TO_ISSUE'
);
--
--
CREATE TYPE public."RiskStrategy" AS ENUM (
    'MITIGATE',
    'ACCEPT',
    'TRANSFER',
    'AVOID',
    'ESCALATE'
);
--
--
CREATE TYPE public."RiskType" AS ENUM (
    'RISK',
    'ISSUE'
);
--
--
CREATE TYPE public."RolePlanSource" AS ENUM (
    'INTERNAL',
    'VENDOR',
    'EITHER'
);
--
--
CREATE TYPE public."SetupRunLogLevel" AS ENUM (
    'TRACE',
    'DEBUG',
    'INFO',
    'WARN',
    'ERROR'
);
--
--
CREATE TYPE public."SetupRunStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'ROLLED_BACK'
);
--
--
CREATE TYPE public."StaffingRequestPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);
--
--
CREATE TYPE public."StaffingRequestProposalCandidateDecision" AS ENUM (
    'PENDING',
    'PICKED',
    'DECLINED',
    'AUTO_DECLINED'
);
--
--
CREATE TYPE public."StaffingRequestProposalSlateStatus" AS ENUM (
    'OPEN',
    'DECIDED',
    'EXPIRED',
    'WITHDRAWN'
);
--
--
CREATE TYPE public."StaffingRequestStatus" AS ENUM (
    'DRAFT',
    'OPEN',
    'IN_REVIEW',
    'FULFILLED',
    'CANCELLED'
);
--
--
CREATE TYPE public."SyncStatus" AS ENUM (
    'IDLE',
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'PARTIAL'
);
--
--
CREATE TYPE public."ThresholdDirection" AS ENUM (
    'HIGHER_IS_BETTER',
    'LOWER_IS_BETTER'
);
--
--
CREATE TYPE public."TimesheetStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);
--
--
CREATE TYPE public."VendorContractType" AS ENUM (
    'STAFF_AUGMENTATION',
    'FIXED_DELIVERABLE',
    'MANAGED_SERVICE'
);
--
--
CREATE TYPE public."VendorEngagementStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'TERMINATED'
);
--
--
CREATE TYPE public."WorkEvidenceLinkType" AS ENUM (
    'ISSUE'
);
--
--
CREATE TYPE public."WorkEvidenceStatus" AS ENUM (
    'CAPTURED',
    'RECONCILED',
    'IGNORED',
    'ARCHIVED'
);
--
--
CREATE TYPE public."WorkEvidenceType" AS ENUM (
    'JIRA_WORKLOG',
    'MANUAL_ENTRY',
    'TIMESHEET_ENTRY'
);
--
--
CREATE TYPE public."WorkflowDefinitionStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'RETIRED'
);
--
--
CREATE FUNCTION public.dm_r_21_ddl_audit() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    INSERT INTO "ddl_audit" (
      "sessionUser", "currentUser", "applicationName",
      "commandTag", "objectType", "objectIdentity", query, "inFunction"
    ) VALUES (
      session_user, current_user, current_setting('application_name', true),
      r.command_tag, r.object_type, r.object_identity,
      current_query(), r.in_extension::text
    );
  END LOOP;
END
$$;
--
--
CREATE FUNCTION public.dm_r_21_ddl_lockout() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_session text := session_user;
BEGIN
  IF v_session NOT IN ('postgres', 'app_migrator') THEN
    RAISE EXCEPTION 'DM-R-21: DDL denied for session_user=% (only app_migrator or postgres may issue DDL). Command=%', v_session, tg_tag
      USING ERRCODE = '42501';
  END IF;
END
$$;
--
--
CREATE FUNCTION public.dm_r_21_sql_drop_audit() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    INSERT INTO "ddl_audit" (
      "sessionUser", "currentUser", "applicationName",
      "commandTag", "objectType", "objectIdentity", query, "inFunction"
    ) VALUES (
      session_user, current_user, current_setting('application_name', true),
      tg_tag, r.object_type, r.object_identity,
      current_query(), NULL
    );
  END LOOP;
END
$$;
--
--
CREATE FUNCTION public.dm_r_22_audit_hash_chain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  prev text;
  new_json jsonb;
BEGIN
  EXECUTE format(
    'SELECT "rowHash" FROM %I ORDER BY "chainSeq" DESC LIMIT 1',
    TG_TABLE_NAME
  ) INTO prev;
  new_json := to_jsonb(NEW) - 'prevHash' - 'rowHash';
  NEW."prevHash" := prev;
  NEW."rowHash"  := encode(
    sha256(convert_to(COALESCE(prev, '') || '|' || new_json::text, 'UTF8')),
    'hex'
  );
  RETURN NEW;
END
$$;
--
--
CREATE FUNCTION public.dm_r_23_mass_mutation_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  affected bigint;
  threshold int := COALESCE(NULLIF(current_setting('public.mass_mutation_threshold', true), '')::int, 1000);
  allow_bulk text;
BEGIN
  allow_bulk := current_setting('public.allow_bulk', true);
  IF allow_bulk = 'true' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'DELETE' THEN
    EXECUTE 'SELECT count(*) FROM dm_r_23_deleted' INTO affected;
  ELSIF TG_OP = 'UPDATE' THEN
    EXECUTE 'SELECT count(*) FROM dm_r_23_updated' INTO affected;
  ELSE
    RETURN NULL;
  END IF;
  IF affected > threshold THEN
    RAISE EXCEPTION
      'DM-R-23: % on % would affect % rows (threshold %). Bypass: SET LOCAL public.allow_bulk = ''true''',
      TG_OP, TG_TABLE_NAME, affected, threshold
      USING ERRCODE = '42501';
  END IF;
  RETURN NULL;
END
$$;
--
--
CREATE FUNCTION public.dm_r_31_honeypot_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  is_honeypot boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM "honeypot"
    WHERE "tableName" = TG_TABLE_NAME
      AND "rowId" = OLD.id
  ) INTO is_honeypot;
  IF NOT is_honeypot THEN
    -- Normal row — let the mutation proceed.
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  -- Honeypot row — record and block.
  INSERT INTO "honeypot_alerts" (
    "tableName", "rowId", operation,
    "sessionUser", "currentUser", "applicationName", query
  ) VALUES (
    TG_TABLE_NAME, OLD.id, TG_OP,
    session_user, current_user, current_setting('application_name', true),
    current_query()
  );
  PERFORM pg_notify('dm_r_31_honeypot_tripped',
    json_build_object(
      'table', TG_TABLE_NAME,
      'rowId', OLD.id,
      'op', TG_OP,
      'sessionUser', session_user,
      'applicationName', current_setting('application_name', true)
    )::text
  );
  RAISE EXCEPTION
    'DM-R-31: % on honeypot row % in % detected. Row is a tripwire; an honest code path never touches it.',
    TG_OP, OLD.id, TG_TABLE_NAME
    USING ERRCODE = '42501';
END
$$;
--
--
CREATE FUNCTION public.dm_r_current_person() RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_person_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END
$$;
--
--
CREATE FUNCTION public.dm_r_current_tenant() RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END
$$;
--
--
CREATE FUNCTION public.in_app_notifications_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'not_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.leave_requests_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'lvr_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.period_locks_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'prd_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.person_cost_rates_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'pcr_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.person_skills_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.project_budgets_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'bud_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.pulse_entries_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.skills_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'skl_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.staffing_request_fulfilments_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.staffing_requests_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'stf_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.timesheet_entries_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE FUNCTION public.timesheet_weeks_dm2_dualmaintain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."id_new" IS NULL THEN
    NEW."id_new" := gen_random_uuid();
  END IF;
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'tsh_' || substr(replace(NEW."id_new"::text, '-', ''), 1, 12);
  END IF;
  RETURN NEW;
END;
$$;
--
--
CREATE TABLE public."AssignmentApproval" (
    id uuid NOT NULL,
    "assignmentId" uuid NOT NULL,
    "decidedByPersonId" uuid,
    "sequenceNumber" integer DEFAULT 1 NOT NULL,
    decision public."ApprovalDecision" DEFAULT 'PENDING'::public."ApprovalDecision" NOT NULL,
    "decisionReason" text,
    "decisionAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."AssignmentHistory" (
    id uuid NOT NULL,
    "assignmentId" uuid NOT NULL,
    "changedByPersonId" uuid,
    "changeType" text NOT NULL,
    "changeReason" text,
    "previousSnapshot" jsonb,
    "newSnapshot" jsonb,
    "occurredAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--
--
CREATE TABLE public."AuditLog" (
    id uuid NOT NULL,
    "aggregateType" public."AggregateType" NOT NULL,
    "aggregateId" uuid NOT NULL,
    "eventName" text NOT NULL,
    "actorId" uuid,
    "correlationId" text,
    payload jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "prevHash" text,
    "rowHash" text,
    "chainSeq" bigint NOT NULL,
    "tenantId" uuid,
    CONSTRAINT "AuditLog_chainSeq_positive_check" CHECK (("chainSeq" > 0)),
    CONSTRAINT "AuditLog_correlationId_maxlen_check" CHECK ((("correlationId" IS NULL) OR (length("correlationId") <= 256))),
    CONSTRAINT "AuditLog_createdAt_not_future_check" CHECK (("createdAt" <= (now() + '01:00:00'::interval))),
    CONSTRAINT "AuditLog_eventName_maxlen_check" CHECK ((length("eventName") <= 256)),
    CONSTRAINT "AuditLog_eventName_nonempty_check" CHECK ((length("eventName") > 0)),
    CONSTRAINT "AuditLog_payload_is_object_check" CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT "AuditLog_prevHash_shape_check" CHECK ((("prevHash" IS NULL) OR ("prevHash" ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT "AuditLog_rowHash_shape_check" CHECK ((("rowHash" IS NULL) OR ("rowHash" ~ '^[0-9a-f]{64}$'::text)))
);
--
--
CREATE SEQUENCE public."AuditLog_chainSeq_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
--
ALTER SEQUENCE public."AuditLog_chainSeq_seq" OWNED BY public."AuditLog"."chainSeq";
--
--
CREATE TABLE public."CaseParticipant" (
    id uuid NOT NULL,
    "caseRecordId" uuid NOT NULL,
    "personId" uuid NOT NULL,
    role public."CaseParticipantRole" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public."CaseRecord" (
    id uuid NOT NULL,
    "caseNumber" text NOT NULL,
    "caseTypeId" uuid NOT NULL,
    "subjectPersonId" uuid NOT NULL,
    "ownerPersonId" uuid NOT NULL,
    "relatedProjectId" uuid,
    "relatedAssignmentId" uuid,
    status public."CaseStatus" DEFAULT 'OPEN'::public."CaseStatus" NOT NULL,
    "openedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueAt" timestamp(3) with time zone,
    "closedAt" timestamp(3) with time zone,
    summary text,
    payload jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "tenantId" uuid,
    version integer DEFAULT 1 NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."CaseStep" (
    id uuid NOT NULL,
    "caseRecordId" uuid NOT NULL,
    "workflowStateDefinitionId" uuid,
    "stepKey" text NOT NULL,
    "displayName" text NOT NULL,
    status public."CaseStatus" DEFAULT 'OPEN'::public."CaseStatus" NOT NULL,
    "assignedToPersonId" uuid,
    "dueAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    payload jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."CaseType" (
    id uuid NOT NULL,
    key public."CaseTypeKey" NOT NULL,
    "displayName" text NOT NULL,
    description text,
    "workflowDefinitionId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."Currency" (
    code character varying(3) NOT NULL,
    name text NOT NULL,
    "minorUnit" integer DEFAULT 2 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public."CustomFieldDefinition" (
    id uuid NOT NULL,
    "entityType" text NOT NULL,
    "fieldKey" text NOT NULL,
    "displayName" text NOT NULL,
    description text,
    "dataType" public."MetadataDataType" NOT NULL,
    "metadataDictionaryId" uuid,
    "scopeOrgUnitId" uuid,
    "validationSchema" jsonb,
    "defaultValue" jsonb,
    "isRequired" boolean DEFAULT false NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."CustomFieldValue" (
    id uuid NOT NULL,
    "entityType" text NOT NULL,
    "entityId" uuid NOT NULL,
    "customFieldDefinitionId" uuid NOT NULL,
    value jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."DomainEvent" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "aggregateType" public."AggregateType" NOT NULL,
    "aggregateId" uuid NOT NULL,
    "eventName" text NOT NULL,
    "actorId" uuid,
    "correlationId" text,
    "causationId" uuid,
    payload jsonb NOT NULL,
    "publishedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "prevHash" text,
    "rowHash" text,
    "chainSeq" bigint NOT NULL,
    "tenantId" uuid
)
PARTITION BY RANGE ("createdAt");
--
--
CREATE SEQUENCE public."DomainEvent_chainSeq_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
--
ALTER SEQUENCE public."DomainEvent_chainSeq_seq" OWNED BY public."DomainEvent"."chainSeq";
--
--
CREATE TABLE public."DomainEvent_default" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "aggregateType" public."AggregateType" NOT NULL,
    "aggregateId" uuid NOT NULL,
    "eventName" text NOT NULL,
    "actorId" uuid,
    "correlationId" text,
    "causationId" uuid,
    payload jsonb NOT NULL,
    "publishedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "prevHash" text,
    "rowHash" text,
    "chainSeq" bigint DEFAULT nextval('public."DomainEvent_chainSeq_seq"'::regclass) NOT NULL,
    "tenantId" uuid
);
--
--
CREATE TABLE public."EmployeeActivityEvent" (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    "eventType" text NOT NULL,
    "occurredAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actorId" uuid,
    summary text NOT NULL,
    "relatedEntityId" uuid,
    metadata jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--
--
CREATE TABLE public."EntityLayoutDefinition" (
    id uuid NOT NULL,
    "entityType" text NOT NULL,
    "layoutKey" text NOT NULL,
    "displayName" text NOT NULL,
    "scopeOrgUnitId" uuid,
    version integer DEFAULT 1 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "layoutSchema" jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."ExternalAccountLink" (
    id uuid NOT NULL,
    "personId" uuid,
    provider text NOT NULL,
    "sourceType" public."ExternalAccountSourceType" NOT NULL,
    "externalAccountId" text NOT NULL,
    "externalUsername" text,
    "externalDisplayName" text,
    "externalEmail" text,
    "matchedByStrategy" text,
    "accountPresenceState" public."ExternalAccountPresenceState",
    "sourceUpdatedAt" timestamp(3) with time zone,
    "lastSeenAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone
);
--
--
CREATE TABLE public."ExternalSyncState" (
    id uuid NOT NULL,
    "projectExternalLinkId" uuid NOT NULL,
    "syncStatus" public."SyncStatus" DEFAULT 'IDLE'::public."SyncStatus" NOT NULL,
    "lastSyncedAt" timestamp(3) with time zone,
    "lastSuccessfulSyncedAt" timestamp(3) with time zone,
    "lastError" text,
    "lastPayloadFingerprint" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--
--
CREATE TABLE public."IntegrationSyncState" (
    id uuid NOT NULL,
    provider text NOT NULL,
    "resourceType" text NOT NULL,
    "scopeKey" text NOT NULL,
    "lastCursor" text,
    "lastSyncedAt" timestamp(3) with time zone,
    "lastStatus" public."SyncStatus" DEFAULT 'IDLE'::public."SyncStatus" NOT NULL,
    "lastError" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."LocalAccount" (
    id uuid NOT NULL,
    "personId" uuid,
    email text NOT NULL,
    "displayName" text NOT NULL,
    "passwordHash" text NOT NULL,
    roles text[] DEFAULT ARRAY[]::text[],
    source public."LocalAccountSource" DEFAULT 'local'::public."LocalAccountSource" NOT NULL,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text,
    "backupCodesHash" text[],
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp(3) with time zone,
    "lastLoginAt" timestamp(3) with time zone,
    "mustChangePw" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "tenantId" uuid,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."M365DirectoryReconciliationRecord" (
    id uuid NOT NULL,
    provider text NOT NULL,
    "externalUserId" text NOT NULL,
    "externalPrincipalName" text,
    "externalEmail" text,
    "externalDisplayName" text,
    "personId" uuid,
    "matchedByStrategy" text,
    category text NOT NULL,
    summary text NOT NULL,
    "candidatePersonIds" text[] DEFAULT ARRAY[]::text[],
    "resolvedManagerPersonId" uuid,
    "sourceDepartment" text,
    "sourceJobTitle" text,
    "sourceAccountEnabled" boolean,
    "sourceUpdatedAt" timestamp(3) with time zone,
    "lastSeenAt" timestamp(3) with time zone,
    "lastEvaluatedAt" timestamp(3) with time zone NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."MetadataDictionary" (
    id uuid NOT NULL,
    "entityType" text NOT NULL,
    "dictionaryKey" text NOT NULL,
    "displayName" text NOT NULL,
    description text,
    "scopeOrgUnitId" uuid,
    "isSystemManaged" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."MetadataEntry" (
    id uuid NOT NULL,
    "metadataDictionaryId" uuid NOT NULL,
    "entryKey" text NOT NULL,
    "entryValue" text NOT NULL,
    "displayName" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."NotificationChannel" (
    id uuid NOT NULL,
    "channelKey" text NOT NULL,
    "displayName" text NOT NULL,
    kind text NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    config jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."NotificationDelivery" (
    id uuid NOT NULL,
    "notificationRequestId" uuid NOT NULL,
    "channelId" uuid NOT NULL,
    recipient text NOT NULL,
    status public."NotificationDeliveryStatus" DEFAULT 'PENDING'::public."NotificationDeliveryStatus" NOT NULL,
    "renderedSubject" text,
    "renderedBody" text NOT NULL,
    "providerMessageId" text,
    "failureReason" text,
    "attemptedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "attemptNumber" integer DEFAULT 1 NOT NULL,
    "nextAttemptAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."NotificationRequest" (
    id uuid NOT NULL,
    "eventName" text NOT NULL,
    "templateId" uuid NOT NULL,
    "channelId" uuid NOT NULL,
    recipient text NOT NULL,
    payload jsonb NOT NULL,
    status public."NotificationRequestStatus" DEFAULT 'QUEUED'::public."NotificationRequestStatus" NOT NULL,
    "failureReason" text,
    "requestedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deliveredAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "attemptCount" integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 1 NOT NULL,
    "nextAttemptAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."NotificationTemplate" (
    id uuid NOT NULL,
    "templateKey" text NOT NULL,
    "eventName" text NOT NULL,
    "displayName" text NOT NULL,
    "channelId" uuid NOT NULL,
    "subjectTemplate" text,
    "bodyTemplate" text NOT NULL,
    "isSystemManaged" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."OrgUnit" (
    id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    status public."OrgUnitStatus" DEFAULT 'ACTIVE'::public."OrgUnitStatus" NOT NULL,
    "parentOrgUnitId" uuid,
    "managerPersonId" uuid,
    "validFrom" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validTo" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "deletedAt" timestamp(3) with time zone,
    "tenantId" uuid,
    version integer DEFAULT 1 NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "OrgUnit_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);
--
--
CREATE TABLE public."OutboxEvent" (
    id uuid NOT NULL,
    topic text NOT NULL,
    "eventName" text NOT NULL,
    "aggregateType" text NOT NULL,
    "aggregateId" uuid NOT NULL,
    "correlationId" text,
    payload jsonb NOT NULL,
    status public."OutboxEventStatus" DEFAULT 'PENDING'::public."OutboxEventStatus" NOT NULL,
    "availableAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "publishedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" uuid,
    attempts integer DEFAULT 0 NOT NULL,
    "lastError" text,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public."PasswordResetToken" (
    id uuid NOT NULL,
    "accountId" uuid NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL,
    "usedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--
--
CREATE TABLE public."Person" (
    id uuid NOT NULL,
    "personNumber" text,
    "givenName" text NOT NULL,
    "familyName" text NOT NULL,
    "displayName" text NOT NULL,
    "primaryEmail" text,
    "employmentStatus" public."PersonEmploymentStatus" DEFAULT 'ACTIVE'::public."PersonEmploymentStatus" NOT NULL,
    "hiredAt" timestamp(3) with time zone,
    "terminatedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "deletedAt" timestamp(3) with time zone,
    grade text,
    role text,
    skillsets text[] DEFAULT ARRAY[]::text[] NOT NULL,
    location text,
    timezone text,
    "tenantId" uuid,
    version integer DEFAULT 1 NOT NULL,
    "probationEndsAt" date,
    "contractEndsAt" date,
    "lastHrReviewAt" date
);
--
--
CREATE TABLE public."PersonExternalIdentityLink" (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    provider text NOT NULL,
    "externalUserId" text NOT NULL,
    "externalPrincipalName" text,
    "matchedByStrategy" text NOT NULL,
    "sourceDepartment" text,
    "sourceJobTitle" text,
    "sourceAccountEnabled" boolean,
    "externalManagerUserId" text,
    "resolvedManagerPersonId" uuid,
    "sourceUpdatedAt" timestamp(3) with time zone,
    "lastSeenAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."PersonOrgMembership" (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    "orgUnitId" uuid NOT NULL,
    "positionId" uuid,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "validFrom" timestamp(3) with time zone NOT NULL,
    "validTo" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "PersonOrgMembership_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);
--
--
CREATE TABLE public."PersonResourcePoolMembership" (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    "resourcePoolId" uuid NOT NULL,
    "validFrom" timestamp(3) with time zone NOT NULL,
    "validTo" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "PersonResourcePoolMembership_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);
--
--
CREATE TABLE public."Position" (
    id uuid NOT NULL,
    "orgUnitId" uuid NOT NULL,
    "occupantPersonId" uuid,
    code text,
    title text NOT NULL,
    description text,
    "isManagerial" boolean DEFAULT false NOT NULL,
    "validFrom" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validTo" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "Position_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);
--
--
CREATE TABLE public."Project" (
    id uuid NOT NULL,
    "projectCode" text NOT NULL,
    name text NOT NULL,
    description text,
    status public."ProjectStatus" DEFAULT 'DRAFT'::public."ProjectStatus" NOT NULL,
    "startsOn" timestamp(3) with time zone,
    "endsOn" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "deletedAt" timestamp(3) with time zone,
    "projectManagerId" uuid,
    "clientId" uuid,
    "deliveryManagerId" uuid,
    "engagementModel" public."EngagementModel",
    "projectType" text,
    priority public."ProjectPriority" DEFAULT 'MEDIUM'::public."ProjectPriority",
    domain text,
    "techStack" text[] DEFAULT ARRAY[]::text[],
    tags text[] DEFAULT ARRAY[]::text[],
    "outcomeRating" text,
    "lessonsLearned" text,
    "wouldStaffSameWay" boolean,
    version integer DEFAULT 1 NOT NULL,
    "baselineEndsOn" timestamp(3) with time zone,
    "forecastEndsOn" timestamp(3) with time zone,
    "criticalPathFloatDays" integer,
    "baselineRequirements" integer,
    shape public."ProjectShape" DEFAULT 'STANDARD'::public."ProjectShape" NOT NULL,
    "programId" uuid,
    "settingsOverride" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "hasLiveSpcRates" boolean DEFAULT false NOT NULL,
    "tenantId" uuid,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "Project_startsOn_before_endsOn_check" CHECK ((("endsOn" IS NULL) OR ("startsOn" IS NULL) OR ("startsOn" <= "endsOn")))
);
--
--
CREATE TABLE public."ProjectAssignment" (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    "projectId" uuid NOT NULL,
    "requestedByPersonId" uuid,
    "assignmentCode" text,
    "staffingRole" text NOT NULL,
    status public."AssignmentStatus" DEFAULT 'CREATED'::public."AssignmentStatus" NOT NULL,
    "allocationPercent" numeric(5,2),
    "requestedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) with time zone,
    "validFrom" timestamp(3) with time zone NOT NULL,
    "validTo" timestamp(3) with time zone,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    "rejectionReason" text,
    "cancellationReason" text,
    "onHoldReason" text,
    "onHoldCaseId" uuid,
    "staffingRequestId" text,
    "workstreamId" uuid,
    "tenantId" uuid,
    "onboardingDate" timestamp(3) with time zone,
    "rejectionReasonCode" text,
    "requiresDirectorApproval" boolean DEFAULT false NOT NULL,
    "slaStage" public."AssignmentSlaStage",
    "slaDueAt" timestamp(3) with time zone,
    "slaBreachedAt" timestamp(3) with time zone,
    "appliedRateCardEntryId" uuid,
    "effectiveBillRate" numeric(10,2),
    "effectiveBillCurrency" character varying(3),
    "slaWarnedAt50pct" timestamp(3) with time zone,
    "slaWarnedAt75pct" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "ProjectAssignment_allocationPercent_range_check" CHECK ((("allocationPercent" IS NULL) OR (("allocationPercent" >= (0)::numeric) AND ("allocationPercent" <= (100)::numeric)))),
    CONSTRAINT "ProjectAssignment_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);
--
--
CREATE TABLE public."ProjectExternalLink" (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    provider text NOT NULL,
    "connectionKey" text,
    "externalProjectKey" text NOT NULL,
    "externalProjectName" text,
    "externalUrl" text,
    "providerEnvironment" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "lastSeenAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."ProjectPosition" (
    id uuid NOT NULL,
    "publicId" character varying(32),
    "projectId" uuid NOT NULL,
    "workstreamId" uuid,
    role text NOT NULL,
    skills text[] DEFAULT ARRAY[]::text[] NOT NULL,
    summary text,
    "requiredAllocationPercent" numeric(5,2) NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    priority public."StaffingRequestPriority" DEFAULT 'MEDIUM'::public."StaffingRequestPriority" NOT NULL,
    "requestedByPersonId" uuid,
    "fillStatus" public."ProjectPositionFillStatus" DEFAULT 'DRAFT'::public."ProjectPositionFillStatus" NOT NULL,
    "activePersonId" uuid,
    "activeAllocationPercent" numeric(5,2),
    "activeValidFrom" timestamp(3) with time zone,
    "activeValidTo" timestamp(3) with time zone,
    "onboardingDate" timestamp(3) with time zone,
    notes text,
    "requiresDirectorApproval" boolean DEFAULT false NOT NULL,
    "slaStage" public."AssignmentSlaStage",
    "slaDueAt" timestamp(3) with time zone,
    "slaBreachedAt" timestamp(3) with time zone,
    "slaWarnedAt50pct" timestamp(3) with time zone,
    "slaWarnedAt75pct" timestamp(3) with time zone,
    "appliedRateCardEntryId" uuid,
    "effectiveBillRate" numeric(10,2),
    "effectiveBillCurrency" character varying(3),
    "rejectionReason" text,
    "rejectionReasonCode" text,
    "cancellationReason" text,
    "onHoldReason" text,
    "onHoldCaseId" uuid,
    "releaseReason" text,
    version integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    "archivedAt" timestamp(3) with time zone,
    "tenantId" uuid,
    "legacyStaffingRequestId" uuid,
    "legacyAssignmentId" uuid
);
--
--
CREATE TABLE public."ProjectPositionCandidate" (
    id uuid NOT NULL,
    "positionId" uuid NOT NULL,
    "candidatePersonId" uuid NOT NULL,
    rank integer NOT NULL,
    "matchScore" numeric(6,3) NOT NULL,
    "availabilityPercent" numeric(5,2),
    "mismatchedSkills" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    rationale text,
    decision public."ProjectPositionCandidateDecision" DEFAULT 'PENDING'::public."ProjectPositionCandidateDecision" NOT NULL,
    "decidedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."ProjectPositionFillHistory" (
    id uuid NOT NULL,
    "positionId" uuid NOT NULL,
    "changeType" public."ProjectPositionFillChangeType" NOT NULL,
    "changedByPersonId" uuid,
    "changeReason" text,
    "previousPersonId" uuid,
    "newPersonId" uuid,
    "previousStatus" public."ProjectPositionFillStatus",
    "newStatus" public."ProjectPositionFillStatus",
    "previousSnapshot" jsonb,
    "newSnapshot" jsonb,
    "occurredAt" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--
--
CREATE TABLE public."RadiusReconciliationRecord" (
    id uuid NOT NULL,
    provider text NOT NULL,
    "externalAccountId" text NOT NULL,
    "externalUsername" text,
    "externalDisplayName" text,
    "externalEmail" text,
    "personId" uuid,
    "matchedByStrategy" text,
    category text NOT NULL,
    summary text NOT NULL,
    "candidatePersonIds" text[] DEFAULT ARRAY[]::text[],
    "accountPresenceState" text,
    "sourceType" text NOT NULL,
    "sourceUpdatedAt" timestamp(3) with time zone,
    "lastSeenAt" timestamp(3) with time zone,
    "lastEvaluatedAt" timestamp(3) with time zone NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."RefreshToken" (
    id uuid NOT NULL,
    "accountId" uuid NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL,
    "revokedAt" timestamp(3) with time zone,
    "userAgent" text,
    "ipAddress" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--
--
CREATE TABLE public."ReportingLine" (
    id uuid NOT NULL,
    "subjectPersonId" uuid NOT NULL,
    "managerPersonId" uuid NOT NULL,
    "relationshipType" public."ReportingLineType" NOT NULL,
    authority public."ReportingAuthority" DEFAULT 'VIEWER'::public."ReportingAuthority" NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "validFrom" timestamp(3) with time zone NOT NULL,
    "validTo" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "ReportingLine_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);
--
--
CREATE TABLE public."ResourcePool" (
    id uuid NOT NULL,
    "orgUnitId" uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."StaffingRequestProposalCandidate" (
    id uuid NOT NULL,
    "slateId" uuid NOT NULL,
    "candidatePersonId" uuid NOT NULL,
    rank integer NOT NULL,
    "matchScore" numeric(6,3) NOT NULL,
    "availabilityPercent" numeric(5,2),
    "mismatchedSkills" text[],
    rationale text,
    decision public."StaffingRequestProposalCandidateDecision" DEFAULT 'PENDING'::public."StaffingRequestProposalCandidateDecision" NOT NULL,
    "decidedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."StaffingRequestProposalSlate" (
    id uuid NOT NULL,
    "staffingRequestId" text NOT NULL,
    "proposedByPersonId" uuid NOT NULL,
    status public."StaffingRequestProposalSlateStatus" DEFAULT 'OPEN'::public."StaffingRequestProposalSlateStatus" NOT NULL,
    "proposedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) with time zone,
    "decidedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."Tenant" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "suspendedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."WorkEvidence" (
    id uuid NOT NULL,
    "workEvidenceSourceId" uuid NOT NULL,
    "personId" uuid,
    "projectId" uuid,
    "sourceRecordKey" text NOT NULL,
    "evidenceType" public."WorkEvidenceType" NOT NULL,
    "recordedAt" timestamp(3) with time zone NOT NULL,
    "occurredOn" timestamp(3) with time zone,
    "durationMinutes" integer,
    status public."WorkEvidenceStatus" DEFAULT 'CAPTURED'::public."WorkEvidenceStatus" NOT NULL,
    summary text,
    details jsonb,
    trace jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    capex boolean DEFAULT false NOT NULL,
    "tenantId" uuid,
    version integer DEFAULT 1 NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."WorkEvidenceLink" (
    id uuid NOT NULL,
    "workEvidenceId" uuid NOT NULL,
    provider text NOT NULL,
    "externalKey" text NOT NULL,
    "externalUrl" text,
    "linkType" public."WorkEvidenceLinkType" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public."WorkEvidenceSource" (
    id uuid NOT NULL,
    provider text NOT NULL,
    "sourceType" text NOT NULL,
    "connectionKey" text,
    "displayName" text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."WorkflowDefinition" (
    id uuid NOT NULL,
    "entityType" text NOT NULL,
    "workflowKey" text NOT NULL,
    "displayName" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status public."WorkflowDefinitionStatus" DEFAULT 'DRAFT'::public."WorkflowDefinitionStatus" NOT NULL,
    definition jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public."WorkflowStateDefinition" (
    id uuid NOT NULL,
    "workflowDefinitionId" uuid NOT NULL,
    "stateKey" text NOT NULL,
    "displayName" text NOT NULL,
    "sequenceNumber" integer DEFAULT 0 NOT NULL,
    "isInitial" boolean DEFAULT false NOT NULL,
    "isTerminal" boolean DEFAULT false NOT NULL,
    "validationSchema" jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);
--
--
CREATE TABLE public.budget_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "projectBudgetId" text NOT NULL,
    status public."BudgetApprovalStatus" DEFAULT 'PENDING'::public."BudgetApprovalStatus" NOT NULL,
    "requestedByPersonId" uuid NOT NULL,
    "decidedByPersonId" uuid,
    "decisionAt" timestamp(3) with time zone,
    "decisionReason" text,
    "requestedAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "requestedChange" jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.capacity_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "recordedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "tableName" text NOT NULL,
    "rowCount" bigint NOT NULL,
    "relSizeBytes" bigint,
    notes text
);
--
--
CREATE TABLE public.clients (
    id uuid NOT NULL,
    name text NOT NULL,
    industry text,
    "accountManagerPersonId" uuid,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "tenantId" uuid,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "personId" uuid NOT NULL,
    kind public."ContactKind" NOT NULL,
    label text NOT NULL,
    value text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.ddl_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    "sessionUser" text NOT NULL,
    "currentUser" text NOT NULL,
    "applicationName" text,
    "commandTag" text NOT NULL,
    "objectType" text,
    "objectIdentity" text,
    query text,
    "inFunction" text,
    "prevHash" text,
    "rowHash" text,
    "chainSeq" bigint NOT NULL
);
--
--
CREATE SEQUENCE public."ddl_audit_chainSeq_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
--
ALTER SEQUENCE public."ddl_audit_chainSeq_seq" OWNED BY public.ddl_audit."chainSeq";
--
--
CREATE VIEW public.domain_outbox_pending AS
 SELECT id,
    "aggregateType",
    "aggregateId",
    "eventName",
    "actorId",
    "correlationId",
    "causationId",
    payload,
    "createdAt",
    "chainSeq"
   FROM public."DomainEvent"
  WHERE ("publishedAt" IS NULL)
  ORDER BY "chainSeq";
--
--
CREATE VIEW public.employee_activity_view AS
 SELECT id,
    "aggregateId" AS "personId",
    "eventName" AS "eventType",
    "createdAt" AS "occurredAt",
    "actorId",
    COALESCE((payload ->> 'summary'::text), ''::text) AS summary,
    (NULLIF((payload ->> 'relatedEntityId'::text), ''::text))::uuid AS "relatedEntityId",
    payload AS metadata,
    "createdAt"
   FROM public."DomainEvent"
  WHERE ("aggregateType" = 'Person'::public."AggregateType");
--
--
CREATE TABLE public.employment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "personId" uuid NOT NULL,
    kind public."EmploymentEventKind" NOT NULL,
    "occurredOn" date NOT NULL,
    reason text,
    "recordedByPersonId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--
--
CREATE TABLE public.fiscal_calendars (
    id uuid NOT NULL,
    name text NOT NULL,
    "fiscalYear" integer NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    "regionCode" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.fiscal_periods (
    id uuid NOT NULL,
    "calendarId" uuid NOT NULL,
    "periodNumber" integer NOT NULL,
    quarter integer NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    label text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public.fx_rates (
    id uuid NOT NULL,
    "fromCurrency" character varying(3) NOT NULL,
    "toCurrency" character varying(3) NOT NULL,
    rate numeric(18,8) NOT NULL,
    "asOf" date NOT NULL,
    source text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public.help_articles (
    id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    body text NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "authorPersonId" uuid,
    "tenantId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.help_feedback (
    id uuid NOT NULL,
    "articleId" uuid NOT NULL,
    "actorPersonId" uuid,
    "wasHelpful" boolean NOT NULL,
    comment text,
    "tenantId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--
--
CREATE TABLE public.help_tips (
    id uuid NOT NULL,
    key text NOT NULL,
    "routePath" text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    "articleId" uuid,
    "displayOrder" integer DEFAULT 100 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "tenantId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.honeypot (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tableName" text NOT NULL,
    "rowId" uuid NOT NULL,
    intent text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--
--
CREATE TABLE public.honeypot_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "occurredAt" timestamp with time zone DEFAULT now() NOT NULL,
    "tableName" text NOT NULL,
    "rowId" uuid NOT NULL,
    operation text NOT NULL,
    "sessionUser" text NOT NULL,
    "currentUser" text NOT NULL,
    "applicationName" text,
    query text
);
--
--
CREATE TABLE public.idempotency_keys (
    id uuid NOT NULL,
    idempotency_key text NOT NULL,
    method text NOT NULL,
    path text NOT NULL,
    actor_id uuid,
    request_hash text NOT NULL,
    status public."IdempotencyKeyStatus" DEFAULT 'PENDING'::public."IdempotencyKeyStatus" NOT NULL,
    response_status integer,
    response_body jsonb,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(3) with time zone,
    expires_at timestamp(3) with time zone NOT NULL
);
--
--
CREATE TABLE public.in_app_notifications (
    id text NOT NULL,
    "recipientPersonId" text NOT NULL,
    "eventType" text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    "readAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicId" character varying(32),
    "tenantId" uuid,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public.leave_balances (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    year integer NOT NULL,
    "leaveType" public."LeaveRequestType" NOT NULL,
    entitlement numeric(5,1) NOT NULL,
    used numeric(5,1) DEFAULT 0 NOT NULL,
    pending numeric(5,1) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.leave_requests (
    id text NOT NULL,
    "personId" text NOT NULL,
    type public."LeaveRequestType" NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    notes text,
    status public."LeaveRequestStatus" DEFAULT 'PENDING'::public."LeaveRequestStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicId" character varying(32),
    "tenantId" uuid,
    version integer DEFAULT 1 NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    "reviewComment" text,
    CONSTRAINT "leave_requests_startDate_before_endDate_check" CHECK (("startDate" <= "endDate"))
);
--
--
CREATE TABLE public.migration_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    migration_mode text NOT NULL,
    migrations text,
    os_user text,
    git_email text,
    git_sha text,
    agent_id text,
    hostname text,
    success boolean NOT NULL,
    notes text,
    "prevHash" text,
    "rowHash" text,
    "chainSeq" bigint NOT NULL
);
--
--
CREATE SEQUENCE public."migration_audit_chainSeq_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
--
ALTER SEQUENCE public."migration_audit_chainSeq_seq" OWNED BY public.migration_audit."chainSeq";
--
--
CREATE TABLE public.onboarding_tour_progress (
    id uuid NOT NULL,
    "personId" uuid,
    "tourKey" text NOT NULL,
    "completedSteps" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "dismissedAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    "tenantId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.organization_configs (
    id text DEFAULT 'default'::text NOT NULL,
    "reportingCadence" text DEFAULT 'WEEKLY'::text NOT NULL,
    "tierLabels" jsonb DEFAULT '{"A": "General", "B": "Quadrant"}'::jsonb NOT NULL,
    "exceptionAxisThreshold" integer DEFAULT 1 NOT NULL,
    "riskCadenceMap" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "crStaleThresholdDays" integer DEFAULT 7 NOT NULL,
    "milestoneSlippedGraceDays" integer DEFAULT 0 NOT NULL,
    "timesheetGapDays" integer DEFAULT 14 NOT NULL,
    "pmReassignmentPolicy" text DEFAULT 'pm-or-director-or-admin'::text NOT NULL,
    "defaultShapeForNewProject" text DEFAULT 'STANDARD'::text NOT NULL,
    "defaultHourlyRate" numeric(10,2),
    "updatedByPersonId" uuid,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "ragThresholdCritical" numeric(3,2) DEFAULT 1.0 NOT NULL,
    "ragThresholdRed" numeric(3,2) DEFAULT 2.0 NOT NULL,
    "ragThresholdAmber" numeric(3,2) DEFAULT 3.0 NOT NULL,
    "colourBlindMode" boolean DEFAULT false NOT NULL,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public.overtime_exceptions (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    "caseRecordId" uuid NOT NULL,
    "maxOvertimeHoursPerWeek" integer NOT NULL,
    reason text NOT NULL,
    "effectiveFrom" timestamp(3) with time zone NOT NULL,
    "effectiveTo" timestamp(3) with time zone NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT overtime_exceptions_effective_range_check CHECK (("effectiveFrom" <= "effectiveTo")),
    CONSTRAINT "overtime_exceptions_maxOvertimeHoursPerWeek_nonnegative_check" CHECK ((("maxOvertimeHoursPerWeek" >= 0) AND ("maxOvertimeHoursPerWeek" <= 168)))
);
--
--
CREATE TABLE public.overtime_policies (
    id uuid NOT NULL,
    "orgUnitId" uuid,
    "resourcePoolId" uuid,
    "standardHoursPerWeek" integer NOT NULL,
    "maxOvertimeHoursPerWeek" integer NOT NULL,
    "setByPersonId" uuid NOT NULL,
    "approvalCaseId" uuid,
    "approvalStatus" text DEFAULT 'ACTIVE'::text NOT NULL,
    "effectiveFrom" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "effectiveTo" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT overtime_policies_effective_range_check CHECK ((("effectiveTo" IS NULL) OR ("effectiveFrom" <= "effectiveTo"))),
    CONSTRAINT "overtime_policies_maxOvertimeHoursPerWeek_nonnegative_check" CHECK ((("maxOvertimeHoursPerWeek" >= 0) AND ("maxOvertimeHoursPerWeek" <= 168))),
    CONSTRAINT "overtime_policies_standardHoursPerWeek_nonnegative_check" CHECK ((("standardHoursPerWeek" >= 0) AND ("standardHoursPerWeek" <= 168)))
);
--
--
CREATE TABLE public.period_locks (
    id text NOT NULL,
    "periodFrom" date NOT NULL,
    "periodTo" date NOT NULL,
    "lockedBy" text NOT NULL,
    "lockedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicId" character varying(32),
    CONSTRAINT period_locks_period_range_check CHECK (("periodFrom" <= "periodTo"))
);
--
--
CREATE TABLE public.person_cost_rates (
    id text NOT NULL,
    "personId" text NOT NULL,
    "effectiveFrom" date NOT NULL,
    "hourlyRate" numeric(10,2) NOT NULL,
    "rateType" public."PersonCostRateType" DEFAULT 'INTERNAL'::public."PersonCostRateType" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicId" character varying(32),
    "currencyCode" character varying(3),
    "createdByPersonId" uuid,
    CONSTRAINT "person_cost_rates_hourlyRate_positive_check" CHECK (("hourlyRate" > (0)::numeric))
);
--
--
CREATE TABLE public.person_notification_digest (
    "personId" uuid NOT NULL,
    "digestSchedule" public."DigestSchedule" DEFAULT 'IMMEDIATE'::public."DigestSchedule" NOT NULL,
    "quietHoursStart" text,
    "quietHoursEnd" text,
    "quietHoursEmailOnly" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    CONSTRAINT person_notification_digest_quiet_hours_end_format_check CHECK ((("quietHoursEnd" IS NULL) OR ("quietHoursEnd" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text))),
    CONSTRAINT person_notification_digest_quiet_hours_pairing_check CHECK (((("quietHoursStart" IS NULL) AND ("quietHoursEnd" IS NULL)) OR (("quietHoursStart" IS NOT NULL) AND ("quietHoursEnd" IS NOT NULL)))),
    CONSTRAINT person_notification_digest_quiet_hours_start_format_check CHECK ((("quietHoursStart" IS NULL) OR ("quietHoursStart" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text)))
);
--
--
CREATE TABLE public.person_notification_preferences (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    "channelKey" text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--
--
CREATE TABLE public.person_release_approvals (
    id uuid NOT NULL,
    "requestId" uuid NOT NULL,
    role character varying(40) NOT NULL,
    "actorPersonId" uuid NOT NULL,
    decision public."ReleaseApprovalDecision" NOT NULL,
    reason text,
    "decidedAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.person_release_requests (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    "initiatedByPersonId" uuid NOT NULL,
    reason text NOT NULL,
    "reasonCode" character varying(60),
    "targetTerminationDate" date NOT NULL,
    status public."PersonReleaseStatus" DEFAULT 'PENDING_APPROVAL'::public."PersonReleaseStatus" NOT NULL,
    "cancelledAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "tenantId" uuid,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.person_skills (
    id text NOT NULL,
    "personId" uuid NOT NULL,
    "skillId" text NOT NULL,
    proficiency integer NOT NULL,
    certified boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "certificationExpiresAt" date,
    CONSTRAINT person_skills_proficiency_range_check CHECK (((proficiency >= 1) AND (proficiency <= 5)))
);
--
--
CREATE TABLE public.planner_scenarios (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    "createdByPersonId" uuid NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    state jsonb NOT NULL,
    "summaryAssignments" integer DEFAULT 0 NOT NULL,
    "summaryHires" integer DEFAULT 0 NOT NULL,
    "summaryReleases" integer DEFAULT 0 NOT NULL,
    "summaryExtensions" integer DEFAULT 0 NOT NULL,
    "summaryAnomalies" integer DEFAULT 0 NOT NULL,
    "horizonFrom" date,
    "horizonWeeks" integer
);
--
--
CREATE TABLE public.platform_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    "updatedBy" text,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.project_activation_approvals (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    "requestedAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "requestedById" uuid NOT NULL,
    "decidedAt" timestamp(3) with time zone,
    "decidedById" uuid,
    decision public."ProjectActivationDecision",
    reason text,
    "tenantId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.project_budgets (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "fiscalYear" integer NOT NULL,
    "capexBudget" numeric(15,2) DEFAULT 0 NOT NULL,
    "opexBudget" numeric(15,2) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicId" character varying(32),
    "earnedValue" numeric(15,2),
    "actualCost" numeric(15,2),
    "plannedToDate" numeric(15,2),
    eac numeric(15,2),
    "capexCorrectPct" numeric(5,4),
    "workstreamId" uuid,
    "vendorBudget" numeric(15,2),
    "currencyCode" character varying(3),
    version integer DEFAULT 1 NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "project_budgets_capexBudget_nonnegative_check" CHECK (("capexBudget" >= (0)::numeric)),
    CONSTRAINT "project_budgets_opexBudget_nonnegative_check" CHECK (("opexBudget" >= (0)::numeric))
);
--
--
CREATE TABLE public.project_change_requests (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    title text NOT NULL,
    description text,
    status public."ChangeRequestStatus" DEFAULT 'PROPOSED'::public."ChangeRequestStatus" NOT NULL,
    severity public."ChangeRequestSeverity" DEFAULT 'MEDIUM'::public."ChangeRequestSeverity" NOT NULL,
    "outOfBaseline" boolean DEFAULT false NOT NULL,
    "impactScope" text,
    "impactSchedule" text,
    "impactBudget" text,
    "requesterPersonId" uuid,
    "decidedByPersonId" uuid,
    "decidedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "workstreamId" uuid,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.project_milestones (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    name text NOT NULL,
    description text,
    "plannedDate" date NOT NULL,
    "actualDate" date,
    status public."MilestoneStatus" DEFAULT 'PLANNED'::public."MilestoneStatus" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "workstreamId" uuid,
    "progressPct" integer DEFAULT 0 NOT NULL,
    "dependsOnMilestoneIds" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.project_radiator_overrides (
    id uuid NOT NULL,
    "snapshotId" uuid NOT NULL,
    "subDimensionKey" text NOT NULL,
    "autoScore" integer,
    "overrideScore" integer NOT NULL,
    reason text NOT NULL,
    "overriddenByPersonId" uuid NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "project_radiator_overrides_overrideScore_check" CHECK ((("overrideScore" >= 0) AND ("overrideScore" <= 4)))
);
--
--
CREATE TABLE public.project_rag_snapshots (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    "weekStarting" date NOT NULL,
    "staffingRag" public."RagRating" NOT NULL,
    "scheduleRag" public."RagRating" NOT NULL,
    "budgetRag" public."RagRating" NOT NULL,
    "clientRag" public."RagRating",
    "overallRag" public."RagRating" NOT NULL,
    "autoComputedOverall" public."RagRating",
    "isOverridden" boolean DEFAULT false NOT NULL,
    "overrideReason" text,
    narrative text,
    accomplishments text,
    "nextSteps" text,
    "recordedByPersonId" uuid NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "scopeRag" public."RagRating",
    "peopleRag" public."RagRating",
    "dimensionDetails" jsonb,
    "riskSummary" text,
    "scopeScore" integer,
    "scheduleScore" integer,
    "budgetScore" integer,
    "peopleScore" integer,
    "overallScore" integer,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.project_retrospectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "projectId" uuid NOT NULL,
    "outcomeRating" text,
    "lessonsLearned" text,
    "wouldStaffSameWay" boolean,
    "retrospectiveDate" date,
    "facilitatedByPersonId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.project_risks (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    title text NOT NULL,
    description text,
    category public."RiskCategory" NOT NULL,
    "riskType" public."RiskType" DEFAULT 'RISK'::public."RiskType" NOT NULL,
    probability integer DEFAULT 3 NOT NULL,
    impact integer DEFAULT 3 NOT NULL,
    strategy public."RiskStrategy",
    "strategyDescription" text,
    "damageControlPlan" text,
    status public."RiskStatus" DEFAULT 'IDENTIFIED'::public."RiskStatus" NOT NULL,
    "ownerPersonId" uuid,
    "assigneePersonId" uuid,
    "raisedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) with time zone,
    "resolvedAt" timestamp(3) with time zone,
    "convertedFromRiskId" uuid,
    "relatedCaseId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "workstreamId" uuid,
    "lastReviewedAt" timestamp(3) with time zone,
    "reviewCadence" public."RiskReviewCadence",
    version integer DEFAULT 1 NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT project_risks_impact_range_check CHECK (((impact >= 1) AND (impact <= 5))),
    CONSTRAINT project_risks_probability_range_check CHECK (((probability >= 1) AND (probability <= 5)))
);
--
--
CREATE TABLE public.project_role_plans (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    "roleName" text NOT NULL,
    "seniorityLevel" text,
    headcount integer DEFAULT 1 NOT NULL,
    "allocationPercent" numeric(5,2),
    "plannedStartDate" timestamp(3) with time zone,
    "plannedEndDate" timestamp(3) with time zone,
    "requiredSkillIds" text[] DEFAULT ARRAY[]::text[],
    source public."RolePlanSource" DEFAULT 'INTERNAL'::public."RolePlanSource" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "standardHourlyRate" numeric(10,2),
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "project_role_plans_allocationPercent_range_check" CHECK ((("allocationPercent" IS NULL) OR (("allocationPercent" >= (0)::numeric) AND ("allocationPercent" <= (100)::numeric)))),
    CONSTRAINT project_role_plans_headcount_positive_check CHECK ((headcount >= 1))
);
--
--
CREATE TABLE public.project_vendor_engagements (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    "vendorId" uuid NOT NULL,
    "roleSummary" text NOT NULL,
    headcount integer DEFAULT 1 NOT NULL,
    "monthlyRate" numeric(12,2),
    "blendedDayRate" numeric(10,2),
    "startDate" timestamp(3) with time zone,
    "endDate" timestamp(3) with time zone,
    status public."VendorEngagementStatus" DEFAULT 'ACTIVE'::public."VendorEngagementStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "currencyCode" character varying(3),
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "project_vendor_engagements_dateRange_check" CHECK ((("endDate" IS NULL) OR ("startDate" IS NULL) OR ("startDate" <= "endDate"))),
    CONSTRAINT project_vendor_engagements_headcount_positive_check CHECK ((headcount >= 1))
);
--
--
CREATE TABLE public.project_workstreams (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    name text NOT NULL,
    "streamLeadPersonId" uuid,
    "budgetShare" numeric(5,4),
    "startDate" date NOT NULL,
    "endDate" date,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.public_holidays (
    id uuid NOT NULL,
    date date NOT NULL,
    name text NOT NULL,
    "countryCode" text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public.pulse_entries (
    id text NOT NULL,
    "personId" text NOT NULL,
    "weekStart" date NOT NULL,
    mood integer NOT NULL,
    note text,
    "submittedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT pulse_entries_mood_range_check CHECK (((mood >= 1) AND (mood <= 5)))
);
--
--
CREATE TABLE public.pulse_reports (
    id uuid NOT NULL,
    "projectId" uuid NOT NULL,
    "weekStarting" date NOT NULL,
    dimensions jsonb DEFAULT '{}'::jsonb NOT NULL,
    "overallNarrative" text,
    "submittedByPersonId" uuid,
    "submittedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.radiator_threshold_configs (
    id uuid NOT NULL,
    "subDimensionKey" text NOT NULL,
    "thresholdScore4" double precision NOT NULL,
    "thresholdScore3" double precision NOT NULL,
    "thresholdScore2" double precision NOT NULL,
    "thresholdScore1" double precision NOT NULL,
    direction public."ThresholdDirection" DEFAULT 'HIGHER_IS_BETTER'::public."ThresholdDirection" NOT NULL,
    "updatedByPersonId" uuid,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public.rate_card_entries (
    id uuid NOT NULL,
    "rateCardId" uuid NOT NULL,
    "staffingRole" text NOT NULL,
    grade text NOT NULL,
    "requiredSkills" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "hourlyRate" numeric(10,2) NOT NULL,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.rate_cards (
    id uuid NOT NULL,
    name text NOT NULL,
    "currencyCode" character varying(3) NOT NULL,
    "clientId" uuid,
    "validFrom" date NOT NULL,
    "validTo" date,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "tenantId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.responsibility_rules (
    id uuid NOT NULL,
    "actionKind" public."ResponsibilityActionKind" NOT NULL,
    "scopeKind" public."ResponsibilityScope" NOT NULL,
    "scopeValue" text,
    mode public."ResponsibilityResolutionMode" NOT NULL,
    "targetRole" text,
    "targetPersonId" uuid,
    priority integer DEFAULT 100 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "tenantId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.setup_run_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    step_key text NOT NULL,
    sequence integer NOT NULL,
    level public."SetupRunLogLevel" DEFAULT 'INFO'::public."SetupRunLogLevel" NOT NULL,
    event text NOT NULL,
    payload_redacted jsonb,
    duration_ms integer,
    occurred_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--
--
CREATE TABLE public.setup_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    step_key text NOT NULL,
    status public."SetupRunStatus" DEFAULT 'PENDING'::public."SetupRunStatus" NOT NULL,
    started_at timestamp(3) with time zone,
    finished_at timestamp(3) with time zone,
    error_payload jsonb,
    actor_id uuid,
    payload_redacted jsonb,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL
);
--
--
CREATE TABLE public.skills (
    id text NOT NULL,
    name text NOT NULL,
    category text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicId" character varying(32),
    "tenantId" uuid,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.staffing_request_fulfilments (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "assignedPersonId" text NOT NULL,
    "proposedByPersonId" text NOT NULL,
    "fulfilledAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE TABLE public.staffing_requests (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "requestedByPersonId" text NOT NULL,
    role text NOT NULL,
    skills text[] NOT NULL,
    summary text,
    "allocationPercent" numeric(5,2) NOT NULL,
    "headcountRequired" integer DEFAULT 1 NOT NULL,
    "headcountFulfilled" integer DEFAULT 0 NOT NULL,
    priority public."StaffingRequestPriority" DEFAULT 'MEDIUM'::public."StaffingRequestPriority" NOT NULL,
    status public."StaffingRequestStatus" DEFAULT 'DRAFT'::public."StaffingRequestStatus" NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    "cancelledAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicId" character varying(32),
    "tenantId" uuid,
    version integer DEFAULT 1 NOT NULL,
    "candidatePersonId" uuid,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "staffing_requests_allocationPercent_range_check" CHECK ((("allocationPercent" >= (0)::numeric) AND ("allocationPercent" <= (100)::numeric))),
    CONSTRAINT "staffing_requests_headcountFulfilled_nonnegative_check" CHECK ((("headcountFulfilled" >= 0) AND ("headcountFulfilled" <= "headcountRequired"))),
    CONSTRAINT "staffing_requests_headcountRequired_positive_check" CHECK (("headcountRequired" >= 1)),
    CONSTRAINT "staffing_requests_startDate_before_endDate_check" CHECK (("startDate" <= "endDate"))
);
--
--
CREATE TABLE public.timesheet_entries (
    id text NOT NULL,
    "timesheetWeekId" text NOT NULL,
    "projectId" text NOT NULL,
    "assignmentId" text,
    date date NOT NULL,
    hours numeric(5,2) NOT NULL,
    capex boolean DEFAULT false NOT NULL,
    description text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "benchCategory" text DEFAULT ''::text NOT NULL,
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "workLabel" text DEFAULT ''::text NOT NULL,
    "workItemId" text,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT timesheet_entries_hours_nonnegative_check CHECK (((hours >= (0)::numeric) AND (hours <= (24)::numeric)))
);
--
--
CREATE TABLE public.timesheet_weeks (
    id text NOT NULL,
    "personId" text NOT NULL,
    "weekStart" date NOT NULL,
    status public."TimesheetStatus" DEFAULT 'DRAFT'::public."TimesheetStatus" NOT NULL,
    "submittedAt" timestamp(3) with time zone,
    "approvedBy" text,
    "approvedAt" timestamp(3) with time zone,
    "rejectedReason" text,
    version integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "overtimeApproved" boolean DEFAULT false NOT NULL,
    "overtimeHours" numeric(5,2),
    "overtimeThreshold" integer,
    "standardHours" numeric(5,2),
    "totalHours" numeric(5,2),
    id_new uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicId" character varying(32),
    "tenantId" uuid,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid,
    CONSTRAINT "timesheet_weeks_overtimeHours_nonnegative_check" CHECK ((("overtimeHours" IS NULL) OR ("overtimeHours" >= (0)::numeric))),
    CONSTRAINT "timesheet_weeks_standardHours_nonnegative_check" CHECK ((("standardHours" IS NULL) OR ("standardHours" >= (0)::numeric))),
    CONSTRAINT "timesheet_weeks_totalHours_nonnegative_check" CHECK ((("totalHours" IS NULL) OR ("totalHours" >= (0)::numeric)))
);
--
--
CREATE TABLE public.undo_actions (
    id uuid NOT NULL,
    "actorId" uuid NOT NULL,
    "actionType" text NOT NULL,
    "entityId" uuid NOT NULL,
    "inversePayload" jsonb NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL,
    "consumedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--
--
CREATE TABLE public.vendor_skill_areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "vendorId" uuid NOT NULL,
    "skillArea" text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "createdByPersonId" uuid
);
--
--
CREATE TABLE public.vendors (
    id uuid NOT NULL,
    name text NOT NULL,
    "contactName" text,
    "contactEmail" text,
    "contractType" public."VendorContractType" DEFAULT 'STAFF_AUGMENTATION'::public."VendorContractType" NOT NULL,
    "skillAreas" text[] DEFAULT ARRAY[]::text[],
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "tenantId" uuid,
    "createdByPersonId" uuid,
    "updatedByPersonId" uuid
);
--
--
CREATE MATERIALIZED VIEW read_models.mv_person_week_hours AS
 SELECT tw."weekStart",
    tw."personId",
    (COALESCE(sum(te.hours), (0)::numeric))::numeric(8,2) AS "totalHours",
    count(te.id) AS "entryCount",
    now() AS "refreshedAt"
   FROM (public.timesheet_weeks tw
     LEFT JOIN public.timesheet_entries te ON ((te."timesheetWeekId" = tw.id)))
  GROUP BY tw."weekStart", tw."personId"
  WITH NO DATA;
--
--
CREATE MATERIALIZED VIEW read_models.mv_project_weekly_roster AS
 SELECT (date_trunc('week'::text, "validFrom"))::date AS "weekStart",
    "projectId",
    "personId",
    (max("allocationPercent"))::numeric(5,2) AS "allocationPercent",
    count(*) AS "assignmentCount",
    now() AS "refreshedAt"
   FROM public."ProjectAssignment" pa
  WHERE (("archivedAt" IS NULL) AND ("personId" IS NOT NULL))
  GROUP BY (date_trunc('week'::text, "validFrom")), "projectId", "personId"
  WITH NO DATA;
--
--
ALTER TABLE ONLY public."DomainEvent" ATTACH PARTITION public."DomainEvent_default" DEFAULT;
--
--
ALTER TABLE ONLY public."AuditLog" ALTER COLUMN "chainSeq" SET DEFAULT nextval('public."AuditLog_chainSeq_seq"'::regclass);
--
--
ALTER TABLE ONLY public."DomainEvent" ALTER COLUMN "chainSeq" SET DEFAULT nextval('public."DomainEvent_chainSeq_seq"'::regclass);
--
--
ALTER TABLE ONLY public.ddl_audit ALTER COLUMN "chainSeq" SET DEFAULT nextval('public."ddl_audit_chainSeq_seq"'::regclass);
--
--
ALTER TABLE ONLY public.migration_audit ALTER COLUMN "chainSeq" SET DEFAULT nextval('public."migration_audit_chainSeq_seq"'::regclass);
--
--
ALTER TABLE ONLY public."AssignmentApproval"
    ADD CONSTRAINT "AssignmentApproval_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."AssignmentHistory"
    ADD CONSTRAINT "AssignmentHistory_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."CaseParticipant"
    ADD CONSTRAINT "CaseParticipant_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."CaseType"
    ADD CONSTRAINT "CaseType_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."Currency"
    ADD CONSTRAINT "Currency_pkey" PRIMARY KEY (code);
--
--
ALTER TABLE ONLY public."CustomFieldDefinition"
    ADD CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."CustomFieldValue"
    ADD CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."DomainEvent"
    ADD CONSTRAINT "DomainEvent_pkey" PRIMARY KEY (id, "createdAt");
--
--
ALTER TABLE ONLY public."DomainEvent_default"
    ADD CONSTRAINT "DomainEvent_default_pkey" PRIMARY KEY (id, "createdAt");
--
--
ALTER TABLE ONLY public."EmployeeActivityEvent"
    ADD CONSTRAINT "EmployeeActivityEvent_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."EntityLayoutDefinition"
    ADD CONSTRAINT "EntityLayoutDefinition_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."ExternalAccountLink"
    ADD CONSTRAINT "ExternalAccountLink_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."ExternalSyncState"
    ADD CONSTRAINT "ExternalSyncState_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."IntegrationSyncState"
    ADD CONSTRAINT "IntegrationSyncState_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."LocalAccount"
    ADD CONSTRAINT "LocalAccount_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."M365DirectoryReconciliationRecord"
    ADD CONSTRAINT "M365DirectoryReconciliationRecord_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."MetadataDictionary"
    ADD CONSTRAINT "MetadataDictionary_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."MetadataEntry"
    ADD CONSTRAINT "MetadataEntry_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."NotificationChannel"
    ADD CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."NotificationRequest"
    ADD CONSTRAINT "NotificationRequest_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."NotificationTemplate"
    ADD CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."OutboxEvent"
    ADD CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."PersonExternalIdentityLink"
    ADD CONSTRAINT "PersonExternalIdentityLink_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."PersonResourcePoolMembership"
    ADD CONSTRAINT "PersonResourcePoolMembership_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."Person"
    ADD CONSTRAINT "Person_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."ProjectExternalLink"
    ADD CONSTRAINT "ProjectExternalLink_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."ProjectPositionCandidate"
    ADD CONSTRAINT "ProjectPositionCandidate_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."ProjectPositionFillHistory"
    ADD CONSTRAINT "ProjectPositionFillHistory_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."RadiusReconciliationRecord"
    ADD CONSTRAINT "RadiusReconciliationRecord_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."ReportingLine"
    ADD CONSTRAINT "ReportingLine_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."ResourcePool"
    ADD CONSTRAINT "ResourcePool_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."StaffingRequestProposalCandidate"
    ADD CONSTRAINT "StaffingRequestProposalCandidate_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."StaffingRequestProposalSlate"
    ADD CONSTRAINT "StaffingRequestProposalSlate_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_code_key" UNIQUE (code);
--
--
ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."WorkEvidenceLink"
    ADD CONSTRAINT "WorkEvidenceLink_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."WorkEvidenceSource"
    ADD CONSTRAINT "WorkEvidenceSource_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."WorkflowDefinition"
    ADD CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public."WorkflowStateDefinition"
    ADD CONSTRAINT "WorkflowStateDefinition_pkey" PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT budget_approvals_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.capacity_audit
    ADD CONSTRAINT capacity_audit_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.ddl_audit
    ADD CONSTRAINT ddl_audit_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.employment_events
    ADD CONSTRAINT employment_events_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.fiscal_calendars
    ADD CONSTRAINT fiscal_calendars_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.fiscal_periods
    ADD CONSTRAINT fiscal_periods_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT fx_rates_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_slug_key UNIQUE (slug);
--
--
ALTER TABLE ONLY public.help_feedback
    ADD CONSTRAINT help_feedback_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.help_tips
    ADD CONSTRAINT help_tips_key_key UNIQUE (key);
--
--
ALTER TABLE ONLY public.help_tips
    ADD CONSTRAINT help_tips_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.honeypot_alerts
    ADD CONSTRAINT honeypot_alerts_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.honeypot
    ADD CONSTRAINT honeypot_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.honeypot
    ADD CONSTRAINT "honeypot_tableName_rowId_key" UNIQUE ("tableName", "rowId");
--
--
ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.migration_audit
    ADD CONSTRAINT migration_audit_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.onboarding_tour_progress
    ADD CONSTRAINT "onboarding_tour_progress_personId_tourKey_key" UNIQUE ("personId", "tourKey");
--
--
ALTER TABLE ONLY public.onboarding_tour_progress
    ADD CONSTRAINT onboarding_tour_progress_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.organization_configs
    ADD CONSTRAINT organization_configs_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.overtime_exceptions
    ADD CONSTRAINT overtime_exceptions_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT overtime_policies_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.period_locks
    ADD CONSTRAINT period_locks_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.person_cost_rates
    ADD CONSTRAINT person_cost_rates_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.person_notification_digest
    ADD CONSTRAINT person_notification_digest_pkey PRIMARY KEY ("personId");
--
--
ALTER TABLE ONLY public.person_notification_preferences
    ADD CONSTRAINT person_notification_preferences_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.person_release_approvals
    ADD CONSTRAINT person_release_approvals_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.person_release_requests
    ADD CONSTRAINT person_release_requests_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.person_skills
    ADD CONSTRAINT person_skills_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.planner_scenarios
    ADD CONSTRAINT planner_scenarios_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (key);
--
--
ALTER TABLE ONLY public.project_activation_approvals
    ADD CONSTRAINT project_activation_approvals_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT project_budgets_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT "project_budgets_projectId_fiscalYear_key" UNIQUE ("projectId", "fiscalYear");
--
--
ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT project_change_requests_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_radiator_overrides
    ADD CONSTRAINT project_radiator_overrides_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_rag_snapshots
    ADD CONSTRAINT project_rag_snapshots_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT project_retrospectives_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT "project_retrospectives_projectId_key" UNIQUE ("projectId");
--
--
ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT project_risks_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_role_plans
    ADD CONSTRAINT project_role_plans_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT project_vendor_engagements_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.project_workstreams
    ADD CONSTRAINT project_workstreams_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.public_holidays
    ADD CONSTRAINT public_holidays_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.pulse_entries
    ADD CONSTRAINT pulse_entries_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.pulse_reports
    ADD CONSTRAINT pulse_reports_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.radiator_threshold_configs
    ADD CONSTRAINT radiator_threshold_configs_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.rate_card_entries
    ADD CONSTRAINT rate_card_entries_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT rate_cards_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.responsibility_rules
    ADD CONSTRAINT responsibility_rules_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.setup_run_logs
    ADD CONSTRAINT setup_run_logs_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.setup_runs
    ADD CONSTRAINT setup_runs_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.staffing_request_fulfilments
    ADD CONSTRAINT staffing_request_fulfilments_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.staffing_requests
    ADD CONSTRAINT staffing_requests_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.timesheet_entries
    ADD CONSTRAINT timesheet_entries_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.timesheet_weeks
    ADD CONSTRAINT timesheet_weeks_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.undo_actions
    ADD CONSTRAINT undo_actions_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.vendor_skill_areas
    ADD CONSTRAINT vendor_skill_areas_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.vendor_skill_areas
    ADD CONSTRAINT "vendor_skill_areas_vendorId_skillArea_key" UNIQUE ("vendorId", "skillArea");
--
--
ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);
--
--
CREATE INDEX "AssignmentApproval_assignmentId_decision_idx" ON public."AssignmentApproval" USING btree ("assignmentId", decision);
--
--
CREATE UNIQUE INDEX "AssignmentApproval_assignmentId_sequenceNumber_key" ON public."AssignmentApproval" USING btree ("assignmentId", "sequenceNumber");
--
--
CREATE INDEX "AssignmentApproval_createdByPersonId_idx" ON public."AssignmentApproval" USING btree ("createdByPersonId");
--
--
CREATE INDEX "AssignmentApproval_decidedByPersonId_idx" ON public."AssignmentApproval" USING btree ("decidedByPersonId");
--
--
CREATE INDEX "AssignmentApproval_updatedByPersonId_idx" ON public."AssignmentApproval" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "AssignmentHistory_assignmentId_occurredAt_idx" ON public."AssignmentHistory" USING btree ("assignmentId", "occurredAt");
--
--
CREATE INDEX "AssignmentHistory_changedByPersonId_idx" ON public."AssignmentHistory" USING btree ("changedByPersonId");
--
--
CREATE INDEX "AuditLog_actorId_idx" ON public."AuditLog" USING btree ("actorId");
--
--
CREATE INDEX "AuditLog_aggregateType_aggregateId_idx" ON public."AuditLog" USING btree ("aggregateType", "aggregateId");
--
--
CREATE INDEX "AuditLog_correlationId_idx" ON public."AuditLog" USING btree ("correlationId");
--
--
CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");
--
--
CREATE INDEX "AuditLog_tenantId_idx" ON public."AuditLog" USING btree ("tenantId");
--
--
CREATE UNIQUE INDEX "CaseParticipant_caseRecordId_personId_role_key" ON public."CaseParticipant" USING btree ("caseRecordId", "personId", role);
--
--
CREATE INDEX "CaseParticipant_createdByPersonId_idx" ON public."CaseParticipant" USING btree ("createdByPersonId");
--
--
CREATE INDEX "CaseParticipant_personId_role_idx" ON public."CaseParticipant" USING btree ("personId", role);
--
--
CREATE INDEX "CaseRecord_active_idx" ON public."CaseRecord" USING btree (id) WHERE ("archivedAt" IS NULL);
--
--
CREATE UNIQUE INDEX "CaseRecord_caseNumber_key" ON public."CaseRecord" USING btree ("caseNumber");
--
--
CREATE INDEX "CaseRecord_caseTypeId_status_idx" ON public."CaseRecord" USING btree ("caseTypeId", status);
--
--
CREATE INDEX "CaseRecord_createdByPersonId_idx" ON public."CaseRecord" USING btree ("createdByPersonId");
--
--
CREATE INDEX "CaseRecord_ownerPersonId_status_idx" ON public."CaseRecord" USING btree ("ownerPersonId", status);
--
--
CREATE INDEX "CaseRecord_relatedAssignmentId_idx" ON public."CaseRecord" USING btree ("relatedAssignmentId");
--
--
CREATE INDEX "CaseRecord_relatedProjectId_idx" ON public."CaseRecord" USING btree ("relatedProjectId");
--
--
CREATE INDEX "CaseRecord_subjectPersonId_status_idx" ON public."CaseRecord" USING btree ("subjectPersonId", status);
--
--
CREATE INDEX "CaseRecord_summary_trgm_idx" ON public."CaseRecord" USING gin (summary public.gin_trgm_ops) WHERE (summary IS NOT NULL);
--
--
CREATE INDEX "CaseRecord_tenantId_idx" ON public."CaseRecord" USING btree ("tenantId");
--
--
CREATE INDEX "CaseRecord_updatedByPersonId_idx" ON public."CaseRecord" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "CaseStep_assignedToPersonId_status_idx" ON public."CaseStep" USING btree ("assignedToPersonId", status);
--
--
CREATE INDEX "CaseStep_caseRecordId_idx" ON public."CaseStep" USING btree ("caseRecordId");
--
--
CREATE UNIQUE INDEX "CaseStep_caseRecordId_stepKey_key" ON public."CaseStep" USING btree ("caseRecordId", "stepKey");
--
--
CREATE INDEX "CaseStep_createdByPersonId_idx" ON public."CaseStep" USING btree ("createdByPersonId");
--
--
CREATE INDEX "CaseStep_updatedByPersonId_idx" ON public."CaseStep" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "CaseStep_workflowStateDefinitionId_idx" ON public."CaseStep" USING btree ("workflowStateDefinitionId");
--
--
CREATE INDEX "CaseType_archivedAt_idx" ON public."CaseType" USING btree ("archivedAt");
--
--
CREATE INDEX "CaseType_createdByPersonId_idx" ON public."CaseType" USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "CaseType_key_key" ON public."CaseType" USING btree (key);
--
--
CREATE INDEX "CaseType_updatedByPersonId_idx" ON public."CaseType" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "CaseType_workflowDefinitionId_idx" ON public."CaseType" USING btree ("workflowDefinitionId");
--
--
CREATE INDEX "Currency_createdByPersonId_idx" ON public."Currency" USING btree ("createdByPersonId");
--
--
CREATE INDEX "CustomFieldDefinition_createdByPersonId_idx" ON public."CustomFieldDefinition" USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "CustomFieldDefinition_entityType_fieldKey_scopeOrgUnitId_key" ON public."CustomFieldDefinition" USING btree ("entityType", "fieldKey", "scopeOrgUnitId");
--
--
CREATE INDEX "CustomFieldDefinition_entityType_isEnabled_archivedAt_idx" ON public."CustomFieldDefinition" USING btree ("entityType", "isEnabled", "archivedAt");
--
--
CREATE INDEX "CustomFieldDefinition_metadataDictionaryId_idx" ON public."CustomFieldDefinition" USING btree ("metadataDictionaryId");
--
--
CREATE INDEX "CustomFieldDefinition_scopeOrgUnitId_idx" ON public."CustomFieldDefinition" USING btree ("scopeOrgUnitId");
--
--
CREATE INDEX "CustomFieldDefinition_updatedByPersonId_idx" ON public."CustomFieldDefinition" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "CustomFieldValue_createdByPersonId_idx" ON public."CustomFieldValue" USING btree ("createdByPersonId");
--
--
CREATE INDEX "CustomFieldValue_customFieldDefinitionId_idx" ON public."CustomFieldValue" USING btree ("customFieldDefinitionId");
--
--
CREATE INDEX "CustomFieldValue_entityType_entityId_archivedAt_idx" ON public."CustomFieldValue" USING btree ("entityType", "entityId", "archivedAt");
--
--
CREATE UNIQUE INDEX "CustomFieldValue_entityType_entityId_customFieldDefinitionI_key" ON public."CustomFieldValue" USING btree ("entityType", "entityId", "customFieldDefinitionId");
--
--
CREATE INDEX "CustomFieldValue_updatedByPersonId_idx" ON public."CustomFieldValue" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "DomainEvent_aggregate_idx" ON ONLY public."DomainEvent" USING btree ("aggregateType", "aggregateId");
--
--
CREATE INDEX "DomainEvent_correlationId_idx" ON ONLY public."DomainEvent" USING btree ("correlationId") WHERE ("correlationId" IS NOT NULL);
--
--
CREATE INDEX "DomainEvent_createdAt_idx" ON ONLY public."DomainEvent" USING btree ("createdAt" DESC);
--
--
CREATE INDEX "DomainEvent_default_aggregateType_aggregateId_idx" ON public."DomainEvent_default" USING btree ("aggregateType", "aggregateId");
--
--
CREATE INDEX "DomainEvent_unpublished_idx" ON ONLY public."DomainEvent" USING btree ("chainSeq") WHERE ("publishedAt" IS NULL);
--
--
CREATE INDEX "DomainEvent_default_chainSeq_idx" ON public."DomainEvent_default" USING btree ("chainSeq") WHERE ("publishedAt" IS NULL);
--
--
CREATE INDEX "DomainEvent_default_correlationId_idx" ON public."DomainEvent_default" USING btree ("correlationId") WHERE ("correlationId" IS NOT NULL);
--
--
CREATE INDEX "DomainEvent_default_createdAt_idx" ON public."DomainEvent_default" USING btree ("createdAt" DESC);
--
--
CREATE INDEX "DomainEvent_eventName_idx" ON ONLY public."DomainEvent" USING btree ("eventName");
--
--
CREATE INDEX "DomainEvent_default_eventName_idx" ON public."DomainEvent_default" USING btree ("eventName");
--
--
CREATE INDEX "DomainEvent_tenantId_idx" ON ONLY public."DomainEvent" USING btree ("tenantId");
--
--
CREATE INDEX "DomainEvent_default_tenantId_idx" ON public."DomainEvent_default" USING btree ("tenantId");
--
--
CREATE INDEX "EmployeeActivityEvent_actorId_idx" ON public."EmployeeActivityEvent" USING btree ("actorId");
--
--
CREATE INDEX "EmployeeActivityEvent_eventType_idx" ON public."EmployeeActivityEvent" USING btree ("eventType");
--
--
CREATE INDEX "EmployeeActivityEvent_personId_occurredAt_idx" ON public."EmployeeActivityEvent" USING btree ("personId", "occurredAt");
--
--
CREATE INDEX "EntityLayoutDefinition_createdByPersonId_idx" ON public."EntityLayoutDefinition" USING btree ("createdByPersonId");
--
--
CREATE INDEX "EntityLayoutDefinition_entityType_isDefault_archivedAt_idx" ON public."EntityLayoutDefinition" USING btree ("entityType", "isDefault", "archivedAt");
--
--
CREATE UNIQUE INDEX "EntityLayoutDefinition_entityType_layoutKey_version_scopeOr_key" ON public."EntityLayoutDefinition" USING btree ("entityType", "layoutKey", version, "scopeOrgUnitId");
--
--
CREATE INDEX "EntityLayoutDefinition_scopeOrgUnitId_idx" ON public."EntityLayoutDefinition" USING btree ("scopeOrgUnitId");
--
--
CREATE INDEX "EntityLayoutDefinition_updatedByPersonId_idx" ON public."EntityLayoutDefinition" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "ExternalAccountLink_externalEmail_idx" ON public."ExternalAccountLink" USING btree ("externalEmail");
--
--
CREATE INDEX "ExternalAccountLink_externalUsername_idx" ON public."ExternalAccountLink" USING btree ("externalUsername");
--
--
CREATE INDEX "ExternalAccountLink_personId_idx" ON public."ExternalAccountLink" USING btree ("personId");
--
--
CREATE UNIQUE INDEX "ExternalAccountLink_provider_externalAccountId_key" ON public."ExternalAccountLink" USING btree (provider, "externalAccountId");
--
--
CREATE INDEX "ExternalAccountLink_provider_personId_idx" ON public."ExternalAccountLink" USING btree (provider, "personId");
--
--
CREATE UNIQUE INDEX "ExternalSyncState_projectExternalLinkId_key" ON public."ExternalSyncState" USING btree ("projectExternalLinkId");
--
--
CREATE INDEX "IntegrationSyncState_createdByPersonId_idx" ON public."IntegrationSyncState" USING btree ("createdByPersonId");
--
--
CREATE INDEX "IntegrationSyncState_provider_resourceType_lastStatus_idx" ON public."IntegrationSyncState" USING btree (provider, "resourceType", "lastStatus");
--
--
CREATE UNIQUE INDEX "IntegrationSyncState_provider_resourceType_scopeKey_key" ON public."IntegrationSyncState" USING btree (provider, "resourceType", "scopeKey");
--
--
CREATE INDEX "IntegrationSyncState_updatedByPersonId_idx" ON public."IntegrationSyncState" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "LocalAccount_createdByPersonId_idx" ON public."LocalAccount" USING btree ("createdByPersonId");
--
--
CREATE INDEX "LocalAccount_email_idx" ON public."LocalAccount" USING btree (email);
--
--
CREATE UNIQUE INDEX "LocalAccount_email_key" ON public."LocalAccount" USING btree (email);
--
--
CREATE INDEX "LocalAccount_personId_idx" ON public."LocalAccount" USING btree ("personId");
--
--
CREATE UNIQUE INDEX "LocalAccount_personId_key" ON public."LocalAccount" USING btree ("personId");
--
--
CREATE INDEX "LocalAccount_tenantId_idx" ON public."LocalAccount" USING btree ("tenantId");
--
--
CREATE INDEX "LocalAccount_updatedByPersonId_idx" ON public."LocalAccount" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "M365DirectoryReconciliationRecord_createdByPersonId_idx" ON public."M365DirectoryReconciliationRecord" USING btree ("createdByPersonId");
--
--
CREATE INDEX "M365DirectoryReconciliationRecord_lastEvaluatedAt_idx" ON public."M365DirectoryReconciliationRecord" USING btree ("lastEvaluatedAt");
--
--
CREATE INDEX "M365DirectoryReconciliationRecord_personId_idx" ON public."M365DirectoryReconciliationRecord" USING btree ("personId");
--
--
CREATE INDEX "M365DirectoryReconciliationRecord_provider_category_idx" ON public."M365DirectoryReconciliationRecord" USING btree (provider, category);
--
--
CREATE UNIQUE INDEX "M365DirectoryReconciliationRecord_provider_externalUserId_key" ON public."M365DirectoryReconciliationRecord" USING btree (provider, "externalUserId");
--
--
CREATE INDEX "M365DirectoryReconciliationRecord_resolvedManagerPersonId_idx" ON public."M365DirectoryReconciliationRecord" USING btree ("resolvedManagerPersonId");
--
--
CREATE INDEX "M365DirectoryReconciliationRecord_updatedByPersonId_idx" ON public."M365DirectoryReconciliationRecord" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "MetadataDictionary_createdByPersonId_idx" ON public."MetadataDictionary" USING btree ("createdByPersonId");
--
--
CREATE INDEX "MetadataDictionary_entityType_archivedAt_idx" ON public."MetadataDictionary" USING btree ("entityType", "archivedAt");
--
--
CREATE UNIQUE INDEX "MetadataDictionary_entityType_dictionaryKey_scopeOrgUnitId_key" ON public."MetadataDictionary" USING btree ("entityType", "dictionaryKey", "scopeOrgUnitId");
--
--
CREATE INDEX "MetadataDictionary_scopeOrgUnitId_idx" ON public."MetadataDictionary" USING btree ("scopeOrgUnitId");
--
--
CREATE INDEX "MetadataDictionary_updatedByPersonId_idx" ON public."MetadataDictionary" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "MetadataEntry_createdByPersonId_idx" ON public."MetadataEntry" USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "MetadataEntry_metadataDictionaryId_entryKey_key" ON public."MetadataEntry" USING btree ("metadataDictionaryId", "entryKey");
--
--
CREATE INDEX "MetadataEntry_metadataDictionaryId_isEnabled_archivedAt_idx" ON public."MetadataEntry" USING btree ("metadataDictionaryId", "isEnabled", "archivedAt");
--
--
CREATE INDEX "MetadataEntry_updatedByPersonId_idx" ON public."MetadataEntry" USING btree ("updatedByPersonId");
--
--
CREATE UNIQUE INDEX "NotificationChannel_channelKey_key" ON public."NotificationChannel" USING btree ("channelKey");
--
--
CREATE INDEX "NotificationChannel_createdByPersonId_idx" ON public."NotificationChannel" USING btree ("createdByPersonId");
--
--
CREATE INDEX "NotificationChannel_kind_isEnabled_idx" ON public."NotificationChannel" USING btree (kind, "isEnabled");
--
--
CREATE INDEX "NotificationChannel_updatedByPersonId_idx" ON public."NotificationChannel" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "NotificationDelivery_channelId_idx" ON public."NotificationDelivery" USING btree ("channelId");
--
--
CREATE INDEX "NotificationDelivery_createdByPersonId_idx" ON public."NotificationDelivery" USING btree ("createdByPersonId");
--
--
CREATE INDEX "NotificationDelivery_notificationRequestId_attemptedAt_idx" ON public."NotificationDelivery" USING btree ("notificationRequestId", "attemptedAt");
--
--
CREATE INDEX "NotificationDelivery_status_attemptedAt_idx" ON public."NotificationDelivery" USING btree (status, "attemptedAt");
--
--
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON public."NotificationDelivery" USING btree (status, "nextAttemptAt");
--
--
CREATE INDEX "NotificationDelivery_updatedByPersonId_idx" ON public."NotificationDelivery" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "NotificationRequest_channelId_idx" ON public."NotificationRequest" USING btree ("channelId");
--
--
CREATE INDEX "NotificationRequest_createdByPersonId_idx" ON public."NotificationRequest" USING btree ("createdByPersonId");
--
--
CREATE INDEX "NotificationRequest_eventName_status_requestedAt_idx" ON public."NotificationRequest" USING btree ("eventName", status, "requestedAt");
--
--
CREATE INDEX "NotificationRequest_recipient_requestedAt_idx" ON public."NotificationRequest" USING btree (recipient, "requestedAt");
--
--
CREATE INDEX "NotificationRequest_status_nextAttemptAt_idx" ON public."NotificationRequest" USING btree (status, "nextAttemptAt");
--
--
CREATE INDEX "NotificationRequest_templateId_idx" ON public."NotificationRequest" USING btree ("templateId");
--
--
CREATE INDEX "NotificationRequest_updatedByPersonId_idx" ON public."NotificationRequest" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "NotificationTemplate_channelId_archivedAt_idx" ON public."NotificationTemplate" USING btree ("channelId", "archivedAt");
--
--
CREATE INDEX "NotificationTemplate_createdByPersonId_idx" ON public."NotificationTemplate" USING btree ("createdByPersonId");
--
--
CREATE INDEX "NotificationTemplate_eventName_archivedAt_idx" ON public."NotificationTemplate" USING btree ("eventName", "archivedAt");
--
--
CREATE UNIQUE INDEX "NotificationTemplate_templateKey_key" ON public."NotificationTemplate" USING btree ("templateKey");
--
--
CREATE INDEX "NotificationTemplate_updatedByPersonId_idx" ON public."NotificationTemplate" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "OrgUnit_active_idx" ON public."OrgUnit" USING btree (id) WHERE ("archivedAt" IS NULL);
--
--
CREATE UNIQUE INDEX "OrgUnit_code_key" ON public."OrgUnit" USING btree (code);
--
--
CREATE INDEX "OrgUnit_createdByPersonId_idx" ON public."OrgUnit" USING btree ("createdByPersonId");
--
--
CREATE INDEX "OrgUnit_managerPersonId_idx" ON public."OrgUnit" USING btree ("managerPersonId");
--
--
CREATE INDEX "OrgUnit_parentOrgUnitId_idx" ON public."OrgUnit" USING btree ("parentOrgUnitId");
--
--
CREATE INDEX "OrgUnit_status_archivedAt_idx" ON public."OrgUnit" USING btree (status, "archivedAt");
--
--
CREATE INDEX "OrgUnit_tenantId_idx" ON public."OrgUnit" USING btree ("tenantId");
--
--
CREATE INDEX "OrgUnit_updatedByPersonId_idx" ON public."OrgUnit" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON public."OutboxEvent" USING btree ("aggregateType", "aggregateId");
--
--
CREATE INDEX "OutboxEvent_createdAt_idx" ON public."OutboxEvent" USING btree ("createdAt");
--
--
CREATE INDEX "OutboxEvent_createdByPersonId_idx" ON public."OutboxEvent" USING btree ("createdByPersonId");
--
--
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON public."OutboxEvent" USING btree (status, "availableAt");
--
--
CREATE INDEX "OutboxEvent_tenantId_idx" ON public."OutboxEvent" USING btree ("tenantId");
--
--
CREATE INDEX "PasswordResetToken_accountId_idx" ON public."PasswordResetToken" USING btree ("accountId");
--
--
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON public."PasswordResetToken" USING btree ("tokenHash");
--
--
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON public."PasswordResetToken" USING btree ("tokenHash");
--
--
CREATE INDEX "PersonExternalIdentityLink_createdByPersonId_idx" ON public."PersonExternalIdentityLink" USING btree ("createdByPersonId");
--
--
CREATE INDEX "PersonExternalIdentityLink_externalPrincipalName_idx" ON public."PersonExternalIdentityLink" USING btree ("externalPrincipalName");
--
--
CREATE INDEX "PersonExternalIdentityLink_personId_idx" ON public."PersonExternalIdentityLink" USING btree ("personId");
--
--
CREATE UNIQUE INDEX "PersonExternalIdentityLink_provider_externalUserId_key" ON public."PersonExternalIdentityLink" USING btree (provider, "externalUserId");
--
--
CREATE UNIQUE INDEX "PersonExternalIdentityLink_provider_personId_key" ON public."PersonExternalIdentityLink" USING btree (provider, "personId");
--
--
CREATE INDEX "PersonExternalIdentityLink_resolvedManagerPersonId_idx" ON public."PersonExternalIdentityLink" USING btree ("resolvedManagerPersonId");
--
--
CREATE INDEX "PersonExternalIdentityLink_updatedByPersonId_idx" ON public."PersonExternalIdentityLink" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "PersonOrgMembership_createdByPersonId_idx" ON public."PersonOrgMembership" USING btree ("createdByPersonId");
--
--
CREATE INDEX "PersonOrgMembership_orgUnitId_validFrom_validTo_idx" ON public."PersonOrgMembership" USING btree ("orgUnitId", "validFrom", "validTo");
--
--
CREATE UNIQUE INDEX "PersonOrgMembership_personId_orgUnitId_validFrom_key" ON public."PersonOrgMembership" USING btree ("personId", "orgUnitId", "validFrom");
--
--
CREATE INDEX "PersonOrgMembership_personId_validFrom_validTo_idx" ON public."PersonOrgMembership" USING btree ("personId", "validFrom", "validTo");
--
--
CREATE INDEX "PersonOrgMembership_positionId_idx" ON public."PersonOrgMembership" USING btree ("positionId");
--
--
CREATE INDEX "PersonOrgMembership_updatedByPersonId_idx" ON public."PersonOrgMembership" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "PersonResourcePoolMembership_createdByPersonId_idx" ON public."PersonResourcePoolMembership" USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "PersonResourcePoolMembership_personId_resourcePoolId_validF_key" ON public."PersonResourcePoolMembership" USING btree ("personId", "resourcePoolId", "validFrom");
--
--
CREATE INDEX "PersonResourcePoolMembership_personId_validFrom_validTo_idx" ON public."PersonResourcePoolMembership" USING btree ("personId", "validFrom", "validTo");
--
--
CREATE INDEX "PersonResourcePoolMembership_resourcePoolId_validFrom_valid_idx" ON public."PersonResourcePoolMembership" USING btree ("resourcePoolId", "validFrom", "validTo");
--
--
CREATE INDEX "PersonResourcePoolMembership_updatedByPersonId_idx" ON public."PersonResourcePoolMembership" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "Person_active_idx" ON public."Person" USING btree (id) WHERE ("archivedAt" IS NULL);
--
--
CREATE INDEX "Person_displayName_trgm_idx" ON public."Person" USING gin ("displayName" public.gin_trgm_ops);
--
--
CREATE INDEX "Person_employmentStatus_archivedAt_idx" ON public."Person" USING btree ("employmentStatus", "archivedAt");
--
--
CREATE INDEX "Person_familyName_givenName_idx" ON public."Person" USING btree ("familyName", "givenName");
--
--
CREATE UNIQUE INDEX "Person_personNumber_key" ON public."Person" USING btree ("personNumber");
--
--
CREATE UNIQUE INDEX "Person_primaryEmail_key" ON public."Person" USING btree ("primaryEmail");
--
--
CREATE INDEX "Person_tenantId_idx" ON public."Person" USING btree ("tenantId");
--
--
CREATE UNIQUE INDEX "Person_tenantId_personNumber_key" ON public."Person" USING btree ("tenantId", "personNumber") WHERE ("personNumber" IS NOT NULL);
--
--
CREATE UNIQUE INDEX "Person_tenantId_primaryEmail_key" ON public."Person" USING btree ("tenantId", "primaryEmail") WHERE ("primaryEmail" IS NOT NULL);
--
--
CREATE INDEX "Position_active_idx" ON public."Position" USING btree (id) WHERE ("archivedAt" IS NULL);
--
--
CREATE INDEX "Position_createdByPersonId_idx" ON public."Position" USING btree ("createdByPersonId");
--
--
CREATE INDEX "Position_occupantPersonId_idx" ON public."Position" USING btree ("occupantPersonId");
--
--
CREATE UNIQUE INDEX "Position_orgUnitId_code_key" ON public."Position" USING btree ("orgUnitId", code);
--
--
CREATE INDEX "Position_orgUnitId_validFrom_validTo_idx" ON public."Position" USING btree ("orgUnitId", "validFrom", "validTo");
--
--
CREATE INDEX "Position_updatedByPersonId_idx" ON public."Position" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "ProjectAssignment_active_idx" ON public."ProjectAssignment" USING btree (id) WHERE ("archivedAt" IS NULL);
--
--
CREATE INDEX "ProjectAssignment_appliedRateCardEntryId_idx" ON public."ProjectAssignment" USING btree ("appliedRateCardEntryId");
--
--
CREATE UNIQUE INDEX "ProjectAssignment_assignmentCode_key" ON public."ProjectAssignment" USING btree ("assignmentCode");
--
--
CREATE INDEX "ProjectAssignment_createdByPersonId_idx" ON public."ProjectAssignment" USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "ProjectAssignment_personId_projectId_validFrom_key" ON public."ProjectAssignment" USING btree ("personId", "projectId", "validFrom");
--
--
CREATE INDEX "ProjectAssignment_personId_status_validFrom_validTo_idx" ON public."ProjectAssignment" USING btree ("personId", status, "validFrom", "validTo");
--
--
CREATE INDEX "ProjectAssignment_projectId_status_validFrom_validTo_idx" ON public."ProjectAssignment" USING btree ("projectId", status, "validFrom", "validTo");
--
--
CREATE INDEX "ProjectAssignment_requestedByPersonId_idx" ON public."ProjectAssignment" USING btree ("requestedByPersonId");
--
--
CREATE INDEX "ProjectAssignment_slaStage_slaDueAt_idx" ON public."ProjectAssignment" USING btree ("slaStage", "slaDueAt");
--
--
CREATE INDEX "ProjectAssignment_staffingRequestId_idx" ON public."ProjectAssignment" USING btree ("staffingRequestId");
--
--
CREATE INDEX "ProjectAssignment_status_slaDueAt_idx" ON public."ProjectAssignment" USING btree (status, "slaDueAt");
--
--
CREATE UNIQUE INDEX "ProjectAssignment_tenantId_assignmentCode_key" ON public."ProjectAssignment" USING btree ("tenantId", "assignmentCode") WHERE ("assignmentCode" IS NOT NULL);
--
--
CREATE INDEX "ProjectAssignment_tenantId_idx" ON public."ProjectAssignment" USING btree ("tenantId");
--
--
CREATE INDEX "ProjectAssignment_updatedByPersonId_idx" ON public."ProjectAssignment" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "ProjectExternalLink_createdByPersonId_idx" ON public."ProjectExternalLink" USING btree ("createdByPersonId");
--
--
CREATE INDEX "ProjectExternalLink_projectId_idx" ON public."ProjectExternalLink" USING btree ("projectId");
--
--
CREATE INDEX "ProjectExternalLink_provider_archivedAt_idx" ON public."ProjectExternalLink" USING btree (provider, "archivedAt");
--
--
CREATE UNIQUE INDEX "ProjectExternalLink_provider_externalProjectKey_key" ON public."ProjectExternalLink" USING btree (provider, "externalProjectKey");
--
--
CREATE INDEX "ProjectExternalLink_updatedByPersonId_idx" ON public."ProjectExternalLink" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "ProjectPositionCandidate_candidatePersonId_idx" ON public."ProjectPositionCandidate" USING btree ("candidatePersonId");
--
--
CREATE INDEX "ProjectPositionCandidate_createdByPersonId_idx" ON public."ProjectPositionCandidate" USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "ProjectPositionCandidate_positionId_candidatePersonId_key" ON public."ProjectPositionCandidate" USING btree ("positionId", "candidatePersonId");
--
--
CREATE INDEX "ProjectPositionCandidate_positionId_decision_idx" ON public."ProjectPositionCandidate" USING btree ("positionId", decision);
--
--
CREATE INDEX "ProjectPositionCandidate_positionId_rank_idx" ON public."ProjectPositionCandidate" USING btree ("positionId", rank);
--
--
CREATE INDEX "ProjectPositionCandidate_updatedByPersonId_idx" ON public."ProjectPositionCandidate" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "ProjectPositionFillHistory_changeType_idx" ON public."ProjectPositionFillHistory" USING btree ("changeType");
--
--
CREATE INDEX "ProjectPositionFillHistory_changedByPersonId_idx" ON public."ProjectPositionFillHistory" USING btree ("changedByPersonId");
--
--
CREATE INDEX "ProjectPositionFillHistory_positionId_occurredAt_idx" ON public."ProjectPositionFillHistory" USING btree ("positionId", "occurredAt");
--
--
CREATE INDEX "ProjectPosition_activePerson_window_idx" ON public."ProjectPosition" USING btree ("activePersonId", "fillStatus", "activeValidFrom", "activeValidTo");
--
--
CREATE INDEX "ProjectPosition_appliedRateCardEntryId_idx" ON public."ProjectPosition" USING btree ("appliedRateCardEntryId");
--
--
CREATE INDEX "ProjectPosition_createdByPersonId_idx" ON public."ProjectPosition" USING btree ("createdByPersonId");
--
--
CREATE INDEX "ProjectPosition_fillStatus_priority_startDate_idx" ON public."ProjectPosition" USING btree ("fillStatus", priority, "startDate");
--
--
CREATE INDEX "ProjectPosition_fillStatus_slaDueAt_idx" ON public."ProjectPosition" USING btree ("fillStatus", "slaDueAt");
--
--
CREATE INDEX "ProjectPosition_legacyAssignmentId_idx" ON public."ProjectPosition" USING btree ("legacyAssignmentId");
--
--
CREATE INDEX "ProjectPosition_legacyStaffingRequestId_idx" ON public."ProjectPosition" USING btree ("legacyStaffingRequestId");
--
--
CREATE INDEX "ProjectPosition_projectId_fillStatus_idx" ON public."ProjectPosition" USING btree ("projectId", "fillStatus");
--
--
CREATE UNIQUE INDEX "ProjectPosition_publicId_key" ON public."ProjectPosition" USING btree ("publicId");
--
--
CREATE INDEX "ProjectPosition_requestedByPersonId_idx" ON public."ProjectPosition" USING btree ("requestedByPersonId");
--
--
CREATE INDEX "ProjectPosition_slaStage_slaDueAt_idx" ON public."ProjectPosition" USING btree ("slaStage", "slaDueAt");
--
--
CREATE INDEX "ProjectPosition_tenantId_idx" ON public."ProjectPosition" USING btree ("tenantId");
--
--
CREATE INDEX "ProjectPosition_updatedByPersonId_idx" ON public."ProjectPosition" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "Project_active_idx" ON public."Project" USING btree (id) WHERE ("archivedAt" IS NULL);
--
--
CREATE INDEX "Project_clientId_idx" ON public."Project" USING btree ("clientId");
--
--
CREATE INDEX "Project_createdByPersonId_idx" ON public."Project" USING btree ("createdByPersonId");
--
--
CREATE INDEX "Project_deliveryManagerId_idx" ON public."Project" USING btree ("deliveryManagerId");
--
--
CREATE INDEX "Project_name_idx" ON public."Project" USING btree (name);
--
--
CREATE INDEX "Project_name_trgm_idx" ON public."Project" USING gin (name public.gin_trgm_ops);
--
--
CREATE INDEX "Project_programId_idx" ON public."Project" USING btree ("programId");
--
--
CREATE UNIQUE INDEX "Project_projectCode_key" ON public."Project" USING btree ("projectCode");
--
--
CREATE INDEX "Project_projectManagerId_idx" ON public."Project" USING btree ("projectManagerId");
--
--
CREATE INDEX "Project_shape_idx" ON public."Project" USING btree (shape);
--
--
CREATE INDEX "Project_status_archivedAt_idx" ON public."Project" USING btree (status, "archivedAt");
--
--
CREATE INDEX "Project_tenantId_idx" ON public."Project" USING btree ("tenantId");
--
--
CREATE INDEX "Project_updatedByPersonId_idx" ON public."Project" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "RadiusReconciliationRecord_createdByPersonId_idx" ON public."RadiusReconciliationRecord" USING btree ("createdByPersonId");
--
--
CREATE INDEX "RadiusReconciliationRecord_lastEvaluatedAt_idx" ON public."RadiusReconciliationRecord" USING btree ("lastEvaluatedAt");
--
--
CREATE INDEX "RadiusReconciliationRecord_personId_idx" ON public."RadiusReconciliationRecord" USING btree ("personId");
--
--
CREATE INDEX "RadiusReconciliationRecord_provider_category_idx" ON public."RadiusReconciliationRecord" USING btree (provider, category);
--
--
CREATE UNIQUE INDEX "RadiusReconciliationRecord_provider_externalAccountId_key" ON public."RadiusReconciliationRecord" USING btree (provider, "externalAccountId");
--
--
CREATE INDEX "RadiusReconciliationRecord_updatedByPersonId_idx" ON public."RadiusReconciliationRecord" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "RefreshToken_accountId_idx" ON public."RefreshToken" USING btree ("accountId");
--
--
CREATE INDEX "RefreshToken_expiresAt_idx" ON public."RefreshToken" USING btree ("expiresAt");
--
--
CREATE INDEX "RefreshToken_tokenHash_idx" ON public."RefreshToken" USING btree ("tokenHash");
--
--
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON public."RefreshToken" USING btree ("tokenHash");
--
--
CREATE INDEX "ReportingLine_createdByPersonId_idx" ON public."ReportingLine" USING btree ("createdByPersonId");
--
--
CREATE INDEX "ReportingLine_isPrimary_validTo_idx" ON public."ReportingLine" USING btree ("isPrimary", "validTo");
--
--
CREATE INDEX "ReportingLine_managerPersonId_relationshipType_validFrom_va_idx" ON public."ReportingLine" USING btree ("managerPersonId", "relationshipType", "validFrom", "validTo");
--
--
CREATE UNIQUE INDEX "ReportingLine_subjectPersonId_managerPersonId_relationshipT_key" ON public."ReportingLine" USING btree ("subjectPersonId", "managerPersonId", "relationshipType", "validFrom");
--
--
CREATE INDEX "ReportingLine_subjectPersonId_relationshipType_validFrom_va_idx" ON public."ReportingLine" USING btree ("subjectPersonId", "relationshipType", "validFrom", "validTo");
--
--
CREATE INDEX "ReportingLine_updatedByPersonId_idx" ON public."ReportingLine" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "ResourcePool_active_idx" ON public."ResourcePool" USING btree (id) WHERE ("archivedAt" IS NULL);
--
--
CREATE INDEX "ResourcePool_archivedAt_idx" ON public."ResourcePool" USING btree ("archivedAt");
--
--
CREATE UNIQUE INDEX "ResourcePool_code_key" ON public."ResourcePool" USING btree (code);
--
--
CREATE INDEX "ResourcePool_createdByPersonId_idx" ON public."ResourcePool" USING btree ("createdByPersonId");
--
--
CREATE INDEX "ResourcePool_orgUnitId_idx" ON public."ResourcePool" USING btree ("orgUnitId");
--
--
CREATE INDEX "ResourcePool_updatedByPersonId_idx" ON public."ResourcePool" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "StaffingRequestProposalCandidate_candidatePersonId_idx" ON public."StaffingRequestProposalCandidate" USING btree ("candidatePersonId");
--
--
CREATE INDEX "StaffingRequestProposalCandidate_createdByPersonId_idx" ON public."StaffingRequestProposalCandidate" USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "StaffingRequestProposalCandidate_slateId_candidatePersonId_key" ON public."StaffingRequestProposalCandidate" USING btree ("slateId", "candidatePersonId");
--
--
CREATE INDEX "StaffingRequestProposalCandidate_slateId_decision_idx" ON public."StaffingRequestProposalCandidate" USING btree ("slateId", decision);
--
--
CREATE UNIQUE INDEX "StaffingRequestProposalCandidate_slateId_picked_unique" ON public."StaffingRequestProposalCandidate" USING btree ("slateId") WHERE (decision = 'PICKED'::public."StaffingRequestProposalCandidateDecision");
--
--
CREATE INDEX "StaffingRequestProposalCandidate_slateId_rank_idx" ON public."StaffingRequestProposalCandidate" USING btree ("slateId", rank);
--
--
CREATE INDEX "StaffingRequestProposalCandidate_updatedByPersonId_idx" ON public."StaffingRequestProposalCandidate" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "StaffingRequestProposalSlate_createdByPersonId_idx" ON public."StaffingRequestProposalSlate" USING btree ("createdByPersonId");
--
--
CREATE INDEX "StaffingRequestProposalSlate_proposedByPersonId_idx" ON public."StaffingRequestProposalSlate" USING btree ("proposedByPersonId");
--
--
CREATE INDEX "StaffingRequestProposalSlate_staffingRequestId_idx" ON public."StaffingRequestProposalSlate" USING btree ("staffingRequestId");
--
--
CREATE UNIQUE INDEX "StaffingRequestProposalSlate_staffingRequestId_key" ON public."StaffingRequestProposalSlate" USING btree ("staffingRequestId");
--
--
CREATE INDEX "StaffingRequestProposalSlate_status_proposedAt_idx" ON public."StaffingRequestProposalSlate" USING btree (status, "proposedAt");
--
--
CREATE INDEX "StaffingRequestProposalSlate_updatedByPersonId_idx" ON public."StaffingRequestProposalSlate" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "Tenant_createdByPersonId_idx" ON public."Tenant" USING btree ("createdByPersonId");
--
--
CREATE INDEX "Tenant_updatedByPersonId_idx" ON public."Tenant" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "WorkEvidenceLink_createdByPersonId_idx" ON public."WorkEvidenceLink" USING btree ("createdByPersonId");
--
--
CREATE INDEX "WorkEvidenceLink_provider_externalKey_idx" ON public."WorkEvidenceLink" USING btree (provider, "externalKey");
--
--
CREATE UNIQUE INDEX "WorkEvidenceLink_workEvidenceId_provider_externalKey_key" ON public."WorkEvidenceLink" USING btree ("workEvidenceId", provider, "externalKey");
--
--
CREATE INDEX "WorkEvidenceSource_createdByPersonId_idx" ON public."WorkEvidenceSource" USING btree ("createdByPersonId");
--
--
CREATE INDEX "WorkEvidenceSource_provider_archivedAt_idx" ON public."WorkEvidenceSource" USING btree (provider, "archivedAt");
--
--
CREATE UNIQUE INDEX "WorkEvidenceSource_provider_sourceType_connectionKey_key" ON public."WorkEvidenceSource" USING btree (provider, "sourceType", "connectionKey");
--
--
CREATE INDEX "WorkEvidenceSource_updatedByPersonId_idx" ON public."WorkEvidenceSource" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "WorkEvidence_createdByPersonId_idx" ON public."WorkEvidence" USING btree ("createdByPersonId");
--
--
CREATE INDEX "WorkEvidence_personId_recordedAt_idx" ON public."WorkEvidence" USING btree ("personId", "recordedAt");
--
--
CREATE INDEX "WorkEvidence_projectId_recordedAt_idx" ON public."WorkEvidence" USING btree ("projectId", "recordedAt");
--
--
CREATE INDEX "WorkEvidence_status_archivedAt_idx" ON public."WorkEvidence" USING btree (status, "archivedAt");
--
--
CREATE INDEX "WorkEvidence_tenantId_idx" ON public."WorkEvidence" USING btree ("tenantId");
--
--
CREATE INDEX "WorkEvidence_updatedByPersonId_idx" ON public."WorkEvidence" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "WorkEvidence_workEvidenceSourceId_recordedAt_idx" ON public."WorkEvidence" USING btree ("workEvidenceSourceId", "recordedAt");
--
--
CREATE UNIQUE INDEX "WorkEvidence_workEvidenceSourceId_sourceRecordKey_key" ON public."WorkEvidence" USING btree ("workEvidenceSourceId", "sourceRecordKey");
--
--
CREATE INDEX "WorkflowDefinition_createdByPersonId_idx" ON public."WorkflowDefinition" USING btree ("createdByPersonId");
--
--
CREATE INDEX "WorkflowDefinition_entityType_status_archivedAt_idx" ON public."WorkflowDefinition" USING btree ("entityType", status, "archivedAt");
--
--
CREATE UNIQUE INDEX "WorkflowDefinition_entityType_workflowKey_version_key" ON public."WorkflowDefinition" USING btree ("entityType", "workflowKey", version);
--
--
CREATE INDEX "WorkflowDefinition_updatedByPersonId_idx" ON public."WorkflowDefinition" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "WorkflowStateDefinition_createdByPersonId_idx" ON public."WorkflowStateDefinition" USING btree ("createdByPersonId");
--
--
CREATE INDEX "WorkflowStateDefinition_updatedByPersonId_idx" ON public."WorkflowStateDefinition" USING btree ("updatedByPersonId");
--
--
CREATE INDEX "WorkflowStateDefinition_workflowDefinitionId_sequenceNumber_idx" ON public."WorkflowStateDefinition" USING btree ("workflowDefinitionId", "sequenceNumber");
--
--
CREATE UNIQUE INDEX "WorkflowStateDefinition_workflowDefinitionId_stateKey_key" ON public."WorkflowStateDefinition" USING btree ("workflowDefinitionId", "stateKey");
--
--
CREATE INDEX "budget_approvals_createdByPersonId_idx" ON public.budget_approvals USING btree ("createdByPersonId");
--
--
CREATE INDEX "budget_approvals_decidedByPersonId_idx" ON public.budget_approvals USING btree ("decidedByPersonId");
--
--
CREATE INDEX "budget_approvals_projectBudgetId_idx" ON public.budget_approvals USING btree ("projectBudgetId");
--
--
CREATE INDEX "budget_approvals_requestedByPersonId_idx" ON public.budget_approvals USING btree ("requestedByPersonId");
--
--
CREATE INDEX budget_approvals_status_idx ON public.budget_approvals USING btree (status);
--
--
CREATE INDEX "budget_approvals_updatedByPersonId_idx" ON public.budget_approvals USING btree ("updatedByPersonId");
--
--
CREATE INDEX capacity_audit_table_recorded_idx ON public.capacity_audit USING btree ("tableName", "recordedAt" DESC);
--
--
CREATE INDEX "clients_accountManagerPersonId_idx" ON public.clients USING btree ("accountManagerPersonId");
--
--
CREATE INDEX "clients_createdByPersonId_idx" ON public.clients USING btree ("createdByPersonId");
--
--
CREATE INDEX "clients_isActive_idx" ON public.clients USING btree ("isActive");
--
--
CREATE UNIQUE INDEX clients_name_key ON public.clients USING btree (name);
--
--
CREATE INDEX "clients_tenantId_idx" ON public.clients USING btree ("tenantId");
--
--
CREATE INDEX "clients_updatedByPersonId_idx" ON public.clients USING btree ("updatedByPersonId");
--
--
CREATE INDEX "contacts_createdByPersonId_idx" ON public.contacts USING btree ("createdByPersonId");
--
--
CREATE INDEX contacts_kind_idx ON public.contacts USING btree (kind);
--
--
CREATE INDEX "contacts_personId_idx" ON public.contacts USING btree ("personId");
--
--
CREATE UNIQUE INDEX contacts_person_kind_primary_idx ON public.contacts USING btree ("personId", kind) WHERE ("isPrimary" = true);
--
--
CREATE INDEX "contacts_updatedByPersonId_idx" ON public.contacts USING btree ("updatedByPersonId");
--
--
CREATE INDEX ddl_audit_occurred_at_idx ON public.ddl_audit USING btree (occurred_at DESC);
--
--
CREATE INDEX "ddl_audit_sessionUser_idx" ON public.ddl_audit USING btree ("sessionUser");
--
--
CREATE INDEX employment_events_kind_idx ON public.employment_events USING btree (kind);
--
--
CREATE INDEX "employment_events_personId_occurredOn_idx" ON public.employment_events USING btree ("personId", "occurredOn");
--
--
CREATE INDEX "employment_events_recordedByPersonId_idx" ON public.employment_events USING btree ("recordedByPersonId");
--
--
CREATE INDEX "fiscal_calendars_createdByPersonId_idx" ON public.fiscal_calendars USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "fiscal_calendars_fiscalYear_regionCode_key" ON public.fiscal_calendars USING btree ("fiscalYear", "regionCode");
--
--
CREATE UNIQUE INDEX fiscal_calendars_name_key ON public.fiscal_calendars USING btree (name);
--
--
CREATE INDEX "fiscal_calendars_startDate_endDate_idx" ON public.fiscal_calendars USING btree ("startDate", "endDate");
--
--
CREATE INDEX "fiscal_calendars_updatedByPersonId_idx" ON public.fiscal_calendars USING btree ("updatedByPersonId");
--
--
CREATE UNIQUE INDEX "fiscal_periods_calendarId_periodNumber_key" ON public.fiscal_periods USING btree ("calendarId", "periodNumber");
--
--
CREATE INDEX "fiscal_periods_calendarId_startDate_idx" ON public.fiscal_periods USING btree ("calendarId", "startDate");
--
--
CREATE INDEX "fiscal_periods_createdByPersonId_idx" ON public.fiscal_periods USING btree ("createdByPersonId");
--
--
CREATE INDEX "fx_rates_createdByPersonId_idx" ON public.fx_rates USING btree ("createdByPersonId");
--
--
CREATE INDEX "fx_rates_fromCurrency_toCurrency_asOf_idx" ON public.fx_rates USING btree ("fromCurrency", "toCurrency", "asOf" DESC);
--
--
CREATE UNIQUE INDEX "fx_rates_fromCurrency_toCurrency_asOf_key" ON public.fx_rates USING btree ("fromCurrency", "toCurrency", "asOf");
--
--
CREATE INDEX "fx_rates_toCurrency_idx" ON public.fx_rates USING btree ("toCurrency");
--
--
CREATE INDEX "help_articles_authorPersonId_idx" ON public.help_articles USING btree ("authorPersonId");
--
--
CREATE INDEX "help_articles_createdByPersonId_idx" ON public.help_articles USING btree ("createdByPersonId");
--
--
CREATE INDEX "help_articles_isPublished_archivedAt_idx" ON public.help_articles USING btree ("isPublished", "archivedAt");
--
--
CREATE INDEX "help_articles_tenantId_idx" ON public.help_articles USING btree ("tenantId");
--
--
CREATE INDEX "help_articles_updatedByPersonId_idx" ON public.help_articles USING btree ("updatedByPersonId");
--
--
CREATE INDEX "help_feedback_actorPersonId_idx" ON public.help_feedback USING btree ("actorPersonId");
--
--
CREATE INDEX "help_feedback_articleId_createdAt_idx" ON public.help_feedback USING btree ("articleId", "createdAt");
--
--
CREATE INDEX "help_feedback_tenantId_idx" ON public.help_feedback USING btree ("tenantId");
--
--
CREATE INDEX "help_tips_articleId_idx" ON public.help_tips USING btree ("articleId");
--
--
CREATE INDEX "help_tips_createdByPersonId_idx" ON public.help_tips USING btree ("createdByPersonId");
--
--
CREATE INDEX "help_tips_routePath_isActive_idx" ON public.help_tips USING btree ("routePath", "isActive");
--
--
CREATE INDEX "help_tips_tenantId_idx" ON public.help_tips USING btree ("tenantId");
--
--
CREATE INDEX "help_tips_updatedByPersonId_idx" ON public.help_tips USING btree ("updatedByPersonId");
--
--
CREATE INDEX "honeypot_alerts_occurredAt_idx" ON public.honeypot_alerts USING btree ("occurredAt" DESC);
--
--
CREATE INDEX idx_audit_log_aggregate ON public."AuditLog" USING btree ("aggregateType", "aggregateId");
--
--
CREATE INDEX idx_idempotency_key_expires_at ON public.idempotency_keys USING btree (expires_at);
--
--
CREATE INDEX idx_staffing_request_project ON public.staffing_requests USING btree ("projectId", status);
--
--
CREATE INDEX "in_app_notifications_createdByPersonId_idx" ON public.in_app_notifications USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "in_app_notifications_publicId_key" ON public.in_app_notifications USING btree ("publicId");
--
--
CREATE INDEX "in_app_notifications_recipientPersonId_createdAt_idx" ON public.in_app_notifications USING btree ("recipientPersonId", "createdAt");
--
--
CREATE INDEX "in_app_notifications_recipientPersonId_readAt_idx" ON public.in_app_notifications USING btree ("recipientPersonId", "readAt");
--
--
CREATE INDEX "in_app_notifications_tenantId_idx" ON public.in_app_notifications USING btree ("tenantId");
--
--
CREATE INDEX "leave_balances_createdByPersonId_idx" ON public.leave_balances USING btree ("createdByPersonId");
--
--
CREATE INDEX "leave_balances_personId_year_idx" ON public.leave_balances USING btree ("personId", year);
--
--
CREATE UNIQUE INDEX "leave_balances_personId_year_leaveType_key" ON public.leave_balances USING btree ("personId", year, "leaveType");
--
--
CREATE INDEX "leave_balances_updatedByPersonId_idx" ON public.leave_balances USING btree ("updatedByPersonId");
--
--
CREATE INDEX "leave_requests_createdByPersonId_idx" ON public.leave_requests USING btree ("createdByPersonId");
--
--
CREATE INDEX "leave_requests_personId_status_idx" ON public.leave_requests USING btree ("personId", status);
--
--
CREATE UNIQUE INDEX "leave_requests_publicId_key" ON public.leave_requests USING btree ("publicId");
--
--
CREATE INDEX leave_requests_status_idx ON public.leave_requests USING btree (status);
--
--
CREATE INDEX "leave_requests_tenantId_idx" ON public.leave_requests USING btree ("tenantId");
--
--
CREATE INDEX "leave_requests_updatedByPersonId_idx" ON public.leave_requests USING btree ("updatedByPersonId");
--
--
CREATE INDEX migration_audit_agent_id_idx ON public.migration_audit USING btree (agent_id) WHERE (agent_id IS NOT NULL);
--
--
CREATE INDEX migration_audit_recorded_at_idx ON public.migration_audit USING btree (recorded_at DESC);
--
--
CREATE INDEX "onboarding_tour_progress_createdByPersonId_idx" ON public.onboarding_tour_progress USING btree ("createdByPersonId");
--
--
CREATE INDEX "onboarding_tour_progress_tenantId_idx" ON public.onboarding_tour_progress USING btree ("tenantId");
--
--
CREATE INDEX "onboarding_tour_progress_tourKey_idx" ON public.onboarding_tour_progress USING btree ("tourKey");
--
--
CREATE INDEX "onboarding_tour_progress_updatedByPersonId_idx" ON public.onboarding_tour_progress USING btree ("updatedByPersonId");
--
--
CREATE INDEX "organization_configs_createdByPersonId_idx" ON public.organization_configs USING btree ("createdByPersonId");
--
--
CREATE INDEX "overtime_exceptions_caseRecordId_idx" ON public.overtime_exceptions USING btree ("caseRecordId");
--
--
CREATE INDEX "overtime_exceptions_createdByPersonId_idx" ON public.overtime_exceptions USING btree ("createdByPersonId");
--
--
CREATE INDEX "overtime_exceptions_personId_effectiveFrom_effectiveTo_idx" ON public.overtime_exceptions USING btree ("personId", "effectiveFrom", "effectiveTo");
--
--
CREATE INDEX "overtime_exceptions_updatedByPersonId_idx" ON public.overtime_exceptions USING btree ("updatedByPersonId");
--
--
CREATE INDEX "overtime_policies_approvalCaseId_idx" ON public.overtime_policies USING btree ("approvalCaseId");
--
--
CREATE INDEX "overtime_policies_createdByPersonId_idx" ON public.overtime_policies USING btree ("createdByPersonId");
--
--
CREATE INDEX "overtime_policies_orgUnitId_effectiveFrom_idx" ON public.overtime_policies USING btree ("orgUnitId", "effectiveFrom");
--
--
CREATE INDEX "overtime_policies_resourcePoolId_effectiveFrom_idx" ON public.overtime_policies USING btree ("resourcePoolId", "effectiveFrom");
--
--
CREATE INDEX "overtime_policies_setByPersonId_idx" ON public.overtime_policies USING btree ("setByPersonId");
--
--
CREATE INDEX "overtime_policies_updatedByPersonId_idx" ON public.overtime_policies USING btree ("updatedByPersonId");
--
--
CREATE UNIQUE INDEX "period_locks_publicId_key" ON public.period_locks USING btree ("publicId");
--
--
CREATE INDEX "person_cost_rates_createdByPersonId_idx" ON public.person_cost_rates USING btree ("createdByPersonId");
--
--
CREATE INDEX "person_cost_rates_currencyCode_idx" ON public.person_cost_rates USING btree ("currencyCode");
--
--
CREATE UNIQUE INDEX "person_cost_rates_publicId_key" ON public.person_cost_rates USING btree ("publicId");
--
--
CREATE UNIQUE INDEX "person_notification_preferences_personId_channelKey_key" ON public.person_notification_preferences USING btree ("personId", "channelKey");
--
--
CREATE INDEX "person_notification_preferences_personId_idx" ON public.person_notification_preferences USING btree ("personId");
--
--
CREATE INDEX "person_release_approvals_actorPersonId_idx" ON public.person_release_approvals USING btree ("actorPersonId");
--
--
CREATE INDEX "person_release_approvals_createdByPersonId_idx" ON public.person_release_approvals USING btree ("createdByPersonId");
--
--
CREATE INDEX "person_release_approvals_requestId_idx" ON public.person_release_approvals USING btree ("requestId");
--
--
CREATE UNIQUE INDEX "person_release_approvals_requestId_role_key" ON public.person_release_approvals USING btree ("requestId", role);
--
--
CREATE INDEX "person_release_approvals_updatedByPersonId_idx" ON public.person_release_approvals USING btree ("updatedByPersonId");
--
--
CREATE INDEX "person_release_requests_createdByPersonId_idx" ON public.person_release_requests USING btree ("createdByPersonId");
--
--
CREATE INDEX "person_release_requests_initiatedByPersonId_idx" ON public.person_release_requests USING btree ("initiatedByPersonId");
--
--
CREATE INDEX "person_release_requests_personId_status_idx" ON public.person_release_requests USING btree ("personId", status);
--
--
CREATE INDEX "person_release_requests_status_targetTerminationDate_idx" ON public.person_release_requests USING btree (status, "targetTerminationDate");
--
--
CREATE INDEX "person_release_requests_tenantId_idx" ON public.person_release_requests USING btree ("tenantId");
--
--
CREATE INDEX "person_release_requests_updatedByPersonId_idx" ON public.person_release_requests USING btree ("updatedByPersonId");
--
--
CREATE INDEX "person_skills_personId_idx" ON public.person_skills USING btree ("personId");
--
--
CREATE UNIQUE INDEX "person_skills_personId_skillId_key" ON public.person_skills USING btree ("personId", "skillId");
--
--
CREATE INDEX "person_skills_skillId_idx" ON public.person_skills USING btree ("skillId");
--
--
CREATE INDEX "planner_scenarios_archivedAt_idx" ON public.planner_scenarios USING btree ("archivedAt");
--
--
CREATE INDEX "planner_scenarios_createdByPersonId_idx" ON public.planner_scenarios USING btree ("createdByPersonId");
--
--
CREATE INDEX "platform_settings_createdByPersonId_idx" ON public.platform_settings USING btree ("createdByPersonId");
--
--
CREATE INDEX "platform_settings_updatedByPersonId_idx" ON public.platform_settings USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_activation_approvals_createdByPersonId_idx" ON public.project_activation_approvals USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_activation_approvals_decidedAt_idx" ON public.project_activation_approvals USING btree ("decidedAt");
--
--
CREATE INDEX "project_activation_approvals_decidedById_idx" ON public.project_activation_approvals USING btree ("decidedById");
--
--
CREATE INDEX "project_activation_approvals_projectId_requestedAt_idx" ON public.project_activation_approvals USING btree ("projectId", "requestedAt");
--
--
CREATE INDEX "project_activation_approvals_requestedById_idx" ON public.project_activation_approvals USING btree ("requestedById");
--
--
CREATE INDEX "project_activation_approvals_tenantId_idx" ON public.project_activation_approvals USING btree ("tenantId");
--
--
CREATE INDEX "project_activation_approvals_updatedByPersonId_idx" ON public.project_activation_approvals USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_budgets_createdByPersonId_idx" ON public.project_budgets USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_budgets_currencyCode_idx" ON public.project_budgets USING btree ("currencyCode");
--
--
CREATE UNIQUE INDEX "project_budgets_publicId_key" ON public.project_budgets USING btree ("publicId");
--
--
CREATE INDEX "project_budgets_updatedByPersonId_idx" ON public.project_budgets USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_change_requests_createdByPersonId_idx" ON public.project_change_requests USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_change_requests_decidedByPersonId_idx" ON public.project_change_requests USING btree ("decidedByPersonId");
--
--
CREATE INDEX "project_change_requests_projectId_createdAt_idx" ON public.project_change_requests USING btree ("projectId", "createdAt");
--
--
CREATE INDEX "project_change_requests_projectId_status_idx" ON public.project_change_requests USING btree ("projectId", status);
--
--
CREATE INDEX "project_change_requests_requesterPersonId_idx" ON public.project_change_requests USING btree ("requesterPersonId");
--
--
CREATE INDEX "project_change_requests_updatedByPersonId_idx" ON public.project_change_requests USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_milestones_createdByPersonId_idx" ON public.project_milestones USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_milestones_projectId_plannedDate_idx" ON public.project_milestones USING btree ("projectId", "plannedDate");
--
--
CREATE INDEX "project_milestones_projectId_status_idx" ON public.project_milestones USING btree ("projectId", status);
--
--
CREATE INDEX "project_milestones_updatedByPersonId_idx" ON public.project_milestones USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_milestones_workstreamId_idx" ON public.project_milestones USING btree ("workstreamId");
--
--
CREATE INDEX "project_radiator_overrides_overriddenByPersonId_idx" ON public.project_radiator_overrides USING btree ("overriddenByPersonId");
--
--
CREATE INDEX "project_radiator_overrides_snapshotId_idx" ON public.project_radiator_overrides USING btree ("snapshotId");
--
--
CREATE INDEX "project_rag_snapshots_createdByPersonId_idx" ON public.project_rag_snapshots USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_rag_snapshots_projectId_weekStarting_idx" ON public.project_rag_snapshots USING btree ("projectId", "weekStarting");
--
--
CREATE UNIQUE INDEX "project_rag_snapshots_projectId_weekStarting_key" ON public.project_rag_snapshots USING btree ("projectId", "weekStarting");
--
--
CREATE INDEX "project_rag_snapshots_recordedByPersonId_idx" ON public.project_rag_snapshots USING btree ("recordedByPersonId");
--
--
CREATE INDEX "project_rag_snapshots_updatedByPersonId_idx" ON public.project_rag_snapshots USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_retrospectives_createdByPersonId_idx" ON public.project_retrospectives USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_retrospectives_facilitatedByPersonId_idx" ON public.project_retrospectives USING btree ("facilitatedByPersonId");
--
--
CREATE INDEX "project_retrospectives_projectId_idx" ON public.project_retrospectives USING btree ("projectId");
--
--
CREATE INDEX "project_retrospectives_updatedByPersonId_idx" ON public.project_retrospectives USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_risks_assigneePersonId_idx" ON public.project_risks USING btree ("assigneePersonId");
--
--
CREATE INDEX "project_risks_convertedFromRiskId_idx" ON public.project_risks USING btree ("convertedFromRiskId");
--
--
CREATE INDEX "project_risks_createdByPersonId_idx" ON public.project_risks USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_risks_ownerPersonId_idx" ON public.project_risks USING btree ("ownerPersonId");
--
--
CREATE INDEX "project_risks_projectId_riskType_idx" ON public.project_risks USING btree ("projectId", "riskType");
--
--
CREATE INDEX "project_risks_projectId_status_idx" ON public.project_risks USING btree ("projectId", status);
--
--
CREATE INDEX "project_risks_relatedCaseId_idx" ON public.project_risks USING btree ("relatedCaseId");
--
--
CREATE INDEX project_risks_title_trgm_idx ON public.project_risks USING gin (title public.gin_trgm_ops);
--
--
CREATE INDEX "project_risks_updatedByPersonId_idx" ON public.project_risks USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_role_plans_createdByPersonId_idx" ON public.project_role_plans USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_role_plans_projectId_idx" ON public.project_role_plans USING btree ("projectId");
--
--
CREATE UNIQUE INDEX "project_role_plans_projectId_roleName_seniorityLevel_key" ON public.project_role_plans USING btree ("projectId", "roleName", "seniorityLevel");
--
--
CREATE INDEX "project_role_plans_updatedByPersonId_idx" ON public.project_role_plans USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_vendor_engagements_createdByPersonId_idx" ON public.project_vendor_engagements USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_vendor_engagements_currencyCode_idx" ON public.project_vendor_engagements USING btree ("currencyCode");
--
--
CREATE INDEX "project_vendor_engagements_projectId_status_idx" ON public.project_vendor_engagements USING btree ("projectId", status);
--
--
CREATE UNIQUE INDEX "project_vendor_engagements_projectId_vendorId_key" ON public.project_vendor_engagements USING btree ("projectId", "vendorId");
--
--
CREATE INDEX "project_vendor_engagements_updatedByPersonId_idx" ON public.project_vendor_engagements USING btree ("updatedByPersonId");
--
--
CREATE INDEX "project_vendor_engagements_vendorId_idx" ON public.project_vendor_engagements USING btree ("vendorId");
--
--
CREATE INDEX "project_workstreams_createdByPersonId_idx" ON public.project_workstreams USING btree ("createdByPersonId");
--
--
CREATE INDEX "project_workstreams_projectId_idx" ON public.project_workstreams USING btree ("projectId");
--
--
CREATE INDEX "project_workstreams_updatedByPersonId_idx" ON public.project_workstreams USING btree ("updatedByPersonId");
--
--
CREATE INDEX "public_holidays_countryCode_date_idx" ON public.public_holidays USING btree ("countryCode", date);
--
--
CREATE INDEX "public_holidays_createdByPersonId_idx" ON public.public_holidays USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "public_holidays_date_countryCode_key" ON public.public_holidays USING btree (date, "countryCode");
--
--
CREATE INDEX "pulse_entries_personId_weekStart_idx" ON public.pulse_entries USING btree ("personId", "weekStart");
--
--
CREATE UNIQUE INDEX "pulse_entries_personId_weekStart_key" ON public.pulse_entries USING btree ("personId", "weekStart");
--
--
CREATE INDEX "pulse_reports_createdByPersonId_idx" ON public.pulse_reports USING btree ("createdByPersonId");
--
--
CREATE INDEX "pulse_reports_projectId_idx" ON public.pulse_reports USING btree ("projectId");
--
--
CREATE UNIQUE INDEX "pulse_reports_projectId_weekStarting_key" ON public.pulse_reports USING btree ("projectId", "weekStarting");
--
--
CREATE INDEX "pulse_reports_updatedByPersonId_idx" ON public.pulse_reports USING btree ("updatedByPersonId");
--
--
CREATE INDEX "radiator_threshold_configs_createdByPersonId_idx" ON public.radiator_threshold_configs USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "radiator_threshold_configs_subDimensionKey_key" ON public.radiator_threshold_configs USING btree ("subDimensionKey");
--
--
CREATE INDEX "radiator_threshold_configs_updatedByPersonId_idx" ON public.radiator_threshold_configs USING btree ("updatedByPersonId");
--
--
CREATE INDEX "rate_card_entries_createdByPersonId_idx" ON public.rate_card_entries USING btree ("createdByPersonId");
--
--
CREATE INDEX "rate_card_entries_rateCardId_isActive_idx" ON public.rate_card_entries USING btree ("rateCardId", "isActive");
--
--
CREATE UNIQUE INDEX "rate_card_entries_rateCardId_staffingRole_grade_key" ON public.rate_card_entries USING btree ("rateCardId", "staffingRole", grade);
--
--
CREATE INDEX "rate_card_entries_updatedByPersonId_idx" ON public.rate_card_entries USING btree ("updatedByPersonId");
--
--
CREATE INDEX "rate_cards_clientId_isActive_idx" ON public.rate_cards USING btree ("clientId", "isActive");
--
--
CREATE INDEX "rate_cards_createdByPersonId_idx" ON public.rate_cards USING btree ("createdByPersonId");
--
--
CREATE INDEX "rate_cards_currencyCode_idx" ON public.rate_cards USING btree ("currencyCode");
--
--
CREATE INDEX "rate_cards_tenantId_idx" ON public.rate_cards USING btree ("tenantId");
--
--
CREATE INDEX "rate_cards_updatedByPersonId_idx" ON public.rate_cards USING btree ("updatedByPersonId");
--
--
CREATE INDEX "responsibility_rules_actionKind_scopeKind_isActive_priority_idx" ON public.responsibility_rules USING btree ("actionKind", "scopeKind", "isActive", priority);
--
--
CREATE INDEX "responsibility_rules_createdByPersonId_idx" ON public.responsibility_rules USING btree ("createdByPersonId");
--
--
CREATE INDEX "responsibility_rules_targetPersonId_idx" ON public.responsibility_rules USING btree ("targetPersonId");
--
--
CREATE INDEX "responsibility_rules_tenantId_idx" ON public.responsibility_rules USING btree ("tenantId");
--
--
CREATE INDEX "responsibility_rules_updatedByPersonId_idx" ON public.responsibility_rules USING btree ("updatedByPersonId");
--
--
CREATE INDEX setup_run_logs_level_occurred_at_idx ON public.setup_run_logs USING btree (level, occurred_at);
--
--
CREATE INDEX setup_run_logs_run_id_sequence_idx ON public.setup_run_logs USING btree (run_id, sequence);
--
--
CREATE INDEX setup_run_logs_run_id_step_key_idx ON public.setup_run_logs USING btree (run_id, step_key);
--
--
CREATE INDEX setup_runs_run_id_idx ON public.setup_runs USING btree (run_id);
--
--
CREATE UNIQUE INDEX setup_runs_run_id_step_key_key ON public.setup_runs USING btree (run_id, step_key);
--
--
CREATE INDEX setup_runs_status_started_at_idx ON public.setup_runs USING btree (status, started_at);
--
--
CREATE INDEX "skills_createdByPersonId_idx" ON public.skills USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX skills_name_key ON public.skills USING btree (name);
--
--
CREATE UNIQUE INDEX "skills_publicId_key" ON public.skills USING btree ("publicId");
--
--
CREATE INDEX "skills_tenantId_idx" ON public.skills USING btree ("tenantId");
--
--
CREATE INDEX "skills_updatedByPersonId_idx" ON public.skills USING btree ("updatedByPersonId");
--
--
CREATE INDEX "staffing_request_fulfilments_assignedPersonId_idx" ON public.staffing_request_fulfilments USING btree ("assignedPersonId");
--
--
CREATE INDEX "staffing_request_fulfilments_createdByPersonId_idx" ON public.staffing_request_fulfilments USING btree ("createdByPersonId");
--
--
CREATE INDEX "staffing_request_fulfilments_requestId_idx" ON public.staffing_request_fulfilments USING btree ("requestId");
--
--
CREATE INDEX "staffing_request_fulfilments_updatedByPersonId_idx" ON public.staffing_request_fulfilments USING btree ("updatedByPersonId");
--
--
CREATE INDEX "staffing_requests_createdByPersonId_idx" ON public.staffing_requests USING btree ("createdByPersonId");
--
--
CREATE INDEX "staffing_requests_projectId_status_idx" ON public.staffing_requests USING btree ("projectId", status);
--
--
CREATE UNIQUE INDEX "staffing_requests_publicId_key" ON public.staffing_requests USING btree ("publicId");
--
--
CREATE INDEX "staffing_requests_requestedByPersonId_status_idx" ON public.staffing_requests USING btree ("requestedByPersonId", status);
--
--
CREATE INDEX "staffing_requests_status_priority_startDate_idx" ON public.staffing_requests USING btree (status, priority, "startDate");
--
--
CREATE INDEX "staffing_requests_tenantId_idx" ON public.staffing_requests USING btree ("tenantId");
--
--
CREATE INDEX "staffing_requests_updatedByPersonId_idx" ON public.staffing_requests USING btree ("updatedByPersonId");
--
--
CREATE INDEX "timesheet_entries_createdByPersonId_idx" ON public.timesheet_entries USING btree ("createdByPersonId");
--
--
CREATE UNIQUE INDEX "timesheet_entries_timesheetWeekId_projectId_benchCategory_w_key" ON public.timesheet_entries USING btree ("timesheetWeekId", "projectId", "benchCategory", "workLabel", date);
--
--
CREATE INDEX "timesheet_entries_updatedByPersonId_idx" ON public.timesheet_entries USING btree ("updatedByPersonId");
--
--
CREATE INDEX "timesheet_weeks_createdByPersonId_idx" ON public.timesheet_weeks USING btree ("createdByPersonId");
--
--
CREATE INDEX "timesheet_weeks_personId_weekStart_idx" ON public.timesheet_weeks USING btree ("personId", "weekStart");
--
--
CREATE UNIQUE INDEX "timesheet_weeks_personId_weekStart_key" ON public.timesheet_weeks USING btree ("personId", "weekStart");
--
--
CREATE UNIQUE INDEX "timesheet_weeks_publicId_key" ON public.timesheet_weeks USING btree ("publicId");
--
--
CREATE INDEX "timesheet_weeks_tenantId_idx" ON public.timesheet_weeks USING btree ("tenantId");
--
--
CREATE INDEX "timesheet_weeks_updatedByPersonId_idx" ON public.timesheet_weeks USING btree ("updatedByPersonId");
--
--
CREATE INDEX "undo_actions_actorId_expiresAt_idx" ON public.undo_actions USING btree ("actorId", "expiresAt");
--
--
CREATE INDEX "undo_actions_entityId_idx" ON public.undo_actions USING btree ("entityId");
--
--
CREATE UNIQUE INDEX uq_idempotency_key_actor_route ON public.idempotency_keys USING btree (idempotency_key, method, path, actor_id);
--
--
CREATE INDEX "vendor_skill_areas_createdByPersonId_idx" ON public.vendor_skill_areas USING btree ("createdByPersonId");
--
--
CREATE INDEX "vendor_skill_areas_skillArea_idx" ON public.vendor_skill_areas USING btree ("skillArea");
--
--
CREATE INDEX "vendors_createdByPersonId_idx" ON public.vendors USING btree ("createdByPersonId");
--
--
CREATE INDEX "vendors_isActive_idx" ON public.vendors USING btree ("isActive");
--
--
CREATE UNIQUE INDEX vendors_name_key ON public.vendors USING btree (name);
--
--
CREATE INDEX "vendors_tenantId_idx" ON public.vendors USING btree ("tenantId");
--
--
CREATE INDEX "vendors_updatedByPersonId_idx" ON public.vendors USING btree ("updatedByPersonId");
--
--
CREATE INDEX mv_person_week_hours_person_idx ON read_models.mv_person_week_hours USING btree ("personId");
--
--
CREATE UNIQUE INDEX mv_person_week_hours_pk ON read_models.mv_person_week_hours USING btree ("weekStart", "personId");
--
--
CREATE INDEX mv_project_weekly_roster_person_idx ON read_models.mv_project_weekly_roster USING btree ("personId");
--
--
CREATE UNIQUE INDEX mv_project_weekly_roster_pk ON read_models.mv_project_weekly_roster USING btree ("weekStart", "projectId", "personId");
--
--
CREATE INDEX mv_project_weekly_roster_project_idx ON read_models.mv_project_weekly_roster USING btree ("projectId");
--
--
ALTER INDEX public."DomainEvent_aggregate_idx" ATTACH PARTITION public."DomainEvent_default_aggregateType_aggregateId_idx";
--
--
ALTER INDEX public."DomainEvent_unpublished_idx" ATTACH PARTITION public."DomainEvent_default_chainSeq_idx";
--
--
ALTER INDEX public."DomainEvent_correlationId_idx" ATTACH PARTITION public."DomainEvent_default_correlationId_idx";
--
--
ALTER INDEX public."DomainEvent_createdAt_idx" ATTACH PARTITION public."DomainEvent_default_createdAt_idx";
--
--
ALTER INDEX public."DomainEvent_eventName_idx" ATTACH PARTITION public."DomainEvent_default_eventName_idx";
--
--
ALTER INDEX public."DomainEvent_pkey" ATTACH PARTITION public."DomainEvent_default_pkey";
--
--
ALTER INDEX public."DomainEvent_tenantId_idx" ATTACH PARTITION public."DomainEvent_default_tenantId_idx";
--
--
CREATE TRIGGER dm_r_22_hash_chain_trigger BEFORE INSERT ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.dm_r_22_audit_hash_chain('createdAt');
--
--
CREATE TRIGGER dm_r_22_hash_chain_trigger BEFORE INSERT ON public."DomainEvent" FOR EACH ROW EXECUTE FUNCTION public.dm_r_22_audit_hash_chain('createdAt');
--
--
CREATE TRIGGER dm_r_22_hash_chain_trigger BEFORE INSERT ON public.ddl_audit FOR EACH ROW EXECUTE FUNCTION public.dm_r_22_audit_hash_chain('occurred_at');
--
--
CREATE TRIGGER dm_r_22_hash_chain_trigger BEFORE INSERT ON public.migration_audit FOR EACH ROW EXECUTE FUNCTION public.dm_r_22_audit_hash_chain('recorded_at');
--
--
CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."CaseRecord" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."LocalAccount" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."Person" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."Project" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."ProjectAssignment" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."WorkEvidence" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public.staffing_requests REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public.timesheet_entries REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public.timesheet_weeks REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."CaseRecord" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."LocalAccount" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."Person" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."Project" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."ProjectAssignment" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."WorkEvidence" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public.staffing_requests REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public.timesheet_entries REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public.timesheet_weeks REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();
--
--
CREATE TRIGGER dm_r_31_honeypot_delete BEFORE DELETE ON public."Person" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();
--
--
CREATE TRIGGER dm_r_31_honeypot_delete BEFORE DELETE ON public."Project" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();
--
--
CREATE TRIGGER dm_r_31_honeypot_delete BEFORE DELETE ON public."ProjectAssignment" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();
--
--
CREATE TRIGGER dm_r_31_honeypot_update BEFORE UPDATE ON public."Person" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();
--
--
CREATE TRIGGER dm_r_31_honeypot_update BEFORE UPDATE ON public."Project" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();
--
--
CREATE TRIGGER dm_r_31_honeypot_update BEFORE UPDATE ON public."ProjectAssignment" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();
--
--
CREATE TRIGGER in_app_notifications_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.in_app_notifications FOR EACH ROW EXECUTE FUNCTION public.in_app_notifications_dm2_dualmaintain();
--
--
CREATE TRIGGER leave_requests_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.leave_requests_dm2_dualmaintain();
--
--
CREATE TRIGGER period_locks_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.period_locks FOR EACH ROW EXECUTE FUNCTION public.period_locks_dm2_dualmaintain();
--
--
CREATE TRIGGER person_cost_rates_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.person_cost_rates FOR EACH ROW EXECUTE FUNCTION public.person_cost_rates_dm2_dualmaintain();
--
--
CREATE TRIGGER person_skills_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.person_skills FOR EACH ROW EXECUTE FUNCTION public.person_skills_dm2_dualmaintain();
--
--
CREATE TRIGGER project_budgets_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.project_budgets FOR EACH ROW EXECUTE FUNCTION public.project_budgets_dm2_dualmaintain();
--
--
CREATE TRIGGER pulse_entries_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.pulse_entries FOR EACH ROW EXECUTE FUNCTION public.pulse_entries_dm2_dualmaintain();
--
--
CREATE TRIGGER skills_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.skills_dm2_dualmaintain();
--
--
CREATE TRIGGER staffing_request_fulfilments_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.staffing_request_fulfilments FOR EACH ROW EXECUTE FUNCTION public.staffing_request_fulfilments_dm2_dualmaintain();
--
--
CREATE TRIGGER staffing_requests_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.staffing_requests FOR EACH ROW EXECUTE FUNCTION public.staffing_requests_dm2_dualmaintain();
--
--
CREATE TRIGGER timesheet_entries_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION public.timesheet_entries_dm2_dualmaintain();
--
--
CREATE TRIGGER timesheet_weeks_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.timesheet_weeks FOR EACH ROW EXECUTE FUNCTION public.timesheet_weeks_dm2_dualmaintain();
--
--
ALTER TABLE ONLY public."AssignmentApproval"
    ADD CONSTRAINT "AssignmentApproval_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES public."ProjectAssignment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."AssignmentApproval"
    ADD CONSTRAINT "AssignmentApproval_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."AssignmentApproval"
    ADD CONSTRAINT "AssignmentApproval_decidedByPersonId_fkey" FOREIGN KEY ("decidedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."AssignmentApproval"
    ADD CONSTRAINT "AssignmentApproval_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."AssignmentHistory"
    ADD CONSTRAINT "AssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES public."ProjectAssignment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."AssignmentHistory"
    ADD CONSTRAINT "AssignmentHistory_changedByPersonId_fkey" FOREIGN KEY ("changedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."CaseParticipant"
    ADD CONSTRAINT "CaseParticipant_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."CaseParticipant"
    ADD CONSTRAINT "CaseParticipant_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseParticipant"
    ADD CONSTRAINT "CaseParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES public."CaseType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_relatedAssignmentId_fkey" FOREIGN KEY ("relatedAssignmentId") REFERENCES public."ProjectAssignment"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_relatedProjectId_fkey" FOREIGN KEY ("relatedProjectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_subjectPersonId_fkey" FOREIGN KEY ("subjectPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_assignedToPersonId_fkey" FOREIGN KEY ("assignedToPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_workflowStateDefinitionId_fkey" FOREIGN KEY ("workflowStateDefinitionId") REFERENCES public."WorkflowStateDefinition"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseType"
    ADD CONSTRAINT "CaseType_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseType"
    ADD CONSTRAINT "CaseType_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CaseType"
    ADD CONSTRAINT "CaseType_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES public."WorkflowDefinition"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Currency"
    ADD CONSTRAINT "Currency_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CustomFieldDefinition"
    ADD CONSTRAINT "CustomFieldDefinition_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CustomFieldDefinition"
    ADD CONSTRAINT "CustomFieldDefinition_metadataDictionaryId_fkey" FOREIGN KEY ("metadataDictionaryId") REFERENCES public."MetadataDictionary"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CustomFieldDefinition"
    ADD CONSTRAINT "CustomFieldDefinition_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CustomFieldDefinition"
    ADD CONSTRAINT "CustomFieldDefinition_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CustomFieldValue"
    ADD CONSTRAINT "CustomFieldValue_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."CustomFieldValue"
    ADD CONSTRAINT "CustomFieldValue_customFieldDefinitionId_fkey" FOREIGN KEY ("customFieldDefinitionId") REFERENCES public."CustomFieldDefinition"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."CustomFieldValue"
    ADD CONSTRAINT "CustomFieldValue_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE public."DomainEvent"
    ADD CONSTRAINT "DomainEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."EmployeeActivityEvent"
    ADD CONSTRAINT "EmployeeActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."EmployeeActivityEvent"
    ADD CONSTRAINT "EmployeeActivityEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."EntityLayoutDefinition"
    ADD CONSTRAINT "EntityLayoutDefinition_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."EntityLayoutDefinition"
    ADD CONSTRAINT "EntityLayoutDefinition_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."EntityLayoutDefinition"
    ADD CONSTRAINT "EntityLayoutDefinition_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ExternalAccountLink"
    ADD CONSTRAINT "ExternalAccountLink_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ExternalSyncState"
    ADD CONSTRAINT "ExternalSyncState_projectExternalLinkId_fkey" FOREIGN KEY ("projectExternalLinkId") REFERENCES public."ProjectExternalLink"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."IntegrationSyncState"
    ADD CONSTRAINT "IntegrationSyncState_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."IntegrationSyncState"
    ADD CONSTRAINT "IntegrationSyncState_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."LocalAccount"
    ADD CONSTRAINT "LocalAccount_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."LocalAccount"
    ADD CONSTRAINT "LocalAccount_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."LocalAccount"
    ADD CONSTRAINT "LocalAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."LocalAccount"
    ADD CONSTRAINT "LocalAccount_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."M365DirectoryReconciliationRecord"
    ADD CONSTRAINT "M365DirectoryReconciliationRecord_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."M365DirectoryReconciliationRecord"
    ADD CONSTRAINT "M365DirectoryReconciliationRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."M365DirectoryReconciliationRecord"
    ADD CONSTRAINT "M365DirectoryReconciliationRecord_resolvedManagerPersonId_fkey" FOREIGN KEY ("resolvedManagerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."M365DirectoryReconciliationRecord"
    ADD CONSTRAINT "M365DirectoryReconciliationRecord_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."MetadataDictionary"
    ADD CONSTRAINT "MetadataDictionary_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."MetadataDictionary"
    ADD CONSTRAINT "MetadataDictionary_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."MetadataDictionary"
    ADD CONSTRAINT "MetadataDictionary_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."MetadataEntry"
    ADD CONSTRAINT "MetadataEntry_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."MetadataEntry"
    ADD CONSTRAINT "MetadataEntry_metadataDictionaryId_fkey" FOREIGN KEY ("metadataDictionaryId") REFERENCES public."MetadataDictionary"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."MetadataEntry"
    ADD CONSTRAINT "MetadataEntry_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."NotificationChannel"
    ADD CONSTRAINT "NotificationChannel_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."NotificationChannel"
    ADD CONSTRAINT "NotificationChannel_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public."NotificationChannel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_notificationRequestId_fkey" FOREIGN KEY ("notificationRequestId") REFERENCES public."NotificationRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."NotificationRequest"
    ADD CONSTRAINT "NotificationRequest_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public."NotificationChannel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."NotificationRequest"
    ADD CONSTRAINT "NotificationRequest_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."NotificationRequest"
    ADD CONSTRAINT "NotificationRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."NotificationTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."NotificationRequest"
    ADD CONSTRAINT "NotificationRequest_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."NotificationTemplate"
    ADD CONSTRAINT "NotificationTemplate_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public."NotificationChannel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."NotificationTemplate"
    ADD CONSTRAINT "NotificationTemplate_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."NotificationTemplate"
    ADD CONSTRAINT "NotificationTemplate_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_managerPersonId_fkey" FOREIGN KEY ("managerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_parentOrgUnitId_fkey" FOREIGN KEY ("parentOrgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."OutboxEvent"
    ADD CONSTRAINT "OutboxEvent_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."OutboxEvent"
    ADD CONSTRAINT "OutboxEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."LocalAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."PersonExternalIdentityLink"
    ADD CONSTRAINT "PersonExternalIdentityLink_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."PersonExternalIdentityLink"
    ADD CONSTRAINT "PersonExternalIdentityLink_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."PersonExternalIdentityLink"
    ADD CONSTRAINT "PersonExternalIdentityLink_resolvedManagerPersonId_fkey" FOREIGN KEY ("resolvedManagerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."PersonExternalIdentityLink"
    ADD CONSTRAINT "PersonExternalIdentityLink_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public."Position"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."PersonResourcePoolMembership"
    ADD CONSTRAINT "PersonResourcePoolMembership_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."PersonResourcePoolMembership"
    ADD CONSTRAINT "PersonResourcePoolMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."PersonResourcePoolMembership"
    ADD CONSTRAINT "PersonResourcePoolMembership_resourcePoolId_fkey" FOREIGN KEY ("resourcePoolId") REFERENCES public."ResourcePool"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."PersonResourcePoolMembership"
    ADD CONSTRAINT "PersonResourcePoolMembership_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Person"
    ADD CONSTRAINT "Person_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_occupantPersonId_fkey" FOREIGN KEY ("occupantPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_appliedRateCardEntryId_fkey" FOREIGN KEY ("appliedRateCardEntryId") REFERENCES public.rate_card_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_requestedByPersonId_fkey" FOREIGN KEY ("requestedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_staffingRequestId_fkey" FOREIGN KEY ("staffingRequestId") REFERENCES public.staffing_requests(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectExternalLink"
    ADD CONSTRAINT "ProjectExternalLink_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectExternalLink"
    ADD CONSTRAINT "ProjectExternalLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ProjectExternalLink"
    ADD CONSTRAINT "ProjectExternalLink_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectPositionCandidate"
    ADD CONSTRAINT "ProjectPositionCandidate_candidatePersonId_fkey" FOREIGN KEY ("candidatePersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ProjectPositionCandidate"
    ADD CONSTRAINT "ProjectPositionCandidate_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectPositionCandidate"
    ADD CONSTRAINT "ProjectPositionCandidate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public."ProjectPosition"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."ProjectPositionCandidate"
    ADD CONSTRAINT "ProjectPositionCandidate_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectPositionFillHistory"
    ADD CONSTRAINT "ProjectPositionFillHistory_changedByPersonId_fkey" FOREIGN KEY ("changedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE;
--
--
ALTER TABLE ONLY public."ProjectPositionFillHistory"
    ADD CONSTRAINT "ProjectPositionFillHistory_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public."ProjectPosition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_activePersonId_fkey" FOREIGN KEY ("activePersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_appliedRateCardEntryId_fkey" FOREIGN KEY ("appliedRateCardEntryId") REFERENCES public.rate_card_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_requestedByPersonId_fkey" FOREIGN KEY ("requestedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ProjectPosition"
    ADD CONSTRAINT "ProjectPosition_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_deliveryManagerId_fkey" FOREIGN KEY ("deliveryManagerId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."RadiusReconciliationRecord"
    ADD CONSTRAINT "RadiusReconciliationRecord_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."RadiusReconciliationRecord"
    ADD CONSTRAINT "RadiusReconciliationRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."RadiusReconciliationRecord"
    ADD CONSTRAINT "RadiusReconciliationRecord_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."LocalAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."ReportingLine"
    ADD CONSTRAINT "ReportingLine_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ReportingLine"
    ADD CONSTRAINT "ReportingLine_managerPersonId_fkey" FOREIGN KEY ("managerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ReportingLine"
    ADD CONSTRAINT "ReportingLine_subjectPersonId_fkey" FOREIGN KEY ("subjectPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."ReportingLine"
    ADD CONSTRAINT "ReportingLine_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ResourcePool"
    ADD CONSTRAINT "ResourcePool_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ResourcePool"
    ADD CONSTRAINT "ResourcePool_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."ResourcePool"
    ADD CONSTRAINT "ResourcePool_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."StaffingRequestProposalCandidate"
    ADD CONSTRAINT "StaffingRequestProposalCandidate_candidatePersonId_fkey" FOREIGN KEY ("candidatePersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."StaffingRequestProposalCandidate"
    ADD CONSTRAINT "StaffingRequestProposalCandidate_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."StaffingRequestProposalCandidate"
    ADD CONSTRAINT "StaffingRequestProposalCandidate_slateId_fkey" FOREIGN KEY ("slateId") REFERENCES public."StaffingRequestProposalSlate"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."StaffingRequestProposalCandidate"
    ADD CONSTRAINT "StaffingRequestProposalCandidate_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."StaffingRequestProposalSlate"
    ADD CONSTRAINT "StaffingRequestProposalSlate_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."StaffingRequestProposalSlate"
    ADD CONSTRAINT "StaffingRequestProposalSlate_proposedByPersonId_fkey" FOREIGN KEY ("proposedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."StaffingRequestProposalSlate"
    ADD CONSTRAINT "StaffingRequestProposalSlate_staffingRequestId_fkey" FOREIGN KEY ("staffingRequestId") REFERENCES public.staffing_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."StaffingRequestProposalSlate"
    ADD CONSTRAINT "StaffingRequestProposalSlate_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkEvidenceLink"
    ADD CONSTRAINT "WorkEvidenceLink_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkEvidenceLink"
    ADD CONSTRAINT "WorkEvidenceLink_workEvidenceId_fkey" FOREIGN KEY ("workEvidenceId") REFERENCES public."WorkEvidence"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public."WorkEvidenceSource"
    ADD CONSTRAINT "WorkEvidenceSource_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkEvidenceSource"
    ADD CONSTRAINT "WorkEvidenceSource_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_workEvidenceSourceId_fkey" FOREIGN KEY ("workEvidenceSourceId") REFERENCES public."WorkEvidenceSource"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public."WorkflowDefinition"
    ADD CONSTRAINT "WorkflowDefinition_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkflowDefinition"
    ADD CONSTRAINT "WorkflowDefinition_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkflowStateDefinition"
    ADD CONSTRAINT "WorkflowStateDefinition_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkflowStateDefinition"
    ADD CONSTRAINT "WorkflowStateDefinition_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public."WorkflowStateDefinition"
    ADD CONSTRAINT "WorkflowStateDefinition_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES public."WorkflowDefinition"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT "budget_approvals_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT "budget_approvals_decidedByPersonId_fkey" FOREIGN KEY ("decidedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT "budget_approvals_projectBudgetId_fkey" FOREIGN KEY ("projectBudgetId") REFERENCES public.project_budgets(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT "budget_approvals_requestedByPersonId_fkey" FOREIGN KEY ("requestedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT "budget_approvals_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_accountManagerPersonId_fkey" FOREIGN KEY ("accountManagerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "contacts_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "contacts_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "contacts_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.employment_events
    ADD CONSTRAINT "employment_events_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.employment_events
    ADD CONSTRAINT "employment_events_recordedByPersonId_fkey" FOREIGN KEY ("recordedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.fiscal_calendars
    ADD CONSTRAINT "fiscal_calendars_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.fiscal_calendars
    ADD CONSTRAINT "fiscal_calendars_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.fiscal_periods
    ADD CONSTRAINT "fiscal_periods_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES public.fiscal_calendars(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.fiscal_periods
    ADD CONSTRAINT "fiscal_periods_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT "fx_rates_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT "fx_rates_fromCurrency_fkey" FOREIGN KEY ("fromCurrency") REFERENCES public."Currency"(code) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT "fx_rates_toCurrency_fkey" FOREIGN KEY ("toCurrency") REFERENCES public."Currency"(code) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT "help_articles_authorPersonId_fkey" FOREIGN KEY ("authorPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT "help_articles_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT "help_articles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT "help_articles_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.help_feedback
    ADD CONSTRAINT "help_feedback_actorPersonId_fkey" FOREIGN KEY ("actorPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.help_feedback
    ADD CONSTRAINT "help_feedback_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public.help_articles(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.help_feedback
    ADD CONSTRAINT "help_feedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.help_tips
    ADD CONSTRAINT "help_tips_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public.help_articles(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.help_tips
    ADD CONSTRAINT "help_tips_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.help_tips
    ADD CONSTRAINT "help_tips_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.help_tips
    ADD CONSTRAINT "help_tips_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT "in_app_notifications_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT "in_app_notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT "leave_balances_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT "leave_balances_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT "leave_balances_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.onboarding_tour_progress
    ADD CONSTRAINT "onboarding_tour_progress_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.onboarding_tour_progress
    ADD CONSTRAINT "onboarding_tour_progress_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.onboarding_tour_progress
    ADD CONSTRAINT "onboarding_tour_progress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.onboarding_tour_progress
    ADD CONSTRAINT "onboarding_tour_progress_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.organization_configs
    ADD CONSTRAINT "organization_configs_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.overtime_exceptions
    ADD CONSTRAINT "overtime_exceptions_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.overtime_exceptions
    ADD CONSTRAINT "overtime_exceptions_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.overtime_exceptions
    ADD CONSTRAINT "overtime_exceptions_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.overtime_exceptions
    ADD CONSTRAINT "overtime_exceptions_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_approvalCaseId_fkey" FOREIGN KEY ("approvalCaseId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_resourcePoolId_fkey" FOREIGN KEY ("resourcePoolId") REFERENCES public."ResourcePool"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_setByPersonId_fkey" FOREIGN KEY ("setByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.person_cost_rates
    ADD CONSTRAINT "person_cost_rates_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.person_cost_rates
    ADD CONSTRAINT "person_cost_rates_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES public."Currency"(code) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.person_notification_digest
    ADD CONSTRAINT "person_notification_digest_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.person_notification_preferences
    ADD CONSTRAINT "person_notification_preferences_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.person_release_approvals
    ADD CONSTRAINT "person_release_approvals_actorPersonId_fkey" FOREIGN KEY ("actorPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.person_release_approvals
    ADD CONSTRAINT "person_release_approvals_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.person_release_approvals
    ADD CONSTRAINT "person_release_approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public.person_release_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.person_release_approvals
    ADD CONSTRAINT "person_release_approvals_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.person_release_requests
    ADD CONSTRAINT "person_release_requests_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.person_release_requests
    ADD CONSTRAINT "person_release_requests_initiatedByPersonId_fkey" FOREIGN KEY ("initiatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.person_release_requests
    ADD CONSTRAINT "person_release_requests_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.person_release_requests
    ADD CONSTRAINT "person_release_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.person_release_requests
    ADD CONSTRAINT "person_release_requests_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.person_skills
    ADD CONSTRAINT "person_skills_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.person_skills
    ADD CONSTRAINT "person_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public.skills(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.planner_scenarios
    ADD CONSTRAINT "planner_scenarios_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT "platform_settings_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT "platform_settings_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_activation_approvals
    ADD CONSTRAINT "project_activation_approvals_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_activation_approvals
    ADD CONSTRAINT "project_activation_approvals_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_activation_approvals
    ADD CONSTRAINT "project_activation_approvals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.project_activation_approvals
    ADD CONSTRAINT "project_activation_approvals_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_activation_approvals
    ADD CONSTRAINT "project_activation_approvals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_activation_approvals
    ADD CONSTRAINT "project_activation_approvals_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT "project_budgets_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT "project_budgets_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES public."Currency"(code) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT "project_budgets_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT "project_change_requests_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT "project_change_requests_decidedByPersonId_fkey" FOREIGN KEY ("decidedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT "project_change_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT "project_change_requests_requesterPersonId_fkey" FOREIGN KEY ("requesterPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT "project_change_requests_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "project_milestones_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "project_milestones_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "project_milestones_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES public.project_workstreams(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_radiator_overrides
    ADD CONSTRAINT "project_radiator_overrides_overriddenByPersonId_fkey" FOREIGN KEY ("overriddenByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_radiator_overrides
    ADD CONSTRAINT "project_radiator_overrides_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES public.project_rag_snapshots(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.project_rag_snapshots
    ADD CONSTRAINT "project_rag_snapshots_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_rag_snapshots
    ADD CONSTRAINT "project_rag_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_rag_snapshots
    ADD CONSTRAINT "project_rag_snapshots_recordedByPersonId_fkey" FOREIGN KEY ("recordedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_rag_snapshots
    ADD CONSTRAINT "project_rag_snapshots_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT "project_retrospectives_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT "project_retrospectives_facilitatedByPersonId_fkey" FOREIGN KEY ("facilitatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT "project_retrospectives_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT "project_retrospectives_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_assigneePersonId_fkey" FOREIGN KEY ("assigneePersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_convertedFromRiskId_fkey" FOREIGN KEY ("convertedFromRiskId") REFERENCES public.project_risks(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_relatedCaseId_fkey" FOREIGN KEY ("relatedCaseId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_role_plans
    ADD CONSTRAINT "project_role_plans_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_role_plans
    ADD CONSTRAINT "project_role_plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_role_plans
    ADD CONSTRAINT "project_role_plans_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT "project_vendor_engagements_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT "project_vendor_engagements_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES public."Currency"(code) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT "project_vendor_engagements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT "project_vendor_engagements_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT "project_vendor_engagements_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_workstreams
    ADD CONSTRAINT "project_workstreams_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.project_workstreams
    ADD CONSTRAINT "project_workstreams_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.project_workstreams
    ADD CONSTRAINT "project_workstreams_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.public_holidays
    ADD CONSTRAINT "public_holidays_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.pulse_reports
    ADD CONSTRAINT "pulse_reports_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.pulse_reports
    ADD CONSTRAINT "pulse_reports_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.radiator_threshold_configs
    ADD CONSTRAINT "radiator_threshold_configs_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.radiator_threshold_configs
    ADD CONSTRAINT "radiator_threshold_configs_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.rate_card_entries
    ADD CONSTRAINT "rate_card_entries_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.rate_card_entries
    ADD CONSTRAINT "rate_card_entries_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES public.rate_cards(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.rate_card_entries
    ADD CONSTRAINT "rate_card_entries_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT "rate_cards_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT "rate_cards_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT "rate_cards_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES public."Currency"(code) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT "rate_cards_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.rate_cards
    ADD CONSTRAINT "rate_cards_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.responsibility_rules
    ADD CONSTRAINT "responsibility_rules_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.responsibility_rules
    ADD CONSTRAINT "responsibility_rules_targetPersonId_fkey" FOREIGN KEY ("targetPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.responsibility_rules
    ADD CONSTRAINT "responsibility_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.responsibility_rules
    ADD CONSTRAINT "responsibility_rules_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.skills
    ADD CONSTRAINT "skills_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.skills
    ADD CONSTRAINT "skills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.skills
    ADD CONSTRAINT "skills_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.staffing_request_fulfilments
    ADD CONSTRAINT "staffing_request_fulfilments_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.staffing_request_fulfilments
    ADD CONSTRAINT "staffing_request_fulfilments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public.staffing_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.staffing_request_fulfilments
    ADD CONSTRAINT "staffing_request_fulfilments_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.staffing_requests
    ADD CONSTRAINT "staffing_requests_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.staffing_requests
    ADD CONSTRAINT "staffing_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.staffing_requests
    ADD CONSTRAINT "staffing_requests_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.timesheet_entries
    ADD CONSTRAINT "timesheet_entries_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.timesheet_entries
    ADD CONSTRAINT "timesheet_entries_timesheetWeekId_fkey" FOREIGN KEY ("timesheetWeekId") REFERENCES public.timesheet_weeks(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.timesheet_entries
    ADD CONSTRAINT "timesheet_entries_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.timesheet_weeks
    ADD CONSTRAINT "timesheet_weeks_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.timesheet_weeks
    ADD CONSTRAINT "timesheet_weeks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.timesheet_weeks
    ADD CONSTRAINT "timesheet_weeks_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.undo_actions
    ADD CONSTRAINT "undo_actions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.vendor_skill_areas
    ADD CONSTRAINT "vendor_skill_areas_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.vendor_skill_areas
    ADD CONSTRAINT "vendor_skill_areas_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT "vendors_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT "vendors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
--
--
ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT "vendors_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;
--
--
CREATE POLICY "AuditLog_tenant_isolation" ON public."AuditLog" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY "CaseRecord_tenant_isolation" ON public."CaseRecord" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY "DomainEvent_tenant_isolation" ON public."DomainEvent" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY "LocalAccount_owner_isolation" ON public."LocalAccount" USING (("personId" = public.dm_r_current_person())) WITH CHECK (("personId" = public.dm_r_current_person()));
--
--
CREATE POLICY "LocalAccount_tenant_isolation" ON public."LocalAccount" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY "OrgUnit_tenant_isolation" ON public."OrgUnit" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY "OutboxEvent_tenant_isolation" ON public."OutboxEvent" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY "PasswordResetToken_owner_isolation" ON public."PasswordResetToken" USING (("accountId" IN ( SELECT "LocalAccount".id
   FROM public."LocalAccount"
  WHERE ("LocalAccount"."personId" = public.dm_r_current_person())))) WITH CHECK (("accountId" IN ( SELECT "LocalAccount".id
   FROM public."LocalAccount"
  WHERE ("LocalAccount"."personId" = public.dm_r_current_person()))));
--
--
CREATE POLICY "Person_tenant_isolation" ON public."Person" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY "ProjectAssignment_tenant_isolation" ON public."ProjectAssignment" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY "Project_tenant_isolation" ON public."Project" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY "RefreshToken_owner_isolation" ON public."RefreshToken" USING (("accountId" IN ( SELECT "LocalAccount".id
   FROM public."LocalAccount"
  WHERE ("LocalAccount"."personId" = public.dm_r_current_person())))) WITH CHECK (("accountId" IN ( SELECT "LocalAccount".id
   FROM public."LocalAccount"
  WHERE ("LocalAccount"."personId" = public.dm_r_current_person()))));
--
--
CREATE POLICY "WorkEvidence_tenant_isolation" ON public."WorkEvidence" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY clients_tenant_isolation ON public.clients USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY contacts_owner_isolation ON public.contacts USING (("personId" = public.dm_r_current_person())) WITH CHECK (("personId" = public.dm_r_current_person()));
--
--
CREATE POLICY in_app_notifications_tenant_isolation ON public.in_app_notifications USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY leave_requests_tenant_isolation ON public.leave_requests USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY skills_tenant_isolation ON public.skills USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY staffing_requests_tenant_isolation ON public.staffing_requests USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY timesheet_weeks_tenant_isolation ON public.timesheet_weeks USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE POLICY vendors_tenant_isolation ON public.vendors USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));
--
--
CREATE EVENT TRIGGER dm_r_21_ddl_audit_trigger ON ddl_command_end
   EXECUTE FUNCTION public.dm_r_21_ddl_audit();
--
--
CREATE EVENT TRIGGER dm_r_21_ddl_lockout_trigger ON ddl_command_start
   EXECUTE FUNCTION public.dm_r_21_ddl_lockout();
--
--
CREATE EVENT TRIGGER dm_r_21_sql_drop_audit_trigger ON sql_drop
   EXECUTE FUNCTION public.dm_r_21_sql_drop_audit();
--
--
