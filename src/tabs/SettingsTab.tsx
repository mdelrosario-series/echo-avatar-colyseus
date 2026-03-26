import { useState, useEffect } from 'react';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { Card } from '../components/Card';
import { usePreferences } from '../context/PreferencesContext';
import { useAudio } from '../audio';

export const SettingsTab: React.FC = () => {
  const { showNameTags, setShowNameTags, showMyNameTag, setShowMyNameTag, voiceVolume, setVoiceVolume } = usePreferences();
  const { 
    musicVolume, 
    sfxVolume, 
    isMuted, 
    setMusicVolume, 
    setSfxVolume, 
    toggleMute,
    playSfx 
  } = useAudio();
  const [userId, setUserId] = useState<string | null>(null);
  const [device, setDevice] = useState<ReturnType<typeof RundotGameAPI.system.getDevice> | null>(
    null,
  );
  const [environment, setEnvironment] = useState<ReturnType<
    typeof RundotGameAPI.system.getEnvironment
  > | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setDevice(RundotGameAPI.system.getDevice());
      setEnvironment(RundotGameAPI.system.getEnvironment());
      setUserId(RundotGameAPI.getProfile().id);
    } catch (error) {
      RundotGameAPI.error('[SettingsTab] Error loading SDK data:', error);
    }
  }, []);

  if (!device || !environment) {
    return (
      <Card title="Loading...">
        <p style={{ fontSize: '13px', textAlign: 'center' }}>Loading device info...</p>
      </Card>
    );
  }

  return (
    <>
      <Card title="Audio">
        <div className="info-item">
          <span className="info-label">Mute All:</span>
          <span
            className="info-value"
            onClick={toggleMute}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            {isMuted ? '🔇 Muted' : '🔊 On'}
          </span>
        </div>
        <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="info-label">Music Volume:</span>
            <span className="info-value">{Math.round(musicVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(musicVolume * 100)}
            onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
          />
        </div>
        <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="info-label">Voice Volume:</span>
            <span className="info-value">{Math.round(voiceVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(voiceVolume * 100)}
            onChange={(e) => setVoiceVolume(Number(e.target.value) / 100)}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
          />
        </div>
        <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="info-label">SFX Volume:</span>
            <span className="info-value">{Math.round(sfxVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(sfxVolume * 100)}
            onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
            onMouseUp={() => playSfx('ui')}
            onTouchEnd={() => playSfx('ui')}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
          />
        </div>
      </Card>

      <Card title="Display">
        <div className="info-item">
          <span className="info-label">My Name Tag:</span>
          <span
            className="info-value"
            onClick={() => setShowMyNameTag(!showMyNameTag)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            {showMyNameTag ? 'Visible' : 'Hidden'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Player Name Tags:</span>
          <span
            className="info-value"
            onClick={() => setShowNameTags(!showNameTags)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            {showNameTags ? 'Visible' : 'Hidden'}
          </span>
        </div>
      </Card>

      <Card title="Device Info">
        <div className="info-item">
          <span className="info-label">Platform:</span>
          <span className="info-value">{environment.platform}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Screen:</span>
          <span className="info-value">
            {device.screenSize.width} × {device.screenSize.height}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Orientation:</span>
          <span className="info-value">{device.orientation}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Haptics:</span>
          <span className="info-value">{device.hapticsEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </Card>

      <Card title="Environment">
        <div className="info-item">
          <span className="info-label">Mock Mode:</span>
          <span className="info-value">{RundotGameAPI.isMock() ? 'Yes' : 'No'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Development:</span>
          <span className="info-value">{environment.isDevelopment ? 'Yes' : 'No'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Platform Version:</span>
          <span className="info-value">{environment.platformVersion}</span>
        </div>
        <div className="info-item" style={{ position: 'relative' }}>
          <span className="info-label">Player ID:</span>
          <span
            className="info-value"
            onClick={() => {
              if (!userId) return;
              void navigator.clipboard.writeText(userId);
              setCopied(true);
              setTimeout(() => setCopied(false), 1000);
            }}
            style={{
              cursor: userId ? 'pointer' : 'default',
              fontFamily: 'monospace',
              userSelect: 'all',
            }}
            title="Click to copy"
          >
            {userId || 'N/A'}
          </span>
          {copied && (
            <span
              style={{
                position: 'absolute',
                right: 0,
                top: -20,
                background: 'rgba(0,0,0,0.85)',
                color: '#4ade80',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              Copied!
            </span>
          )}
        </div>
      </Card>
    </>
  );
};
