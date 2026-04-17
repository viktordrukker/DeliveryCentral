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

export function ExceptionQueueFilters({
  isLoading,
  onAsOfChange,
  onCategoryChange,
  onProviderChange,
  onStatusFilterChange,
  onTargetEntityIdChange,
  values,
}: ExceptionQueueFiltersProps): JSX.Element {
  const categoryOptions = [
    { label: 'All categories', value: '' as '' | ExceptionCategory },
    { label: 'Project closure conflict', value: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS' as '' | ExceptionCategory },
    { label: 'Stale assignment approval', value: 'STALE_ASSIGNMENT_APPROVAL' as '' | ExceptionCategory },
  ];

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
        <span className="field__label">Target Entity Id</span>
        <input
          className="field__control"
          disabled={isLoading}
          onChange={(event) => onTargetEntityIdChange(event.target.value)}
          placeholder="Filter by assignment, project, or external id"
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
