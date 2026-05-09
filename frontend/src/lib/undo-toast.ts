import { toast } from 'sonner';

import { consumeUndoAction } from './api/undo';

// HD-8 / Chunk 8.4 — `showUndoToast` is the single FE entry point for any
// destructive mutation that wants an Undo affordance.
//
// Pattern at the call site:
//   const result = await cancelAssignment(id, { reason });
//   showUndoToast({
//     undoActionId: result.undoActionId,
//     successMessage: 'Assignment cancelled.',
//     onUndone: () => refetch(),
//   });
//
// If `undoActionId` is null/undefined (legacy path or failed registration),
// only the success toast renders — no Undo button. The toast auto-dismisses
// after 5 s by default; clicking Undo within that window calls
// `POST /undo/:id/consume` and triggers `onUndone`.

interface ShowUndoToastArgs {
  undoActionId: string | null | undefined;
  successMessage: string;
  /** Fired after a successful consume; the caller refetches state here. */
  onUndone?: () => void | Promise<void>;
  /** Auto-dismiss window in ms. Default 5000 (matches plan). */
  durationMs?: number;
  /** Override the button label. Default 'Undo'. */
  undoLabel?: string;
}

export function showUndoToast({
  undoActionId,
  successMessage,
  onUndone,
  durationMs = 5000,
  undoLabel = 'Undo',
}: ShowUndoToastArgs): void {
  if (!undoActionId) {
    toast.success(successMessage);
    return;
  }

  toast.success(successMessage, {
    duration: durationMs,
    action: {
      label: undoLabel,
      onClick: () => {
        // Fire and forget; we report errors via a follow-up toast so the
        // sonner action button doesn't await — sonner closes the toast
        // synchronously on click.
        void (async () => {
          try {
            await consumeUndoAction(undoActionId);
            toast.success('Reverted.');
            if (onUndone) await onUndone();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Undo failed.';
            toast.error(msg);
          }
        })();
      },
    },
  });
}
