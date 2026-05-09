// HD-8 / Chunk 8.2 — public DTO returned by `POST /undo/:id/consume`.
export class UndoConsumeResponseDto {
  undoActionId!: string;
  actionType!: string;
  entityId!: string;
  // ISO timestamp the consume succeeded at.
  consumedAt!: string;
}
