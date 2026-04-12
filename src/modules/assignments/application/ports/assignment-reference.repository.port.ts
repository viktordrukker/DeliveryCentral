export interface AssignmentReferenceRepositoryPort {
  personIsActive(personId: string): Promise<boolean>;
  personExists(personId: string): Promise<boolean>;
  projectExists(projectId: string): Promise<boolean>;
}
