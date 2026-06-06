import { useEffect, useState } from 'react';

import { fetchClients, type ClientDto } from '@/lib/api/clients';
import { FormField, Select } from '@/components/ds';

interface ClientSelectProps {
  id?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}

/**
 * V2 W1-18 — token-driven Client picker shaped after PersonSelect /
 * ProjectSelect. Replaces raw UUID Input fields on admin surfaces
 * (RateCardsAdminPage, etc.). Value remains the client uuid so callers
 * forwarding it to the BE keep working without an API contract change.
 */
export function ClientSelect({
  id,
  label,
  onChange,
  placeholder,
  required,
  value,
}: ClientSelectProps): JSX.Element {
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    void fetchClients(true)
      .then((items) => {
        if (active) setClients(items);
      })
      .catch(() => {
        // silently ignore; user sees the disabled select
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <FormField label={label} required={required} id={id}>
      {(props) => (
        <Select
          disabled={isLoading}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          value={value}
          {...props}
        >
          <option value="">
            {isLoading ? 'Loading…' : placeholder ?? 'Tenant default (no client)'}
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  );
}
