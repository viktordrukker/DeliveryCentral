import { useCallback, useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button, IconButton } from '@/components/ds';

/**
 * SoT PR 6 — Saved-tab strip for the Staffing Desk.
 *
 * Matches DS canvas (`page-staffing-desk.jsx` lines 6-12, 30-42):
 *  - 6 default tabs (Mine + Public scope chips)
 *  - "+" trigger that opens a New-tab modal
 *  - per-tab gear icon for Rename / Clone / Delete
 *  - URL-persisted active tab id (UX Law 5)
 *
 * Data lives in localStorage under `staffing-desk-tabs/v1` as
 * `{ id, label, scope, query }`. The `query` is the same filter object
 * shape `SavedFiltersDropdown` already persists — applying a tab swaps the
 * URL filter params onto the page.
 */

export type StaffingTabScope = 'private' | 'public';

export interface StaffingTab {
  id: string;
  label: string;
  scope: StaffingTabScope;
  /** URL filter key/value pairs that get applied when the tab is selected. */
  query: Record<string, string>;
}

const STORAGE_KEY = 'staffing-desk-tabs/v1';

const DEFAULT_TABS: StaffingTab[] = [
  { id: 'mine',   label: 'My open positions', scope: 'private', query: { status: 'OPEN' } },
  { id: 'sla',    label: 'SLA breach watch',  scope: 'public',  query: { status: 'OPEN' } },
  { id: 'cobol',  label: 'COBOL pipeline',    scope: 'private', query: { skills: 'COBOL' } },
  { id: 'mcb-q3', label: 'MCB Q3 backlog',    scope: 'public',  query: {} },
  { id: 'capex',  label: 'Capex-only roles',  scope: 'public',  query: {} },
];

function loadTabs(): StaffingTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TABS;
    const parsed = JSON.parse(raw) as StaffingTab[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TABS;
    return parsed;
  } catch {
    return DEFAULT_TABS;
  }
}

function saveTabs(tabs: StaffingTab[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs)); } catch { /* ignore */ }
}

interface Props {
  /** Currently active tab id (from URL search param `tab`). */
  activeTabId: string;
  /** Filter values currently in the URL — used when the user clicks "Save tab". */
  currentFilters: Record<string, string>;
  /** Called when a tab is selected — the page applies the tab's query to URL params. */
  onSelectTab: (tab: StaffingTab) => void;
  /** Whether the user has unsaved query edits relative to the active tab. */
  dirty?: boolean;
  /** Trigger for the planner tab — flips view=planner. */
  onOpenPlanner?: () => void;
  /** Whether planner tab is active (view=planner). */
  plannerActive?: boolean;
}

export function StaffingDeskTabStrip({
  activeTabId,
  currentFilters,
  onSelectTab,
  dirty,
  onOpenPlanner,
  plannerActive,
}: Props): JSX.Element {
  const [tabs, setTabs] = useState<StaffingTab[]>(() => loadTabs());
  const [modalOpen, setModalOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [gearOpenFor, setGearOpenFor] = useState<string | null>(null);

  useEffect(() => { saveTabs(tabs); }, [tabs]);

  const closeGear = useCallback(() => setGearOpenFor(null), []);

  const handleSelect = useCallback((tab: StaffingTab) => {
    closeGear();
    onSelectTab(tab);
  }, [closeGear, onSelectTab]);

  const handleCreate = useCallback((label: string, scope: StaffingTabScope, query: Record<string, string>) => {
    const id = `tab-${Date.now()}`;
    const next: StaffingTab = { id, label, scope, query };
    setTabs((prev) => [...prev, next]);
    setModalOpen(false);
    onSelectTab(next);
  }, [onSelectTab]);

  const handleRename = useCallback((id: string, nextLabel: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, label: nextLabel } : t)));
    setRenameId(null);
  }, []);

  const handleClone = useCallback((id: string) => {
    closeGear();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    const clone: StaffingTab = { ...tab, id: `tab-${Date.now()}`, label: `${tab.label} (copy)`, scope: 'private' };
    setTabs((prev) => [...prev, clone]);
    onSelectTab(clone);
  }, [tabs, closeGear, onSelectTab]);

  const handleDelete = useCallback((id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    setDeleteId(null);
    if (activeTabId === id && tabs[0]) {
      const fallback = tabs.find((t) => t.id !== id);
      if (fallback) onSelectTab(fallback);
    }
  }, [activeTabId, tabs, onSelectTab]);

  const deleteTab = useMemo(() => tabs.find((t) => t.id === deleteId) ?? null, [tabs, deleteId]);

  return (
    <>
      <div
        role="tablist"
        aria-label="Saved staffing views"
        className="sd-tab-strip"
      >
        {tabs.map((t) => {
          const isActive = activeTabId === t.id && !plannerActive;
          const isRenaming = renameId === t.id;
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={isActive}
              className={`sd-tab${isActive ? ' sd-tab--active' : ''}`}
            >
              {isRenaming ? (
                <input
                  className="field__control sd-tab__rename"
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(t.id, renameDraft.trim() || t.label);
                    if (e.key === 'Escape') setRenameId(null);
                  }}
                  onBlur={() => handleRename(t.id, renameDraft.trim() || t.label)}
                />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="sd-tab__label"
                  onClick={() => handleSelect(t)}
                  type="button"
                >
                  <span>{t.label}</span>
                </Button>
              )}
              <span className={`sd-tab__scope sd-tab__scope--${t.scope}`}>{t.scope === 'public' ? 'Public' : 'Mine'}</span>
              <span style={{ position: 'relative' }}>
                <IconButton
                  aria-label={`Tab actions for ${t.label}`}
                  size="sm"
                  onClick={() => setGearOpenFor((cur) => (cur === t.id ? null : t.id))}
                >
                  <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>⚙</span>
                </IconButton>
                {gearOpenFor === t.id && (
                  <div className="sd-tab__menu" role="menu">
                    <Button
                      variant="ghost"
                      size="sm"
                      role="menuitem"
                      className="sd-tab__menu-item"
                      type="button"
                      onClick={() => {
                        setRenameId(t.id);
                        setRenameDraft(t.label);
                        closeGear();
                      }}
                    >Rename</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      role="menuitem"
                      className="sd-tab__menu-item"
                      type="button"
                      onClick={() => handleClone(t.id)}
                    >Clone</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      role="menuitem"
                      className="sd-tab__menu-item sd-tab__menu-item--danger"
                      type="button"
                      onClick={() => { closeGear(); setDeleteId(t.id); }}
                    >Delete</Button>
                  </div>
                )}
              </span>
            </div>
          );
        })}

        {/* Planner tab — flips ?view=planner */}
        {onOpenPlanner && (
          <div
            role="tab"
            aria-selected={!!plannerActive}
            className={`sd-tab sd-tab--planner${plannerActive ? ' sd-tab--active' : ''}`}
          >
            <Button
              variant="ghost"
              size="sm"
              className="sd-tab__label"
              onClick={onOpenPlanner}
              type="button"
            >
              <span>Distribution Studio</span>
            </Button>
            <span className="sd-tab__scope sd-tab__scope--private">Mine</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          aria-label="New saved tab"
          onClick={() => setModalOpen(true)}
          style={{ minWidth: 28, padding: '0 8px' }}
        >+</Button>

        {dirty && !plannerActive && (
          <span className="sd-tab__dirty" aria-live="polite">unsaved changes</span>
        )}
      </div>

      {modalOpen && (
        <NewTabModal
          currentFilters={currentFilters}
          onCancel={() => setModalOpen(false)}
          onCreate={handleCreate}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete saved tab"
        message={
          deleteTab
            ? `Delete ${deleteTab.scope === 'public' ? 'public' : 'private'} tab "${deleteTab.label}"? Other users with read access will lose this view.`
            : ''
        }
        confirmLabel="Delete tab"
        tone="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
      />
    </>
  );
}

interface NewTabModalProps {
  currentFilters: Record<string, string>;
  onCancel: () => void;
  onCreate: (label: string, scope: StaffingTabScope, query: Record<string, string>) => void;
}

function NewTabModal({ currentFilters, onCancel, onCreate }: NewTabModalProps): JSX.Element {
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState<StaffingTabScope>('private');
  const cleanFilters = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(currentFilters)) {
      if (v && v.length > 0 && k !== 'page' && k !== 'pageSize') out[k] = v;
    }
    return out;
  }, [currentFilters]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New saved tab"
      style={{
        position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'var(--color-overlay)' }} onClick={onCancel} />
      <div
        style={{
          position: 'relative', width: 460, maxWidth: '94vw',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 12, boxShadow: 'var(--shadow-modal)', padding: 'var(--space-4)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>New saved tab</h2>
        <label className="field" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
          <span className="field__label">Tab name</span>
          <input
            className="field__control"
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. MCB FE backlog"
          />
        </label>
        <fieldset style={{ border: 'none', padding: 0, marginTop: 'var(--space-3)' }}>
          <legend className="field__label" style={{ padding: 0 }}>Scope</legend>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', padding: 8, border: `1px solid ${scope === 'private' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 6, flex: 1, cursor: 'pointer' }}>
              <input type="radio" name="scope" checked={scope === 'private'} onChange={() => setScope('private')} />
              <span><strong style={{ fontSize: 12 }}>Mine</strong><br /><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Only you can see it.</span></span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', padding: 8, border: `1px solid ${scope === 'public' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 6, flex: 1, cursor: 'pointer' }}>
              <input type="radio" name="scope" checked={scope === 'public'} onChange={() => setScope('public')} />
              <span><strong style={{ fontSize: 12 }}>Public</strong><br /><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Everyone with read access.</span></span>
            </label>
          </div>
        </fieldset>
        <div style={{ marginTop: 'var(--space-3)', fontSize: 11, color: 'var(--color-text-muted)' }}>
          Captures the current query: <span style={{ fontFamily: 'monospace' }}>{Object.keys(cleanFilters).length === 0 ? '(no filters)' : Object.entries(cleanFilters).map(([k, v]) => `${k}=${v}`).join(' · ')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" size="sm" onClick={onCancel} type="button">Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={!label.trim()}
            onClick={() => onCreate(label.trim(), scope, cleanFilters)}
          >Create tab</Button>
        </div>
      </div>
    </div>
  );
}
