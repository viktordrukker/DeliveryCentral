import { useEffect, useMemo, useState } from 'react';

import { fetchPersonDirectory, PersonDirectoryItem } from '@/lib/api/person-directory';
import {
  CreateTeamRequest,
  TeamMember,
  TeamSummary,
  createTeam,
  fetchTeamMembers,
  fetchTeams,
  updateTeamMember,
} from '@/lib/api/teams';

export interface TeamFormValues {
  code: string;
  description: string;
  name: string;
}

export const initialTeamFormValues: TeamFormValues = {
  code: '',
  description: '',
  name: '',
};

interface TeamManagementState {
  createTeam: (values: TeamFormValues) => Promise<boolean>;
  error: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  members: TeamMember[];
  people: PersonDirectoryItem[];
  selectedTeam: TeamSummary | null;
  selectedTeamId: string | null;
  selectTeam: (id: string) => void;
  successMessage: string | null;
  teams: TeamSummary[];
  updateMember: (personId: string, action: 'add' | 'remove') => Promise<void>;
}

export function useTeamManagement(): TeamManagementState {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void Promise.all([
      fetchTeams(),
      fetchPersonDirectory({ page: 1, pageSize: 100 }),
    ])
      .then(async ([teamResponse, peopleResponse]) => {
        if (!isMounted) {
          return;
        }

        setTeams(teamResponse.items);
        setPeople(peopleResponse.items);

        const firstTeamId = teamResponse.items[0]?.id ?? null;
        setSelectedTeamId(firstTeamId);

        if (firstTeamId) {
          const memberResponse = await fetchTeamMembers(firstTeamId);
          if (isMounted) {
            setMembers(memberResponse.items);
          }
        } else {
          setMembers([]);
        }
      })
      .catch((reason: Error) => {
        if (!isMounted) {
          return;
        }

        setError(reason.message);
        setTeams([]);
        setPeople([]);
        setMembers([]);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadMembers(teamId: string): Promise<void> {
    const response = await fetchTeamMembers(teamId);
    setMembers(response.items);
  }

  async function refreshTeams(selectedId?: string): Promise<void> {
    const response = await fetchTeams();
    setTeams(response.items);

    const nextId = selectedId ?? response.items[0]?.id ?? null;
    setSelectedTeamId(nextId);

    if (nextId) {
      await loadMembers(nextId);
    } else {
      setMembers([]);
    }
  }

  async function handleCreateTeam(values: TeamFormValues): Promise<boolean> {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const request: CreateTeamRequest = {
        code: values.code,
        description: values.description || undefined,
        name: values.name,
      };

      const createdTeam = await createTeam(request);
      await refreshTeams(createdTeam.id);
      setSuccessMessage(`Created team ${createdTeam.name}.`);
      return true;
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to create team.',
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateMember(personId: string, action: 'add' | 'remove'): Promise<void> {
    if (!selectedTeamId) {
      setError('Select a team first.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await updateTeamMember(selectedTeamId, { action, personId });
      setMembers(response.items);

      const person = people.find((item) => item.id === personId);
      setSuccessMessage(
        `${action === 'add' ? 'Added' : 'Removed'} ${person?.displayName ?? 'member'} ${
          action === 'add' ? 'to' : 'from'
        } ${selectedTeam?.name ?? 'team'}.`,
      );

      const teamResponse = await fetchTeams();
      setTeams(teamResponse.items);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to update team member.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    createTeam: handleCreateTeam,
    error,
    isLoading,
    isSubmitting,
    members,
    people,
    selectedTeam,
    selectedTeamId,
    selectTeam: (id: string) => {
      setSelectedTeamId(id);
      setSuccessMessage(null);
      setError(null);
      void loadMembers(id).catch((reason: Error) => {
        setError(reason.message);
        setMembers([]);
      });
    },
    successMessage,
    teams,
    updateMember: handleUpdateMember,
  };
}
