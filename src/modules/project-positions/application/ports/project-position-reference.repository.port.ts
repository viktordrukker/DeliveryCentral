/**
 * Reference repository — lightweight existence checks used by services to
 * validate referenced entities without pulling in their full repositories.
 *
 * Same pattern as `assignment-reference.repository.port.ts`.
 */
export interface ProjectPositionReferenceRepositoryPort {
  projectExists(projectId: string): Promise<boolean>;
  projectIsActive(projectId: string): Promise<boolean>;
  personExists(personId: string): Promise<boolean>;
  personIsActive(personId: string): Promise<boolean>;
}
