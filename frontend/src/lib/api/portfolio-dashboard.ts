import { httpGet } from './http-client';

export interface PortfolioHeatmapRow {
  projectId: string;
  projectName: string;
  projectCode: string;
  engagementModel: string | null;
  priority: string | null;
  clientName: string | null;
  startsOn: string | null;
  endsOn: string | null;
  staffCount: number;
  plannedCount: number;
  currentFillRate: number;
  currentRag: 'GREEN' | 'AMBER' | 'RED';
  weekColumns: Array<{
    weekStart: string;
    projectedFillRate: number;
    staffedCount: number;
    rag: 'GREEN' | 'AMBER' | 'RED';
  }>;
}

export interface PortfolioHeatmapResponse {
  rows: PortfolioHeatmapRow[];
  weekHeaders: string[];
  summary: {
    totalProjects: number;
    greenCount: number;
    amberCount: number;
    redCount: number;
    totalPlannedHC: number;
    totalFilledHC: number;
    overallFillRate: number;
  };
}

export interface PortfolioSummaryResponse {
  totalProjects: number;
  byRag: { green: number; amber: number; red: number };
  totalInternalHC: number;
  totalVendorHC: number;
  totalOpenGaps: number;
  overallFillRate: number;
  benchSize: number;
}

export interface AvailablePoolPerson {
  id: string;
  displayName: string;
  currentAllocation: number;
  availableFrom: string | null;
  skills: string[];
  location: string | null;
}

export async function fetchPortfolioHeatmap(weeks = 8): Promise<PortfolioHeatmapResponse> {
  return httpGet<PortfolioHeatmapResponse>(`/dashboard/portfolio/heatmap?weeks=${weeks}`);
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummaryResponse> {
  return httpGet<PortfolioSummaryResponse>('/dashboard/portfolio/summary');
}

export async function fetchAvailablePool(): Promise<AvailablePoolPerson[]> {
  return httpGet<AvailablePoolPerson[]>('/dashboard/portfolio/available-pool');
}
