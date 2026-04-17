/**
 * Generate a JQL string from current filter state (reverse direction).
 * This enables bidirectional sync: visual filters ↔ JQL bar.
 */
export function filtersToJql(filters: Record<string, string>): string {
  const clauses: string[] = [];

  if (filters.kind) clauses.push(`kind = ${filters.kind}`);
  if (filters.person) clauses.push(`person ~ "${filters.person}"`);
  if (filters.project) clauses.push(`project ~ "${filters.project}"`);
  if (filters.status) {
    const statuses = filters.status.split(',').map((s) => s.trim());
    if (statuses.length === 1) clauses.push(`status = ${statuses[0]}`);
    else clauses.push(`status IN (${statuses.join(', ')})`);
  }
  if (filters.priority) {
    const priorities = filters.priority.split(',').map((s) => s.trim());
    if (priorities.length === 1) clauses.push(`priority = ${priorities[0]}`);
    else clauses.push(`priority IN (${priorities.join(', ')})`);
  }
  if (filters.role) clauses.push(`role ~ "${filters.role}"`);
  if (filters.skills) clauses.push(`skills ~ "${filters.skills}"`);
  if (filters.allocMin && filters.allocMax && filters.allocMin === filters.allocMax) {
    clauses.push(`allocation = ${filters.allocMin}`);
  } else {
    if (filters.allocMin) clauses.push(`allocation >= ${filters.allocMin}`);
    if (filters.allocMax) clauses.push(`allocation <= ${filters.allocMax}`);
  }
  if (filters.poolId) clauses.push(`pool = "${filters.poolId}"`);
  if (filters.orgUnitId) clauses.push(`orgUnit = "${filters.orgUnitId}"`);
  if (filters.from) clauses.push(`startDate >= ${filters.from}`);
  if (filters.to) clauses.push(`endDate <= ${filters.to}`);

  return clauses.join(' AND ');
}
