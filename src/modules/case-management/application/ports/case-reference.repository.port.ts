export interface CaseReferenceRepositoryPort {
  assignmentExists(assignmentId: string): Promise<boolean>;
  personExists(personId: string): Promise<boolean>;
  projectExists(projectId: string): Promise<boolean>;
}
