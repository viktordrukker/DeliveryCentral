export class ProjectLifecycleConflictError extends Error {
  public constructor(message = 'Project was changed by another operation. Refresh and try again.') {
    super(message);
    this.name = 'ProjectLifecycleConflictError';
  }
}
