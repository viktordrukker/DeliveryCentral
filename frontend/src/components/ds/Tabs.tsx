import {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useId,
  useRef,
} from 'react';

/**
 * V2-B.12 — DS Tabs atom.
 *
 * Implements the W3C WAI-ARIA "Tabs" pattern with roving tabindex:
 *   - `role="tablist"` on the strip
 *   - `role="tab"` on each tab button (raw `<button>` is correct per W3C)
 *   - `role="tabpanel"` on the linked content (caller renders)
 *   - keyboard nav: ←/→ (or ↑/↓ when orientation="vertical") moves focus
 *     between tabs and selects the focused one (per W3C "Automatic activation")
 *   - Home/End jump to first/last
 *
 * The component is intentionally controlled — caller owns `value` + provides
 * `onValueChange`. URL-driven or sessionStorage-driven tab state lives in
 * the caller, which keeps the atom tiny and side-effect-free.
 *
 * The conformance script (`scripts/check-ds-conformance.cjs`) allows
 * raw `<button>` inside `components/ds/**` so the W3C-required raw button
 * lives here, and consumer routes can `import { Tabs }` without violating
 * the `no-raw-button` rule. This was the V2-E.2 blocker for the
 * Workspace `/me` tab strip.
 */

export interface TabItem {
  /** Stable id used in `role=tab` `id` + `aria-controls` linkage. */
  id: string;
  /** Visible label. */
  label: ReactNode;
  /** Optional disabled state — focusable but not selectable. */
  disabled?: boolean;
}

interface TabsProps {
  /** Tab metadata, rendered in array order. */
  tabs: TabItem[];
  /** Currently-selected tab id (controlled). */
  value: string;
  /** Fired when the user activates a different tab. */
  onValueChange: (id: string) => void;
  /** Label for screen readers naming the tablist. */
  ariaLabel?: string;
  /** Tablist orientation. Affects which arrow keys move focus. Default `horizontal`. */
  orientation?: 'horizontal' | 'vertical';
  /** Optional className passed through to the tablist `<div>`. */
  className?: string;
  /** Optional inline style passed through to the tablist `<div>`. */
  style?: CSSProperties;
  /** Optional `data-testid` for the tablist root. */
  testId?: string;
  /**
   * Optional id prefix for the rendered tab elements (e.g. `"me-tab"`).
   * Renders as `${idPrefix}-${tab.id}` for the tab and
   * `${idPrefix}panel-${tab.id}` for the paired panel — useful when the
   * caller wraps panels and needs `aria-controls` ids to line up.
   * Defaults to a stable React `useId()` value.
   */
  idPrefix?: string;
}

const TABLIST_STYLE_BASE: CSSProperties = {
  display: 'flex',
  gap: 4,
  borderBottom: '1px solid var(--color-border)',
  flexWrap: 'wrap',
};

const TAB_STYLE_BASE: CSSProperties = {
  background: 'transparent',
  border: 0,
  padding: '10px 14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  marginBottom: -1,
};

/**
 * Returns `id-${tab.id}` / `idpanel-${tab.id}` so the tab + panel pair
 * is properly linked for assistive tech. Pass the same value to a
 * caller-rendered panel's `id` + `aria-labelledby`.
 */
export function tabIds(
  idPrefix: string,
  tabId: string,
): { tabId: string; panelId: string } {
  return { tabId: `${idPrefix}-${tabId}`, panelId: `${idPrefix}panel-${tabId}` };
}

export function Tabs({
  tabs,
  value,
  onValueChange,
  ariaLabel,
  orientation = 'horizontal',
  className,
  style,
  testId,
  idPrefix,
}: TabsProps): JSX.Element {
  const reactId = useId();
  const prefix = idPrefix ?? `ds-tabs-${reactId.replace(/:/g, '')}`;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = useCallback((id: string) => {
    refs.current[id]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentId: string) => {
      const enabledIds = tabs.filter((t) => !t.disabled).map((t) => t.id);
      const currentIdx = enabledIds.indexOf(currentId);
      if (currentIdx === -1) return;

      const isHorizontal = orientation === 'horizontal';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

      let nextIdx: number | null = null;
      if (e.key === nextKey) nextIdx = (currentIdx + 1) % enabledIds.length;
      else if (e.key === prevKey)
        nextIdx = (currentIdx - 1 + enabledIds.length) % enabledIds.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = enabledIds.length - 1;

      if (nextIdx === null) return;
      e.preventDefault();
      const nextId = enabledIds[nextIdx];
      // Per W3C "Automatic activation": move focus AND change selection.
      focusTab(nextId);
      onValueChange(nextId);
    },
    [tabs, orientation, focusTab, onValueChange],
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={className}
      data-testid={testId}
      style={{
        ...TABLIST_STYLE_BASE,
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        const { tabId, panelId } = tabIds(prefix, tab.id);
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={tabId}
            aria-controls={panelId}
            aria-selected={selected}
            aria-disabled={tab.disabled || undefined}
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            data-tab={tab.id}
            data-active={selected || undefined}
            onClick={() => !tab.disabled && onValueChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, tab.id)}
            style={{
              ...TAB_STYLE_BASE,
              color: selected ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontWeight: selected ? 600 : 400,
              borderBottom: selected
                ? '2px solid var(--color-accent)'
                : '2px solid transparent',
              opacity: tab.disabled ? 0.5 : 1,
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
