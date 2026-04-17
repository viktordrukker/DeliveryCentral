export interface AssignmentReferenceRepositoryPort {
  personIsActive(personId: string): Promise<boolean>;
  personExists(personId: string): Promise<boolean>;
  projectExists(projectId: string): Promise<boolean>;
  projectEndDate?(projectId: string): Promise<Date | null>;
}
