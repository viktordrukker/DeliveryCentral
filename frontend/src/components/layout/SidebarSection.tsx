import { useState, PropsWithChildren } from 'react';

interface SidebarSectionProps {
  label: string;
  defaultOpen?: boolean;
}

export function SidebarSection({
  label,
  defaultOpen = true,
  children,
}: PropsWithChildren<SidebarSectionProps>): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="sidebar-section">
      <button
        aria-expanded={open}
        className="sidebar-section__header"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="sidebar-section__label">{label}</span>
        <span
          aria-hidden="true"
          className="sidebar-section__chevron"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>
      {open ? <div className="sidebar-section__content">{children}</div> : null}
    </div>
  );
}
