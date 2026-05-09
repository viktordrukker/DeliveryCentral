import { httpPost } from './http-client';

// HD-8 / Chunk 8.4 — undo consume. Backend writes an UndoAction row when a
// destructive mutation succeeds; the response carries the row id as
// `undoActionId`. Calling this endpoint dispatches the registered executor
// (assignment.cancel, project.close, person.deactivate) which reverses
// the mutation atomically + chains a fresh audit row.

export interface UndoConsumeResponse {
  /** UndoAction row id — same value the FE just sent in. */
  id: string;
  /** Stable string identifying which executor ran. */
  actionType: string;
  /** ISO timestamp of when the row was consumed. */
  consumedAt: string;
}

export async function consumeUndoAction(undoActionId: string): Promise<UndoConsumeResponse> {
  return httpPost<UndoConsumeResponse, Record<string, never>>(
    `/undo/${undoActionId}/consume`,
    {},
  );
}
