import { useRef, useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { LocalPlayer } from '../scene/LocalPlayer';
import { ThirdPersonCamera } from '../scene/ThirdPersonCamera';
import { EmoteMenuButton } from '../scene/EmoteMenuButton';
import { useMultiplayer } from '../multiplayer/useMultiplayer';
import type { UseMultiplayerOptions } from '../multiplayer/useMultiplayer';
import { RemotePlayers } from '../scene/RemotePlayers';
import { ChatPanel } from '../ui/ChatPanel';
import { RoomBrowser } from '../ui/RoomBrowser';
import { InviteModal } from '../ui/InviteModal';
import { InboxModal } from '../ui/InboxModal';
import { WorldHudTop } from '../ui/WorldHudTop';
import { useGlobalRoomContext } from '../multiplayer/global/useGlobalRoom';
import { useAvatarGlb } from '../context/AvatarGlbContext';
import { useIsActiveTab } from '../context/ActiveTabContext';
import { useGame } from '../context/GameContext';
import { WorldEnvironment } from '../world/WorldEnvironment';
import { OPEN_PLAZA_PRESET, HOME_ROOM_PRESET } from '../world/presets';
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

export const WorldTab: React.FC = () => {
  const { glbUrl } = useAvatarGlb();
  const isActive = useIsActiveTab('world');
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

  const { pendingGuestJoin, clearPendingGuestJoin } = useGame();
  const { pendingInvites, acceptInvite, dismissInvite, sendInvite } = useGlobalRoomContext();
  const [invitesPanelOpen, setInvitesPanelOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // null = show room browser, non-null = connected with these options
  const [joinOptions, setJoinOptions] = useState<UseMultiplayerOptions | null>(null);
  // Stores error text so the lobby can show it after auto-return
  const [lastJoinError, setLastJoinError] = useState<string | null>(null);
  /** Skips one "kicked → clear joinOptions" effect run right after we intentionally start a join. */
  const skipKickLobbyOnceRef = useRef(false);

  const [activeAnimation, setActiveAnimation] = useState<string | undefined>(undefined);
  const [currentMovementAnimation, setCurrentMovementAnimation] = useState<string>('idle');
  const currentMovementAnimationRef = useRef(currentMovementAnimation);
  currentMovementAnimationRef.current = currentMovementAnimation;
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
  const worldAnimUrls = useMemo(() => getAnimationUrls(), []);
  const worldClipNames = useMemo(() => getAnimationClipNames(), []);
  const effectiveGlbUrl = useDebugAvatar ? defaultAvatar : (glbUrl ?? defaultAvatar);
  const inLobby = joinOptions === null;

  // Ref keeps the current avatar URL available for eager send on connect
  const avatarUrlRef = useRef<string | null>(glbUrl ?? null);
  avatarUrlRef.current = glbUrl ?? null;

  // Multiplayer — only active once room browser is dismissed
  const {
    isConnecting,
    isReconnecting,
    error,
    wasKicked,
    roomName,
    roomCode,
    playerCount,
    ownerId,
    myProfileId,
    stableProfileId,
    environmentIndex,
    serverRoomType,
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
    messages,
    prepareForNewJoinIntent,
  } = useMultiplayer(inLobby ? undefined : joinOptions!, avatarUrlRef);

  // After useMultiplayer so we can clear stale kick state before joinOptions updates (same tick as kick effect).
  useEffect(() => {
    if (!pendingGuestJoin) return;
    const roomId = pendingGuestJoin.inviteToken;
    console.log('[test] WorldTab invite flow: pendingGuestJoin → joinById', { roomId });
    setLastJoinError(null);
    clearPendingGuestJoin();
    skipKickLobbyOnceRef.current = true;
    prepareForNewJoinIntent();
    setJoinOptions({ mode: 'joinById', roomId });
  }, [pendingGuestJoin, prepareForNewJoinIntent, clearPendingGuestJoin]);

  const { isMuted, toggleMute, speakingUsers, isConnected: voiceConnected } = useVoiceChat(
    isActive && !inLobby ? (roomCode ?? null) : null,
    myProfileId ?? null,
    voiceVolume,
  );

  const { playEmote, emoteRequest, onEmoteComplete } = usePlayEmote(
    sendAnimation,
    () => currentMovementAnimationRef.current,
  );

  // Auto-return to lobby when kicked or on connection error (not when we just started a new join).
  useEffect(() => {
    if (!inLobby && skipKickLobbyOnceRef.current) {
      skipKickLobbyOnceRef.current = false;
      return;
    }
    if ((wasKicked || error) && !inLobby) {
      setLastJoinError(wasKicked ? 'You were kicked from the room.' : error);
      setJoinOptions(null);
    }
  }, [wasKicked, error, inLobby]);

  // When our avatar GLB is set or changes, tell the room so others can show it
  useEffect(() => {
    if (inLobby) return;
    sendAvatar(glbUrl ?? null);
  }, [inLobby, glbUrl, sendAvatar]);

  // Sync movement animation to other players
  useEffect(() => {
    if (inLobby) return;
    sendAnimation(currentMovementAnimation);
  }, [inLobby, currentMovementAnimation, sendAnimation]);

  // Pick the world preset based on server-reported room type.
  // For joinById we don't know the room type until roomInfo arrives,
  // so we fall back to OPEN_PLAZA_PRESET until the server tells us.
  const worldPreset = (() => {
    if (joinOptions?.mode === 'joinOrCreate') return OPEN_PLAZA_PRESET;
    if (joinOptions?.mode === 'joinById') {
      if (serverRoomType === 'world_room') return OPEN_PLAZA_PRESET;
      if (serverRoomType === 'player_room' || serverRoomType === 'avatar_room') return HOME_ROOM_PRESET;
      // Invites join by Colyseus room id into a home/avatar room; roomInfo may lag. Use home
      // preset + deterministic cozy (HomeRoom default) instead of plaza → cozy swap.
      return HOME_ROOM_PRESET;
    }
    // mode === 'create'
    return joinOptions?.roomType === 'avatar_room' ? HOME_ROOM_PRESET : OPEN_PLAZA_PRESET;
  })();

  //console.log('[WorldTab] render — joinOptions?.mode:', joinOptions?.mode, '| serverRoomType:', serverRoomType, '| environmentIndex:', environmentIndex);

  return (
    <div className="world-tab-container" style={{ touchAction: 'none' }}>
      <Canvas
        frameloop={isActive ? 'always' : 'never'}
        camera={{ position: [0, 3.2, 5], fov: 60, near: 0.5 }}
        style={{ width: '100%', height: '100%' }}
      >
        <WorldEnvironment
          definition={worldPreset}
          debugGround={debugGround}
          environmentIndex={environmentIndex}
        />
        <LocalPlayer
          playerGroupRef={playerGroupRef}
          cameraYawRef={cameraYawRef}
          joystickRef={joystickRef}
          onPositionUpdate={inLobby ? undefined : sendPosition}
          glbUrl={effectiveGlbUrl}
          animationUrls={worldAnimUrls}
          animationClipNames={worldClipNames}
          activeAnimation={activeAnimation}
          emoteRequest={emoteRequest}
          onEmoteComplete={onEmoteComplete}
          onAnimationChange={setCurrentMovementAnimation}
          sendPosture={inLobby ? undefined : sendPosture}
          sendAnimation={inLobby ? undefined : sendAnimation}
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
        {!inLobby && (
          <RemotePlayers
            playerIds={remotePlayerIds}
            positionsRef={remotePlayerPositions}
            avatarUrls={remotePlayerAvatarUrls}
            avatarActiveAnimations={remotePlayerAnimations}
            playerNames={remotePlayerNames}
            speakingUsers={speakingUsers}
            showSkeleton={showSkeleton}
          />
        )}
      </Canvas>

      {/* Room browser overlay */}
      {inLobby && (
        <RoomBrowser
          lastError={lastJoinError}
          onJoin={(opts) => {
            setLastJoinError(null);
            skipKickLobbyOnceRef.current = true;
            prepareForNewJoinIntent();
            setJoinOptions(opts);
          }}
        />
      )}

      <GlbSceneDebugPanel
        visible={glbDebugPanelVisible}
        debugOpen={debugOpen}
        onToggleOpen={() => setDebugOpen((o) => !o)}
        useDebugAvatar={useDebugAvatar}
        onUseDebugAvatar={(v) => {
          setUseDebugAvatar(v);
          if (v && inLobby) {
            skipKickLobbyOnceRef.current = true;
            prepareForNewJoinIntent();
            setJoinOptions({ mode: 'create', roomType: 'avatar_room' });
          }
        }}
        debugGround={debugGround}
        onDebugGround={setDebugGround}
        showSkeleton={showSkeleton}
        onShowSkeleton={setShowSkeleton}
        activeAnimation={activeAnimation}
        onSetActiveAnimation={setActiveAnimation}
        soloRoom={
          inLobby
            ? {
                inLobby: true,
                onSolo: () => {
                  skipKickLobbyOnceRef.current = true;
                  prepareForNewJoinIntent();
                  setJoinOptions({ mode: 'create', roomType: 'avatar_room' });
                },
              }
            : undefined
        }
      />

      {/* HTML overlays — only when in world */}
      {!inLobby && (
        <>
          {/* Top HUD */}
          <WorldHudTop
            roomName={roomName}
            ownerId={serverRoomType === 'world_room' ? null : ownerId}
            myPlayerId={myProfileId ?? ''}
            playerCount={playerCount}
            hasPendingInvite={pendingInvites.length > 0}
            onLeave={() => setJoinOptions(null)}
            onInvite={() => setInvitesPanelOpen((o) => !o)}
            onInbox={() => setInboxOpen((o) => !o)}
          />

          {/* Invite modal */}
          {invitesPanelOpen && (
            <InviteModal
              roomCode={roomCode}
              playerId={stableProfileId}
              onSendInvite={sendInvite}
              onClose={() => setInvitesPanelOpen(false)}
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
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setChatOpen((o) => !o)}
          >
            💬
          </button>}

          <ChatPanel
            messages={messages}
            onSend={sendChat}
            playerCount={playerCount}
            roomName={roomName}
            roomCode={roomCode}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />

          {/* Connection status — connecting overlay */}
          {isConnecting && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(10, 10, 30, 0.75)',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <div style={{
                width: 36, height: 36,
                border: '3px solid rgba(255,255,255,0.15)',
                borderTop: '3px solid #fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ marginTop: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                {isReconnecting ? 'Reconnecting…' : 'Joining room…'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
