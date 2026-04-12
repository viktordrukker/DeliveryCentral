import { ExceptionCategory, ExceptionStatusFilter } from '@/lib/api/exceptions';

interface ExceptionQueueFiltersProps {
  isLoading: boolean;
  onCategoryChange: (value: '' | ExceptionCategory) => void;
  onProviderChange: (value: '' | 'm365' | 'radius') => void;
  onStatusFilterChange: (value: ExceptionStatusFilter) => void;
  onTargetEntityIdChange: (value: string) => void;
  onAsOfChange: (value: string) => void;
  values: {
    asOf: string;
    category: '' | ExceptionCategory;
    provider: '' | 'm365' | 'radius';
    statusFilter: ExceptionStatusFilter;
    targetEntityId: string;
  };
}

const categoryOptions: Array<{ label: string; value: '' | ExceptionCategory }> = [
  { label: 'All categories', value: '' },
  { label: 'Assignment without evidence', value: 'ASSIGNMENT_WITHOUT_EVIDENCE' },
  { label: 'Work evidence without assignment', value: 'WORK_EVIDENCE_WITHOUT_ASSIGNMENT' },
  { label: 'Work evidence after assignment end', value: 'WORK_EVIDENCE_AFTER_ASSIGNMENT_END' },
  { label: 'Project closure conflict', value: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS' },
  { label: 'Stale assignment approval', value: 'STALE_ASSIGNMENT_APPROVAL' },
  { label: 'M365 reconciliation anomaly', value: 'M365_RECONCILIATION_ANOMALY' },
  { label: 'RADIUS reconciliation anomaly', value: 'RADIUS_RECONCILIATION_ANOMALY' },
];

export function ExceptionQueueFilters({
  isLoading,
  onAsOfChange,
  onCategoryChange,
  onProviderChange,
  onStatusFilterChange,
  onTargetEntityIdChange,
  values,
}: ExceptionQueueFiltersProps): JSX.Element {
  return (
    <>
      <label className="field">
        <span className="field__label">Status</span>
        <select
          className="field__control"
          disabled={isLoading}
          onChange={(event) => onStatusFilterChange(event.target.value as ExceptionStatusFilter)}
          value={values.statusFilter}
        >
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="SUPPRESSED">Suppressed</option>
        </select>
      </label>

      <label className="field">
        <span className="field__label">Category</span>
        <select
          className="field__control"
          disabled={isLoading}
          onChange={(event) => onCategoryChange(event.target.value as '' | ExceptionCategory)}
          value={values.category}
        >
          {categoryOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">Provider</span>
        <select
          className="field__control"
          disabled={isLoading}
          onChange={(event) => onProviderChange(event.target.value as '' | 'm365' | 'radius')}
          value={values.provider}
        >
          <option value="">All providers</option>
          <option value="m365">M365</option>
          <option value="radius">RADIUS</option>
        </select>
      </label>

      <label className="field">
        <span className="field__label">Target Entity Id</span>
        <input
          className="field__control"
          disabled={isLoading}
          onChange={(event) => onTargetEntityIdChange(event.target.value)}
          placeholder="Filter by assignment, project, work evidence, or external id"
          type="search"
          value={values.targetEntityId}
        />
      </label>

      <label className="field">
        <span className="field__label">As Of</span>
        <input
          className="field__control"
          disabled={isLoading}
          onChange={(event) => onAsOfChange(event.target.value)}
          type="datetime-local"
          value={toLocalInputValue(values.asOf)}
        />
      </label>
    </>
  );
}

function toLocalInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

