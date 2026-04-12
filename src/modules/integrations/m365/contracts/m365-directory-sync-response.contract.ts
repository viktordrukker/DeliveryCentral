export interface M365DirectorySyncResponseDto {
  employeesCreated: number;
  employeesLinked: number;
  managerMappingsResolved: number;
  syncedPersonIds: string[];
}
