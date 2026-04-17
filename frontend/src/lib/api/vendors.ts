import { httpGet, httpPatch, httpPost } from './http-client';

export interface VendorDto {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contractType: string;
  skillAreas: string[];
  notes: string | null;
  isActive: boolean;
  engagementCount: number;
}

export interface CreateVendorRequest {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contractType?: string;
  skillAreas?: string[];
  notes?: string;
}

export interface UpdateVendorRequest {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contractType?: string;
  skillAreas?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface ProjectVendorEngagementDto {
  id: string;
  projectId: string;
  vendorId: string;
  vendorName: string;
  roleSummary: string;
  headcount: number;
  monthlyRate: number | null;
  blendedDayRate: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  notes: string | null;
}

export interface CreateVendorEngagementRequest {
  vendorId: string;
  roleSummary: string;
  headcount?: number;
  monthlyRate?: number;
  blendedDayRate?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export async function fetchVendors(activeOnly = true): Promise<VendorDto[]> {
  return httpGet<VendorDto[]>(`/vendors?activeOnly=${activeOnly}`);
}

export async function fetchVendorById(id: string): Promise<VendorDto> {
  return httpGet<VendorDto>(`/vendors/${id}`);
}

export async function createVendor(data: CreateVendorRequest): Promise<VendorDto> {
  return httpPost<VendorDto, CreateVendorRequest>('/vendors', data);
}

export async function updateVendor(id: string, data: UpdateVendorRequest): Promise<VendorDto> {
  return httpPatch<VendorDto, UpdateVendorRequest>(`/vendors/${id}`, data);
}

export async function fetchProjectVendors(projectId: string): Promise<ProjectVendorEngagementDto[]> {
  return httpGet<ProjectVendorEngagementDto[]>(`/projects/${projectId}/vendors`);
}

export async function assignVendorToProject(projectId: string, data: CreateVendorEngagementRequest): Promise<ProjectVendorEngagementDto> {
  return httpPost<ProjectVendorEngagementDto, CreateVendorEngagementRequest>(`/projects/${projectId}/vendors`, data);
}

export async function updateVendorEngagement(projectId: string, engagementId: string, data: Partial<CreateVendorEngagementRequest>): Promise<ProjectVendorEngagementDto> {
  return httpPatch<ProjectVendorEngagementDto, Partial<CreateVendorEngagementRequest>>(`/projects/${projectId}/vendors/${engagementId}`, data);
}

export async function endVendorEngagement(projectId: string, engagementId: string, status?: 'COMPLETED' | 'TERMINATED'): Promise<ProjectVendorEngagementDto> {
  return httpPost<ProjectVendorEngagementDto, { status?: string }>(`/projects/${projectId}/vendors/${engagementId}/end`, { status });
}
