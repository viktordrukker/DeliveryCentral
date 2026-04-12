import { useEffect, useMemo, useState } from 'react';

import { fetchPersonDirectory, PersonDirectoryItem } from '@/lib/api/person-directory';
import { fetchProjectDirectory, ProjectDirectoryItem } from '@/lib/api/project-registry';
import { fetchWorkEvidence, WorkEvidenceItem, WorkEvidenceResponse } from '@/lib/api/work-evidence';
import { QueryState } from '@/lib/api/query-state';

export interface WorkEvidenceFilters {
  dateFrom: string;
  dateTo: string;
  person: string;
  project: string;
  source: string;
}

export interface WorkEvidenceViewItem extends WorkEvidenceItem {
  personName: string;
  projectName: string;
}

interface WorkEvidencePageState extends QueryState<WorkEvidenceResponse> {
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  reload: () => void;
  visibleItems: WorkEvidenceViewItem[];
}

export function useWorkEvidencePage(
  filters: WorkEvidenceFilters,
): WorkEvidencePageState {
  const [state, setState] = useState<QueryState<WorkEvidenceResponse>>({
    isLoading: true,
  });
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    setState({ isLoading: true });
    void Promise.all([
      fetchWorkEvidence({
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters.source ? { sourceType: filters.source } : {}),
      }),
      fetchPersonDirectory({ page: 1, pageSize: 100 }),
      fetchProjectDirectory(),
    ])
      .then(([evidenceResponse, peopleResponse, projectResponse]) => {
        if (!active) {
          return;
        }

        setPeople(peopleResponse.items);
        setProjects(projectResponse.items);
        setState({
          data: evidenceResponse,
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState({
          error: error instanceof Error ? error.message : 'Failed to load work evidence.',
          isLoading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [filters.dateFrom, filters.dateTo, filters.source, reloadToken]);

  const visibleItems = useMemo(() => {
    const personSearch = filters.person.trim().toLowerCase();
    const projectSearch = filters.project.trim().toLowerCase();

    return (state.data?.items ?? [])
      .map<WorkEvidenceViewItem>((item) => ({
        ...item,
        personName:
          people.find((person) => person.id === item.personId)?.displayName ?? item.personId ?? 'Unattributed person',
        projectName:
          projects.find((project) => project.id === item.projectId)?.name ?? item.projectId ?? 'Unattributed project',
      }))
      .filter((item) => {
        const matchesPerson = !personSearch || item.personName.toLowerCase().includes(personSearch);
        const matchesProject = !projectSearch || item.projectName.toLowerCase().includes(projectSearch);

        return matchesPerson && matchesProject;
      });
  }, [filters.person, filters.project, people, projects, state.data?.items]);

  return {
    ...state,
    people,
    projects,
    reload: () => setReloadToken((current) => current + 1),
    visibleItems,
  };
}
