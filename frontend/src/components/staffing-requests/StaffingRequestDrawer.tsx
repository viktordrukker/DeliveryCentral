import { Drawer } from '@/components/ds';

import { StaffingRequestForm } from './StaffingRequestForm';
import { type StaffingRequestFormValues } from './staffing-request-form.validation';
import { type StaffingRequest } from '@/lib/api/staffing-requests';

interface StaffingRequestDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful create+submit so callers can toast / refetch. */
  onSubmitted: (request: StaffingRequest) => void;
  /** Pre-fill form values (e.g. project context from the page that opened the drawer). */
  initialValues?: Partial<StaffingRequestFormValues>;
}

/**
 * Inline drawer for creating a staffing request without leaving the host page.
 *
 * Used from:
 * - Project detail → Team tab (`projectId` pre-filled).
 * - Staffing Desk page header (no project pre-fill).
 *
 * Wraps the shared `<StaffingRequestForm>` so behavior matches `/staffing-requests/new`
 * exactly. The drawer skips the right-side preview pane that the page renders —
 * users who want a preview navigate to the page instead.
 */
export function StaffingRequestDrawer(props: StaffingRequestDrawerProps): JSX.Element | null {
  if (!props.open) return null;
  return <StaffingRequestDrawerInner {...props} />;
}

function StaffingRequestDrawerInner({
  open,
  onClose,
  onSubmitted,
  initialValues,
}: StaffingRequestDrawerProps): JSX.Element {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New staffing request"
      description="One request = one person. Fill the essentials, then submit."
      width="md"
      side="right"
    >
      <StaffingRequestForm
        mode="drawer"
        initialValues={initialValues}
        onSubmitted={(req) => {
          onSubmitted(req);
          onClose();
        }}
        onCancel={onClose}
      />
    </Drawer>
  );
}
