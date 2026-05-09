import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  PersonDirectoryItem,
  fetchPersonDirectory,
} from '@/lib/api/person-directory';
import {
  CreateReportingLineRequest,
  ReportingLineRecord,
  createReportingLine,
} from '@/lib/api/reporting-lines';
import { ReportingLineFormValues } from '@/components/people/ReportingLineForm';

interface SelectOption {
  label: string;
  meta?: string;
  value: string;
}

interface ReportingLineManagementState {
  error: string | null;
  errors: Partial<Record<keyof ReportingLineFormValues, string>>;
  handleChange: (field: keyof ReportingLineFormValues, value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoadingManagers: boolean;
  isSubmitting: boolean;
  lastCreatedReportingLine: ReportingLineRecord | null;
  managerOptions: SelectOption[];
  successMessage: string | null;
  values: ReportingLineFormValues;
}

/**
 * Default the start date to today (UTC) so a typical "assign now" save
 * doesn't silently land as a future-dated row that the resolver excludes
 * from `currentLineManager`. Past confusion: an empty default + a
 * tomorrow-pick produced a `validFrom > now()` row, so the page header
 * kept showing "No line manager assigned" even after a successful save.
 */
function todayUtcIsoDate(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildInitialValues(): ReportingLineFormValues {
  return {
    endDate: '',
    managerId: '',
    startDate: todayUtcIsoDate(),
    type: 'SOLID',
  };
}

export function useReportingLineManagement(
  personId?: string,
): ReportingLineManagementState {
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [values, setValues] = useState<ReportingLineFormValues>(buildInitialValues());
  const [errors, setErrors] =
    useState<Partial<Record<keyof ReportingLineFormValues, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoadingManagers, setIsLoadingManagers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedReportingLine, setLastCreatedReportingLine] =
    useState<ReportingLineRecord | null>(null);

  useEffect(() => {
    let active = true;

    setIsLoadingManagers(true);
    setError(null);

    // pageSize=500 mirrors the Create-Employee form. The IT-Company seed
    // has 200 people; pageSize=100 would silently drop managers from
    // page 2 of the directory and the dropdown wouldn't include them.
    void fetchPersonDirectory({ page: 1, pageSize: 500 })
      .then((response) => {
        if (!active) {
          return;
        }

        setPeople(response.items);
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }

        setError(
          reason instanceof Error ? reason.message : 'Failed to load manager options.',
        );
      })
      .finally(() => {
        if (active) {
          setIsLoadingManagers(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const managerOptions = useMemo(
    () =>
      people
        .filter((person) => person.id !== personId)
        .map((person) => ({
          label: person.displayName,
          meta: person.currentOrgUnit?.name ?? undefined,
          value: person.id,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [people, personId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const nextErrors = validate(values, personId);
    setErrors(nextErrors);
    setError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0 || !personId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const request: CreateReportingLineRequest = {
        managerId: values.managerId,
        personId,
        startDate: toIsoDate(values.startDate),
        type: values.type,
        ...(values.endDate ? { endDate: toIsoDate(values.endDate) } : {}),
      };

      const created = await createReportingLine(request);
      const managerLabel =
        managerOptions.find((option) => option.value === created.managerId)?.label ??
        'selected manager';
      const startDateLabel = values.startDate;
      const isFutureDated = new Date(`${values.startDate}T00:00:00.000Z`) > startOfTodayUtc();

      setLastCreatedReportingLine(created);
      setSuccessMessage(
        isFutureDated
          ? `Scheduled ${managerLabel} as line manager effective ${startDateLabel}.`
          : `Assigned ${managerLabel} as line manager effective ${startDateLabel}.`,
      );
      setValues(buildInitialValues());
      setErrors({});
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to save reporting line.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    error,
    errors,
    handleChange: (field, value) => {
      setValues((current) => ({
        ...current,
        [field]: value,
      }));
      setErrors((current) => ({
        ...current,
        [field]: undefined,
      }));
      setSuccessMessage(null);
    },
    handleSubmit,
    isLoadingManagers,
    isSubmitting,
    lastCreatedReportingLine,
    managerOptions,
    successMessage,
    values,
  };
}

function validate(
  values: ReportingLineFormValues,
  personId?: string,
): Partial<Record<keyof ReportingLineFormValues, string>> {
  const result: Partial<Record<keyof ReportingLineFormValues, string>> = {};

  if (!values.managerId) {
    result.managerId = 'Manager is required.';
  } else if (values.managerId === personId) {
    result.managerId = 'Employee cannot report to themselves.';
  }

  if (!values.startDate) {
    result.startDate = 'Start date is required.';
  } else if (Number.isNaN(Date.parse(values.startDate))) {
    result.startDate = 'Start date must be valid.';
  }

  if (values.endDate) {
    if (Number.isNaN(Date.parse(values.endDate))) {
      result.endDate = 'End date must be valid.';
    } else if (
      values.startDate &&
      !Number.isNaN(Date.parse(values.startDate)) &&
      new Date(values.endDate) < new Date(values.startDate)
    ) {
      result.endDate = 'End date cannot be earlier than start date.';
    }
  }

  return result;
}

function toIsoDate(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
