import type { ReactNode } from 'react';

import { Button } from '@/components/ds';

interface TabBarItem {
  id: string;
  /** V2-B.2 — widened to ReactNode so consumers can compose count badges into
   * the tab label (e.g. `<>Bench <span>(12)</span></>`). Backward-compatible:
   * string is a valid ReactNode, so all existing string-label callers are
   * untouched. */
  label: ReactNode;
}

interface TabBarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: TabBarItem[];
}

export function TabBar({ activeTab, onTabChange, tabs }: TabBarProps): JSX.Element {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab) => (
        <Button
          aria-selected={activeTab === tab.id}
          variant={activeTab === tab.id ? 'primary' : 'secondary'}
          size="sm"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          type="button"
          data-testid={`tab-${tab.id}`}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
