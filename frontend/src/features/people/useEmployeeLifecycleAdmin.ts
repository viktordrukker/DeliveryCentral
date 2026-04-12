import { FormEvent, useEffect, useMemo, useState } from 'react';

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
  skillsetOptions: SelectOption[];
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
  skillsets: [],
};

export function useEmployeeLifecycleAdmin(): EmployeeLifecycleAdminState {
  const [values, setValues] = useState(initialEmployeeLifecycleFormValues);
  const [orgUnitOptions, setOrgUnitOptions] = useState<SelectOption[]>([]);
  const [managerOptions, setManagerOptions] = useState<SelectOption[]>([]);
  const [gradeDictionary, setGradeDictionary] = useState<MetadataDictionaryDetails | null>(null);
  const [roleDictionary, setRoleDictionary] = useState<MetadataDictionaryDetails | null>(null);
  const [skillsetDictionary, setSkillsetDictionary] = useState<MetadataDictionaryDetails | null>(null);
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
    ])
      .then(async ([orgChartResponse, dictionariesResponse, peopleResponse]) => {
        if (!isMounted) {
          return;
        }

        setOrgUnitOptions(flattenOrgUnits(orgChartResponse.roots));
        setManagerOptions(
          peopleResponse.items.map((p) => ({ label: p.displayName, value: p.id })),
        );

        const supportedDictionaries = dictionariesResponse.items.filter((item) =>
          ['grade', 'role', 'skillset'].includes(item.dictionaryKey),
        );
        const details = await Promise.all(
          supportedDictionaries.map((item) => fetchMetadataDictionaryById(item.id)),
        );

        if (!isMounted) {
          return;
        }

        setGradeDictionary(details.find((item) => item.dictionaryKey === 'grade') ?? null);
        setRoleDictionary(details.find((item) => item.dictionaryKey === 'role') ?? null);
        setSkillsetDictionary(details.find((item) => item.dictionaryKey === 'skillset') ?? null);
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
  const skillsetOptions = useMemo(
    () => toDictionaryOptions(skillsetDictionary),
    [skillsetDictionary],
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
        ...(values.skillsets.length > 0 ? { skillsets: values.skillsets } : {}),
      };

      const created = await createEmployee(request);
      setCreatedEmployee(created);
      setSuccessMessage(`Created employee ${created.name} with status ${created.status}.`);
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
    skillsetOptions,
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
