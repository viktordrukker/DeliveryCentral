import { httpGet, httpPatch, httpPost } from './http-client';

export interface ClientDto {
  id: string;
  name: string;
  industry: string | null;
  accountManagerPersonId: string | null;
  accountManagerDisplayName: string | null;
  notes: string | null;
  isActive: boolean;
  projectCount: number;
}

export interface CreateClientRequest {
  name: string;
  industry?: string;
  accountManagerPersonId?: string;
  notes?: string;
}

export interface UpdateClientRequest {
  name?: string;
  industry?: string;
  accountManagerPersonId?: string;
  notes?: string;
  isActive?: boolean;
}

export async function fetchClients(activeOnly = true): Promise<ClientDto[]> {
  return httpGet<ClientDto[]>(`/clients?activeOnly=${activeOnly}`);
}

export async function fetchClientById(id: string): Promise<ClientDto> {
  return httpGet<ClientDto>(`/clients/${id}`);
}

export async function createClient(data: CreateClientRequest): Promise<ClientDto> {
  return httpPost<ClientDto, CreateClientRequest>('/clients', data);
}

export async function updateClient(id: string, data: UpdateClientRequest): Promise<ClientDto> {
  return httpPatch<ClientDto, UpdateClientRequest>(`/clients/${id}`, data);
}
