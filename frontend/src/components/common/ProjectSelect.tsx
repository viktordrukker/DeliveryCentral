import { useEffect, useState } from 'react';

import { fetchProjectDirectory, type ProjectDirectoryItem } from '@/lib/api/project-registry';
import { FormField, Select } from '@/components/ds';

interface ProjectSelectProps {
  id?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
  /** When provided, only projects whose status is in this list are shown. */
  statusFilter?: string[];
  /** Override the empty-option label. Default: "All projects". */
  placeholder?: string;
  /** Surface the project code + client + status badge in each option's label. */
  rich?: boolean;
}

/**
 * Phase DS-3-3 — public API unchanged. Internally composes <FormField>
 * + DS <Select>. Native <select required> validation preserved.
 *
 * WO-StaffingForm — added `statusFilter` so callers can hide CLOSED/ARCHIVED
 * projects (e.g. on the StaffingRequest creation form, where only OPEN
 * projects are selectable). Added `rich` to surface project code + status
 * inline in the option label for disambiguation.
 */
export function ProjectSelect({
  id,
  label,
  onChange,
  required,
  value,
  statusFilter,
  placeholder,
  rich,
}: ProjectSelectProps): JSX.Element {
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    void fetchProjectDirectory(
      statusFilter && statusFilter.length > 0 ? { status: statusFilter.join(',') } : {},
    )
      .then((response) => {
        if (!active) return;
        const items = statusFilter && statusFilter.length > 0
          ? response.items.filter((item) => statusFilter.includes(item.status))
          : response.items;
        setProjects(items);
      })
      .catch(() => {
        // silently ignore
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [statusFilter?.join(',')]);

  function optionLabel(item: ProjectDirectoryItem): string {
    if (!rich) return item.name;
    const parts: string[] = [item.name];
    if (item.projectCode) parts.push(`(${item.projectCode})`);
    if (item.clientName) parts.push(`— ${item.clientName}`);
    if (item.status && item.status !== 'ACTIVE') parts.push(`· ${item.status}`);
    return parts.join(' ');
  }

  return (
    <FormField label={label} required={required} id={id}>
      {(props) => (
        <Select
          disabled={isLoading}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          value={value}
          {...props}
        >
          <option value="">
            {isLoading ? 'Loading…' : placeholder ?? 'All projects'}
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {optionLabel(project)}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  );
}
