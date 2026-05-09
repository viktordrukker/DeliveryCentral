import { FormEvent, useEffect, useMemo, useState } from 'react';

import { ORG_DATA_CHANGED_EVENT } from '@/features/org-chart/useOrgChart';
import { EmployeeLifecycleFormValues } from '@/components/people/EmployeeLifecycleForm';
import {
  CreateEmployeeRequest,
  EmployeeLifecycleRecord,
  createEmployee,
  fetchPersonDirectory,
} from '@/lib/api/person-directory';
import {
  MetadataDictionaryDetails,
  fetchMetadataDictionaries,
  fetchMetadataDictionaryById,
} from '@/lib/api/metadata';
import { OrgChartNode, fetchOrgChart } from '@/lib/api/org-chart';
import { Skill, fetchSkills, upsertPersonSkills } from '@/lib/api/skills';

interface SelectOption {
  label: string;
  meta?: string;
  value: string;
}

interface EmployeeLifecycleAdminState {
  createdEmployee: EmployeeLifecycleRecord | null;
  error: string | null;
  errors: Partial<Record<keyof EmployeeLifecycleFormValues, string>>;
  gradeOptions: SelectOption[];
  handleChange: (field: keyof EmployeeLifecycleFormValues, value: string | string[]) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<EmployeeLifecycleRecord | null>;
  isLoading: boolean;
  isSubmitting: boolean;
  managerOptions: SelectOption[];
  orgUnitOptions: SelectOption[];
  roleOptions: SelectOption[];
  skillOptions: SelectOption[];
  successMessage: string | null;
  values: EmployeeLifecycleFormValues;
}

export const initialEmployeeLifecycleFormValues: EmployeeLifecycleFormValues = {
  email: '',
  grade: '',
  hireDate: '',
  jobTitle: '',
  lineManagerId: '',
  location: '',
  name: '',
  orgUnitId: '',
  role: '',
  skillIds: [],
};

const DEFAULT_NEW_HIRE_PROFICIENCY = 3;

export function useEmployeeLifecycleAdmin(): EmployeeLifecycleAdminState {
  const [values, setValues] = useState(initialEmployeeLifecycleFormValues);
  const [orgUnitOptions, setOrgUnitOptions] = useState<SelectOption[]>([]);
  const [managerOptions, setManagerOptions] = useState<SelectOption[]>([]);
  const [gradeDictionary, setGradeDictionary] = useState<MetadataDictionaryDetails | null>(null);
  const [roleDictionary, setRoleDictionary] = useState<MetadataDictionaryDetails | null>(null);
  const [skillCatalog, setSkillCatalog] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdEmployee, setCreatedEmployee] = useState<EmployeeLifecycleRecord | null>(null);
  const [errors, setErrors] =
    useState<Partial<Record<keyof EmployeeLifecycleFormValues, string>>>({});

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void Promise.all([
      fetchOrgChart(),
      fetchMetadataDictionaries({ entityType: 'Person' }),
      fetchPersonDirectory({ pageSize: 500 }),
      fetchSkills(),
    ])
      .then(async ([orgChartResponse, dictionariesResponse, peopleResponse, skillsResponse]) => {
        if (!isMounted) {
          return;
        }

        setOrgUnitOptions(flattenOrgUnits(orgChartResponse.roots));
        setManagerOptions(
          peopleResponse.items.map((p) => ({ label: p.displayName, value: p.id })),
        );
        setSkillCatalog(skillsResponse);

        const supportedDictionaries = dictionariesResponse.items.filter((item) =>
          ['grade', 'role'].includes(item.dictionaryKey),
        );
        const details = await Promise.all(
          supportedDictionaries.map((item) => fetchMetadataDictionaryById(item.id)),
        );

        if (!isMounted) {
          return;
        }

        setGradeDictionary(details.find((item) => item.dictionaryKey === 'grade') ?? null);
        setRoleDictionary(details.find((item) => item.dictionaryKey === 'role') ?? null);
      })
      .catch((reason: Error) => {
        if (isMounted) {
          setError(reason.message);
        }
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

  const gradeOptions = useMemo(
    () => toDictionaryOptions(gradeDictionary),
    [gradeDictionary],
  );
  const roleOptions = useMemo(() => {
    const fromDict = toDictionaryOptions(roleDictionary);
    if (fromDict.length > 0) return fromDict;
    return RBAC_ROLES;
  }, [roleDictionary]);
  const skillOptions = useMemo<SelectOption[]>(
    () =>
      skillCatalog
        .map((skill) => ({
          label: skill.name,
          meta: skill.category ?? undefined,
          value: skill.id,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [skillCatalog],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<EmployeeLifecycleRecord | null> {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    setIsSubmitting(true);

    try {
      const request: CreateEmployeeRequest = {
        email: values.email.trim(),
        ...(values.grade ? { grade: values.grade } : {}),
        ...(values.hireDate ? { hireDate: values.hireDate } : {}),
        ...(values.jobTitle ? { jobTitle: values.jobTitle.trim() } : {}),
        ...(values.lineManagerId ? { lineManagerId: values.lineManagerId } : {}),
        ...(values.location ? { location: values.location.trim() } : {}),
        name: values.name.trim(),
        orgUnitId: values.orgUnitId,
        ...(values.role ? { role: values.role } : {}),
      };

      const created = await createEmployee(request);

      // Persist picked skills as PersonSkill rows. Failure here is non-fatal:
      // the employee is created; we surface a warning in the success message.
      // (The transactional outbox + $transaction wrap that would make this
      // atomic is HD-0.2 / HD-0.3 — a separate task.)
      let skillNote = '';
      if (values.skillIds.length > 0) {
        try {
          await upsertPersonSkills(
            created.id,
            values.skillIds.map((skillId) => ({
              skillId,
              proficiency: DEFAULT_NEW_HIRE_PROFICIENCY,
              certified: false,
            })),
          );
        } catch (skillError) {
          skillNote =
            ' (warning: skills could not be saved — open the employee Skills tab to retry)';
          // Surface in console for diagnostics; success path still continues.
          // eslint-disable-next-line no-console
          console.warn('upsertPersonSkills failed after createEmployee', skillError);
        }
      }

      setCreatedEmployee(created);
      setSuccessMessage(
        `Created employee ${created.name} with status ${created.status}.${skillNote}`,
      );
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      setValues(initialEmployeeLifecycleFormValues);
      setErrors({});
      return created;
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to create employee.',
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    createdEmployee,
    error,
    errors,
    gradeOptions,
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
    isLoading,
    isSubmitting,
    managerOptions,
    orgUnitOptions,
    roleOptions,
    skillOptions,
    successMessage,
    values,
  };
}

function validate(
  values: EmployeeLifecycleFormValues,
): Partial<Record<keyof EmployeeLifecycleFormValues, string>> {
  const result: Partial<Record<keyof EmployeeLifecycleFormValues, string>> = {};

  if (values.name.trim().length === 0) {
    result.name = 'Name is required.';
  }

  if (values.email.trim().length === 0) {
    result.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    result.email = 'Email must be valid.';
  }

  if (values.orgUnitId.trim().length === 0) {
    result.orgUnitId = 'Org unit is required.';
  }

  return result;
}

function flattenOrgUnits(roots: OrgChartNode[]): SelectOption[] {
  const flattened = roots.flatMap((root) => flattenNode(root));
  const unique = new Map<string, SelectOption>();

  flattened.forEach((node) => {
    if (!unique.has(node.id)) {
      unique.set(node.id, {
        label: node.name,
        meta: node.code,
        value: node.id,
      });
    }
  });

  return Array.from(unique.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function flattenNode(node: OrgChartNode): OrgChartNode[] {
  return [node, ...node.children.flatMap((child) => flattenNode(child))];
}

const RBAC_ROLES: SelectOption[] = [
  { label: 'Employee', value: 'employee' },
  { label: 'Project Manager', value: 'project_manager' },
  { label: 'Resource Manager', value: 'resource_manager' },
  { label: 'HR Manager', value: 'hr_manager' },
  { label: 'Delivery Manager', value: 'delivery_manager' },
  { label: 'Director', value: 'director' },
  { label: 'Admin', value: 'admin' },
];

function toDictionaryOptions(dictionary: MetadataDictionaryDetails | null): SelectOption[] {
  return (
    dictionary?.entries
      .filter((entry) => entry.isEnabled)
      .map((entry) => ({
        label: entry.displayName,
        value: entry.entryValue,
      })) ?? []
  );
}
