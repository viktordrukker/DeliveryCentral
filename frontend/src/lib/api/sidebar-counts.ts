import { httpGet } from './http-client';

/**
 * FE-309 — unified count badges for the v2 sidebar (DS/chrome.jsx nav counts).
 * Backed by `GET /api/me/sidebar-counts`. Out-of-scope counts return 0.
 */
export interface SidebarCounts {
  projects: number;
  approvals: number;
  bench: number;
  hrQueue: number;
}

export async function fetchSidebarCounts(): Promise<SidebarCounts> {
  return httpGet<SidebarCounts>('/me/sidebar-counts');
}
