/**
 * V2 Scope §4 item 14 — inline-editable system flag toggles for /admin?tab=settings.
 *
 * Replaces the read-only AdminConfigViewer that previously rendered system
 * flags as text under the Runtime Settings tab. Each row is a DS Checkbox
 * bound to the existing `PATCH /admin/feature-flags/:id` endpoint with
 * optimistic update + automatic revert on failure.
 *
 * Renders under `dsRefresh` only; the read-only path stays available for
 * the OFF state.
 */
import { useEffect, useState } from 'react';

import { Checkbox } from '@/components/ds';
import {
  fetchFeatureFlags,
  updateFeatureFlag,
  type FeatureFlagAdminEntry,
} from '@/lib/api/feature-flags-admin';

interface PerFlagState {
  /** Current optimistic value shown in the UI. */
  value: boolean;
  /** True while a PATCH is in flight for this flag. */
  pending: boolean;
  /** Last error if a toggle failed. */
  error: string | null;
}

export function SystemFlagsSettingsList(): JSX.Element {
  const [flags, setFlags] = useState<FeatureFlagAdminEntry[] | null>(null);
  const [perFlag, setPerFlag] = useState<Record<string, PerFlagState>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchFeatureFlags()
      .then((res) => {
        if (!active) return;
        setFlags(res);
        const seeded: Record<string, PerFlagState> = {};
        for (const f of res) {
          seeded[f.id] = { value: f.currentValue, pending: false, error: null };
        }
        setPerFlag(seeded);
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load flags.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleToggle(flag: FeatureFlagAdminEntry, next: boolean): Promise<void> {
    setPerFlag((current) => ({
      ...current,
      [flag.id]: { value: next, pending: true, error: null },
    }));
    try {
      const result = await updateFeatureFlag(flag.id, next);
      setPerFlag((current) => ({
        ...current,
        [flag.id]: { value: result.currentValue, pending: false, error: null },
      }));
    } catch (err) {
      // Revert + surface error inline.
      setPerFlag((current) => ({
        ...current,
        [flag.id]: {
          value: !next,
          pending: false,
          error: err instanceof Error ? err.message : 'Toggle failed.',
        },
      }));
    }
  }

  if (loadError) {
    return (
      <p className="admin-config-viewer__empty" style={{ color: 'var(--color-status-danger)' }}>
        Couldn’t load feature flags: {loadError}
      </p>
    );
  }

  if (!flags) {
    return <p className="admin-config-viewer__empty">Loading feature flags…</p>;
  }

  if (flags.length === 0) {
    return <p className="admin-config-viewer__empty">No feature flags registered.</p>;
  }

  return (
    <dl className="admin-config-viewer" data-testid="system-flags-settings-list">
      {flags.map((flag) => {
        const state = perFlag[flag.id] ?? { value: flag.currentValue, pending: false, error: null };
        return (
          <div className="admin-config-viewer__item" key={flag.id} data-flag-id={flag.id}>
            <dt>{flag.key}</dt>
            <dd>
              <Checkbox
                checked={state.value}
                disabled={state.pending}
                onChange={(e) => void handleToggle(flag, e.target.checked)}
                label={state.value ? 'Enabled' : 'Disabled'}
              />
            </dd>
            <div className="admin-config-viewer__supporting-text">
              {flag.description}
              {flag.maturityLevel ? ` · Maturity: ${flag.maturityLevel}` : ''}
              {flag.owner ? ` · Owner: ${flag.owner}` : ''}
            </div>
            {state.error ? (
              <div
                className="admin-config-viewer__supporting-text"
                style={{ color: 'var(--color-status-danger)' }}
              >
                {state.error}
              </div>
            ) : null}
          </div>
        );
      })}
    </dl>
  );
}
