import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/common/SectionCard';

/**
 * /me?tab=projects — placeholder for the My Memberships table.
 *
 * Final design (employee-workspace amendment surface #3) ships in
 * ds-trunk-7: DataTable with columns Project / Role / Allocation% / Start /
 * End / Status / Manager; section break for historical assignments;
 * empty-state CTA to message RM.
 *
 * For now: empty-state pointer to the existing assignments list.
 */
export function ProjectsTab(): JSX.Element {
  const navigate = useNavigate();
  return (
    <SectionCard title="My memberships">
      <EmptyState
        title="My-memberships view coming soon"
        description="The full project membership table ships in the next workspace phase. For now, see your assignments via the legacy route."
        actions={[
          { label: 'View assignments', onClick: () => navigate('/assignments'), variant: 'primary' },
        ]}
      />
    </SectionCard>
  );
}
