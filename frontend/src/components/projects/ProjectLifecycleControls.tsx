import { FormEvent, useState } from 'react';

import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { hasAnyStoredRole } from '@/features/auth/token-claims';
import { DIRECTOR_ADMIN_ROLES } from '@/app/route-manifest';
import { AuthTokenField } from '@/components/common/AuthTokenField';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { GovernanceOverridePanel } from '@/components/common/GovernanceOverridePanel';
import { SectionCard } from '@/components/common/SectionCard';
import { humanizeEnum, PROJECT_STATUS_LABELS } from '@/lib/labels';
import { ApiError } from '@/lib/api/http-client';
import {
  type ProjectClosureResponse,
  type ProjectDetails,
  activateProject,
  closeProject,
  closeProjectOverride,
} from '@/lib/api/project-registry';

interface ProjectLifecycleControlsProps {
  project: ProjectDetails;
  canManageProject: boolean;
  onReload: () => Promise<void>;
}

export function ProjectLifecycleControls({
  project,
  canManageProject,
  onReload,
}: ProjectLifecycleControlsProps): JSX.Element {
  const tokenState = useStoredApiToken();
  const canUseProjectOverride = hasAnyStoredRole(tokenState.token, DIRECTOR_ADMIN_ROLES);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [closeResult, setCloseResult] = useState<ProjectClosureResponse | null>(null);

  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonError, setOverrideReasonError] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);
  const [isOverrideClosing, setIsOverrideClosing] = useState(false);
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false);

  const canActivate = project.status === 'DRAFT';
  const canClose = project.status === 'ACTIVE';
  const canShowCloseOverride =
    canUseProjectOverride &&
    actionError?.includes('Use the explicit override flow with a reason to close anyway.') === true;

  async function handleActivate(): Promise<void> {
    if (!canActivate || isActivating) return;
    setIsActivating(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await activateProject(project.id);
      setActionSuccess(`Project ${response.name} activated.`);
      await onReload();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'Failed to activate project.');
    } finally {
      setIsActivating(false);
    }
  }

  async function handleClose(): Promise<void> {
    if (!canClose || isClosing) return;
    setIsClosing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await closeProject(project.id);
      setCloseResult(response);
      setActionSuccess(
        `Project ${response.name} closed with ${response.workspend.totalMandays.toFixed(2)} mandays captured.`,
      );
      await onReload();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError(error instanceof Error ? error.message : 'Failed to close project.');
      }
    } finally {
      setIsClosing(false);
    }
  }

  function handleCloseOverrideRequest(): void {
    if (overrideReason.trim().length < 10) {
      setOverrideReasonError('Reason must be at least 10 characters.');
      return;
    }
    setOverrideReasonError(null);
    setConfirmOverrideOpen(true);
  }

  async function handleCloseOverride(): Promise<void> {
    if (isOverrideClosing) return;
    setIsOverrideClosing(true);
    setOverrideError(null);
    setOverrideSuccess(null);
    try {
      const response = await closeProjectOverride(project.id, {
        reason: overrideReason,
      });
      setCloseResult(response);
      setOverrideSuccess(
        `Project ${response.name} closed by override with ${response.workspend.totalMandays.toFixed(2)} mandays captured.`,
      );
      setActionError(null);
      await onReload();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setOverrideError(error.message);
      } else {
        setOverrideError(error instanceof Error ? error.message : 'Override close failed.');
      }
    } finally {
      setIsOverrideClosing(false);
    }
  }

  return (
    <SectionCard compact title="Lifecycle Controls">
      <ConfirmDialog
        confirmLabel="Confirm close"
        message="Close this project? History is preserved and workspend summary will be generated."
        onCancel={() => setConfirmCloseOpen(false)}
        onConfirm={() => { setConfirmCloseOpen(false); void handleClose(); }}
        open={confirmCloseOpen}
        title="Close Project"
      />
      <ConfirmDialog
        confirmLabel="Apply override"
        message="Apply the closure override? This closes the project despite blocking conditions."
        onCancel={() => setConfirmOverrideOpen(false)}
        onConfirm={() => { setConfirmOverrideOpen(false); void handleCloseOverride(); }}
        open={confirmOverrideOpen}
        title="Confirm Closure Override"
      />

      {actionError ? <ErrorState description={actionError} /> : null}
      {actionSuccess ? <div className="success-banner">{actionSuccess}</div> : null}

      <dl className="details-list">
        <div><dt>Lifecycle State</dt><dd>{humanizeEnum(project.status, PROJECT_STATUS_LABELS)}</dd></div>
        <div>
          <dt>Activate</dt>
          <dd>{canActivate ? 'Draft projects can be activated before staffing begins.' : 'Only available in DRAFT.'}</dd>
        </div>
        <div>
          <dt>Close</dt>
          <dd>{canClose ? 'Closing captures workspend and preserves history.' : 'Only available while ACTIVE.'}</dd>
        </div>
      </dl>

      {canManageProject && canActivate ? (
        <div style={{ marginTop: 12 }}>
          <button className="button--project-detail button--primary" disabled={isActivating} onClick={() => void handleActivate()} type="button">
            {isActivating ? 'Activating...' : 'Activate project'}
          </button>
        </div>
      ) : null}

      {canManageProject && canClose ? (
        <div style={{ marginTop: 12 }}>
          <button className="button--project-detail button--danger" disabled={isClosing} onClick={() => setConfirmCloseOpen(true)} type="button">
            {isClosing ? 'Closing...' : 'Close project'}
          </button>
        </div>
      ) : null}

      {!tokenState.hasToken ? (
        <AuthTokenField hasToken={tokenState.hasToken} onClear={tokenState.clearToken} onSave={tokenState.saveToken} token={tokenState.token} />
      ) : null}

      {canShowCloseOverride ? (
        <GovernanceOverridePanel
          actionLabel="Close project with override"
          confirmLabel="This override should only be used by authorized governance roles."
          error={overrideError}
          impactMessage="The project will close despite active assignments. History and override reason remain auditable."
          isSubmitting={isOverrideClosing}
          onReasonChange={(v) => { setOverrideReason(v); setOverrideReasonError(null); }}
          onSubmit={(e: FormEvent) => { e.preventDefault(); handleCloseOverrideRequest(); }}
          reason={overrideReason}
          reasonError={overrideReasonError}
          success={overrideSuccess}
          subtitle="Normal closure is blocked due to active staffing."
          title="Project Closure Override"
        />
      ) : null}

      {closeResult ? (
        <div className="project-closure-summary" data-testid="project-closure-summary">
          <h4>Closure Workspend Summary</h4>
          <p>Total mandays: {closeResult.workspend.totalMandays.toFixed(2)}</p>
          <div className="project-bucket-grid">
            <div>
              <div className="project-bucket-grid__title">By role</div>
              {closeResult.workspend.byRole.length === 0 ? (
                <p className="project-bucket-grid__empty">No role workspend.</p>
              ) : (
                <ul className="project-bucket-list">
                  {closeResult.workspend.byRole.map((b) => (
                    <li key={`role-${b.key}`}><span>{b.key}</span><span>{b.mandays.toFixed(2)} md</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="project-bucket-grid__title">By skillset</div>
              {closeResult.workspend.bySkillset.length === 0 ? (
                <p className="project-bucket-grid__empty">No skillset workspend.</p>
              ) : (
                <ul className="project-bucket-list">
                  {closeResult.workspend.bySkillset.map((b) => (
                    <li key={`skill-${b.key}`}><span>{b.key}</span><span>{b.mandays.toFixed(2)} md</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
