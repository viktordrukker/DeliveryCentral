/**
 * DC Design System — Phase DS atom barrel.
 *
 * Import from `@/components/ds` in route code. ESLint guard rules (DS-7) will
 * forbid raw `<button>` / `<a className="button">` / `<input>` etc. in
 * `frontend/src/routes/**` once baselines are clear.
 */
export { ThemeProvider, useThemePreference } from './ThemeProvider';
export type { ThemePreference } from './ThemeProvider';

export { Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';

export { IconButton } from './IconButton';
export type { IconButtonSize } from './IconButton';

export { Link } from './Link';
export type { LinkSize } from './Link';

export { Input } from './Input';
export { Textarea } from './Textarea';
export { Select } from './Select';
export { Checkbox } from './Checkbox';
export { Radio } from './Radio';
export { Switch } from './Switch';

export { Spinner } from './Spinner';
export type { SpinnerSize } from './Spinner';

export { Skeleton } from './Skeleton';
export type { SkeletonShape } from './Skeleton';

// Phase DS-2 — surfaces.
export { Modal } from './Modal';
export type { ModalSize } from './Modal';

export { Drawer } from './Drawer';
export type { DrawerSide, DrawerWidth } from './Drawer';

export { Sheet } from './Sheet';

export { Popover } from './Popover';
export type { PopoverPlacement } from './Popover';

export { MenuPopover } from './MenuPopover';
export type { MenuItem } from './MenuPopover';

export { FormModal } from './FormModal';

// Phase DS-3 — form molecules.
export { FormField } from './FormField';
export { SearchInput } from './SearchInput';
export { DatePicker } from './DatePicker';
export { DateRangePicker } from './DateRangePicker';
export { CheckboxGroup } from './CheckboxGroup';
export { RadioGroup } from './RadioGroup';
export { Combobox } from './Combobox';
export type { ComboboxOption } from './Combobox';
export { MultiCombobox } from './MultiCombobox';

// Phase DS-4 — table primitive + compound DataView.
export { Table } from './Table';
export type { Column, ColumnEdit, FilterKind, TableVariant } from './Table';

export { EditableCell } from './EditableCell';

export { DescriptionList } from './DescriptionList';
export type { DescriptionListItem } from './DescriptionList';

export { DataView } from './DataView';
export type {
  DataViewMode,
  SortState,
  SortDirection,
  FilterState,
  PaginationState,
  BulkAction,
  RowAction,
} from './DataView';

export { Timeline } from './Timeline';
export type {
  TimelineSize,
  TimelineVariant,
  TimelineSegment,
  TimelineMarker,
  TimelineHoverContext,
  TimelineProps,
} from './Timeline';

// Phase WO-4 — workflow stage stepper.
export { WorkflowStages } from './WorkflowStages';
export type {
  WorkflowStage,
  WorkflowStageStatus,
  WorkflowStagesProps,
} from './WorkflowStages';

// Phase WO-4.11 — re-exports of common surfaces that already obey DS rules.
// Hosted under `@/components/common/*` for historical reasons; alias them here
// so route code can import everything from `@/components/ds`.
export { TabBar } from '@/components/common/TabBar';
export { Breadcrumb } from '@/components/common/Breadcrumb';
export { ConfirmDialog } from '@/components/common/ConfirmDialog';
