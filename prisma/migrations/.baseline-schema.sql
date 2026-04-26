--
-- PostgreSQL database dump
--


-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: read_models; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA read_models;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: AggregateType; Type: TYPE; Schema: public; Owner: -
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
    'Migration'
);


--
-- Name: ApprovalDecision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApprovalDecision" AS ENUM (
    'REQUESTED',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: AssignmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssignmentStatus" AS ENUM (
    'CREATED',
    'PROPOSED',
    'REJECTED',
    'BOOKED',
    'ONBOARDING',
    'ASSIGNED',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: BudgetApprovalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BudgetApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: CaseParticipantRole; Type: TYPE; Schema: public; Owner: -
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
-- Name: CaseStatus; Type: TYPE; Schema: public; Owner: -
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
-- Name: CaseTypeKey; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CaseTypeKey" AS ENUM (
    'OFFBOARDING',
    'ONBOARDING',
    'PERFORMANCE',
    'TRANSFER',
    'OVERTIME_EXCEPTION'
);


--
-- Name: ChangeRequestSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChangeRequestSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: ChangeRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChangeRequestStatus" AS ENUM (
    'PROPOSED',
    'APPROVED',
    'REJECTED',
    'WITHDRAWN'
);


--
-- Name: ContactKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContactKind" AS ENUM (
    'EMAIL',
    'PHONE',
    'ADDRESS'
);


--
-- Name: EmploymentEventKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmploymentEventKind" AS ENUM (
    'HIRE',
    'TERMINATE',
    'LEAVE_START',
    'LEAVE_END',
    'REHIRE'
);


--
-- Name: EngagementModel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EngagementModel" AS ENUM (
    'TIME_AND_MATERIAL',
    'FIXED_PRICE',
    'MANAGED_SERVICE',
    'INTERNAL'
);


--
-- Name: ExternalAccountPresenceState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExternalAccountPresenceState" AS ENUM (
    'PRESENT',
    'ABSENT',
    'SUSPENDED',
    'UNKNOWN'
);


--
-- Name: ExternalAccountSourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExternalAccountSourceType" AS ENUM (
    'LDAP',
    'AZURE_AD',
    'GOOGLE_WORKSPACE',
    'RADIUS',
    'MANUAL'
);


--
-- Name: LeaveRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeaveRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: LeaveRequestType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeaveRequestType" AS ENUM (
    'ANNUAL',
    'SICK',
    'OTHER',
    'OT_OFF',
    'PERSONAL',
    'PARENTAL',
    'BEREAVEMENT',
    'STUDY'
);


--
-- Name: LocalAccountSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LocalAccountSource" AS ENUM (
    'local',
    'ldap',
    'azure_ad',
    'google',
    'okta'
);


--
-- Name: MetadataDataType; Type: TYPE; Schema: public; Owner: -
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
-- Name: MilestoneStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MilestoneStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'HIT',
    'MISSED'
);


--
-- Name: NotificationChannelKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationChannelKind" AS ENUM (
    'EMAIL',
    'SMS',
    'IN_APP',
    'PUSH',
    'SLACK',
    'WEBHOOK'
);


--
-- Name: NotificationDeliveryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationDeliveryStatus" AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED_TERMINAL',
    'RETRYING'
);


--
-- Name: NotificationRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationRequestStatus" AS ENUM (
    'QUEUED',
    'SENT',
    'FAILED_TERMINAL',
    'RETRYING'
);


--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'READ'
);


--
-- Name: OrgUnitStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrgUnitStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ARCHIVED'
);


--
-- Name: OutboxEventStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OutboxEventStatus" AS ENUM (
    'PENDING',
    'PUBLISHED',
    'FAILED',
    'RETRY'
);


--
-- Name: PersonCostRateType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PersonCostRateType" AS ENUM (
    'INTERNAL'
);


--
-- Name: PersonEmploymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PersonEmploymentStatus" AS ENUM (
    'ACTIVE',
    'LEAVE',
    'INACTIVE',
    'TERMINATED'
);


--
-- Name: ProjectPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProjectPriority" AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
);


--
-- Name: ProjectShape; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProjectShape" AS ENUM (
    'SMALL',
    'STANDARD',
    'ENTERPRISE',
    'PROGRAM'
);


--
-- Name: ProjectStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProjectStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'ARCHIVED',
    'CLOSED'
);


--
-- Name: RagRating; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RagRating" AS ENUM (
    'GREEN',
    'AMBER',
    'RED'
);


--
-- Name: ReportingAuthority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReportingAuthority" AS ENUM (
    'APPROVER',
    'REVIEWER',
    'VIEWER'
);


--
-- Name: ReportingLineType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReportingLineType" AS ENUM (
    'SOLID_LINE',
    'DOTTED_LINE',
    'FUNCTIONAL',
    'PROJECT'
);


--
-- Name: RiskCategory; Type: TYPE; Schema: public; Owner: -
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
-- Name: RiskReviewCadence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RiskReviewCadence" AS ENUM (
    'WEEKLY',
    'FORTNIGHTLY',
    'MONTHLY',
    'QUARTERLY'
);


--
-- Name: RiskStatus; Type: TYPE; Schema: public; Owner: -
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
-- Name: RiskStrategy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RiskStrategy" AS ENUM (
    'MITIGATE',
    'ACCEPT',
    'TRANSFER',
    'AVOID',
    'ESCALATE'
);


--
-- Name: RiskType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RiskType" AS ENUM (
    'RISK',
    'ISSUE'
);


--
-- Name: RolePlanSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RolePlanSource" AS ENUM (
    'INTERNAL',
    'VENDOR',
    'EITHER'
);


--
-- Name: StaffingRequestPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StaffingRequestPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


--
-- Name: StaffingRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StaffingRequestStatus" AS ENUM (
    'DRAFT',
    'OPEN',
    'IN_REVIEW',
    'FULFILLED',
    'CANCELLED'
);


--
-- Name: SyncStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SyncStatus" AS ENUM (
    'IDLE',
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'PARTIAL'
);


--
-- Name: ThresholdDirection; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ThresholdDirection" AS ENUM (
    'HIGHER_IS_BETTER',
    'LOWER_IS_BETTER'
);


--
-- Name: TimesheetStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TimesheetStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);


--
-- Name: VendorContractType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VendorContractType" AS ENUM (
    'STAFF_AUGMENTATION',
    'FIXED_DELIVERABLE',
    'MANAGED_SERVICE'
);


--
-- Name: VendorEngagementStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VendorEngagementStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'TERMINATED'
);


--
-- Name: WorkEvidenceLinkType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkEvidenceLinkType" AS ENUM (
    'ISSUE'
);


--
-- Name: WorkEvidenceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkEvidenceStatus" AS ENUM (
    'CAPTURED',
    'RECONCILED',
    'IGNORED',
    'ARCHIVED'
);


--
-- Name: WorkEvidenceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkEvidenceType" AS ENUM (
    'JIRA_WORKLOG',
    'MANUAL_ENTRY',
    'TIMESHEET_ENTRY'
);


--
-- Name: WorkflowDefinitionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkflowDefinitionStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'RETIRED'
);


--
-- Name: dm_r_21_ddl_audit(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: dm_r_21_ddl_lockout(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: dm_r_21_sql_drop_audit(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: dm_r_22_audit_hash_chain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: dm_r_23_mass_mutation_guard(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: dm_r_31_honeypot_guard(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: dm_r_current_person(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: dm_r_current_tenant(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: in_app_notifications_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: leave_requests_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: period_locks_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: person_cost_rates_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: person_skills_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: project_budgets_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: pulse_entries_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: skills_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: staffing_request_fulfilments_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: staffing_requests_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: timesheet_entries_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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
-- Name: timesheet_weeks_dm2_dualmaintain(); Type: FUNCTION; Schema: public; Owner: -
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AssignmentApproval; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: AssignmentHistory; Type: TABLE; Schema: public; Owner: -
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
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
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
    "tenantId" uuid
);


--
-- Name: AuditLog_chainSeq_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AuditLog_chainSeq_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AuditLog_chainSeq_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AuditLog_chainSeq_seq" OWNED BY public."AuditLog"."chainSeq";


--
-- Name: CaseParticipant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CaseParticipant" (
    id uuid NOT NULL,
    "caseRecordId" uuid NOT NULL,
    "personId" uuid NOT NULL,
    role public."CaseParticipantRole" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CaseRecord; Type: TABLE; Schema: public; Owner: -
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
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: CaseStep; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: CaseType; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CaseType" (
    id uuid NOT NULL,
    key public."CaseTypeKey" NOT NULL,
    "displayName" text NOT NULL,
    description text,
    "workflowDefinitionId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: Currency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Currency" (
    code character varying(3) NOT NULL,
    name text NOT NULL,
    "minorUnit" integer DEFAULT 2 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: CustomFieldDefinition; Type: TABLE; Schema: public; Owner: -
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
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: CustomFieldValue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CustomFieldValue" (
    id uuid NOT NULL,
    "entityType" text NOT NULL,
    "entityId" uuid NOT NULL,
    "customFieldDefinitionId" uuid NOT NULL,
    value jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: DomainEvent; Type: TABLE; Schema: public; Owner: -
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
-- Name: DomainEvent_chainSeq_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DomainEvent_chainSeq_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DomainEvent_chainSeq_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DomainEvent_chainSeq_seq" OWNED BY public."DomainEvent"."chainSeq";


--
-- Name: DomainEvent_default; Type: TABLE; Schema: public; Owner: -
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
-- Name: EmployeeActivityEvent; Type: TABLE; Schema: public; Owner: -
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
-- Name: EntityLayoutDefinition; Type: TABLE; Schema: public; Owner: -
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
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: ExternalAccountLink; Type: TABLE; Schema: public; Owner: -
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
-- Name: ExternalSyncState; Type: TABLE; Schema: public; Owner: -
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
-- Name: IntegrationSyncState; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: LocalAccount; Type: TABLE; Schema: public; Owner: -
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
    "tenantId" uuid
);


--
-- Name: M365DirectoryReconciliationRecord; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: MetadataDictionary; Type: TABLE; Schema: public; Owner: -
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
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: MetadataEntry; Type: TABLE; Schema: public; Owner: -
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
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tenantId" uuid NOT NULL,
    "recipientPersonId" uuid NOT NULL,
    "channelKind" public."NotificationChannelKind" NOT NULL,
    "eventType" text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    payload jsonb,
    status public."NotificationStatus" DEFAULT 'PENDING'::public."NotificationStatus" NOT NULL,
    "sentAt" timestamp with time zone,
    "deliveredAt" timestamp with time zone,
    "readAt" timestamp with time zone,
    "failedAt" timestamp with time zone,
    "failureReason" text,
    "providerId" text,
    "providerMessageId" text,
    "correlationId" text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: NotificationChannel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NotificationChannel" (
    id uuid NOT NULL,
    "channelKey" text NOT NULL,
    "displayName" text NOT NULL,
    kind text NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    config jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: NotificationDelivery; Type: TABLE; Schema: public; Owner: -
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
    "nextAttemptAt" timestamp(3) with time zone
);


--
-- Name: NotificationRequest; Type: TABLE; Schema: public; Owner: -
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
    "nextAttemptAt" timestamp(3) with time zone
);


--
-- Name: NotificationTemplate; Type: TABLE; Schema: public; Owner: -
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
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: OrgUnit; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT "OrgUnit_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);


--
-- Name: OutboxEvent; Type: TABLE; Schema: public; Owner: -
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
    "tenantId" uuid
);


--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: -
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
-- Name: Person; Type: TABLE; Schema: public; Owner: -
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
    "gradeId" uuid,
    "jobRoleId" uuid,
    "locationId" uuid
);


--
-- Name: PersonExternalIdentityLink; Type: TABLE; Schema: public; Owner: -
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
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: PersonOrgMembership; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT "PersonOrgMembership_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);


--
-- Name: PersonResourcePoolMembership; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT "PersonResourcePoolMembership_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);


--
-- Name: Position; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT "Position_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);


--
-- Name: Project; Type: TABLE; Schema: public; Owner: -
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
    version integer DEFAULT 1 NOT NULL,
    "clientId" uuid,
    "deliveryManagerId" uuid,
    domain text,
    "engagementModel" public."EngagementModel",
    "lessonsLearned" text,
    "outcomeRating" text,
    priority public."ProjectPriority" DEFAULT 'MEDIUM'::public."ProjectPriority",
    "projectType" text,
    tags text[] DEFAULT ARRAY[]::text[],
    "techStack" text[] DEFAULT ARRAY[]::text[],
    "wouldStaffSameWay" boolean,
    "baselineEndsOn" timestamp(3) with time zone,
    "forecastEndsOn" timestamp(3) with time zone,
    "criticalPathFloatDays" integer,
    "baselineRequirements" integer,
    shape public."ProjectShape" DEFAULT 'STANDARD'::public."ProjectShape" NOT NULL,
    "programId" uuid,
    "leadPmPersonId" uuid,
    "settingsOverride" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "hasLiveSpcRates" boolean DEFAULT false NOT NULL,
    "tenantId" uuid,
    "domainId" uuid,
    "projectTypeId" uuid,
    CONSTRAINT "Project_startsOn_before_endsOn_check" CHECK ((("endsOn" IS NULL) OR ("startsOn" IS NULL) OR ("startsOn" <= "endsOn")))
);


--
-- Name: ProjectAssignment; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT "ProjectAssignment_allocationPercent_range_check" CHECK ((("allocationPercent" IS NULL) OR (("allocationPercent" >= (0)::numeric) AND ("allocationPercent" <= (100)::numeric)))),
    CONSTRAINT "ProjectAssignment_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);


--
-- Name: ProjectExternalLink; Type: TABLE; Schema: public; Owner: -
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
    "lastSeenAt" timestamp(3) with time zone
);


--
-- Name: RadiusReconciliationRecord; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: -
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
-- Name: ReportingLine; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT "ReportingLine_validFrom_before_validTo_check" CHECK ((("validTo" IS NULL) OR ("validFrom" <= "validTo")))
);


--
-- Name: ResourcePool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ResourcePool" (
    id uuid NOT NULL,
    "orgUnitId" uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tenant" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "suspendedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: WorkEvidence; Type: TABLE; Schema: public; Owner: -
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
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: WorkEvidenceLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkEvidenceLink" (
    id uuid NOT NULL,
    "workEvidenceId" uuid NOT NULL,
    provider text NOT NULL,
    "externalKey" text NOT NULL,
    "externalUrl" text,
    "linkType" public."WorkEvidenceLinkType" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: WorkEvidenceSource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkEvidenceSource" (
    id uuid NOT NULL,
    provider text NOT NULL,
    "sourceType" text NOT NULL,
    "connectionKey" text,
    "displayName" text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: WorkflowDefinition; Type: TABLE; Schema: public; Owner: -
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
    "archivedAt" timestamp(3) with time zone
);


--
-- Name: WorkflowStateDefinition; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
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
-- Name: budget_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "projectBudgetId" text NOT NULL,
    status public."BudgetApprovalStatus" DEFAULT 'PENDING'::public."BudgetApprovalStatus" NOT NULL,
    "requestedByPersonId" uuid NOT NULL,
    "decidedByPersonId" uuid,
    "decisionAt" timestamp with time zone,
    "decisionReason" text,
    "requestedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "requestedChange" jsonb,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: capacity_audit; Type: TABLE; Schema: public; Owner: -
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
-- Name: clients; Type: TABLE; Schema: public; Owner: -
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
    "tenantId" uuid
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "personId" uuid NOT NULL,
    kind public."ContactKind" NOT NULL,
    label text NOT NULL,
    value text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ddl_audit; Type: TABLE; Schema: public; Owner: -
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
-- Name: ddl_audit_chainSeq_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ddl_audit_chainSeq_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ddl_audit_chainSeq_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ddl_audit_chainSeq_seq" OWNED BY public.ddl_audit."chainSeq";


--
-- Name: domain_outbox_pending; Type: VIEW; Schema: public; Owner: -
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
-- Name: employee_activity_view; Type: VIEW; Schema: public; Owner: -
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
-- Name: employment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "personId" uuid NOT NULL,
    kind public."EmploymentEventKind" NOT NULL,
    "occurredOn" date NOT NULL,
    reason text,
    "recordedByPersonId" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tenantId" uuid NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "archivedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: honeypot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.honeypot (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tableName" text NOT NULL,
    "rowId" uuid NOT NULL,
    intent text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: honeypot_alerts; Type: TABLE; Schema: public; Owner: -
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
-- Name: in_app_notifications; Type: TABLE; Schema: public; Owner: -
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
    id_new uuid DEFAULT gen_random_uuid(),
    "publicId" character varying(32),
    "tenantId" uuid
);


--
-- Name: job_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tenantId" uuid NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    "archivedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leave_balances; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
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
    id_new uuid DEFAULT gen_random_uuid(),
    "publicId" character varying(32),
    "tenantId" uuid,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT "leave_requests_startDate_before_endDate_check" CHECK (("startDate" <= "endDate"))
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tenantId" uuid NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    "countryCode" character varying(2),
    timezone text,
    "archivedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migration_audit; Type: TABLE; Schema: public; Owner: -
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
-- Name: migration_audit_chainSeq_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."migration_audit_chainSeq_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migration_audit_chainSeq_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."migration_audit_chainSeq_seq" OWNED BY public.migration_audit."chainSeq";


--
-- Name: organization_configs; Type: TABLE; Schema: public; Owner: -
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
    "colourBlindMode" boolean DEFAULT false NOT NULL
);


--
-- Name: overtime_exceptions; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT overtime_exceptions_effective_range_check CHECK (("effectiveFrom" <= "effectiveTo")),
    CONSTRAINT "overtime_exceptions_maxOvertimeHoursPerWeek_nonnegative_check" CHECK ((("maxOvertimeHoursPerWeek" >= 0) AND ("maxOvertimeHoursPerWeek" <= 168)))
);


--
-- Name: overtime_policies; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT overtime_policies_effective_range_check CHECK ((("effectiveTo" IS NULL) OR ("effectiveFrom" <= "effectiveTo"))),
    CONSTRAINT "overtime_policies_maxOvertimeHoursPerWeek_nonnegative_check" CHECK ((("maxOvertimeHoursPerWeek" >= 0) AND ("maxOvertimeHoursPerWeek" <= 168))),
    CONSTRAINT "overtime_policies_standardHoursPerWeek_nonnegative_check" CHECK ((("standardHoursPerWeek" >= 0) AND ("standardHoursPerWeek" <= 168)))
);


--
-- Name: period_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.period_locks (
    id text NOT NULL,
    "periodFrom" date NOT NULL,
    "periodTo" date NOT NULL,
    "lockedBy" text NOT NULL,
    "lockedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid(),
    "publicId" character varying(32),
    CONSTRAINT period_locks_period_range_check CHECK (("periodFrom" <= "periodTo"))
);


--
-- Name: person_cost_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_cost_rates (
    id text NOT NULL,
    "personId" text NOT NULL,
    "effectiveFrom" date NOT NULL,
    "hourlyRate" numeric(10,2) NOT NULL,
    "rateType" public."PersonCostRateType" DEFAULT 'INTERNAL'::public."PersonCostRateType" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid(),
    "publicId" character varying(32),
    "currencyCode" character varying(3),
    CONSTRAINT "person_cost_rates_hourlyRate_positive_check" CHECK (("hourlyRate" > (0)::numeric))
);


--
-- Name: person_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_notification_preferences (
    id uuid NOT NULL,
    "personId" uuid NOT NULL,
    "channelKey" text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: person_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_skills (
    id text NOT NULL,
    "personId" text NOT NULL,
    "skillId" text NOT NULL,
    proficiency integer NOT NULL,
    certified boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    id_new uuid DEFAULT gen_random_uuid(),
    CONSTRAINT person_skills_proficiency_range_check CHECK (((proficiency >= 1) AND (proficiency <= 5)))
);


--
-- Name: planner_scenarios; Type: TABLE; Schema: public; Owner: -
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
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    "updatedBy" text,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: project_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_budgets (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "fiscalYear" integer NOT NULL,
    "capexBudget" numeric(15,2) DEFAULT 0 NOT NULL,
    "opexBudget" numeric(15,2) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "earnedValue" numeric(15,2),
    "actualCost" numeric(15,2),
    "plannedToDate" numeric(15,2),
    eac numeric(15,2),
    "capexCorrectPct" numeric(5,4),
    id_new uuid DEFAULT gen_random_uuid(),
    "publicId" character varying(32),
    "workstreamId" uuid,
    "vendorBudget" numeric(15,2),
    "currencyCode" character varying(3),
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT "project_budgets_capexBudget_nonnegative_check" CHECK (("capexBudget" >= (0)::numeric)),
    CONSTRAINT "project_budgets_opexBudget_nonnegative_check" CHECK (("opexBudget" >= (0)::numeric))
);


--
-- Name: project_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_change_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    "workstreamId" uuid
);


--
-- Name: project_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tenantId" uuid NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    "archivedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    "dependsOnMilestoneIds" text[] DEFAULT ARRAY[]::text[] NOT NULL
);


--
-- Name: project_radiator_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_radiator_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
-- Name: project_rag_snapshots; Type: TABLE; Schema: public; Owner: -
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
    "overallScore" integer
);


--
-- Name: project_retrospectives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_retrospectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "projectId" uuid NOT NULL,
    "outcomeRating" text,
    "lessonsLearned" text,
    "wouldStaffSameWay" boolean,
    "retrospectiveDate" date,
    "facilitatedByPersonId" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_risks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    CONSTRAINT project_risks_impact_range_check CHECK (((impact >= 1) AND (impact <= 5))),
    CONSTRAINT project_risks_probability_range_check CHECK (((probability >= 1) AND (probability <= 5)))
);


--
-- Name: project_role_plans; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT "project_role_plans_allocationPercent_range_check" CHECK ((("allocationPercent" IS NULL) OR (("allocationPercent" >= (0)::numeric) AND ("allocationPercent" <= (100)::numeric)))),
    CONSTRAINT project_role_plans_headcount_positive_check CHECK ((headcount >= 1))
);


--
-- Name: project_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "projectId" uuid NOT NULL,
    tag text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_technologies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_technologies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "projectId" uuid NOT NULL,
    technology text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "tenantId" uuid NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    "archivedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_vendor_engagements; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT "project_vendor_engagements_dateRange_check" CHECK ((("endDate" IS NULL) OR ("startDate" IS NULL) OR ("startDate" <= "endDate"))),
    CONSTRAINT project_vendor_engagements_headcount_positive_check CHECK ((headcount >= 1))
);


--
-- Name: project_workstreams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_workstreams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "projectId" uuid NOT NULL,
    name text NOT NULL,
    "streamLeadPersonId" uuid,
    "budgetShare" numeric(5,4),
    "startDate" date NOT NULL,
    "endDate" date,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: public_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_holidays (
    id uuid NOT NULL,
    date date NOT NULL,
    name text NOT NULL,
    "countryCode" text DEFAULT 'AU'::text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pulse_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pulse_entries (
    id text NOT NULL,
    "personId" text NOT NULL,
    "weekStart" date NOT NULL,
    mood integer NOT NULL,
    note text,
    "submittedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid(),
    CONSTRAINT pulse_entries_mood_range_check CHECK (((mood >= 1) AND (mood <= 5)))
);


--
-- Name: pulse_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pulse_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "projectId" uuid NOT NULL,
    "weekStarting" date NOT NULL,
    dimensions jsonb DEFAULT '{}'::jsonb NOT NULL,
    "overallNarrative" text,
    "submittedByPersonId" uuid,
    "submittedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: radiator_threshold_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.radiator_threshold_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "subDimensionKey" text NOT NULL,
    "thresholdScore4" double precision NOT NULL,
    "thresholdScore3" double precision NOT NULL,
    "thresholdScore2" double precision NOT NULL,
    "thresholdScore1" double precision NOT NULL,
    direction public."ThresholdDirection" DEFAULT 'HIGHER_IS_BETTER'::public."ThresholdDirection" NOT NULL,
    "updatedByPersonId" uuid,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id text NOT NULL,
    name text NOT NULL,
    category text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid(),
    "publicId" character varying(32),
    "tenantId" uuid
);


--
-- Name: staffing_request_fulfilments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staffing_request_fulfilments (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "assignedPersonId" text NOT NULL,
    "proposedByPersonId" text NOT NULL,
    "fulfilledAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_new uuid DEFAULT gen_random_uuid()
);


--
-- Name: staffing_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staffing_requests (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "requestedByPersonId" text NOT NULL,
    role text NOT NULL,
    skills text[],
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
    id_new uuid DEFAULT gen_random_uuid(),
    "publicId" character varying(32),
    "tenantId" uuid,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT "staffing_requests_allocationPercent_range_check" CHECK ((("allocationPercent" >= (0)::numeric) AND ("allocationPercent" <= (100)::numeric))),
    CONSTRAINT "staffing_requests_headcountFulfilled_nonnegative_check" CHECK ((("headcountFulfilled" >= 0) AND ("headcountFulfilled" <= "headcountRequired"))),
    CONSTRAINT "staffing_requests_headcountRequired_positive_check" CHECK (("headcountRequired" >= 1)),
    CONSTRAINT "staffing_requests_startDate_before_endDate_check" CHECK (("startDate" <= "endDate"))
);


--
-- Name: timesheet_entries; Type: TABLE; Schema: public; Owner: -
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
    "benchCategory" text,
    id_new uuid DEFAULT gen_random_uuid(),
    CONSTRAINT timesheet_entries_hours_nonnegative_check CHECK (((hours >= (0)::numeric) AND (hours <= (24)::numeric)))
);


--
-- Name: timesheet_weeks; Type: TABLE; Schema: public; Owner: -
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
    id_new uuid DEFAULT gen_random_uuid(),
    "publicId" character varying(32),
    "tenantId" uuid,
    CONSTRAINT "timesheet_weeks_overtimeHours_nonnegative_check" CHECK ((("overtimeHours" IS NULL) OR ("overtimeHours" >= (0)::numeric))),
    CONSTRAINT "timesheet_weeks_standardHours_nonnegative_check" CHECK ((("standardHours" IS NULL) OR ("standardHours" >= (0)::numeric))),
    CONSTRAINT "timesheet_weeks_totalHours_nonnegative_check" CHECK ((("totalHours" IS NULL) OR ("totalHours" >= (0)::numeric)))
);


--
-- Name: undo_actions; Type: TABLE; Schema: public; Owner: -
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
-- Name: vendor_skill_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_skill_areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "vendorId" uuid NOT NULL,
    "skillArea" text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
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
    "tenantId" uuid
);


--
-- Name: mv_person_week_hours; Type: MATERIALIZED VIEW; Schema: read_models; Owner: -
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
-- Name: mv_project_weekly_roster; Type: MATERIALIZED VIEW; Schema: read_models; Owner: -
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
-- Name: DomainEvent_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DomainEvent" ATTACH PARTITION public."DomainEvent_default" DEFAULT;


--
-- Name: AuditLog chainSeq; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog" ALTER COLUMN "chainSeq" SET DEFAULT nextval('public."AuditLog_chainSeq_seq"'::regclass);


--
-- Name: DomainEvent chainSeq; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DomainEvent" ALTER COLUMN "chainSeq" SET DEFAULT nextval('public."DomainEvent_chainSeq_seq"'::regclass);


--
-- Name: ddl_audit chainSeq; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ddl_audit ALTER COLUMN "chainSeq" SET DEFAULT nextval('public."ddl_audit_chainSeq_seq"'::regclass);


--
-- Name: migration_audit chainSeq; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_audit ALTER COLUMN "chainSeq" SET DEFAULT nextval('public."migration_audit_chainSeq_seq"'::regclass);


--
-- Name: AssignmentApproval AssignmentApproval_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentApproval"
    ADD CONSTRAINT "AssignmentApproval_pkey" PRIMARY KEY (id);


--
-- Name: AssignmentHistory AssignmentHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentHistory"
    ADD CONSTRAINT "AssignmentHistory_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: CaseParticipant CaseParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseParticipant"
    ADD CONSTRAINT "CaseParticipant_pkey" PRIMARY KEY (id);


--
-- Name: CaseRecord CaseRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_pkey" PRIMARY KEY (id);


--
-- Name: CaseStep CaseStep_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_pkey" PRIMARY KEY (id);


--
-- Name: CaseType CaseType_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseType"
    ADD CONSTRAINT "CaseType_pkey" PRIMARY KEY (id);


--
-- Name: Currency Currency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Currency"
    ADD CONSTRAINT "Currency_pkey" PRIMARY KEY (code);


--
-- Name: CustomFieldDefinition CustomFieldDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomFieldDefinition"
    ADD CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY (id);


--
-- Name: CustomFieldValue CustomFieldValue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomFieldValue"
    ADD CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY (id);


--
-- Name: DomainEvent DomainEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DomainEvent"
    ADD CONSTRAINT "DomainEvent_pkey" PRIMARY KEY (id, "createdAt");


--
-- Name: DomainEvent_default DomainEvent_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DomainEvent_default"
    ADD CONSTRAINT "DomainEvent_default_pkey" PRIMARY KEY (id, "createdAt");


--
-- Name: EmployeeActivityEvent EmployeeActivityEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeActivityEvent"
    ADD CONSTRAINT "EmployeeActivityEvent_pkey" PRIMARY KEY (id);


--
-- Name: EntityLayoutDefinition EntityLayoutDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntityLayoutDefinition"
    ADD CONSTRAINT "EntityLayoutDefinition_pkey" PRIMARY KEY (id);


--
-- Name: ExternalAccountLink ExternalAccountLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExternalAccountLink"
    ADD CONSTRAINT "ExternalAccountLink_pkey" PRIMARY KEY (id);


--
-- Name: ExternalSyncState ExternalSyncState_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExternalSyncState"
    ADD CONSTRAINT "ExternalSyncState_pkey" PRIMARY KEY (id);


--
-- Name: IntegrationSyncState IntegrationSyncState_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IntegrationSyncState"
    ADD CONSTRAINT "IntegrationSyncState_pkey" PRIMARY KEY (id);


--
-- Name: LocalAccount LocalAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LocalAccount"
    ADD CONSTRAINT "LocalAccount_pkey" PRIMARY KEY (id);


--
-- Name: M365DirectoryReconciliationRecord M365DirectoryReconciliationRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."M365DirectoryReconciliationRecord"
    ADD CONSTRAINT "M365DirectoryReconciliationRecord_pkey" PRIMARY KEY (id);


--
-- Name: MetadataDictionary MetadataDictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MetadataDictionary"
    ADD CONSTRAINT "MetadataDictionary_pkey" PRIMARY KEY (id);


--
-- Name: MetadataEntry MetadataEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MetadataEntry"
    ADD CONSTRAINT "MetadataEntry_pkey" PRIMARY KEY (id);


--
-- Name: NotificationChannel NotificationChannel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationChannel"
    ADD CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY (id);


--
-- Name: NotificationDelivery NotificationDelivery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY (id);


--
-- Name: NotificationRequest NotificationRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationRequest"
    ADD CONSTRAINT "NotificationRequest_pkey" PRIMARY KEY (id);


--
-- Name: NotificationTemplate NotificationTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationTemplate"
    ADD CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OrgUnit OrgUnit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_pkey" PRIMARY KEY (id);


--
-- Name: OutboxEvent OutboxEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OutboxEvent"
    ADD CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: PersonExternalIdentityLink PersonExternalIdentityLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonExternalIdentityLink"
    ADD CONSTRAINT "PersonExternalIdentityLink_pkey" PRIMARY KEY (id);


--
-- Name: PersonOrgMembership PersonOrgMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_pkey" PRIMARY KEY (id);


--
-- Name: PersonResourcePoolMembership PersonResourcePoolMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonResourcePoolMembership"
    ADD CONSTRAINT "PersonResourcePoolMembership_pkey" PRIMARY KEY (id);


--
-- Name: Person Person_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Person"
    ADD CONSTRAINT "Person_pkey" PRIMARY KEY (id);


--
-- Name: Position Position_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_pkey" PRIMARY KEY (id);


--
-- Name: ProjectAssignment ProjectAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY (id);


--
-- Name: ProjectExternalLink ProjectExternalLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectExternalLink"
    ADD CONSTRAINT "ProjectExternalLink_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: RadiusReconciliationRecord RadiusReconciliationRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RadiusReconciliationRecord"
    ADD CONSTRAINT "RadiusReconciliationRecord_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: ReportingLine ReportingLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReportingLine"
    ADD CONSTRAINT "ReportingLine_pkey" PRIMARY KEY (id);


--
-- Name: ResourcePool ResourcePool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResourcePool"
    ADD CONSTRAINT "ResourcePool_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_code_key" UNIQUE (code);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: WorkEvidenceLink WorkEvidenceLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvidenceLink"
    ADD CONSTRAINT "WorkEvidenceLink_pkey" PRIMARY KEY (id);


--
-- Name: WorkEvidenceSource WorkEvidenceSource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvidenceSource"
    ADD CONSTRAINT "WorkEvidenceSource_pkey" PRIMARY KEY (id);


--
-- Name: WorkEvidence WorkEvidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_pkey" PRIMARY KEY (id);


--
-- Name: WorkflowDefinition WorkflowDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkflowDefinition"
    ADD CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY (id);


--
-- Name: WorkflowStateDefinition WorkflowStateDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkflowStateDefinition"
    ADD CONSTRAINT "WorkflowStateDefinition_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: budget_approvals budget_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT budget_approvals_pkey PRIMARY KEY (id);


--
-- Name: capacity_audit capacity_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_audit
    ADD CONSTRAINT capacity_audit_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: ddl_audit ddl_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ddl_audit
    ADD CONSTRAINT ddl_audit_pkey PRIMARY KEY (id);


--
-- Name: employment_events employment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employment_events
    ADD CONSTRAINT employment_events_pkey PRIMARY KEY (id);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: grades grades_tenantId_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT "grades_tenantId_code_key" UNIQUE ("tenantId", code);


--
-- Name: honeypot_alerts honeypot_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.honeypot_alerts
    ADD CONSTRAINT honeypot_alerts_pkey PRIMARY KEY (id);


--
-- Name: honeypot honeypot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.honeypot
    ADD CONSTRAINT honeypot_pkey PRIMARY KEY (id);


--
-- Name: honeypot honeypot_tableName_rowId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.honeypot
    ADD CONSTRAINT "honeypot_tableName_rowId_key" UNIQUE ("tableName", "rowId");


--
-- Name: in_app_notifications in_app_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT in_app_notifications_pkey PRIMARY KEY (id);


--
-- Name: job_roles job_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_roles
    ADD CONSTRAINT job_roles_pkey PRIMARY KEY (id);


--
-- Name: job_roles job_roles_tenantId_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_roles
    ADD CONSTRAINT "job_roles_tenantId_code_key" UNIQUE ("tenantId", code);


--
-- Name: leave_balances leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: locations locations_tenantId_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT "locations_tenantId_code_key" UNIQUE ("tenantId", code);


--
-- Name: migration_audit migration_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_audit
    ADD CONSTRAINT migration_audit_pkey PRIMARY KEY (id);


--
-- Name: organization_configs organization_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_configs
    ADD CONSTRAINT organization_configs_pkey PRIMARY KEY (id);


--
-- Name: overtime_exceptions overtime_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_exceptions
    ADD CONSTRAINT overtime_exceptions_pkey PRIMARY KEY (id);


--
-- Name: overtime_policies overtime_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT overtime_policies_pkey PRIMARY KEY (id);


--
-- Name: period_locks period_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_locks
    ADD CONSTRAINT period_locks_pkey PRIMARY KEY (id);


--
-- Name: person_cost_rates person_cost_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_cost_rates
    ADD CONSTRAINT person_cost_rates_pkey PRIMARY KEY (id);


--
-- Name: person_notification_preferences person_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_notification_preferences
    ADD CONSTRAINT person_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: person_skills person_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_skills
    ADD CONSTRAINT person_skills_pkey PRIMARY KEY (id);


--
-- Name: planner_scenarios planner_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planner_scenarios
    ADD CONSTRAINT planner_scenarios_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (key);


--
-- Name: project_budgets project_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT project_budgets_pkey PRIMARY KEY (id);


--
-- Name: project_budgets project_budgets_projectId_fiscalYear_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT "project_budgets_projectId_fiscalYear_key" UNIQUE ("projectId", "fiscalYear");


--
-- Name: project_change_requests project_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT project_change_requests_pkey PRIMARY KEY (id);


--
-- Name: project_domains project_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_domains
    ADD CONSTRAINT project_domains_pkey PRIMARY KEY (id);


--
-- Name: project_domains project_domains_tenantId_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_domains
    ADD CONSTRAINT "project_domains_tenantId_code_key" UNIQUE ("tenantId", code);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_radiator_overrides project_radiator_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_radiator_overrides
    ADD CONSTRAINT project_radiator_overrides_pkey PRIMARY KEY (id);


--
-- Name: project_rag_snapshots project_rag_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_rag_snapshots
    ADD CONSTRAINT project_rag_snapshots_pkey PRIMARY KEY (id);


--
-- Name: project_retrospectives project_retrospectives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT project_retrospectives_pkey PRIMARY KEY (id);


--
-- Name: project_retrospectives project_retrospectives_projectId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT "project_retrospectives_projectId_key" UNIQUE ("projectId");


--
-- Name: project_risks project_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT project_risks_pkey PRIMARY KEY (id);


--
-- Name: project_role_plans project_role_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_role_plans
    ADD CONSTRAINT project_role_plans_pkey PRIMARY KEY (id);


--
-- Name: project_tags project_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tags
    ADD CONSTRAINT project_tags_pkey PRIMARY KEY (id);


--
-- Name: project_tags project_tags_projectId_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tags
    ADD CONSTRAINT "project_tags_projectId_tag_key" UNIQUE ("projectId", tag);


--
-- Name: project_technologies project_technologies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_technologies
    ADD CONSTRAINT project_technologies_pkey PRIMARY KEY (id);


--
-- Name: project_technologies project_technologies_projectId_technology_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_technologies
    ADD CONSTRAINT "project_technologies_projectId_technology_key" UNIQUE ("projectId", technology);


--
-- Name: project_types project_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_types
    ADD CONSTRAINT project_types_pkey PRIMARY KEY (id);


--
-- Name: project_types project_types_tenantId_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_types
    ADD CONSTRAINT "project_types_tenantId_code_key" UNIQUE ("tenantId", code);


--
-- Name: project_vendor_engagements project_vendor_engagements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT project_vendor_engagements_pkey PRIMARY KEY (id);


--
-- Name: project_workstreams project_workstreams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_workstreams
    ADD CONSTRAINT project_workstreams_pkey PRIMARY KEY (id);


--
-- Name: public_holidays public_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_holidays
    ADD CONSTRAINT public_holidays_pkey PRIMARY KEY (id);


--
-- Name: pulse_entries pulse_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_entries
    ADD CONSTRAINT pulse_entries_pkey PRIMARY KEY (id);


--
-- Name: pulse_reports pulse_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_reports
    ADD CONSTRAINT pulse_reports_pkey PRIMARY KEY (id);


--
-- Name: radiator_threshold_configs radiator_threshold_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiator_threshold_configs
    ADD CONSTRAINT radiator_threshold_configs_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: staffing_request_fulfilments staffing_request_fulfilments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staffing_request_fulfilments
    ADD CONSTRAINT staffing_request_fulfilments_pkey PRIMARY KEY (id);


--
-- Name: staffing_requests staffing_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staffing_requests
    ADD CONSTRAINT staffing_requests_pkey PRIMARY KEY (id);


--
-- Name: timesheet_entries timesheet_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_entries
    ADD CONSTRAINT timesheet_entries_pkey PRIMARY KEY (id);


--
-- Name: timesheet_weeks timesheet_weeks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_weeks
    ADD CONSTRAINT timesheet_weeks_pkey PRIMARY KEY (id);


--
-- Name: undo_actions undo_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.undo_actions
    ADD CONSTRAINT undo_actions_pkey PRIMARY KEY (id);


--
-- Name: vendor_skill_areas vendor_skill_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_skill_areas
    ADD CONSTRAINT vendor_skill_areas_pkey PRIMARY KEY (id);


--
-- Name: vendor_skill_areas vendor_skill_areas_vendorId_skillArea_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_skill_areas
    ADD CONSTRAINT "vendor_skill_areas_vendorId_skillArea_key" UNIQUE ("vendorId", "skillArea");


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: AssignmentApproval_assignmentId_decision_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AssignmentApproval_assignmentId_decision_idx" ON public."AssignmentApproval" USING btree ("assignmentId", decision);


--
-- Name: AssignmentApproval_assignmentId_sequenceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AssignmentApproval_assignmentId_sequenceNumber_key" ON public."AssignmentApproval" USING btree ("assignmentId", "sequenceNumber");


--
-- Name: AssignmentApproval_decidedByPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AssignmentApproval_decidedByPersonId_idx" ON public."AssignmentApproval" USING btree ("decidedByPersonId");


--
-- Name: AssignmentHistory_assignmentId_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AssignmentHistory_assignmentId_occurredAt_idx" ON public."AssignmentHistory" USING btree ("assignmentId", "occurredAt");


--
-- Name: AssignmentHistory_changedByPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AssignmentHistory_changedByPersonId_idx" ON public."AssignmentHistory" USING btree ("changedByPersonId");


--
-- Name: AuditLog_actorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_actorId_idx" ON public."AuditLog" USING btree ("actorId");


--
-- Name: AuditLog_aggregateType_aggregateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_aggregateType_aggregateId_idx" ON public."AuditLog" USING btree ("aggregateType", "aggregateId");


--
-- Name: AuditLog_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_correlationId_idx" ON public."AuditLog" USING btree ("correlationId");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_tenantId_idx" ON public."AuditLog" USING btree ("tenantId");


--
-- Name: CaseParticipant_caseRecordId_personId_role_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CaseParticipant_caseRecordId_personId_role_key" ON public."CaseParticipant" USING btree ("caseRecordId", "personId", role);


--
-- Name: CaseParticipant_personId_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseParticipant_personId_role_idx" ON public."CaseParticipant" USING btree ("personId", role);


--
-- Name: CaseRecord_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseRecord_active_idx" ON public."CaseRecord" USING btree (id) WHERE ("archivedAt" IS NULL);


--
-- Name: CaseRecord_caseTypeId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseRecord_caseTypeId_status_idx" ON public."CaseRecord" USING btree ("caseTypeId", status);


--
-- Name: CaseRecord_ownerPersonId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseRecord_ownerPersonId_status_idx" ON public."CaseRecord" USING btree ("ownerPersonId", status);


--
-- Name: CaseRecord_relatedAssignmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseRecord_relatedAssignmentId_idx" ON public."CaseRecord" USING btree ("relatedAssignmentId");


--
-- Name: CaseRecord_relatedProjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseRecord_relatedProjectId_idx" ON public."CaseRecord" USING btree ("relatedProjectId");


--
-- Name: CaseRecord_subjectPersonId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseRecord_subjectPersonId_status_idx" ON public."CaseRecord" USING btree ("subjectPersonId", status);


--
-- Name: CaseRecord_summary_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseRecord_summary_trgm_idx" ON public."CaseRecord" USING gin (summary public.gin_trgm_ops) WHERE (summary IS NOT NULL);


--
-- Name: CaseRecord_tenantId_caseNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CaseRecord_tenantId_caseNumber_key" ON public."CaseRecord" USING btree ("tenantId", "caseNumber");


--
-- Name: CaseRecord_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseRecord_tenantId_idx" ON public."CaseRecord" USING btree ("tenantId");


--
-- Name: CaseStep_assignedToPersonId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseStep_assignedToPersonId_status_idx" ON public."CaseStep" USING btree ("assignedToPersonId", status);


--
-- Name: CaseStep_caseRecordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseStep_caseRecordId_idx" ON public."CaseStep" USING btree ("caseRecordId");


--
-- Name: CaseStep_caseRecordId_stepKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CaseStep_caseRecordId_stepKey_key" ON public."CaseStep" USING btree ("caseRecordId", "stepKey");


--
-- Name: CaseStep_workflowStateDefinitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseStep_workflowStateDefinitionId_idx" ON public."CaseStep" USING btree ("workflowStateDefinitionId");


--
-- Name: CaseType_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaseType_archivedAt_idx" ON public."CaseType" USING btree ("archivedAt");


--
-- Name: CaseType_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CaseType_key_key" ON public."CaseType" USING btree (key);


--
-- Name: CustomFieldDefinition_entityType_fieldKey_scopeOrgUnitId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CustomFieldDefinition_entityType_fieldKey_scopeOrgUnitId_key" ON public."CustomFieldDefinition" USING btree ("entityType", "fieldKey", "scopeOrgUnitId");


--
-- Name: CustomFieldDefinition_entityType_isEnabled_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomFieldDefinition_entityType_isEnabled_archivedAt_idx" ON public."CustomFieldDefinition" USING btree ("entityType", "isEnabled", "archivedAt");


--
-- Name: CustomFieldDefinition_metadataDictionaryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomFieldDefinition_metadataDictionaryId_idx" ON public."CustomFieldDefinition" USING btree ("metadataDictionaryId");


--
-- Name: CustomFieldDefinition_scopeOrgUnitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomFieldDefinition_scopeOrgUnitId_idx" ON public."CustomFieldDefinition" USING btree ("scopeOrgUnitId");


--
-- Name: CustomFieldValue_customFieldDefinitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomFieldValue_customFieldDefinitionId_idx" ON public."CustomFieldValue" USING btree ("customFieldDefinitionId");


--
-- Name: CustomFieldValue_entityType_entityId_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomFieldValue_entityType_entityId_archivedAt_idx" ON public."CustomFieldValue" USING btree ("entityType", "entityId", "archivedAt");


--
-- Name: CustomFieldValue_entityType_entityId_customFieldDefinitionI_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CustomFieldValue_entityType_entityId_customFieldDefinitionI_key" ON public."CustomFieldValue" USING btree ("entityType", "entityId", "customFieldDefinitionId");


--
-- Name: DomainEvent_aggregate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_aggregate_idx" ON ONLY public."DomainEvent" USING btree ("aggregateType", "aggregateId");


--
-- Name: DomainEvent_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_correlationId_idx" ON ONLY public."DomainEvent" USING btree ("correlationId") WHERE ("correlationId" IS NOT NULL);


--
-- Name: DomainEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_createdAt_idx" ON ONLY public."DomainEvent" USING btree ("createdAt" DESC);


--
-- Name: DomainEvent_default_aggregateType_aggregateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_default_aggregateType_aggregateId_idx" ON public."DomainEvent_default" USING btree ("aggregateType", "aggregateId");


--
-- Name: DomainEvent_unpublished_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_unpublished_idx" ON ONLY public."DomainEvent" USING btree ("chainSeq") WHERE ("publishedAt" IS NULL);


--
-- Name: DomainEvent_default_chainSeq_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_default_chainSeq_idx" ON public."DomainEvent_default" USING btree ("chainSeq") WHERE ("publishedAt" IS NULL);


--
-- Name: DomainEvent_default_correlationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_default_correlationId_idx" ON public."DomainEvent_default" USING btree ("correlationId") WHERE ("correlationId" IS NOT NULL);


--
-- Name: DomainEvent_default_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_default_createdAt_idx" ON public."DomainEvent_default" USING btree ("createdAt" DESC);


--
-- Name: DomainEvent_eventName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_eventName_idx" ON ONLY public."DomainEvent" USING btree ("eventName");


--
-- Name: DomainEvent_default_eventName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_default_eventName_idx" ON public."DomainEvent_default" USING btree ("eventName");


--
-- Name: DomainEvent_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_tenantId_idx" ON ONLY public."DomainEvent" USING btree ("tenantId");


--
-- Name: DomainEvent_default_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DomainEvent_default_tenantId_idx" ON public."DomainEvent_default" USING btree ("tenantId");


--
-- Name: EmployeeActivityEvent_actorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeActivityEvent_actorId_idx" ON public."EmployeeActivityEvent" USING btree ("actorId");


--
-- Name: EmployeeActivityEvent_eventType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeActivityEvent_eventType_idx" ON public."EmployeeActivityEvent" USING btree ("eventType");


--
-- Name: EmployeeActivityEvent_personId_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeActivityEvent_personId_occurredAt_idx" ON public."EmployeeActivityEvent" USING btree ("personId", "occurredAt");


--
-- Name: EntityLayoutDefinition_entityType_isDefault_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EntityLayoutDefinition_entityType_isDefault_archivedAt_idx" ON public."EntityLayoutDefinition" USING btree ("entityType", "isDefault", "archivedAt");


--
-- Name: EntityLayoutDefinition_entityType_layoutKey_version_scopeOr_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EntityLayoutDefinition_entityType_layoutKey_version_scopeOr_key" ON public."EntityLayoutDefinition" USING btree ("entityType", "layoutKey", version, "scopeOrgUnitId");


--
-- Name: EntityLayoutDefinition_scopeOrgUnitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EntityLayoutDefinition_scopeOrgUnitId_idx" ON public."EntityLayoutDefinition" USING btree ("scopeOrgUnitId");


--
-- Name: ExternalAccountLink_externalEmail_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExternalAccountLink_externalEmail_idx" ON public."ExternalAccountLink" USING btree ("externalEmail");


--
-- Name: ExternalAccountLink_externalUsername_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExternalAccountLink_externalUsername_idx" ON public."ExternalAccountLink" USING btree ("externalUsername");


--
-- Name: ExternalAccountLink_provider_externalAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ExternalAccountLink_provider_externalAccountId_key" ON public."ExternalAccountLink" USING btree (provider, "externalAccountId");


--
-- Name: ExternalAccountLink_provider_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExternalAccountLink_provider_personId_idx" ON public."ExternalAccountLink" USING btree (provider, "personId");


--
-- Name: ExternalSyncState_projectExternalLinkId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ExternalSyncState_projectExternalLinkId_key" ON public."ExternalSyncState" USING btree ("projectExternalLinkId");


--
-- Name: IntegrationSyncState_provider_resourceType_lastStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IntegrationSyncState_provider_resourceType_lastStatus_idx" ON public."IntegrationSyncState" USING btree (provider, "resourceType", "lastStatus");


--
-- Name: IntegrationSyncState_provider_resourceType_scopeKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IntegrationSyncState_provider_resourceType_scopeKey_key" ON public."IntegrationSyncState" USING btree (provider, "resourceType", "scopeKey");


--
-- Name: LocalAccount_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LocalAccount_email_idx" ON public."LocalAccount" USING btree (email);


--
-- Name: LocalAccount_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LocalAccount_email_key" ON public."LocalAccount" USING btree (email);


--
-- Name: LocalAccount_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LocalAccount_personId_idx" ON public."LocalAccount" USING btree ("personId");


--
-- Name: LocalAccount_personId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LocalAccount_personId_key" ON public."LocalAccount" USING btree ("personId");


--
-- Name: LocalAccount_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LocalAccount_tenantId_idx" ON public."LocalAccount" USING btree ("tenantId");


--
-- Name: M365DirectoryReconciliationRecord_lastEvaluatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "M365DirectoryReconciliationRecord_lastEvaluatedAt_idx" ON public."M365DirectoryReconciliationRecord" USING btree ("lastEvaluatedAt");


--
-- Name: M365DirectoryReconciliationRecord_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "M365DirectoryReconciliationRecord_personId_idx" ON public."M365DirectoryReconciliationRecord" USING btree ("personId");


--
-- Name: M365DirectoryReconciliationRecord_provider_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "M365DirectoryReconciliationRecord_provider_category_idx" ON public."M365DirectoryReconciliationRecord" USING btree (provider, category);


--
-- Name: M365DirectoryReconciliationRecord_provider_externalUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "M365DirectoryReconciliationRecord_provider_externalUserId_key" ON public."M365DirectoryReconciliationRecord" USING btree (provider, "externalUserId");


--
-- Name: M365DirectoryReconciliationRecord_resolvedManagerPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "M365DirectoryReconciliationRecord_resolvedManagerPersonId_idx" ON public."M365DirectoryReconciliationRecord" USING btree ("resolvedManagerPersonId");


--
-- Name: MetadataDictionary_entityType_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MetadataDictionary_entityType_archivedAt_idx" ON public."MetadataDictionary" USING btree ("entityType", "archivedAt");


--
-- Name: MetadataDictionary_entityType_dictionaryKey_scopeOrgUnitId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MetadataDictionary_entityType_dictionaryKey_scopeOrgUnitId_key" ON public."MetadataDictionary" USING btree ("entityType", "dictionaryKey", "scopeOrgUnitId");


--
-- Name: MetadataDictionary_scopeOrgUnitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MetadataDictionary_scopeOrgUnitId_idx" ON public."MetadataDictionary" USING btree ("scopeOrgUnitId");


--
-- Name: MetadataEntry_metadataDictionaryId_entryKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MetadataEntry_metadataDictionaryId_entryKey_key" ON public."MetadataEntry" USING btree ("metadataDictionaryId", "entryKey");


--
-- Name: MetadataEntry_metadataDictionaryId_isEnabled_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MetadataEntry_metadataDictionaryId_isEnabled_archivedAt_idx" ON public."MetadataEntry" USING btree ("metadataDictionaryId", "isEnabled", "archivedAt");


--
-- Name: NotificationChannel_channelKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NotificationChannel_channelKey_key" ON public."NotificationChannel" USING btree ("channelKey");


--
-- Name: NotificationChannel_kind_isEnabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationChannel_kind_isEnabled_idx" ON public."NotificationChannel" USING btree (kind, "isEnabled");


--
-- Name: NotificationDelivery_channelId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationDelivery_channelId_idx" ON public."NotificationDelivery" USING btree ("channelId");


--
-- Name: NotificationDelivery_notificationRequestId_attemptedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationDelivery_notificationRequestId_attemptedAt_idx" ON public."NotificationDelivery" USING btree ("notificationRequestId", "attemptedAt");


--
-- Name: NotificationDelivery_status_attemptedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationDelivery_status_attemptedAt_idx" ON public."NotificationDelivery" USING btree (status, "attemptedAt");


--
-- Name: NotificationDelivery_status_nextAttemptAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON public."NotificationDelivery" USING btree (status, "nextAttemptAt");


--
-- Name: NotificationRequest_eventName_status_requestedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationRequest_eventName_status_requestedAt_idx" ON public."NotificationRequest" USING btree ("eventName", status, "requestedAt");


--
-- Name: NotificationRequest_recipient_requestedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationRequest_recipient_requestedAt_idx" ON public."NotificationRequest" USING btree (recipient, "requestedAt");


--
-- Name: NotificationRequest_status_nextAttemptAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationRequest_status_nextAttemptAt_idx" ON public."NotificationRequest" USING btree (status, "nextAttemptAt");


--
-- Name: NotificationRequest_templateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationRequest_templateId_idx" ON public."NotificationRequest" USING btree ("templateId");


--
-- Name: NotificationTemplate_channelId_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationTemplate_channelId_archivedAt_idx" ON public."NotificationTemplate" USING btree ("channelId", "archivedAt");


--
-- Name: NotificationTemplate_eventName_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationTemplate_eventName_archivedAt_idx" ON public."NotificationTemplate" USING btree ("eventName", "archivedAt");


--
-- Name: NotificationTemplate_templateKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NotificationTemplate_templateKey_key" ON public."NotificationTemplate" USING btree ("templateKey");


--
-- Name: Notification_correlation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_correlation_idx" ON public."Notification" USING btree ("correlationId") WHERE ("correlationId" IS NOT NULL);


--
-- Name: Notification_recipient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_recipient_idx" ON public."Notification" USING btree ("recipientPersonId", "createdAt" DESC);


--
-- Name: Notification_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_status_idx" ON public."Notification" USING btree (status) WHERE (status = ANY (ARRAY['PENDING'::public."NotificationStatus", 'FAILED'::public."NotificationStatus"]));


--
-- Name: Notification_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_tenantId_idx" ON public."Notification" USING btree ("tenantId");


--
-- Name: Notification_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_unread_idx" ON public."Notification" USING btree ("recipientPersonId", "readAt") WHERE (("channelKind" = 'IN_APP'::public."NotificationChannelKind") AND ("readAt" IS NULL));


--
-- Name: OrgUnit_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrgUnit_active_idx" ON public."OrgUnit" USING btree (id) WHERE ("archivedAt" IS NULL);


--
-- Name: OrgUnit_managerPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrgUnit_managerPersonId_idx" ON public."OrgUnit" USING btree ("managerPersonId");


--
-- Name: OrgUnit_parentOrgUnitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrgUnit_parentOrgUnitId_idx" ON public."OrgUnit" USING btree ("parentOrgUnitId");


--
-- Name: OrgUnit_status_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrgUnit_status_archivedAt_idx" ON public."OrgUnit" USING btree (status, "archivedAt");


--
-- Name: OrgUnit_tenantId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrgUnit_tenantId_code_key" ON public."OrgUnit" USING btree ("tenantId", code);


--
-- Name: OrgUnit_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrgUnit_tenantId_idx" ON public."OrgUnit" USING btree ("tenantId");


--
-- Name: OutboxEvent_aggregateType_aggregateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON public."OutboxEvent" USING btree ("aggregateType", "aggregateId");


--
-- Name: OutboxEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OutboxEvent_createdAt_idx" ON public."OutboxEvent" USING btree ("createdAt");


--
-- Name: OutboxEvent_status_availableAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OutboxEvent_status_availableAt_idx" ON public."OutboxEvent" USING btree (status, "availableAt");


--
-- Name: OutboxEvent_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OutboxEvent_tenantId_idx" ON public."OutboxEvent" USING btree ("tenantId");


--
-- Name: PasswordResetToken_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_accountId_idx" ON public."PasswordResetToken" USING btree ("accountId");


--
-- Name: PasswordResetToken_tokenHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_tokenHash_idx" ON public."PasswordResetToken" USING btree ("tokenHash");


--
-- Name: PasswordResetToken_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON public."PasswordResetToken" USING btree ("tokenHash");


--
-- Name: PersonExternalIdentityLink_externalPrincipalName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PersonExternalIdentityLink_externalPrincipalName_idx" ON public."PersonExternalIdentityLink" USING btree ("externalPrincipalName");


--
-- Name: PersonExternalIdentityLink_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PersonExternalIdentityLink_personId_idx" ON public."PersonExternalIdentityLink" USING btree ("personId");


--
-- Name: PersonExternalIdentityLink_provider_externalUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PersonExternalIdentityLink_provider_externalUserId_key" ON public."PersonExternalIdentityLink" USING btree (provider, "externalUserId");


--
-- Name: PersonExternalIdentityLink_provider_personId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PersonExternalIdentityLink_provider_personId_key" ON public."PersonExternalIdentityLink" USING btree (provider, "personId");


--
-- Name: PersonExternalIdentityLink_resolvedManagerPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PersonExternalIdentityLink_resolvedManagerPersonId_idx" ON public."PersonExternalIdentityLink" USING btree ("resolvedManagerPersonId");


--
-- Name: PersonOrgMembership_orgUnitId_validFrom_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PersonOrgMembership_orgUnitId_validFrom_validTo_idx" ON public."PersonOrgMembership" USING btree ("orgUnitId", "validFrom", "validTo");


--
-- Name: PersonOrgMembership_personId_orgUnitId_validFrom_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PersonOrgMembership_personId_orgUnitId_validFrom_key" ON public."PersonOrgMembership" USING btree ("personId", "orgUnitId", "validFrom");


--
-- Name: PersonOrgMembership_personId_validFrom_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PersonOrgMembership_personId_validFrom_validTo_idx" ON public."PersonOrgMembership" USING btree ("personId", "validFrom", "validTo");


--
-- Name: PersonOrgMembership_positionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PersonOrgMembership_positionId_idx" ON public."PersonOrgMembership" USING btree ("positionId");


--
-- Name: PersonResourcePoolMembership_personId_resourcePoolId_validF_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PersonResourcePoolMembership_personId_resourcePoolId_validF_key" ON public."PersonResourcePoolMembership" USING btree ("personId", "resourcePoolId", "validFrom");


--
-- Name: PersonResourcePoolMembership_personId_validFrom_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PersonResourcePoolMembership_personId_validFrom_validTo_idx" ON public."PersonResourcePoolMembership" USING btree ("personId", "validFrom", "validTo");


--
-- Name: PersonResourcePoolMembership_resourcePoolId_validFrom_valid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PersonResourcePoolMembership_resourcePoolId_validFrom_valid_idx" ON public."PersonResourcePoolMembership" USING btree ("resourcePoolId", "validFrom", "validTo");


--
-- Name: Person_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_active_idx" ON public."Person" USING btree (id) WHERE ("archivedAt" IS NULL);


--
-- Name: Person_displayName_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_displayName_trgm_idx" ON public."Person" USING gin ("displayName" public.gin_trgm_ops);


--
-- Name: Person_employmentStatus_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_employmentStatus_archivedAt_idx" ON public."Person" USING btree ("employmentStatus", "archivedAt");


--
-- Name: Person_familyName_givenName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_familyName_givenName_idx" ON public."Person" USING btree ("familyName", "givenName");


--
-- Name: Person_gradeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_gradeId_idx" ON public."Person" USING btree ("gradeId");


--
-- Name: Person_jobRoleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_jobRoleId_idx" ON public."Person" USING btree ("jobRoleId");


--
-- Name: Person_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_locationId_idx" ON public."Person" USING btree ("locationId");


--
-- Name: Person_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_tenantId_idx" ON public."Person" USING btree ("tenantId");


--
-- Name: Person_tenantId_personNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Person_tenantId_personNumber_key" ON public."Person" USING btree ("tenantId", "personNumber") WHERE ("personNumber" IS NOT NULL);


--
-- Name: Person_tenantId_primaryEmail_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Person_tenantId_primaryEmail_key" ON public."Person" USING btree ("tenantId", "primaryEmail") WHERE ("primaryEmail" IS NOT NULL);


--
-- Name: Position_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Position_active_idx" ON public."Position" USING btree (id) WHERE ("archivedAt" IS NULL);


--
-- Name: Position_occupantPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Position_occupantPersonId_idx" ON public."Position" USING btree ("occupantPersonId");


--
-- Name: Position_orgUnitId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Position_orgUnitId_code_key" ON public."Position" USING btree ("orgUnitId", code);


--
-- Name: Position_orgUnitId_validFrom_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Position_orgUnitId_validFrom_validTo_idx" ON public."Position" USING btree ("orgUnitId", "validFrom", "validTo");


--
-- Name: ProjectAssignment_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectAssignment_active_idx" ON public."ProjectAssignment" USING btree (id) WHERE ("archivedAt" IS NULL);


--
-- Name: ProjectAssignment_personId_projectId_validFrom_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProjectAssignment_personId_projectId_validFrom_key" ON public."ProjectAssignment" USING btree ("personId", "projectId", "validFrom");


--
-- Name: ProjectAssignment_personId_status_validFrom_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectAssignment_personId_status_validFrom_validTo_idx" ON public."ProjectAssignment" USING btree ("personId", status, "validFrom", "validTo");


--
-- Name: ProjectAssignment_projectId_status_validFrom_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectAssignment_projectId_status_validFrom_validTo_idx" ON public."ProjectAssignment" USING btree ("projectId", status, "validFrom", "validTo");


--
-- Name: ProjectAssignment_requestedByPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectAssignment_requestedByPersonId_idx" ON public."ProjectAssignment" USING btree ("requestedByPersonId");


--
-- Name: ProjectAssignment_staffingRequestId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectAssignment_staffingRequestId_idx" ON public."ProjectAssignment" USING btree ("staffingRequestId");


--
-- Name: ProjectAssignment_tenantId_assignmentCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProjectAssignment_tenantId_assignmentCode_key" ON public."ProjectAssignment" USING btree ("tenantId", "assignmentCode") WHERE ("assignmentCode" IS NOT NULL);


--
-- Name: ProjectAssignment_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectAssignment_tenantId_idx" ON public."ProjectAssignment" USING btree ("tenantId");


--
-- Name: ProjectExternalLink_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectExternalLink_projectId_idx" ON public."ProjectExternalLink" USING btree ("projectId");


--
-- Name: ProjectExternalLink_provider_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectExternalLink_provider_archivedAt_idx" ON public."ProjectExternalLink" USING btree (provider, "archivedAt");


--
-- Name: ProjectExternalLink_provider_externalProjectKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProjectExternalLink_provider_externalProjectKey_key" ON public."ProjectExternalLink" USING btree (provider, "externalProjectKey");


--
-- Name: Project_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_active_idx" ON public."Project" USING btree (id) WHERE ("archivedAt" IS NULL);


--
-- Name: Project_clientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_clientId_idx" ON public."Project" USING btree ("clientId");


--
-- Name: Project_deliveryManagerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_deliveryManagerId_idx" ON public."Project" USING btree ("deliveryManagerId");


--
-- Name: Project_domainId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_domainId_idx" ON public."Project" USING btree ("domainId");


--
-- Name: Project_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_name_idx" ON public."Project" USING btree (name);


--
-- Name: Project_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_name_trgm_idx" ON public."Project" USING gin (name public.gin_trgm_ops);


--
-- Name: Project_programId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_programId_idx" ON public."Project" USING btree ("programId");


--
-- Name: Project_projectManagerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_projectManagerId_idx" ON public."Project" USING btree ("projectManagerId");


--
-- Name: Project_projectTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_projectTypeId_idx" ON public."Project" USING btree ("projectTypeId");


--
-- Name: Project_shape_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_shape_idx" ON public."Project" USING btree (shape);


--
-- Name: Project_status_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_status_archivedAt_idx" ON public."Project" USING btree (status, "archivedAt");


--
-- Name: Project_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_tenantId_idx" ON public."Project" USING btree ("tenantId");


--
-- Name: Project_tenantId_projectCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_tenantId_projectCode_key" ON public."Project" USING btree ("tenantId", "projectCode");


--
-- Name: RadiusReconciliationRecord_lastEvaluatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RadiusReconciliationRecord_lastEvaluatedAt_idx" ON public."RadiusReconciliationRecord" USING btree ("lastEvaluatedAt");


--
-- Name: RadiusReconciliationRecord_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RadiusReconciliationRecord_personId_idx" ON public."RadiusReconciliationRecord" USING btree ("personId");


--
-- Name: RadiusReconciliationRecord_provider_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RadiusReconciliationRecord_provider_category_idx" ON public."RadiusReconciliationRecord" USING btree (provider, category);


--
-- Name: RadiusReconciliationRecord_provider_externalAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RadiusReconciliationRecord_provider_externalAccountId_key" ON public."RadiusReconciliationRecord" USING btree (provider, "externalAccountId");


--
-- Name: RefreshToken_accountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RefreshToken_accountId_idx" ON public."RefreshToken" USING btree ("accountId");


--
-- Name: RefreshToken_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RefreshToken_expiresAt_idx" ON public."RefreshToken" USING btree ("expiresAt");


--
-- Name: RefreshToken_tokenHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RefreshToken_tokenHash_idx" ON public."RefreshToken" USING btree ("tokenHash");


--
-- Name: RefreshToken_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON public."RefreshToken" USING btree ("tokenHash");


--
-- Name: ReportingLine_isPrimary_validTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReportingLine_isPrimary_validTo_idx" ON public."ReportingLine" USING btree ("isPrimary", "validTo");


--
-- Name: ReportingLine_managerPersonId_relationshipType_validFrom_va_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReportingLine_managerPersonId_relationshipType_validFrom_va_idx" ON public."ReportingLine" USING btree ("managerPersonId", "relationshipType", "validFrom", "validTo");


--
-- Name: ReportingLine_subjectPersonId_managerPersonId_relationshipT_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReportingLine_subjectPersonId_managerPersonId_relationshipT_key" ON public."ReportingLine" USING btree ("subjectPersonId", "managerPersonId", "relationshipType", "validFrom");


--
-- Name: ReportingLine_subjectPersonId_relationshipType_validFrom_va_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReportingLine_subjectPersonId_relationshipType_validFrom_va_idx" ON public."ReportingLine" USING btree ("subjectPersonId", "relationshipType", "validFrom", "validTo");


--
-- Name: ResourcePool_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResourcePool_active_idx" ON public."ResourcePool" USING btree (id) WHERE ("archivedAt" IS NULL);


--
-- Name: ResourcePool_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResourcePool_archivedAt_idx" ON public."ResourcePool" USING btree ("archivedAt");


--
-- Name: ResourcePool_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ResourcePool_code_key" ON public."ResourcePool" USING btree (code);


--
-- Name: ResourcePool_orgUnitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResourcePool_orgUnitId_idx" ON public."ResourcePool" USING btree ("orgUnitId");


--
-- Name: WorkEvidenceLink_provider_externalKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvidenceLink_provider_externalKey_idx" ON public."WorkEvidenceLink" USING btree (provider, "externalKey");


--
-- Name: WorkEvidenceLink_workEvidenceId_provider_externalKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkEvidenceLink_workEvidenceId_provider_externalKey_key" ON public."WorkEvidenceLink" USING btree ("workEvidenceId", provider, "externalKey");


--
-- Name: WorkEvidenceSource_provider_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvidenceSource_provider_archivedAt_idx" ON public."WorkEvidenceSource" USING btree (provider, "archivedAt");


--
-- Name: WorkEvidenceSource_provider_sourceType_connectionKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkEvidenceSource_provider_sourceType_connectionKey_key" ON public."WorkEvidenceSource" USING btree (provider, "sourceType", "connectionKey");


--
-- Name: WorkEvidence_personId_recordedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvidence_personId_recordedAt_idx" ON public."WorkEvidence" USING btree ("personId", "recordedAt");


--
-- Name: WorkEvidence_projectId_recordedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvidence_projectId_recordedAt_idx" ON public."WorkEvidence" USING btree ("projectId", "recordedAt");


--
-- Name: WorkEvidence_status_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvidence_status_archivedAt_idx" ON public."WorkEvidence" USING btree (status, "archivedAt");


--
-- Name: WorkEvidence_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvidence_tenantId_idx" ON public."WorkEvidence" USING btree ("tenantId");


--
-- Name: WorkEvidence_workEvidenceSourceId_recordedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkEvidence_workEvidenceSourceId_recordedAt_idx" ON public."WorkEvidence" USING btree ("workEvidenceSourceId", "recordedAt");


--
-- Name: WorkEvidence_workEvidenceSourceId_sourceRecordKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkEvidence_workEvidenceSourceId_sourceRecordKey_key" ON public."WorkEvidence" USING btree ("workEvidenceSourceId", "sourceRecordKey");


--
-- Name: WorkflowDefinition_entityType_status_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkflowDefinition_entityType_status_archivedAt_idx" ON public."WorkflowDefinition" USING btree ("entityType", status, "archivedAt");


--
-- Name: WorkflowDefinition_entityType_workflowKey_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkflowDefinition_entityType_workflowKey_version_key" ON public."WorkflowDefinition" USING btree ("entityType", "workflowKey", version);


--
-- Name: WorkflowStateDefinition_workflowDefinitionId_sequenceNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkflowStateDefinition_workflowDefinitionId_sequenceNumber_idx" ON public."WorkflowStateDefinition" USING btree ("workflowDefinitionId", "sequenceNumber");


--
-- Name: WorkflowStateDefinition_workflowDefinitionId_stateKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkflowStateDefinition_workflowDefinitionId_stateKey_key" ON public."WorkflowStateDefinition" USING btree ("workflowDefinitionId", "stateKey");


--
-- Name: budget_approvals_projectBudgetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "budget_approvals_projectBudgetId_idx" ON public.budget_approvals USING btree ("projectBudgetId");


--
-- Name: budget_approvals_requestedByPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "budget_approvals_requestedByPersonId_idx" ON public.budget_approvals USING btree ("requestedByPersonId");


--
-- Name: budget_approvals_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_approvals_status_idx ON public.budget_approvals USING btree (status);


--
-- Name: capacity_audit_table_recorded_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX capacity_audit_table_recorded_idx ON public.capacity_audit USING btree ("tableName", "recordedAt" DESC);


--
-- Name: clients_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "clients_isActive_idx" ON public.clients USING btree ("isActive");


--
-- Name: clients_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clients_name_key ON public.clients USING btree (name);


--
-- Name: clients_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "clients_tenantId_idx" ON public.clients USING btree ("tenantId");


--
-- Name: contacts_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contacts_kind_idx ON public.contacts USING btree (kind);


--
-- Name: contacts_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "contacts_personId_idx" ON public.contacts USING btree ("personId");


--
-- Name: contacts_person_kind_primary_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX contacts_person_kind_primary_idx ON public.contacts USING btree ("personId", kind) WHERE ("isPrimary" = true);


--
-- Name: ddl_audit_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ddl_audit_occurred_at_idx ON public.ddl_audit USING btree (occurred_at DESC);


--
-- Name: ddl_audit_sessionUser_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ddl_audit_sessionUser_idx" ON public.ddl_audit USING btree ("sessionUser");


--
-- Name: employment_events_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employment_events_kind_idx ON public.employment_events USING btree (kind);


--
-- Name: employment_events_personId_occurredOn_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "employment_events_personId_occurredOn_idx" ON public.employment_events USING btree ("personId", "occurredOn");


--
-- Name: grades_tenantId_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grades_tenantId_archivedAt_idx" ON public.grades USING btree ("tenantId", "archivedAt");


--
-- Name: honeypot_alerts_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "honeypot_alerts_occurredAt_idx" ON public.honeypot_alerts USING btree ("occurredAt" DESC);


--
-- Name: idx_audit_log_aggregate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_aggregate ON public."AuditLog" USING btree ("aggregateType", "aggregateId");


--
-- Name: idx_staffing_request_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staffing_request_project ON public.staffing_requests USING btree ("projectId", status);


--
-- Name: in_app_notifications_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX in_app_notifications_id_new_key ON public.in_app_notifications USING btree (id_new);


--
-- Name: in_app_notifications_publicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "in_app_notifications_publicId_key" ON public.in_app_notifications USING btree ("publicId");


--
-- Name: in_app_notifications_recipientPersonId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "in_app_notifications_recipientPersonId_createdAt_idx" ON public.in_app_notifications USING btree ("recipientPersonId", "createdAt");


--
-- Name: in_app_notifications_recipientPersonId_readAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "in_app_notifications_recipientPersonId_readAt_idx" ON public.in_app_notifications USING btree ("recipientPersonId", "readAt");


--
-- Name: in_app_notifications_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "in_app_notifications_tenantId_idx" ON public.in_app_notifications USING btree ("tenantId");


--
-- Name: job_roles_tenantId_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "job_roles_tenantId_archivedAt_idx" ON public.job_roles USING btree ("tenantId", "archivedAt");


--
-- Name: leave_balances_personId_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "leave_balances_personId_year_idx" ON public.leave_balances USING btree ("personId", year);


--
-- Name: leave_balances_personId_year_leaveType_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "leave_balances_personId_year_leaveType_key" ON public.leave_balances USING btree ("personId", year, "leaveType");


--
-- Name: leave_requests_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX leave_requests_id_new_key ON public.leave_requests USING btree (id_new);


--
-- Name: leave_requests_personId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "leave_requests_personId_status_idx" ON public.leave_requests USING btree ("personId", status);


--
-- Name: leave_requests_publicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "leave_requests_publicId_key" ON public.leave_requests USING btree ("publicId");


--
-- Name: leave_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leave_requests_status_idx ON public.leave_requests USING btree (status);


--
-- Name: leave_requests_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "leave_requests_tenantId_idx" ON public.leave_requests USING btree ("tenantId");


--
-- Name: locations_tenantId_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "locations_tenantId_archivedAt_idx" ON public.locations USING btree ("tenantId", "archivedAt");


--
-- Name: migration_audit_agent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX migration_audit_agent_id_idx ON public.migration_audit USING btree (agent_id) WHERE (agent_id IS NOT NULL);


--
-- Name: migration_audit_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX migration_audit_recorded_at_idx ON public.migration_audit USING btree (recorded_at DESC);


--
-- Name: overtime_exceptions_personId_effectiveFrom_effectiveTo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "overtime_exceptions_personId_effectiveFrom_effectiveTo_idx" ON public.overtime_exceptions USING btree ("personId", "effectiveFrom", "effectiveTo");


--
-- Name: overtime_policies_approvalCaseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "overtime_policies_approvalCaseId_idx" ON public.overtime_policies USING btree ("approvalCaseId");


--
-- Name: overtime_policies_orgUnitId_effectiveFrom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "overtime_policies_orgUnitId_effectiveFrom_idx" ON public.overtime_policies USING btree ("orgUnitId", "effectiveFrom");


--
-- Name: overtime_policies_resourcePoolId_effectiveFrom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "overtime_policies_resourcePoolId_effectiveFrom_idx" ON public.overtime_policies USING btree ("resourcePoolId", "effectiveFrom");


--
-- Name: period_locks_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX period_locks_id_new_key ON public.period_locks USING btree (id_new);


--
-- Name: period_locks_publicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "period_locks_publicId_key" ON public.period_locks USING btree ("publicId");


--
-- Name: person_cost_rates_currencyCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "person_cost_rates_currencyCode_idx" ON public.person_cost_rates USING btree ("currencyCode");


--
-- Name: person_cost_rates_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX person_cost_rates_id_new_key ON public.person_cost_rates USING btree (id_new);


--
-- Name: person_cost_rates_publicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "person_cost_rates_publicId_key" ON public.person_cost_rates USING btree ("publicId");


--
-- Name: person_notification_preferences_personId_channelKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "person_notification_preferences_personId_channelKey_key" ON public.person_notification_preferences USING btree ("personId", "channelKey");


--
-- Name: person_notification_preferences_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "person_notification_preferences_personId_idx" ON public.person_notification_preferences USING btree ("personId");


--
-- Name: person_skills_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX person_skills_id_new_key ON public.person_skills USING btree (id_new);


--
-- Name: person_skills_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "person_skills_personId_idx" ON public.person_skills USING btree ("personId");


--
-- Name: person_skills_personId_skillId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "person_skills_personId_skillId_key" ON public.person_skills USING btree ("personId", "skillId");


--
-- Name: planner_scenarios_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "planner_scenarios_archivedAt_idx" ON public.planner_scenarios USING btree ("archivedAt");


--
-- Name: planner_scenarios_createdByPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "planner_scenarios_createdByPersonId_idx" ON public.planner_scenarios USING btree ("createdByPersonId");


--
-- Name: project_budgets_currencyCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_budgets_currencyCode_idx" ON public.project_budgets USING btree ("currencyCode");


--
-- Name: project_budgets_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX project_budgets_id_new_key ON public.project_budgets USING btree (id_new);


--
-- Name: project_budgets_publicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "project_budgets_publicId_key" ON public.project_budgets USING btree ("publicId");


--
-- Name: project_change_requests_decidedByPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_change_requests_decidedByPersonId_idx" ON public.project_change_requests USING btree ("decidedByPersonId");


--
-- Name: project_change_requests_projectId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_change_requests_projectId_createdAt_idx" ON public.project_change_requests USING btree ("projectId", "createdAt");


--
-- Name: project_change_requests_projectId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_change_requests_projectId_status_idx" ON public.project_change_requests USING btree ("projectId", status);


--
-- Name: project_change_requests_requesterPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_change_requests_requesterPersonId_idx" ON public.project_change_requests USING btree ("requesterPersonId");


--
-- Name: project_domains_tenantId_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_domains_tenantId_archivedAt_idx" ON public.project_domains USING btree ("tenantId", "archivedAt");


--
-- Name: project_milestones_projectId_plannedDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_milestones_projectId_plannedDate_idx" ON public.project_milestones USING btree ("projectId", "plannedDate");


--
-- Name: project_milestones_projectId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_milestones_projectId_status_idx" ON public.project_milestones USING btree ("projectId", status);


--
-- Name: project_radiator_overrides_overriddenByPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_radiator_overrides_overriddenByPersonId_idx" ON public.project_radiator_overrides USING btree ("overriddenByPersonId");


--
-- Name: project_radiator_overrides_snapshotId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_radiator_overrides_snapshotId_idx" ON public.project_radiator_overrides USING btree ("snapshotId");


--
-- Name: project_rag_snapshots_projectId_weekStarting_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_rag_snapshots_projectId_weekStarting_idx" ON public.project_rag_snapshots USING btree ("projectId", "weekStarting");


--
-- Name: project_rag_snapshots_projectId_weekStarting_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "project_rag_snapshots_projectId_weekStarting_key" ON public.project_rag_snapshots USING btree ("projectId", "weekStarting");


--
-- Name: project_rag_snapshots_recordedByPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_rag_snapshots_recordedByPersonId_idx" ON public.project_rag_snapshots USING btree ("recordedByPersonId");


--
-- Name: project_retrospectives_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_retrospectives_projectId_idx" ON public.project_retrospectives USING btree ("projectId");


--
-- Name: project_risks_assigneePersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_risks_assigneePersonId_idx" ON public.project_risks USING btree ("assigneePersonId");


--
-- Name: project_risks_ownerPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_risks_ownerPersonId_idx" ON public.project_risks USING btree ("ownerPersonId");


--
-- Name: project_risks_projectId_riskType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_risks_projectId_riskType_idx" ON public.project_risks USING btree ("projectId", "riskType");


--
-- Name: project_risks_projectId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_risks_projectId_status_idx" ON public.project_risks USING btree ("projectId", status);


--
-- Name: project_risks_relatedCaseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_risks_relatedCaseId_idx" ON public.project_risks USING btree ("relatedCaseId");


--
-- Name: project_risks_title_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_risks_title_trgm_idx ON public.project_risks USING gin (title public.gin_trgm_ops);


--
-- Name: project_role_plans_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_role_plans_projectId_idx" ON public.project_role_plans USING btree ("projectId");


--
-- Name: project_role_plans_projectId_roleName_seniorityLevel_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "project_role_plans_projectId_roleName_seniorityLevel_key" ON public.project_role_plans USING btree ("projectId", "roleName", "seniorityLevel");


--
-- Name: project_tags_tag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_tags_tag_idx ON public.project_tags USING btree (tag);


--
-- Name: project_technologies_technology_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_technologies_technology_idx ON public.project_technologies USING btree (technology);


--
-- Name: project_types_tenantId_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_types_tenantId_archivedAt_idx" ON public.project_types USING btree ("tenantId", "archivedAt");


--
-- Name: project_vendor_engagements_currencyCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_vendor_engagements_currencyCode_idx" ON public.project_vendor_engagements USING btree ("currencyCode");


--
-- Name: project_vendor_engagements_projectId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_vendor_engagements_projectId_status_idx" ON public.project_vendor_engagements USING btree ("projectId", status);


--
-- Name: project_vendor_engagements_projectId_vendorId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "project_vendor_engagements_projectId_vendorId_key" ON public.project_vendor_engagements USING btree ("projectId", "vendorId");


--
-- Name: project_vendor_engagements_vendorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_vendor_engagements_vendorId_idx" ON public.project_vendor_engagements USING btree ("vendorId");


--
-- Name: project_workstreams_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_workstreams_projectId_idx" ON public.project_workstreams USING btree ("projectId");


--
-- Name: public_holidays_countryCode_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "public_holidays_countryCode_date_idx" ON public.public_holidays USING btree ("countryCode", date);


--
-- Name: public_holidays_date_countryCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "public_holidays_date_countryCode_key" ON public.public_holidays USING btree (date, "countryCode");


--
-- Name: pulse_entries_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pulse_entries_id_new_key ON public.pulse_entries USING btree (id_new);


--
-- Name: pulse_entries_personId_weekStart_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pulse_entries_personId_weekStart_idx" ON public.pulse_entries USING btree ("personId", "weekStart");


--
-- Name: pulse_entries_personId_weekStart_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pulse_entries_personId_weekStart_key" ON public.pulse_entries USING btree ("personId", "weekStart");


--
-- Name: pulse_reports_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "pulse_reports_projectId_idx" ON public.pulse_reports USING btree ("projectId");


--
-- Name: pulse_reports_projectId_weekStarting_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "pulse_reports_projectId_weekStarting_key" ON public.pulse_reports USING btree ("projectId", "weekStarting");


--
-- Name: radiator_threshold_configs_subDimensionKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "radiator_threshold_configs_subDimensionKey_key" ON public.radiator_threshold_configs USING btree ("subDimensionKey");


--
-- Name: radiator_threshold_configs_updatedByPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "radiator_threshold_configs_updatedByPersonId_idx" ON public.radiator_threshold_configs USING btree ("updatedByPersonId");


--
-- Name: skills_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX skills_id_new_key ON public.skills USING btree (id_new);


--
-- Name: skills_publicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "skills_publicId_key" ON public.skills USING btree ("publicId");


--
-- Name: skills_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "skills_tenantId_idx" ON public.skills USING btree ("tenantId");


--
-- Name: skills_tenantId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "skills_tenantId_name_key" ON public.skills USING btree ("tenantId", name);


--
-- Name: staffing_request_fulfilments_assignedPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "staffing_request_fulfilments_assignedPersonId_idx" ON public.staffing_request_fulfilments USING btree ("assignedPersonId");


--
-- Name: staffing_request_fulfilments_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX staffing_request_fulfilments_id_new_key ON public.staffing_request_fulfilments USING btree (id_new);


--
-- Name: staffing_request_fulfilments_requestId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "staffing_request_fulfilments_requestId_idx" ON public.staffing_request_fulfilments USING btree ("requestId");


--
-- Name: staffing_requests_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX staffing_requests_id_new_key ON public.staffing_requests USING btree (id_new);


--
-- Name: staffing_requests_projectId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "staffing_requests_projectId_status_idx" ON public.staffing_requests USING btree ("projectId", status);


--
-- Name: staffing_requests_publicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "staffing_requests_publicId_key" ON public.staffing_requests USING btree ("publicId");


--
-- Name: staffing_requests_requestedByPersonId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "staffing_requests_requestedByPersonId_status_idx" ON public.staffing_requests USING btree ("requestedByPersonId", status);


--
-- Name: staffing_requests_status_priority_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "staffing_requests_status_priority_startDate_idx" ON public.staffing_requests USING btree (status, priority, "startDate");


--
-- Name: staffing_requests_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "staffing_requests_tenantId_idx" ON public.staffing_requests USING btree ("tenantId");


--
-- Name: timesheet_entries_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX timesheet_entries_id_new_key ON public.timesheet_entries USING btree (id_new);


--
-- Name: timesheet_entries_timesheetWeekId_projectId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "timesheet_entries_timesheetWeekId_projectId_date_key" ON public.timesheet_entries USING btree ("timesheetWeekId", "projectId", date);


--
-- Name: timesheet_weeks_id_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX timesheet_weeks_id_new_key ON public.timesheet_weeks USING btree (id_new);


--
-- Name: timesheet_weeks_personId_weekStart_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "timesheet_weeks_personId_weekStart_idx" ON public.timesheet_weeks USING btree ("personId", "weekStart");


--
-- Name: timesheet_weeks_personId_weekStart_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "timesheet_weeks_personId_weekStart_key" ON public.timesheet_weeks USING btree ("personId", "weekStart");


--
-- Name: timesheet_weeks_publicId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "timesheet_weeks_publicId_key" ON public.timesheet_weeks USING btree ("publicId");


--
-- Name: timesheet_weeks_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "timesheet_weeks_tenantId_idx" ON public.timesheet_weeks USING btree ("tenantId");


--
-- Name: undo_actions_actorId_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "undo_actions_actorId_expiresAt_idx" ON public.undo_actions USING btree ("actorId", "expiresAt");


--
-- Name: undo_actions_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "undo_actions_entityId_idx" ON public.undo_actions USING btree ("entityId");


--
-- Name: vendor_skill_areas_skillArea_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendor_skill_areas_skillArea_idx" ON public.vendor_skill_areas USING btree ("skillArea");


--
-- Name: vendors_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendors_isActive_idx" ON public.vendors USING btree ("isActive");


--
-- Name: vendors_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendors_name_key ON public.vendors USING btree (name);


--
-- Name: vendors_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vendors_tenantId_idx" ON public.vendors USING btree ("tenantId");


--
-- Name: mv_person_week_hours_person_idx; Type: INDEX; Schema: read_models; Owner: -
--

CREATE INDEX mv_person_week_hours_person_idx ON read_models.mv_person_week_hours USING btree ("personId");


--
-- Name: mv_person_week_hours_pk; Type: INDEX; Schema: read_models; Owner: -
--

CREATE UNIQUE INDEX mv_person_week_hours_pk ON read_models.mv_person_week_hours USING btree ("weekStart", "personId");


--
-- Name: mv_project_weekly_roster_person_idx; Type: INDEX; Schema: read_models; Owner: -
--

CREATE INDEX mv_project_weekly_roster_person_idx ON read_models.mv_project_weekly_roster USING btree ("personId");


--
-- Name: mv_project_weekly_roster_pk; Type: INDEX; Schema: read_models; Owner: -
--

CREATE UNIQUE INDEX mv_project_weekly_roster_pk ON read_models.mv_project_weekly_roster USING btree ("weekStart", "projectId", "personId");


--
-- Name: mv_project_weekly_roster_project_idx; Type: INDEX; Schema: read_models; Owner: -
--

CREATE INDEX mv_project_weekly_roster_project_idx ON read_models.mv_project_weekly_roster USING btree ("projectId");


--
-- Name: DomainEvent_default_aggregateType_aggregateId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."DomainEvent_aggregate_idx" ATTACH PARTITION public."DomainEvent_default_aggregateType_aggregateId_idx";


--
-- Name: DomainEvent_default_chainSeq_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."DomainEvent_unpublished_idx" ATTACH PARTITION public."DomainEvent_default_chainSeq_idx";


--
-- Name: DomainEvent_default_correlationId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."DomainEvent_correlationId_idx" ATTACH PARTITION public."DomainEvent_default_correlationId_idx";


--
-- Name: DomainEvent_default_createdAt_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."DomainEvent_createdAt_idx" ATTACH PARTITION public."DomainEvent_default_createdAt_idx";


--
-- Name: DomainEvent_default_eventName_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."DomainEvent_eventName_idx" ATTACH PARTITION public."DomainEvent_default_eventName_idx";


--
-- Name: DomainEvent_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."DomainEvent_pkey" ATTACH PARTITION public."DomainEvent_default_pkey";


--
-- Name: DomainEvent_default_tenantId_idx; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public."DomainEvent_tenantId_idx" ATTACH PARTITION public."DomainEvent_default_tenantId_idx";


--
-- Name: AuditLog dm_r_22_hash_chain_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_22_hash_chain_trigger BEFORE INSERT ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.dm_r_22_audit_hash_chain('createdAt');


--
-- Name: DomainEvent dm_r_22_hash_chain_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_22_hash_chain_trigger BEFORE INSERT ON public."DomainEvent" FOR EACH ROW EXECUTE FUNCTION public.dm_r_22_audit_hash_chain('createdAt');


--
-- Name: ddl_audit dm_r_22_hash_chain_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_22_hash_chain_trigger BEFORE INSERT ON public.ddl_audit FOR EACH ROW EXECUTE FUNCTION public.dm_r_22_audit_hash_chain('occurred_at');


--
-- Name: migration_audit dm_r_22_hash_chain_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_22_hash_chain_trigger BEFORE INSERT ON public.migration_audit FOR EACH ROW EXECUTE FUNCTION public.dm_r_22_audit_hash_chain('recorded_at');


--
-- Name: CaseRecord dm_r_23_delete_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."CaseRecord" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: LocalAccount dm_r_23_delete_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."LocalAccount" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: Person dm_r_23_delete_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."Person" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: Project dm_r_23_delete_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."Project" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: ProjectAssignment dm_r_23_delete_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."ProjectAssignment" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: WorkEvidence dm_r_23_delete_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public."WorkEvidence" REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: staffing_requests dm_r_23_delete_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public.staffing_requests REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: timesheet_entries dm_r_23_delete_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public.timesheet_entries REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: timesheet_weeks dm_r_23_delete_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_delete_guard AFTER DELETE ON public.timesheet_weeks REFERENCING OLD TABLE AS dm_r_23_deleted FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: CaseRecord dm_r_23_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."CaseRecord" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: LocalAccount dm_r_23_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."LocalAccount" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: Person dm_r_23_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."Person" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: Project dm_r_23_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."Project" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: ProjectAssignment dm_r_23_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."ProjectAssignment" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: WorkEvidence dm_r_23_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public."WorkEvidence" REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: staffing_requests dm_r_23_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public.staffing_requests REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: timesheet_entries dm_r_23_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public.timesheet_entries REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: timesheet_weeks dm_r_23_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_23_update_guard AFTER UPDATE ON public.timesheet_weeks REFERENCING OLD TABLE AS dm_r_23_updated FOR EACH STATEMENT EXECUTE FUNCTION public.dm_r_23_mass_mutation_guard();


--
-- Name: Person dm_r_31_honeypot_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_31_honeypot_delete BEFORE DELETE ON public."Person" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();


--
-- Name: Project dm_r_31_honeypot_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_31_honeypot_delete BEFORE DELETE ON public."Project" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();


--
-- Name: ProjectAssignment dm_r_31_honeypot_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_31_honeypot_delete BEFORE DELETE ON public."ProjectAssignment" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();


--
-- Name: Person dm_r_31_honeypot_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_31_honeypot_update BEFORE UPDATE ON public."Person" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();


--
-- Name: Project dm_r_31_honeypot_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_31_honeypot_update BEFORE UPDATE ON public."Project" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();


--
-- Name: ProjectAssignment dm_r_31_honeypot_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dm_r_31_honeypot_update BEFORE UPDATE ON public."ProjectAssignment" FOR EACH ROW EXECUTE FUNCTION public.dm_r_31_honeypot_guard();


--
-- Name: in_app_notifications in_app_notifications_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER in_app_notifications_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.in_app_notifications FOR EACH ROW EXECUTE FUNCTION public.in_app_notifications_dm2_dualmaintain();


--
-- Name: leave_requests leave_requests_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER leave_requests_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.leave_requests_dm2_dualmaintain();


--
-- Name: period_locks period_locks_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER period_locks_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.period_locks FOR EACH ROW EXECUTE FUNCTION public.period_locks_dm2_dualmaintain();


--
-- Name: person_cost_rates person_cost_rates_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER person_cost_rates_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.person_cost_rates FOR EACH ROW EXECUTE FUNCTION public.person_cost_rates_dm2_dualmaintain();


--
-- Name: person_skills person_skills_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER person_skills_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.person_skills FOR EACH ROW EXECUTE FUNCTION public.person_skills_dm2_dualmaintain();


--
-- Name: project_budgets project_budgets_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER project_budgets_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.project_budgets FOR EACH ROW EXECUTE FUNCTION public.project_budgets_dm2_dualmaintain();


--
-- Name: pulse_entries pulse_entries_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pulse_entries_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.pulse_entries FOR EACH ROW EXECUTE FUNCTION public.pulse_entries_dm2_dualmaintain();


--
-- Name: skills skills_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER skills_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.skills_dm2_dualmaintain();


--
-- Name: staffing_request_fulfilments staffing_request_fulfilments_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER staffing_request_fulfilments_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.staffing_request_fulfilments FOR EACH ROW EXECUTE FUNCTION public.staffing_request_fulfilments_dm2_dualmaintain();


--
-- Name: staffing_requests staffing_requests_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER staffing_requests_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.staffing_requests FOR EACH ROW EXECUTE FUNCTION public.staffing_requests_dm2_dualmaintain();


--
-- Name: timesheet_entries timesheet_entries_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER timesheet_entries_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION public.timesheet_entries_dm2_dualmaintain();


--
-- Name: timesheet_weeks timesheet_weeks_dm2_dualmaintain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER timesheet_weeks_dm2_dualmaintain BEFORE INSERT OR UPDATE ON public.timesheet_weeks FOR EACH ROW EXECUTE FUNCTION public.timesheet_weeks_dm2_dualmaintain();


--
-- Name: AssignmentApproval AssignmentApproval_assignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentApproval"
    ADD CONSTRAINT "AssignmentApproval_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES public."ProjectAssignment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AssignmentApproval AssignmentApproval_decidedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentApproval"
    ADD CONSTRAINT "AssignmentApproval_decidedByPersonId_fkey" FOREIGN KEY ("decidedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AssignmentHistory AssignmentHistory_assignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentHistory"
    ADD CONSTRAINT "AssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES public."ProjectAssignment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AssignmentHistory AssignmentHistory_changedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AssignmentHistory"
    ADD CONSTRAINT "AssignmentHistory_changedByPersonId_fkey" FOREIGN KEY ("changedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CaseParticipant CaseParticipant_caseRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseParticipant"
    ADD CONSTRAINT "CaseParticipant_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CaseParticipant CaseParticipant_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseParticipant"
    ADD CONSTRAINT "CaseParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CaseRecord CaseRecord_caseTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES public."CaseType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CaseRecord CaseRecord_ownerPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CaseRecord CaseRecord_relatedAssignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_relatedAssignmentId_fkey" FOREIGN KEY ("relatedAssignmentId") REFERENCES public."ProjectAssignment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CaseRecord CaseRecord_relatedProjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_relatedProjectId_fkey" FOREIGN KEY ("relatedProjectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CaseRecord CaseRecord_subjectPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_subjectPersonId_fkey" FOREIGN KEY ("subjectPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CaseRecord CaseRecord_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseRecord"
    ADD CONSTRAINT "CaseRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CaseStep CaseStep_assignedToPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_assignedToPersonId_fkey" FOREIGN KEY ("assignedToPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CaseStep CaseStep_caseRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CaseStep CaseStep_workflowStateDefinitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseStep"
    ADD CONSTRAINT "CaseStep_workflowStateDefinitionId_fkey" FOREIGN KEY ("workflowStateDefinitionId") REFERENCES public."WorkflowStateDefinition"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CaseType CaseType_workflowDefinitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaseType"
    ADD CONSTRAINT "CaseType_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES public."WorkflowDefinition"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CustomFieldDefinition CustomFieldDefinition_metadataDictionaryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomFieldDefinition"
    ADD CONSTRAINT "CustomFieldDefinition_metadataDictionaryId_fkey" FOREIGN KEY ("metadataDictionaryId") REFERENCES public."MetadataDictionary"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CustomFieldDefinition CustomFieldDefinition_scopeOrgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomFieldDefinition"
    ADD CONSTRAINT "CustomFieldDefinition_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CustomFieldValue CustomFieldValue_customFieldDefinitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomFieldValue"
    ADD CONSTRAINT "CustomFieldValue_customFieldDefinitionId_fkey" FOREIGN KEY ("customFieldDefinitionId") REFERENCES public."CustomFieldDefinition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DomainEvent DomainEvent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public."DomainEvent"
    ADD CONSTRAINT "DomainEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeActivityEvent EmployeeActivityEvent_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeActivityEvent"
    ADD CONSTRAINT "EmployeeActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeActivityEvent EmployeeActivityEvent_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeActivityEvent"
    ADD CONSTRAINT "EmployeeActivityEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EntityLayoutDefinition EntityLayoutDefinition_scopeOrgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EntityLayoutDefinition"
    ADD CONSTRAINT "EntityLayoutDefinition_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ExternalAccountLink ExternalAccountLink_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExternalAccountLink"
    ADD CONSTRAINT "ExternalAccountLink_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ExternalSyncState ExternalSyncState_projectExternalLinkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExternalSyncState"
    ADD CONSTRAINT "ExternalSyncState_projectExternalLinkId_fkey" FOREIGN KEY ("projectExternalLinkId") REFERENCES public."ProjectExternalLink"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LocalAccount LocalAccount_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LocalAccount"
    ADD CONSTRAINT "LocalAccount_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LocalAccount LocalAccount_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LocalAccount"
    ADD CONSTRAINT "LocalAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: M365DirectoryReconciliationRecord M365DirectoryReconciliationRecord_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."M365DirectoryReconciliationRecord"
    ADD CONSTRAINT "M365DirectoryReconciliationRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: M365DirectoryReconciliationRecord M365DirectoryReconciliationRecord_resolvedManagerPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."M365DirectoryReconciliationRecord"
    ADD CONSTRAINT "M365DirectoryReconciliationRecord_resolvedManagerPersonId_fkey" FOREIGN KEY ("resolvedManagerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MetadataDictionary MetadataDictionary_scopeOrgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MetadataDictionary"
    ADD CONSTRAINT "MetadataDictionary_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MetadataEntry MetadataEntry_metadataDictionaryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MetadataEntry"
    ADD CONSTRAINT "MetadataEntry_metadataDictionaryId_fkey" FOREIGN KEY ("metadataDictionaryId") REFERENCES public."MetadataDictionary"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NotificationDelivery NotificationDelivery_channelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public."NotificationChannel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NotificationDelivery NotificationDelivery_notificationRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_notificationRequestId_fkey" FOREIGN KEY ("notificationRequestId") REFERENCES public."NotificationRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NotificationRequest NotificationRequest_channelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationRequest"
    ADD CONSTRAINT "NotificationRequest_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public."NotificationChannel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NotificationRequest NotificationRequest_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationRequest"
    ADD CONSTRAINT "NotificationRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."NotificationTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: NotificationTemplate NotificationTemplate_channelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationTemplate"
    ADD CONSTRAINT "NotificationTemplate_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public."NotificationChannel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrgUnit OrgUnit_managerPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_managerPersonId_fkey" FOREIGN KEY ("managerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrgUnit OrgUnit_parentOrgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_parentOrgUnitId_fkey" FOREIGN KEY ("parentOrgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrgUnit OrgUnit_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrgUnit"
    ADD CONSTRAINT "OrgUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OutboxEvent OutboxEvent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OutboxEvent"
    ADD CONSTRAINT "OutboxEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PasswordResetToken PasswordResetToken_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."LocalAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PersonExternalIdentityLink PersonExternalIdentityLink_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonExternalIdentityLink"
    ADD CONSTRAINT "PersonExternalIdentityLink_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PersonExternalIdentityLink PersonExternalIdentityLink_resolvedManagerPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonExternalIdentityLink"
    ADD CONSTRAINT "PersonExternalIdentityLink_resolvedManagerPersonId_fkey" FOREIGN KEY ("resolvedManagerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PersonOrgMembership PersonOrgMembership_orgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PersonOrgMembership PersonOrgMembership_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PersonOrgMembership PersonOrgMembership_positionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonOrgMembership"
    ADD CONSTRAINT "PersonOrgMembership_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public."Position"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PersonResourcePoolMembership PersonResourcePoolMembership_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonResourcePoolMembership"
    ADD CONSTRAINT "PersonResourcePoolMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PersonResourcePoolMembership PersonResourcePoolMembership_resourcePoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PersonResourcePoolMembership"
    ADD CONSTRAINT "PersonResourcePoolMembership_resourcePoolId_fkey" FOREIGN KEY ("resourcePoolId") REFERENCES public."ResourcePool"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Person Person_gradeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Person"
    ADD CONSTRAINT "Person_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES public.grades(id) ON DELETE SET NULL;


--
-- Name: Person Person_jobRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Person"
    ADD CONSTRAINT "Person_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES public.job_roles(id) ON DELETE SET NULL;


--
-- Name: Person Person_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Person"
    ADD CONSTRAINT "Person_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: Person Person_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Person"
    ADD CONSTRAINT "Person_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Position Position_occupantPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_occupantPersonId_fkey" FOREIGN KEY ("occupantPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Position Position_orgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectAssignment ProjectAssignment_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectAssignment ProjectAssignment_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectAssignment ProjectAssignment_requestedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_requestedByPersonId_fkey" FOREIGN KEY ("requestedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProjectAssignment ProjectAssignment_staffingRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_staffingRequestId_fkey" FOREIGN KEY ("staffingRequestId") REFERENCES public.staffing_requests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProjectAssignment ProjectAssignment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectAssignment"
    ADD CONSTRAINT "ProjectAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectExternalLink ProjectExternalLink_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectExternalLink"
    ADD CONSTRAINT "ProjectExternalLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Project Project_deliveryManagerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_deliveryManagerId_fkey" FOREIGN KEY ("deliveryManagerId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Project Project_domainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES public.project_domains(id) ON DELETE SET NULL;


--
-- Name: Project Project_projectManagerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Project Project_projectTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES public.project_types(id) ON DELETE SET NULL;


--
-- Name: Project Project_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RadiusReconciliationRecord RadiusReconciliationRecord_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RadiusReconciliationRecord"
    ADD CONSTRAINT "RadiusReconciliationRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RefreshToken RefreshToken_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."LocalAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReportingLine ReportingLine_managerPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReportingLine"
    ADD CONSTRAINT "ReportingLine_managerPersonId_fkey" FOREIGN KEY ("managerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReportingLine ReportingLine_subjectPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReportingLine"
    ADD CONSTRAINT "ReportingLine_subjectPersonId_fkey" FOREIGN KEY ("subjectPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ResourcePool ResourcePool_orgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResourcePool"
    ADD CONSTRAINT "ResourcePool_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkEvidenceLink WorkEvidenceLink_workEvidenceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvidenceLink"
    ADD CONSTRAINT "WorkEvidenceLink_workEvidenceId_fkey" FOREIGN KEY ("workEvidenceId") REFERENCES public."WorkEvidence"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkEvidence WorkEvidence_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkEvidence WorkEvidence_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkEvidence WorkEvidence_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WorkEvidence WorkEvidence_workEvidenceSourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkEvidence"
    ADD CONSTRAINT "WorkEvidence_workEvidenceSourceId_fkey" FOREIGN KEY ("workEvidenceSourceId") REFERENCES public."WorkEvidenceSource"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WorkflowStateDefinition WorkflowStateDefinition_workflowDefinitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkflowStateDefinition"
    ADD CONSTRAINT "WorkflowStateDefinition_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES public."WorkflowDefinition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: budget_approvals budget_approvals_decidedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT "budget_approvals_decidedByPersonId_fkey" FOREIGN KEY ("decidedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: budget_approvals budget_approvals_projectBudgetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT "budget_approvals_projectBudgetId_fkey" FOREIGN KEY ("projectBudgetId") REFERENCES public.project_budgets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: budget_approvals budget_approvals_requestedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_approvals
    ADD CONSTRAINT "budget_approvals_requestedByPersonId_fkey" FOREIGN KEY ("requestedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: clients clients_accountManagerPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_accountManagerPersonId_fkey" FOREIGN KEY ("accountManagerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contacts contacts_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "contacts_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employment_events employment_events_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employment_events
    ADD CONSTRAINT "employment_events_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employment_events employment_events_recordedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employment_events
    ADD CONSTRAINT "employment_events_recordedByPersonId_fkey" FOREIGN KEY ("recordedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: grades grades_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT "grades_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: in_app_notifications in_app_notifications_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.in_app_notifications
    ADD CONSTRAINT "in_app_notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: job_roles job_roles_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_roles
    ADD CONSTRAINT "job_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: leave_balances leave_balances_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT "leave_balances_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: leave_requests leave_requests_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: locations locations_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT "locations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: overtime_exceptions overtime_exceptions_caseRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_exceptions
    ADD CONSTRAINT "overtime_exceptions_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: overtime_exceptions overtime_exceptions_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_exceptions
    ADD CONSTRAINT "overtime_exceptions_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: overtime_policies overtime_policies_approvalCaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_approvalCaseId_fkey" FOREIGN KEY ("approvalCaseId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: overtime_policies overtime_policies_orgUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES public."OrgUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: overtime_policies overtime_policies_resourcePoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_resourcePoolId_fkey" FOREIGN KEY ("resourcePoolId") REFERENCES public."ResourcePool"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: overtime_policies overtime_policies_setByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_policies
    ADD CONSTRAINT "overtime_policies_setByPersonId_fkey" FOREIGN KEY ("setByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: person_cost_rates person_cost_rates_currencyCode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_cost_rates
    ADD CONSTRAINT "person_cost_rates_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES public."Currency"(code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: person_notification_preferences person_notification_preferences_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_notification_preferences
    ADD CONSTRAINT "person_notification_preferences_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: person_skills person_skills_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_skills
    ADD CONSTRAINT "person_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public.skills(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: planner_scenarios planner_scenarios_createdByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planner_scenarios
    ADD CONSTRAINT "planner_scenarios_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_budgets project_budgets_currencyCode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT "project_budgets_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES public."Currency"(code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_change_requests project_change_requests_decidedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT "project_change_requests_decidedByPersonId_fkey" FOREIGN KEY ("decidedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_change_requests project_change_requests_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT "project_change_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_change_requests project_change_requests_requesterPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_change_requests
    ADD CONSTRAINT "project_change_requests_requesterPersonId_fkey" FOREIGN KEY ("requesterPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_domains project_domains_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_domains
    ADD CONSTRAINT "project_domains_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_milestones project_milestones_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_radiator_overrides project_radiator_overrides_overriddenByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_radiator_overrides
    ADD CONSTRAINT "project_radiator_overrides_overriddenByPersonId_fkey" FOREIGN KEY ("overriddenByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_radiator_overrides project_radiator_overrides_snapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_radiator_overrides
    ADD CONSTRAINT "project_radiator_overrides_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES public.project_rag_snapshots(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_rag_snapshots project_rag_snapshots_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_rag_snapshots
    ADD CONSTRAINT "project_rag_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_rag_snapshots project_rag_snapshots_recordedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_rag_snapshots
    ADD CONSTRAINT "project_rag_snapshots_recordedByPersonId_fkey" FOREIGN KEY ("recordedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_retrospectives project_retrospectives_facilitatedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT "project_retrospectives_facilitatedByPersonId_fkey" FOREIGN KEY ("facilitatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_retrospectives project_retrospectives_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_retrospectives
    ADD CONSTRAINT "project_retrospectives_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_risks project_risks_assigneePersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_assigneePersonId_fkey" FOREIGN KEY ("assigneePersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_risks project_risks_convertedFromRiskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_convertedFromRiskId_fkey" FOREIGN KEY ("convertedFromRiskId") REFERENCES public.project_risks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_risks project_risks_ownerPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_risks project_risks_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_risks project_risks_relatedCaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_risks
    ADD CONSTRAINT "project_risks_relatedCaseId_fkey" FOREIGN KEY ("relatedCaseId") REFERENCES public."CaseRecord"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_role_plans project_role_plans_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_role_plans
    ADD CONSTRAINT "project_role_plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_tags project_tags_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tags
    ADD CONSTRAINT "project_tags_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_technologies project_technologies_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_technologies
    ADD CONSTRAINT "project_technologies_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_types project_types_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_types
    ADD CONSTRAINT "project_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_vendor_engagements project_vendor_engagements_currencyCode_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT "project_vendor_engagements_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES public."Currency"(code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_vendor_engagements project_vendor_engagements_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT "project_vendor_engagements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_vendor_engagements project_vendor_engagements_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_vendor_engagements
    ADD CONSTRAINT "project_vendor_engagements_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_workstreams project_workstreams_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_workstreams
    ADD CONSTRAINT "project_workstreams_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: radiator_threshold_configs radiator_threshold_configs_updatedByPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiator_threshold_configs
    ADD CONSTRAINT "radiator_threshold_configs_updatedByPersonId_fkey" FOREIGN KEY ("updatedByPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: skills skills_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT "skills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: staffing_request_fulfilments staffing_request_fulfilments_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staffing_request_fulfilments
    ADD CONSTRAINT "staffing_request_fulfilments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public.staffing_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: staffing_requests staffing_requests_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staffing_requests
    ADD CONSTRAINT "staffing_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: timesheet_entries timesheet_entries_timesheetWeekId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_entries
    ADD CONSTRAINT "timesheet_entries_timesheetWeekId_fkey" FOREIGN KEY ("timesheetWeekId") REFERENCES public.timesheet_weeks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: timesheet_weeks timesheet_weeks_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_weeks
    ADD CONSTRAINT "timesheet_weeks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: undo_actions undo_actions_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.undo_actions
    ADD CONSTRAINT "undo_actions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendor_skill_areas vendor_skill_areas_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_skill_areas
    ADD CONSTRAINT "vendor_skill_areas_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendors vendors_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT "vendors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "AuditLog_tenant_isolation" ON public."AuditLog" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: CaseRecord CaseRecord_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CaseRecord_tenant_isolation" ON public."CaseRecord" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: DomainEvent DomainEvent_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "DomainEvent_tenant_isolation" ON public."DomainEvent" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: LocalAccount LocalAccount_owner_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "LocalAccount_owner_isolation" ON public."LocalAccount" USING (("personId" = public.dm_r_current_person())) WITH CHECK (("personId" = public.dm_r_current_person()));


--
-- Name: LocalAccount LocalAccount_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "LocalAccount_tenant_isolation" ON public."LocalAccount" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: OrgUnit OrgUnit_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OrgUnit_tenant_isolation" ON public."OrgUnit" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: OutboxEvent OutboxEvent_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OutboxEvent_tenant_isolation" ON public."OutboxEvent" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: PasswordResetToken PasswordResetToken_owner_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "PasswordResetToken_owner_isolation" ON public."PasswordResetToken" USING (("accountId" IN ( SELECT "LocalAccount".id
   FROM public."LocalAccount"
  WHERE ("LocalAccount"."personId" = public.dm_r_current_person())))) WITH CHECK (("accountId" IN ( SELECT "LocalAccount".id
   FROM public."LocalAccount"
  WHERE ("LocalAccount"."personId" = public.dm_r_current_person()))));


--
-- Name: Person Person_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Person_tenant_isolation" ON public."Person" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: ProjectAssignment ProjectAssignment_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "ProjectAssignment_tenant_isolation" ON public."ProjectAssignment" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: Project Project_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project_tenant_isolation" ON public."Project" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: RefreshToken RefreshToken_owner_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "RefreshToken_owner_isolation" ON public."RefreshToken" USING (("accountId" IN ( SELECT "LocalAccount".id
   FROM public."LocalAccount"
  WHERE ("LocalAccount"."personId" = public.dm_r_current_person())))) WITH CHECK (("accountId" IN ( SELECT "LocalAccount".id
   FROM public."LocalAccount"
  WHERE ("LocalAccount"."personId" = public.dm_r_current_person()))));


--
-- Name: WorkEvidence WorkEvidence_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "WorkEvidence_tenant_isolation" ON public."WorkEvidence" USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: clients clients_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_tenant_isolation ON public.clients USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: contacts contacts_owner_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contacts_owner_isolation ON public.contacts USING (("personId" = public.dm_r_current_person())) WITH CHECK (("personId" = public.dm_r_current_person()));


--
-- Name: in_app_notifications in_app_notifications_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY in_app_notifications_tenant_isolation ON public.in_app_notifications USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: leave_requests leave_requests_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_requests_tenant_isolation ON public.leave_requests USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: skills skills_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY skills_tenant_isolation ON public.skills USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: staffing_requests staffing_requests_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staffing_requests_tenant_isolation ON public.staffing_requests USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: timesheet_weeks timesheet_weeks_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timesheet_weeks_tenant_isolation ON public.timesheet_weeks USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: vendors vendors_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_tenant_isolation ON public.vendors USING (("tenantId" = public.dm_r_current_tenant())) WITH CHECK (("tenantId" = public.dm_r_current_tenant()));


--
-- Name: dm_r_21_ddl_audit_trigger; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER dm_r_21_ddl_audit_trigger ON ddl_command_end
   EXECUTE FUNCTION public.dm_r_21_ddl_audit();


--
-- Name: dm_r_21_ddl_lockout_trigger; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER dm_r_21_ddl_lockout_trigger ON ddl_command_start
   EXECUTE FUNCTION public.dm_r_21_ddl_lockout();


--
-- Name: dm_r_21_sql_drop_audit_trigger; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER dm_r_21_sql_drop_audit_trigger ON sql_drop
   EXECUTE FUNCTION public.dm_r_21_sql_drop_audit();


--
-- PostgreSQL database dump complete
--


