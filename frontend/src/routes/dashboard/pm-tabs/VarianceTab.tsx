import { SectionCard } from '@/components/common/SectionCard';
import { AnomalyPanel } from '@/components/projects/AnomalyPanel';
import type {
  ProjectDashboardAttentionItem,
  ProjectManagerDashboardPersonSummary,
} from '@/lib/api/dashboard-project-manager';

interface Props {
  projectsWithTimeVariance: ProjectDashboardAttentionItem[];
  person: ProjectManagerDashboardPersonSummary;
}

export function PmVarianceTab({ projectsWithTimeVariance, person }: Props): JSX.Element {
  return (
    <SectionCard title="Time Variance" collapsible>
      <AnomalyPanel
        items={projectsWithTimeVariance.map((item) => ({
          message: item.detail,
          person: { displayName: person.displayName, id: person.id },
          project: { id: item.projectId, name: item.projectName, projectCode: item.projectCode },
          type: item.reason,
        }))}
      />
    </SectionCard>
  );
}
