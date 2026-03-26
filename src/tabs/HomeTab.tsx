import { useRef, useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { LocalPlayer } from '../scene/LocalPlayer';
import { ThirdPersonCamera } from '../scene/ThirdPersonCamera';
import { EmoteMenuButton } from '../scene/EmoteMenuButton';
import { useMultiplayer } from '../multiplayer/useMultiplayer';
import { RemotePlayers } from '../scene/RemotePlayers';
import { ChatPanel } from '../ui/ChatPanel';
import { InviteModal } from '../ui/InviteModal';
import { InboxModal } from '../ui/InboxModal';
import { WorldHudTop } from '../ui/WorldHudTop';
import { KickPanel } from '../ui/KickPanel';
import { useAvatarGlb } from '../context/AvatarGlbContext';
import { useGlobalRoomContext } from '../multiplayer/global/useGlobalRoom';
import { useIsActiveTab } from '../context/ActiveTabContext';
import { WorldEnvironment } from '../world/WorldEnvironment';
import { HOME_ROOM_PRESET } from '../world/presets';
import { getAnimationClipNames, getAnimationUrls, getCdnUrl } from '../lib/cdnAssets';
import { MovementHud } from '../scene/MovementHud';
import { usePlayEmote } from '../hooks/usePlayEmote';
import { useVoiceChat } from '../voice/useVoiceChat';
import { VoiceMuteButton } from '../voice/VoiceMuteButton';
import { usePreferences } from '../context/PreferencesContext';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { GlbSceneDebugPanel } from '../debug/GlbSceneDebugPanel';
import {
  getGlbSceneDebugPanelVisible,
  subscribeGlbSceneDebugPanel,
} from '../debug/glbSceneDebug';

export const HomeTab: React.FC = () => {
  const { glbUrl } = useAvatarGlb();
  const { pendingInvites, acceptInvite, dismissInvite, sendInvite } = useGlobalRoomContext();
  const isActive = useIsActiveTab('home');
  const { voiceVolume, showMyNameTag } = usePreferences();
  const [myUsername, setMyUsername] = useState<string>('');
  useEffect(() => {
    const p = RundotGameAPI.getProfile();
    setMyUsername(p.username ?? '');
  }, []);
  const playerGroupRef = useRef<THREE.Group>(null!);
  const cameraYawRef = useRef(0);
  const joystickRef = useRef({ x: 0, y: 0 });
  const cameraJoystickRef = useRef({ x: 0, y: 0 });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentMovementAnimation, setCurrentMovementAnimation] = useState<string>('idle');
  const currentMovementAnimationRef = useRef(currentMovementAnimation);
  currentMovementAnimationRef.current = currentMovementAnimation;
  const [activeAnimation, setActiveAnimation] = useState<string | undefined>(undefined);
  const [useDebugAvatar, setUseDebugAvatar] = useState(false);
  const [debugGround, setDebugGround] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const glbDebugPanelVisible = useSyncExternalStore(
    subscribeGlbSceneDebugPanel,
    getGlbSceneDebugPanelVisible,
    getGlbSceneDebugPanelVisible,
  );
  const defaultAvatar = getCdnUrl('DEFAULT_AVATAR');
  const homeAnimUrls = useMemo(() => getAnimationUrls(), []);
  const homeClipNames = useMemo(() => getAnimationClipNames(), []);
  const effectiveGlbUrl = useDebugAvatar ? defaultAvatar : (glbUrl ?? defaultAvatar);

  // Ref keeps the current avatar URL available for eager send on connect
  const avatarUrlRef = useRef<string | null>(glbUrl ?? null);
  avatarUrlRef.current = glbUrl ?? null;

  const {
    isConnecting,
    isReconnecting,
    error,
    roomCode,
    playerCount,
    myProfileId,
    stableProfileId,
    remotePlayerIds,
    remotePlayerPositions,
    remotePlayerAvatarUrls,
    remotePlayerAnimations,
    remotePlayerNames,
    sendPosition,
    sendAvatar,
    sendAnimation,
    sendPosture,
    sendChat,
    kickPlayer,
    messages,
  } = useMultiplayer({ mode: 'create', roomType: 'player_room' }, avatarUrlRef);

  const { isMuted, toggleMute, speakingUsers, isConnected: voiceConnected } = useVoiceChat(
    isActive ? (roomCode ?? null) : null,
    myProfileId ?? null,
    voiceVolume,
  );

  const { playEmote, emoteRequest, onEmoteComplete } = usePlayEmote(
    sendAnimation,
    () => currentMovementAnimationRef.current,
  );

  // Broadcast avatar changes to room guests
  useEffect(() => {
    sendAvatar(glbUrl ?? null);
  }, [glbUrl, sendAvatar]);

  // Sync movement animation
  useEffect(() => {
    sendAnimation(currentMovementAnimation);
  }, [currentMovementAnimation, sendAnimation]);

  useEffect(() => {
    const map = remotePlayerPositions.current;
    const rawKeys = [...map.keys()];
    const filteredKeys = myProfileId
      ? rawKeys.filter((k) => String(k) !== String(myProfileId))
      : rawKeys;
    const listsAligned =
      filteredKeys.length === remotePlayerIds.length &&
      filteredKeys.every((k) => remotePlayerIds.includes(k));
    console.log('[test] HomeTab multiplayer snapshot', {
      isActive,
      isConnecting,
      isReconnecting,
      error: error ?? null,
      roomCode: roomCode ?? null,
      myProfileId: myProfileId || '(empty)',
      remotePlayerIds: [...remotePlayerIds],
      playerCount,
      rawMapSize: map.size,
      rawMapKeys: rawKeys,
      selfSessionInRawMap: Boolean(myProfileId && map.has(myProfileId)),
      listsAligned,
    });
  }, [
    isActive,
    isConnecting,
    isReconnecting,
    error,
    roomCode,
    myProfileId,
    remotePlayerIds.join('\0'),
    playerCount,
  ]);

  const stopProp = useCallback((e: React.PointerEvent) => e.stopPropagation(), []);

  return (
    <div className="world-tab-container" style={{ touchAction: 'none' }}>
      <Canvas
        frameloop={isActive ? 'always' : 'never'}
        camera={{ position: [0, 3.2, 5], fov: 60, near: 0.5 }}
        style={{ width: '100%', height: '100%' }}
      >
        <WorldEnvironment
          definition={HOME_ROOM_PRESET}
          environmentIndex={undefined}
          debugGround={debugGround}
        />
        <LocalPlayer
          debugHomeRoom
          playerGroupRef={playerGroupRef}
          cameraYawRef={cameraYawRef}
          joystickRef={joystickRef}
          onPositionUpdate={sendPosition}
          glbUrl={effectiveGlbUrl}
          animationUrls={homeAnimUrls}
          animationClipNames={homeClipNames}
          activeAnimation={activeAnimation}
          emoteRequest={emoteRequest}
          onEmoteComplete={onEmoteComplete}
          onAnimationChange={setCurrentMovementAnimation}
          sendPosture={sendPosture}
          sendAnimation={sendAnimation}
          isSpeaking={myProfileId ? speakingUsers.has(myProfileId) : false}
          username={myUsername}
          showNameTag={showMyNameTag}
          showSkeleton={showSkeleton}
        />
        <ThirdPersonCamera
          playerGroupRef={playerGroupRef}
          cameraYawRef={cameraYawRef}
          cameraJoystickRef={cameraJoystickRef}
        />
        <RemotePlayers
          debugHomeRoom
          playerIds={remotePlayerIds}
          positionsRef={remotePlayerPositions}
          avatarUrls={remotePlayerAvatarUrls}
          avatarActiveAnimations={remotePlayerAnimations}
          playerNames={remotePlayerNames}
          speakingUsers={speakingUsers}
          showSkeleton={showSkeleton}
        />
      </Canvas>

      {/* Top HUD */}
      <WorldHudTop
        roomName="My Home"
        ownerId={null}
        myPlayerId={myProfileId ?? ''}
        playerCount={playerCount}
        hasPendingInvite={pendingInvites.length > 0}
        onInvite={() => setInviteOpen((o) => !o)}
        onInbox={() => setInboxOpen((o) => !o)}
      />

      <MovementHud joystickRef={joystickRef} cameraJoystickRef={cameraJoystickRef} />
      {!chatOpen && <EmoteMenuButton playEmote={playEmote} />}

      {!chatOpen && (
        <VoiceMuteButton
          isMuted={isMuted}
          isConnected={voiceConnected}
          onToggle={toggleMute}
          style={{
            position: 'absolute',
            top: 'calc(184px + env(safe-area-inset-top, 0px))',
            right: 162,
            zIndex: 12,
          }}
        />
      )}

      {!chatOpen && <button
        style={{
          position: 'absolute',
          top: 'calc(184px + env(safe-area-inset-top, 0px))',
          right: 100,
          zIndex: 12,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          border: '2px solid rgba(255,255,255,0.25)',
          color: '#fff',
          fontSize: 22,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        onPointerDown={stopProp}
        onClick={() => setChatOpen((o) => !o)}
      >
        💬
      </button>}

      <ChatPanel
        messages={messages}
        onSend={sendChat}
        playerCount={playerCount}
        roomName="My Home"
        roomCode={roomCode}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      <KickPanel
        remotePlayerIds={remotePlayerIds}
        remotePlayerNames={remotePlayerNames}
        onKick={kickPlayer}
      />

      {/* Invite modal */}
      {inviteOpen && (
        <InviteModal
          roomCode={roomCode}
          playerId={stableProfileId}
          onSendInvite={sendInvite}
          onClose={() => setInviteOpen(false)}
        />
      )}

      {/* Inbox modal */}
      {inboxOpen && (
        <InboxModal
          invites={pendingInvites}
          onAccept={acceptInvite}
          onDismiss={dismissInvite}
          onClose={() => setInboxOpen(false)}
        />
      )}

      {(isConnecting || error) && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 11,
            color: error ? '#e74c3c' : 'rgba(255,255,255,0.5)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {error ?? (isReconnecting ? 'Reconnecting…' : 'Connecting to home…')}
        </div>
      )}

      <GlbSceneDebugPanel
        visible={glbDebugPanelVisible}
        debugOpen={debugOpen}
        onToggleOpen={() => setDebugOpen((o) => !o)}
        useDebugAvatar={useDebugAvatar}
        onUseDebugAvatar={setUseDebugAvatar}
        debugGround={debugGround}
        onDebugGround={setDebugGround}
        showSkeleton={showSkeleton}
        onShowSkeleton={setShowSkeleton}
        activeAnimation={activeAnimation}
        onSetActiveAnimation={setActiveAnimation}
      />
    </div>
  );
};
