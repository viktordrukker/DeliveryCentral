import { Button } from '@/components/ds';

interface SyncButtonProps {
  disabled?: boolean;
  isSyncing: boolean;
  label: string;
  onClick: () => void;
}

export function SyncButton({
  disabled,
  isSyncing,
  label,
  onClick,
}: SyncButtonProps): JSX.Element {
  return (
    <Button variant="primary" disabled={disabled || isSyncing} onClick={onClick} type="button">
      {isSyncing ? 'Syncing...' : label}
    </Button>
  );
}
