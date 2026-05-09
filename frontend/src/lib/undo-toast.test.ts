import { toast } from 'sonner';
import { vi } from 'vitest';

import { consumeUndoAction } from './api/undo';
import { showUndoToast } from './undo-toast';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./api/undo', () => ({
  consumeUndoAction: vi.fn(),
}));

const mockedSuccess = vi.mocked(toast.success);
const mockedError = vi.mocked(toast.error);
const mockedConsume = vi.mocked(consumeUndoAction);

describe('showUndoToast', () => {
  beforeEach(() => {
    mockedSuccess.mockReset();
    mockedError.mockReset();
    mockedConsume.mockReset();
  });

  it('renders only the success toast (no Undo) when undoActionId is undefined', () => {
    showUndoToast({ undoActionId: undefined, successMessage: 'Closed.' });
    expect(mockedSuccess).toHaveBeenCalledTimes(1);
    expect(mockedSuccess).toHaveBeenCalledWith('Closed.');
  });

  it('renders the success toast with an Undo action when undoActionId is present', () => {
    showUndoToast({ undoActionId: 'undo-1', successMessage: 'Closed.' });
    expect(mockedSuccess).toHaveBeenCalledTimes(1);
    const [message, opts] = mockedSuccess.mock.calls[0];
    expect(message).toBe('Closed.');
    expect(opts).toBeDefined();
    expect(opts?.action).toBeDefined();
    expect((opts?.action as { label: string }).label).toBe('Undo');
  });

  it('respects custom durationMs and undoLabel', () => {
    showUndoToast({
      undoActionId: 'undo-1',
      successMessage: 'Closed.',
      durationMs: 8000,
      undoLabel: 'Restore',
    });
    const [, opts] = mockedSuccess.mock.calls[0];
    expect(opts?.duration).toBe(8000);
    expect((opts?.action as { label: string }).label).toBe('Restore');
  });

  it('clicking Undo calls consumeUndoAction + onUndone + a follow-up success toast', async () => {
    mockedConsume.mockResolvedValue({
      id: 'undo-1',
      actionType: 'project.close',
      consumedAt: '2026-05-06T00:00:00Z',
    });
    const onUndone = vi.fn().mockResolvedValue(undefined);

    showUndoToast({ undoActionId: 'undo-1', successMessage: 'Closed.', onUndone });
    const [, opts] = mockedSuccess.mock.calls[0];
    const action = opts?.action as {
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    };

    action.onClick({} as React.MouseEvent<HTMLButtonElement>);
    // wait a microtask for the inner async IIFE
    await new Promise((r) => setTimeout(r, 0));

    expect(mockedConsume).toHaveBeenCalledWith('undo-1');
    expect(onUndone).toHaveBeenCalledTimes(1);
    expect(mockedSuccess).toHaveBeenCalledWith('Reverted.');
  });

  it('clicking Undo surfaces an error toast when consume rejects', async () => {
    mockedConsume.mockRejectedValue(new Error('Token expired.'));

    showUndoToast({ undoActionId: 'undo-1', successMessage: 'Closed.' });
    const [, opts] = mockedSuccess.mock.calls[0];
    const action = opts?.action as {
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    };
    action.onClick({} as React.MouseEvent<HTMLButtonElement>);
    await new Promise((r) => setTimeout(r, 0));

    expect(mockedConsume).toHaveBeenCalledWith('undo-1');
    expect(mockedError).toHaveBeenCalledWith('Token expired.');
  });

  it('skips Undo + onUndone when undoActionId is null', () => {
    const onUndone = vi.fn();
    showUndoToast({ undoActionId: null, successMessage: 'Closed.', onUndone });
    expect(mockedSuccess).toHaveBeenCalledTimes(1);
    expect(mockedSuccess).toHaveBeenCalledWith('Closed.');
    expect(onUndone).not.toHaveBeenCalled();
  });
});
