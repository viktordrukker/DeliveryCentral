import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { appRoutes } from '@/app/navigation';
import { fetchPersonDirectory, PersonDirectoryItem } from '@/lib/api/person-directory';
import { fetchProjectDirectory, ProjectDirectoryItem } from '@/lib/api/project-registry';

export interface RecentPage {
  path: string;
  title: string;
}

interface CommandPaletteProps {
  onClose: () => void;
  open: boolean;
  recentPages?: RecentPage[];
}

interface CommandItem {
  group: string;
  id: string;
  label: string;
  onSelect: () => void;
  sublabel?: string;
}

function highlight(text: string, query: string): JSX.Element {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="command-palette__highlight">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function CommandPalette({ onClose, open, recentPages = [] }: CommandPaletteProps): JSX.Element | null {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setPeople([]);
      setProjects([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (query.length >= 1) {
        void fetchPersonDirectory({ pageSize: 5 }).then((r) => {
          setPeople(
            r.items.filter((p) =>
              p.displayName.toLowerCase().includes(query.toLowerCase()),
            ).slice(0, 5),
          );
        });
        void fetchProjectDirectory({ search: query }).then((r) => {
          setProjects(r.items.slice(0, 5));
        });
      } else {
        setPeople([]);
        setProjects([]);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const visibleRoutes = appRoutes.filter((route) => {
    if (!route.allowedRoles) return true;
    return route.allowedRoles.some((r) => principal?.roles.includes(r));
  });

  const pageItems: CommandItem[] = visibleRoutes
    .filter((route) =>
      !query || route.title.toLowerCase().includes(query.toLowerCase()),
    )
    .map((route) => ({
      group: 'Pages',
      id: `page-${route.path}`,
      label: route.title,
      sublabel: route.description,
      onSelect: () => {
        navigate(route.path);
        onClose();
      },
    }));

  const actionItems: CommandItem[] = [
    {
      group: 'Actions',
      id: 'action-log-hours',
      label: 'Log Hours',
      sublabel: 'Record manual work evidence',
      onSelect: () => {
        navigate('/work-evidence');
        onClose();
      },
    },
    {
      group: 'Actions',
      id: 'action-create-assignment',
      label: 'Create Assignment',
      sublabel: 'Create a new staffing assignment',
      onSelect: () => {
        navigate('/assignments/new');
        onClose();
      },
    },
    {
      group: 'Actions',
      id: 'action-submit-timesheet',
      label: 'Submit Timesheet',
      sublabel: 'Go to your timesheet',
      onSelect: () => {
        navigate('/timesheets');
        onClose();
      },
    },
    {
      group: 'Actions',
      id: 'action-approve-requests',
      label: 'Approve Requests',
      sublabel: 'Review pending staffing requests',
      onSelect: () => {
        navigate('/staffing-requests');
        onClose();
      },
    },
  ].filter(
    (item) =>
      !query || item.label.toLowerCase().includes(query.toLowerCase()),
  );

  const peopleItems: CommandItem[] = people.map((person) => ({
    group: 'People',
    id: `person-${person.id}`,
    label: person.displayName,
    sublabel: person.primaryEmail ?? undefined,
    onSelect: () => {
      navigate(`/people/${person.id}`);
      onClose();
    },
  }));

  const projectItems: CommandItem[] = projects.map((project) => ({
    group: 'Projects',
    id: `project-${project.id}`,
    label: project.name,
    sublabel: project.projectCode,
    onSelect: () => {
      navigate(`/projects/${project.id}`);
      onClose();
    },
  }));

  const recentItems: CommandItem[] = !query
    ? recentPages.map((page) => ({
        group: 'Recent',
        id: `recent-${page.path}`,
        label: page.title,
        sublabel: page.path,
        onSelect: () => {
          navigate(page.path);
          onClose();
        },
      }))
    : [];

  const allItems = [...recentItems, ...peopleItems, ...projectItems, ...pageItems, ...actionItems];

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[activeIndex];
      if (item) item.onSelect();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  const groups = query
    ? ['People', 'Projects', 'Pages', 'Actions']
    : ['Recent', 'Pages', 'Actions'];

  return (
    <div
      aria-modal="true"
      className="command-palette-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className="command-palette">
        <input
          aria-label="Search commands"
          className="command-palette__input"
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search pages, people, projects..."
          ref={inputRef}
          type="text"
          value={query}
        />
        <div className="command-palette__list">
          {allItems.length === 0 ? (
            <div className="command-palette__empty">No results</div>
          ) : (
            groups.map((group) => {
              const groupItems = allItems.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;
              return (
                <div key={group}>
                  <div className="command-palette__group-label">{group}</div>
                  {groupItems.map((item) => {
                    const globalIndex = allItems.indexOf(item);
                    return (
                      <button
                        className={`command-palette__item${globalIndex === activeIndex ? ' command-palette__item--active' : ''}`}
                        key={item.id}
                        onClick={item.onSelect}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        type="button"
                      >
                        <span className="command-palette__item-label">
                          {highlight(item.label, query)}
                        </span>
                        {item.sublabel ? (
                          <span className="command-palette__item-sublabel">
                            {highlight(item.sublabel, query)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
