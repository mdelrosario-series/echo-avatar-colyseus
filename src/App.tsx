import { useState } from 'react';
import { TabBar } from './components/TabBar';
import { TAB_CONFIG, DEFAULT_TAB_ID, type TabId } from './tabs/tabConfig';
import { AvatarGlbProvider } from './context/AvatarGlbContext';
import { GameProvider } from './context/GameContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { ActiveTabContext } from './context/ActiveTabContext';
import { GlobalRoomProvider } from './multiplayer/global/useGlobalRoom';
import { AnimDeployHud } from './debug/AnimDeployHud';
import { GlobalRoomMembersUiGate } from './debug/GlobalRoomDebugOverlay';
import { AudioProvider, BackgroundMusicStarter } from './audio';
import './style.css';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB_ID);

  return (
    <PreferencesProvider>
    <AudioProvider>
    <GameProvider onAcceptInvite={() => setActiveTab('world')}>
      <GlobalRoomProvider>
        <AvatarGlbProvider switchToWorldTab={() => setActiveTab('world')} switchToAvatarTab={() => setActiveTab('avatar')}>
          <>
            <BackgroundMusicStarter />
            {/* Landscape Warning */}
            <div className="landscape-warning">
              <div className="landscape-warning-icon">📱</div>
              <h2>Portrait Mode Only</h2>
              <p>Please rotate your device to portrait orientation</p>
            </div>

            {/* Main App */}
            <div className="app-container">
              <div className="content-area">
                <ActiveTabContext.Provider value={activeTab}>
                  {TAB_CONFIG.map((tab) => (
                    <div
                      key={tab.id}
                      className="tab-content"
                      style={{ display: activeTab === tab.id ? undefined : 'none' }}
                    >
                      {tab.render()}
                    </div>
                  ))}
                </ActiveTabContext.Provider>
              </div>

              <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <AnimDeployHud />
            <GlobalRoomMembersUiGate />
          </>
        </AvatarGlbProvider>
      </GlobalRoomProvider>
    </GameProvider>
    </AudioProvider>
    </PreferencesProvider>
  );
}

export default App;
