import { useEffect, useState } from 'react';

import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionCard } from '@/components/common/SectionCard';
import { ProjectStatusReportView } from '@/components/projects/ProjectStatusReportView';
import type { ProjectDetails } from '@/lib/api/project-registry';
import { type ComputedRag, type RagSnapshotDto, type StaffingAlert, fetchComputedRag, fetchLatestRagSnapshot, fetchStaffingAlerts } from '@/lib/api/project-rag';
import { type StaffingSummary, fetchStaffingSummary } from '@/lib/api/project-role-plan';
import { type ProjectBudgetDashboard, fetchProjectBudgetDashboard } from '@/lib/api/project-budget';
import { type ProjectRiskDto, fetchRisks } from '@/lib/api/project-risks';
import { type ProjectVendorEngagementDto, fetchProjectVendors } from '@/lib/api/vendors';

interface ReportTabProps {
  project: ProjectDetails;
  projectId: string;
}

export function ReportTab({ project, projectId }: ReportTabProps): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [computed, setComputed] = useState<ComputedRag | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<RagSnapshotDto | null>(null);
  const [staffingSummary, setStaffingSummary] = useState<StaffingSummary | null>(null);
  const [alerts, setAlerts] = useState<StaffingAlert[]>([]);
  const [budgetDashboard, setBudgetDashboard] = useState<ProjectBudgetDashboard | null>(null);
  const [risks, setRisks] = useState<ProjectRiskDto[]>([]);
  const [vendorEngagements, setVendorEngagements] = useState<ProjectVendorEngagementDto[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void Promise.all([
      fetchComputedRag(projectId).catch(() => null),
      fetchLatestRagSnapshot(projectId).catch(() => null),
      fetchStaffingSummary(projectId).catch(() => null),
      fetchStaffingAlerts(projectId).catch(() => []),
      fetchProjectBudgetDashboard(projectId).catch(() => null),
      fetchRisks(projectId).catch(() => []),
      fetchProjectVendors(projectId).catch(() => []),
    ]).then(([comp, latest, summary, staffAlerts, budget, riskList, vendors]) => {
      if (!active) return;
      setComputed(comp);
      setLatestSnapshot(latest);
      setStaffingSummary(summary);
      setAlerts(staffAlerts as StaffingAlert[]);
      setBudgetDashboard(budget);
      setRisks(riskList as ProjectRiskDto[]);
      setVendorEngagements(vendors as ProjectVendorEngagementDto[]);
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'Failed to load report data.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [projectId]);

  if (loading) return <LoadingState label="Generating report..." variant="skeleton" skeletonType="detail" />;
  if (error) return <ErrorState description={error} />;

  return (
    <SectionCard title="PM Status Report">
      <ProjectStatusReportView
        project={project}
        computed={computed}
        latestSnapshot={latestSnapshot}
        staffingSummary={staffingSummary}
        alerts={alerts}
        budgetDashboard={budgetDashboard}
        risks={risks}
        vendorEngagements={vendorEngagements}
        dimensionDetails={latestSnapshot?.dimensionDetails ?? null}
      />
    </SectionCard>
  );
}
