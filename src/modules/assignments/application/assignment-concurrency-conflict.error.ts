export class AssignmentConcurrencyConflictError extends Error {
  public constructor(message = 'Assignment was changed by another operation. Refresh and try again.') {
    super(message);
    this.name = 'AssignmentConcurrencyConflictError';
  }
}
