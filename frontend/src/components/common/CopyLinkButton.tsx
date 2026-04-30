import { useState } from 'react';
import { Button } from '@/components/ds';

interface Props {
  label?: string;
  title?: string;
}

/**
 * Copies the current `window.location.href` (including query params) to the clipboard.
 * Consumer pages should source their filter state from `useSearchParams` or equivalent
 * so the URL represents a reproducible view.
 */
export function CopyLinkButton({ label = 'Copy link', title = 'Copy link to this view' }: Props): JSX.Element {
  const [copied, setCopied] = useState(false);

  function handleClick(): void {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleClick} title={title} type="button">
      {copied ? 'Copied \u2713' : label}
    </Button>
  );
}
