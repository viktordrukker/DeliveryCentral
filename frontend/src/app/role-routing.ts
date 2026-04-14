const ROLE_PRIORITY: string[] = [
  'admin',
  'director',
  'hr_manager',
  'resource_manager',
  'project_manager',
  'delivery_manager',
  'employee',
];

export function getDashboardPath(roles: string[]): string {
  const top = ROLE_PRIORITY.find((r) => roles.includes(r));

  switch (top) {
    case 'admin':
      return '/admin';
    case 'director':
      return '/dashboard/director';
    case 'hr_manager':
      return '/dashboard/hr';
    case 'resource_manager':
      return '/dashboard/resource-manager';
    case 'project_manager':
      return '/dashboard/project-manager';
    case 'delivery_manager':
      return '/dashboard/delivery-manager';
    default:
      return '/dashboard/employee';
  }
}
