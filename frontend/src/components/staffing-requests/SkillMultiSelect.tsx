import { useEffect, useMemo, useState } from 'react';

import { MultiCombobox, type ComboboxOption } from '@/components/ds';
import { fetchSkills, type Skill } from '@/lib/api/skills';

// Module-scoped cache: the skill catalog rarely changes during a session, so
// re-mounts (e.g., navigating away and back to /staffing-requests/new) reuse
// the in-flight or resolved promise instead of refetching.
let skillCatalogPromise: Promise<Skill[]> | null = null;
function loadSkillCatalog(): Promise<Skill[]> {
  if (!skillCatalogPromise) {
    skillCatalogPromise = fetchSkills().catch((err) => {
      // Reset on failure so the next mount can retry.
      skillCatalogPromise = null;
      throw err;
    });
  }
  return skillCatalogPromise;
}

interface SkillMultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Catalog-only multi-select for skills. Backed by the shared `<MultiCombobox>`
 * DS primitive: chips for selected skills render inline inside the field
 * itself, alongside the typeahead input — one cohesive control.
 *
 * - Loads the seeded `Skill` catalog via `fetchSkills()` once per session.
 * - There is no "create custom skill" affordance, so writes never carry a
 *   misspelled or invented skill name. Backend validates against the same
 *   catalog as a belt-and-braces guard.
 */
export function SkillMultiSelect({
  value,
  onChange,
  placeholder = 'Add a skill…',
  disabled,
}: SkillMultiSelectProps): JSX.Element {
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void loadSkillCatalog()
      .then((skills) => {
        if (active) setCatalog(skills);
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load skill catalog.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const options: ComboboxOption[] = useMemo(() => {
    return catalog
      .slice()
      .sort((a, b) => {
        const ac = a.category ?? '~';
        const bc = b.category ?? '~';
        if (ac !== bc) return ac.localeCompare(bc);
        return a.name.localeCompare(b.name);
      })
      .map((s) => ({
        value: s.name,
        label: s.name,
        hint: s.category ?? undefined,
      }));
  }, [catalog]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <MultiCombobox
        value={value}
        onValueChange={onChange}
        options={options}
        placeholder={isLoading ? 'Loading skills…' : (loadError ?? placeholder)}
        disabled={disabled || isLoading || Boolean(loadError)}
        emptyLabel="No more skills available"
      />
      {loadError ? (
        <div role="alert" style={{ fontSize: 11, color: 'var(--color-status-danger)' }}>
          {loadError}
        </div>
      ) : null}
    </div>
  );
}
