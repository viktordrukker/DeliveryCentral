import { Button } from '@/components/ds';

interface TabBarItem {
  id: string;
  label: string;
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
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
