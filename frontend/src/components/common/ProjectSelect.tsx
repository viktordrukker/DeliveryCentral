import { useEffect, useState } from 'react';

import { fetchProjectDirectory } from '@/lib/api/project-registry';

interface ProjectSelectProps {
  id?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

export function ProjectSelect({
  id,
  label,
  onChange,
  required,
  value,
}: ProjectSelectProps): JSX.Element {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    void fetchProjectDirectory()
      .then((response) => {
        if (!active) return;
        setProjects(
          response.items.map((item) => ({
            id: item.id,
            name: item.name,
          })),
        );
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
  }, []);

  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select
        className="field__control"
        disabled={isLoading}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      >
        <option value="">{isLoading ? 'Loading…' : 'All projects'}</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
