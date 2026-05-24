/**
 * FE-#314 — role-aware home payload.
 *
 * One endpoint, one request, role-specific shape. FE dispatches on
 * `homeKind` to render the right cards inside the WorkspaceShell
 * Overview tab. BE owns the role-priority logic so the FE never has
 * to ask "what's my top role".
 */
export type MeHomeKind =
  | 'employee'
  | 'pm'
  | 'rm'
  | 'hr'
  | 'dm'
  | 'director'
  | 'admin';

export interface MeHomeResponseDto {
  homeKind: MeHomeKind;
  /** Shape varies by homeKind; see each role-dashboard service's response DTO. */
  payload: unknown;
}
