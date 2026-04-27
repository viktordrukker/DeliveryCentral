import { useEffect } from 'react';

// FE-03: warns the user before they close/reload the tab while a form has
// unsaved changes. Wires the standard `beforeunload` event — the browser
// shows its native "Leave site?" prompt; the empty `returnValue` is what
// triggers it across modern browsers.
//
// In-app navigation (e.g., react-router <Link>) is intentionally NOT
// blocked here. Adding a router-level blocker would force every consumer
// to opt into a specific React Router data-router setup; the much smaller
// step is to warn on the cases where data is genuinely lost — closing the
// tab or hitting reload — and accept that users who click an in-app link
// have made a deliberate navigation choice.
export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;
    function handler(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
