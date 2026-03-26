import { useEffect } from 'react';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { TAB_CONFIG, type TabId } from '../tabs/tabConfig';
import { playUiClick } from '../audio';

/** Approximate tab bar content height (icon + label + padding) without safe area */
const TAB_BAR_CONTENT_HEIGHT = 64;

interface TabBarProps {
  /**
   * Currently active tab ID
   */
  activeTab: TabId;
  /**
   * Callback when tab is changed
   */
  onTabChange: (tabId: TabId) => void;
}

/**
 * Bottom navigation tab bar component (always visible)
 */
export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const safeArea = RundotGameAPI.system.getSafeArea();
  const totalBottom = TAB_BAR_CONTENT_HEIGHT + safeArea.bottom;

  useEffect(() => {
    document.documentElement.style.setProperty('--tab-bar-height', `${totalBottom}px`);
  }, [totalBottom]);

  return (
    <div className="tab-bar" style={{ paddingBottom: `${safeArea.bottom}px` }}>
      {TAB_CONFIG.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => {
            playUiClick();
            onTabChange(tab.id);
          }}
        >
          <div className="tab-icon">{tab.icon}</div>
          <div className="tab-label">{tab.label}</div>
        </button>
      ))}
    </div>
  );
};
