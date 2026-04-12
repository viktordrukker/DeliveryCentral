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
        <button
          aria-selected={activeTab === tab.id}
          className={`tab-bar__tab${activeTab === tab.id ? ' tab-bar__tab--active' : ''}`}
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
