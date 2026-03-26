# EchoAvatar — Project Status

## Current State
- Multiplayer 3D avatar scene using React Three Fiber (client) + Colyseus (server)
- Client: Vite dev server on port 5173
- Server: Colyseus on port 2567

### Deploy / iframe animation debug
- **`[AnimDeploy]`** logs are always emitted to **console** (filter DevTools) **and** mirrored so you can still read them when the host strips `console` or you’re on the wrong frame:
  - **On-screen:** bottom-right **AnimDeploy** panel (`AnimDeployHud.tsx`).
  - **Iframe console:** `window.__ECHO_ANIM_DEPLOY__.tail(30)` or `.entries()` — open DevTools with the **game iframe** selected (top-left frame dropdown in Chrome), not only the parent shell.
  - **CustomEvent:** `window.addEventListener('echo-anim-deploy', …)` if needed.
- **`OK`** — expected checkpoints (CDN preload for idle/walk/run, clip/action snapshot, movement state changes, which locomotion clip is playing).
- **`WARN`** — investigate first (missing `AnimationAction`, fallback when `activeAnimation` has no action, `getCdnUrl` cache miss, zero-track clips).
- Implementation: `src/debug/animDeployDebug.ts`, `AnimDeployHud.tsx`, plus hooks in `cdnAssets.ts`, `useAnimationLoader.ts`, `useLoopingAnimation.ts`, `usePlayerMovementFrame.ts`.
- **Mic “unclickable” (2026-03-23):** `VoiceMuteButton` used `disabled={!isConnected}` — when Agora never joined (env / room / join error), the control ignored all taps. **Fix:** removed native `disabled`; use `opacity` + `aria-disabled` + tooltip; `toggleMute` still no-ops without a local track. **AnimDeployHud** used `pointer-events: auto` on a fixed wrapper that could steal hits — **Fix:** `pointer-events: none` on wrapper, `auto` only on the toggle button and open panel; `width: max-content` + `minWidth` on the bar.
- **Plaza + home auto-rejoin (2026-03-23):** `ConnectionManager` mirrors `global_room` for **Central Plaza** (`joinOrCreate` + `world_room`) and **private home** (`create` + `player_room`): after a successful join, transient `onDisconnect` / `onError` / failed re-join skip sticky `error`; exponential backoff re-calls `connect` with persisted options/avatar. SDK `onReconnecting` / `onReconnected` clears the app timer. Kick, intentional `disconnect()`, and first join failure unchanged. **Heartbeat:** `requestSync` every **10s** for those two session types vs **60s** for join-by-code / ad-hoc `avatar_room` create. **UI:** `WorldTab` + `HomeTab` show “Reconnecting…” when `state === 'reconnecting'`. Exported `multiplayerSessionUsesAutoRejoin()` in `useMultiplayer.ts` stays in sync with `supportsAutoRejoin` in `ConnectionManager`.

---

## Completed Work

### Colyseus Server Setup (2026-03-03)
**What:** Created a dedicated Colyseus multiplayer server under `server/` for avatar room management, position sync, and chat.

**Files Created:**
- `server/package.json` — Dependencies: colyseus ^0.16, @colyseus/tools, monitor, playground; dev: tsx, typescript, rimraf
- `server/tsconfig.json` — `experimentalDecorators` + `emitDecoratorMetadata` enabled (required for `@colyseus/schema`)
- `server/src/index.ts` — Boots Colyseus via `listen(appConfig)`, port 2567
- `server/src/app.config.ts` — Registers `avatar_room`, mounts playground at `/` and monitor at `/monitor`
- `server/src/rooms/schema/RoomState.ts` — `PlayerState` (x, z, rotY, username) + `RoomState` (MapSchema of players)
- `server/src/rooms/AvatarRoom.ts` — Room logic: `updatePosition` → broadcast `playerMoved`; `chat` → broadcast `chatMessage`; `onJoin` → `playerJoined` to all + existing players to new client; `onLeave` → `playerLeft`

**Message Contract:**
- Client → Server: `updatePosition { x, z, rotY }`, `chat { text }`
- Server → Clients: `playerMoved { sessionId, x, z, rotY }`, `playerJoined { sessionId, x, z, rotY, username }`, `playerLeft { sessionId }`, `chatMessage { sessionId, username, text }`

**Verification:**
- `npm install` ✅
- `npm start` ✅ — Server boots, prints `Listening on http://localhost:2567`
- Playground at `http://localhost:2567` shows `avatar_room`

**Reference:** Based on pattern from `T:/Work/1a_Series_work/quokka/voxel/voxel-server/babylon-colyseus-server/`

### Colyseus Client Integration (2026-03-03)
**What:** Replaced the old Rundot Rooms multiplayer layer with a Colyseus WebSocket client. Added snapshot interpolation to RemotePlayers for smooth movement.

**Files Created:**
- `src/multiplayer/types.ts` — `RemotePlayerState` with snapshot interpolation fields (`prevX`, `prevZ`, `prevRotY`, `prevUpdate`) + `username`; `ChatMessage` interface
- `src/multiplayer/useColyseus.ts` — New hook connecting to Colyseus server (`ws://localhost:2567` dev, `wss://TODO` prod). Same return shape as old `useRoom` hook. Handles `playerJoined`/`playerMoved`/`playerLeft`/`chatMessage` messages. Includes `beforeunload`/`pagehide` cleanup. `sendPosition` throttled to 10Hz.
- `src/scene/RemotePlayers.tsx` — Renders remote player meshes. `useFrame` uses snapshot interpolation: `t` moves from 0→1 over measured update interval, clamped (no extrapolation). Rotation lerped with wrap-around safety.

**Dependency Added:**
- `colyseus.js` ^0.16.18

**Build Fixes:**
- `room.id` → `room.roomId` (Colyseus API)
- `onError` callback `message` param made optional to match SDK types

**Not Done:**
- `WorldTab.tsx` doesn't exist in the current codebase (tab config uses `SceneTab`). The `useColyseus` + `RemotePlayers` infrastructure is ready but not wired into a tab yet.

### Phase 4: Architecture Refactor + Three Room Types + Home World + Invites Mailbox (2026-03-05)
**What:** Refactored app architecture with three Colyseus room types, two 3D worlds (Home + World), data-driven environments, tab-aware rendering, and an invites mailbox foundation.

**Server Files Created:**
- `server/src/rooms/PlayerRoom.ts` — Private home room (maxClients: 10). Copy of AvatarRoom but always forces `isPublic: false`. Used for player homes.
- `server/src/rooms/WorldRoom.ts` — Server-hosted public world (maxClients: 50). Copy of AvatarRoom but always forces `isPublic: true`. Pre-created on boot.

**Server Files Modified:**
- `server/src/app.config.ts` — Registers 3 room types: `avatar_room`, `player_room`, `world_room`. Pre-creates "Central Plaza" world_room on boot via `matchMaker.createRoom()` (500ms delay). Updated `/rooms` endpoint to query both `world_room` and public `avatar_room`, returns merged list with room type name.
- `server/src/index.ts` — Updated startup log: "Rooms: player_room | world_room | avatar_room"

**Client Files Created:**
- `src/world/types.ts` — `WorldDefinition` data model: `WorldType`, `LayoutConfig` (enclosed_room | open_field), `LightingConfig`, `SceneProp`, `WorldDefinition`
- `src/world/presets.ts` — Two preset WorldDefinitions: `HOME_ROOM_PRESET` (12x12x4 enclosed room, warm lighting, furniture props + rug) and `OPEN_PLAZA_PRESET` (open field matching old Ground.tsx values)
- `src/world/HomeRoom.tsx` — Renders enclosed room geometry (floor, ceiling, 4 walls with subtle shade variations, warm point light, `PropMesh` sub-component) from a `WorldDefinition`
- `src/world/WorldEnvironment.tsx` — Data-driven scene renderer: applies lighting/fog/background from definition, delegates to `<Ground />` or `<HomeRoom />` based on layout type
- `src/context/ActiveTabContext.tsx` — Context holding current active tab ID + `useIsActiveTab(tabId)` hook
- `src/context/GameContext.tsx` — Cross-tab shared state: `Invite` type (includes `roomType`), `GameProvider`, `useGame()` hook with `invites`, `addInvite`, `dismissInvite`
- `src/ui/InvitesPanel.tsx` — Collapsible invite panel with `InviteCard` sub-component (matching ChatPanel style). Accept deferred to Phase 5 (logs to console).

**Client Files Modified:**
- `src/multiplayer/types.ts` — Added `RoomType` type alias. Added `roomType` field to `RoomInfo`.
- `src/multiplayer/useColyseus.ts` — Replaced `joinOrCreate` mode with `joinPlayerRoom` (targets `player_room` via `client.joinOrCreate`). Added `roomType` field to `joinById` options. Updated `fetchRooms` to extract room type name from server response.
- `src/tabs/HomeTab.tsx` — Full rewrite: now a 3D Canvas with enclosed room (HOME_ROOM_PRESET), auto-joins Colyseus `player_room` named `home_<userId>` via `joinPlayerRoom` mode, includes joystick/chat/camera drag, `frameloop` controlled by `useIsActiveTab('home')`
- `src/tabs/WorldTab.tsx` — (A) `frameloop={isActive ? 'always' : 'never'}` via `useIsActiveTab('world')`, (B) replaced `<Ground />` with `<WorldEnvironment definition={OPEN_PLAZA_PRESET} />`, (C) added `<InvitesPanel />` in non-lobby UI
- `src/scene/Ground.tsx` — Removed lighting/fog/background declarations (now provided by WorldEnvironment). Kept hemisphereLight, ground plane, and crate generation.
- `src/ui/RoomBrowser.tsx` — Updated `joinById` calls to include required `roomType` field (from room list data or defaults to `'avatar_room'` for code join).
- `src/App.tsx` — Wrapped content with `<GameProvider>` (outermost) and `<ActiveTabContext.Provider value={activeTab}>` around tab map

**Room Type Architecture:**
| Type | Class | Creator | Visibility | Max Clients |
|------|-------|---------|------------|-------------|
| `player_room` | PlayerRoom | Auto (joinOrCreate) | Always private | 10 |
| `world_room` | WorldRoom | Server (pre-created on boot) | Always public | 50 |
| `avatar_room` | AvatarRoom | Player (create) | Configurable | 25 |

**Architecture Decisions:**
- Two separate `<Canvas>` instances (HomeTab + WorldTab), only one renders at a time via R3F `frameloop` prop
- Home room identity: `joinPlayerRoom` with `roomName = home_<userId>`, always private
- World room: pre-created by server on boot ("Central Plaza"), always public, clients join via RoomBrowser
- Invite system: mailbox model — in-memory state in GameContext with `roomType` field. No delivery mechanism yet.
- App.tsx still renders ALL tabs permanently with CSS show/hide (TD-02 preserved)

**Verification:**
- Client `tsc --noEmit` ✅ — zero errors
- Client `npm run build` ✅ — production build passes
- Server `tsc --noEmit` ✅ — zero errors

### Invite Send/Receive System (2026-03-06)
**What:** Built the full invite send/receive pipeline: server-side in-memory mailbox with REST endpoints, client-side API helpers, GameContext server-polling, HomeTab invite send UI with player ID display, and homeRoomToken reception from PlayerRoom.

**Server Files Created:**
- `server/src/inviteStore.ts` — In-memory invite mailbox. `InviteRecord` interface, Map keyed by toProfileId, `addInvite()` (generates id, caps at 20 per player), `getInvites()`, `deleteInvite()`.

**Client Files Created:**
- `src/multiplayer/inviteApi.ts` — HTTP helpers: `sendInvite()` (POST /invite), `fetchInvites()` (GET /invites/:profileId), `removeInvite()` (DELETE /invites/:profileId/:inviteId). `ClientInvite` interface mirroring server InviteRecord.

**Server Files Modified:**
- `server/src/app.config.ts` — Added three REST endpoints: POST /invite (validate + store), GET /invites/:profileId (retrieve), DELETE /invites/:profileId/:inviteId (dismiss). All with CORS headers.

**Client Files Modified:**
- `src/multiplayer/useColyseus.ts` — Added `homeRoomToken` state + `room.onMessage('homeRoomToken', ...)` listener. Returned `homeRoomToken` from hook.
- `src/context/GameContext.tsx` — Added `inviteToken: string` to `Invite` interface. Added useEffect polling `fetchInvites` every 15s (server = source of truth, replaces local array). `dismissInvite` now also calls `removeInvite()` fire-and-forget.
- `src/tabs/HomeTab.tsx` — Re-destructured `roomCode` and `homeRoomToken` from useColyseus (internal use only, not shown in UI). Added "Your ID" label (tap to copy), "Invite" toggle button, and invite form panel (input + Send button, disabled until homeRoomToken received). Uses `sendInvite()` API.

**Invite Flow:**
1. Owner opens HomeTab → auto-joins player_room → server sends `homeRoomToken` message → client stores token
2. Owner sees their profile ID (tap to copy) → types target player ID → clicks Send → POST /invite
3. Target player's GameContext polls GET /invites/:profileId every 15s → invites appear in InvitesPanel
4. Dismissing an invite calls DELETE on server + removes from local state

**Verification:**
- Client `tsc --noEmit` ✅ — zero errors
- Client `npm run build` ✅ — production build passes
- Server `tsc --noEmit` ✅ — zero errors

---

## Technical Debt Registry
- `[TECH DEBT]` `useColyseus.ts` — Production endpoint is `wss://TODO_COLYSEUS_CLOUD_ENDPOINT`. Must be filled in before deploying to Colyseus Cloud.
- `[TECH DEBT]` `InvitesPanel.tsx` — Accept button just dismisses + logs. Wire invite acceptance to join room in Phase 5.
- `[TECH DEBT]` `GameContext.tsx` — Invites are in-memory only. No persistence or delivery mechanism. Server-side invite delivery deferred.
- `[TECH DEBT]` `PlayerRoom.ts` / `WorldRoom.ts` — Copy-pasted from AvatarRoom. Consider extracting shared message handlers into a base class or mixin to reduce duplication.

### PlayerRoom Access Guard + HomeTab UI Fix (2026-03-06)
**What:** Added a real server-side owner/token access guard to `PlayerRoom` and cleaned up the HomeTab HUD.

**Server:**
- `server/src/rooms/PlayerRoom.ts` — Added `ownerProfileId` and `inviteToken` private fields. In `onCreate`, stores owner's `profileId` from options and generates a random 6-char alphanumeric invite token. In `onJoin`, rejects any client that is neither the owner nor holds a valid invite token (`throw new Error`). Sends `homeRoomToken` message to owner on join so the client can store it for future invite sharing. Updated `JoinOptions` to include `profileId` and `inviteToken`.

**Client:**
- `src/multiplayer/useColyseus.ts` — Added `profileId: string` to `joinPlayerRoom` branch of `UseColyseusOptions`. Passes `profileId` in the `joinOrCreate` options for `player_room`.
- `src/tabs/HomeTab.tsx` — Removed `roomCode` from `useColyseus` destructure and from `<ChatPanel>` props (no more room code display in home). Added `profileId: profile.id` to `useColyseus` options. Added `<InvitesPanel />` to HUD overlays. Added import for `InvitesPanel`.

**Verification:**
- Client `tsc --noEmit` ✅ — zero errors
- Client `npm run build` ✅ — production build passes
- Server `tsc --noEmit` ✅ — zero errors

---

### Build Error Fixes — Rundot SDK Migration (2026-03-12)
**What:** Fixed 3 TypeScript build errors that appeared after migrating from Colyseus to Rundot realtime SDK.

**Error 1: `room.joinData` does not exist on `ServerRoom`**
- Root cause: The Rundot SDK's `GameRoom.onPlayerJoin()` return value is silently ignored by the framework (verified in SDK source). Code was accessing `room.joinData` which doesn't exist on the `ServerRoom` interface.
- Fix (server): `BaseRoom.onPlayerJoin()` now uses `this.sendTo(player.id, ...)` to send individual `playerJoined` messages for each existing player to the newcomer. Removed `EchoJoinData` return type.
- Fix (client): `useMultiplayer.ts` removed `joinData` access block. Added `onPrivateMessage` handler that processes `playerJoined` messages for existing player hydration.

**Error 2: `AnimationAction` not assignable to `AnimationClip`**
- Root cause: `mixer.uncacheAction(waveAction)` passes an `AnimationAction` but Three.js expects an `AnimationClip`.
- Fix: Changed to `mixer.uncacheAction(waveAction.getClip())`.

**Error 3: Unused `AVATAR_COLOR` constant**
- Fix: Removed unused `AVATAR_COLOR` from `LocalPlayer.tsx`.

**Files Modified:**
- `rundotserver/src/rooms/BaseRoom.ts` — `onPlayerJoin` now returns void, uses `sendTo` for existing players
- `src/multiplayer/useMultiplayer.ts` — removed `joinData` access, added `onPrivateMessage` handler
- `src/scene/AvatarGlbMesh.tsx` — `uncacheAction` now receives `AnimationClip` via `getClip()`
- `src/scene/LocalPlayer.tsx` — removed unused `AVATAR_COLOR`

**Verification:**
- Client `npm run build` ✅ — zero errors, production build passes

---

### Kick Player + Leave World (2026-03-12)
**What:** Added two features: (1) kick button in HomeTab for room owners to remove guests, (2) leave button in WorldTab to return to the world lobby.

**Feature 1 — Kick Player:**
- Protocol: Added `KickPlayerMsg` (client→server) and `PlayerKickedMsg` (server→client) to `EchoAvatarProtocol`.
- Server: `BaseRoom` now tracks `ownerId` (first player to join). Handles `kickPlayer` message — verifies sender is owner, sends private `playerKicked` to target, removes from positions map, broadcasts `playerLeft`.
- Client hook: `useMultiplayer` now exposes `remotePlayerNames`, `kickPlayer()`, and `wasKicked` state. Handles `playerKicked` private message by disconnecting and setting error.
- UI: New `KickPanel` component (toggle button + dropdown of players with confirm-to-kick). Wired into HomeTab, only visible when guests are present.

**Feature 2 — Leave World:**
- Added a "← Leave" pill button in WorldTab's in-world HUD. Clicking it sets `joinOptions` to `null`, which triggers `useMultiplayer` cleanup (disconnect) and shows `RoomBrowser` again.
- Auto-returns to lobby when kicked via `wasKicked` effect.

**Files Created:**
- `src/ui/KickPanel.tsx` — Kick panel UI with confirm-to-kick pattern

**Files Modified:**
- `rundotserver/src/rooms/types.ts` — 2 new message types (`KickPlayerMsg`, `PlayerKickedMsg`)
- `rundotserver/src/rooms/BaseRoom.ts` — `ownerId` tracking + `kickPlayer` handler
- `src/multiplayer/useMultiplayer.ts` — `remotePlayerNames` state, `kickPlayer` callback, `playerKicked` handler, `wasKicked` state
- `src/tabs/HomeTab.tsx` — wired `KickPanel` into HUD overlays
- `src/tabs/WorldTab.tsx` — Leave button + auto-return on kick

### CDN Asset Loading Fix (2026-03-12)
**What:** Fixed CDN assets not loading after deployment to Rundot. All `public/cdn-assets/` assets were referenced using direct relative paths (e.g., `'cdn-assets/characters/base.glb'`), which works in local dev (Vite serves them) but fails in production because Rundot uploads them to the CDN with content-hashed URLs — they must be fetched via `RundotGameAPI.cdn.fetchAsset()`.

**Root Cause:** After `rundot deploy`, assets in `public/cdn-assets/` are uploaded to the Rundot CDN and removed from the app bundle. The CDN uses a manifest with content-hashed filenames for cache-busting. Code using raw relative paths (like `useGLTF('cdn-assets/environments/gdc.glb')`) gets 404s because those paths no longer exist in the deployed app.

**Solution:** Created a centralized CDN asset preloader:

**Files Created:**
- `src/lib/cdnAssets.ts` — CDN asset registry, preloader, and URL resolver. In dev mode: returns relative paths for Vite. In production: calls `RundotGameAPI.cdn.fetchAsset(path)` for each asset, creates blob URLs via `URL.createObjectURL()`, and caches them. Exports `preloadCdnAssets()`, `getCdnUrl(key)`, and `getAnimationUrls()`.

**Files Modified:**
- `src/main.tsx` — Calls `preloadCdnAssets()` before first React render so all blob URLs are ready synchronously.
- `src/scene/LocalPlayer.tsx` — `DEFAULT_AVATAR_GLB` → `getCdnUrl('DEFAULT_AVATAR')`
- `src/scene/Ground.tsx` — `PLAZA_ENV_PATH` → `getCdnUrl('ENV_COZY02')`, removed module-level `useGLTF.preload()`
- `src/scene/AvatarPreviewScene.tsx` — `ANIMATION_URLS` → `getAnimationUrls()`
- `src/world/WorldEnvironment.tsx` — Hardcoded gdc.glb path → `getCdnUrl('ENV_GDC')`
- `src/world/HomeRoom.tsx` — `COZY_GLBS` array → `COZY_KEYS` with `getCdnUrl()`
- `src/tabs/WorldTab.tsx` — All `'cdn-assets/...'` strings → `getCdnUrl()` / `getAnimationUrls()`
- `src/tabs/HomeTab.tsx` — Animation URLs → `getAnimationUrls()`
- `src/tabs/AvatarTab.tsx` — `DEFAULT_AVATAR_GLB` → `getCdnUrl('DEFAULT_AVATAR')`

**CDN Asset Registry (9 assets):**
| Key | CDN Path |
|-----|----------|
| `DEFAULT_AVATAR` | `characters/base.glb` |
| `ANIM_IDLE` | `animations/idle.glb` |
| `ANIM_WALK` | `animations/walk2.glb` |
| `ANIM_RUN` | `animations/run2.glb` |
| `ANIM_WAVE` | `animations/wave.glb` |
| `ENV_GDC` | `environments/gdc.glb` |
| `ENV_COZY01` | `environments/cozy01.glb` |
| `ENV_COZY02` | `environments/cozy02.glb` |
| `ENV_COZY03` | `environments/cozy03.glb` |

**How to add new CDN assets:**
1. Place file in `public/cdn-assets/<path>`
2. Add entry to `CDN_ASSET_PATHS` in `src/lib/cdnAssets.ts`
3. Use `getCdnUrl('KEY')` in component code

**Verification:**
- Client `tsc --noEmit` ✅ — zero errors
- Client `npm run build` ✅ — production build passes

### Room Joining Improvements (2026-03-12)
**What:** Batch of 7 improvements to the room joining flow: room name passthrough, descriptive error handling with auto-return, loading overlay, animation sync, reconnection re-sync, UX polish, and debug code cleanup.

**1. Room Name Passthrough**
- `UseMultiplayerOptions` `create` mode now accepts optional `roomName?: string`.
- `RoomBrowser` passes the "Create Room" name input to `onJoin({ ..., roomName })`.
- `useMultiplayer` sets `roomName` state from the custom name when provided; defaults to "World Room" if empty.

**2. Descriptive Error Handling + Auto-Return to Lobby**
- `useMultiplayer` catch block now parses error strings to produce user-friendly messages: "Room is full.", "Room not found. Check the code and try again.", "Connection timed out.", etc.
- `RoomBrowser` accepts optional `lastError` prop and renders a red error banner at the top when set.
- `WorldTab` stores `lastJoinError` state. On error or kick, saves the message before clearing `joinOptions` (returning to lobby). Clears the error when user tries a new join.

**3. Loading Overlay During Room Join**
- Replaced small "Connecting…" text with a full-screen semi-transparent overlay containing a spinner and "Joining room…" text (z-index 20, pointer-events none).
- Added `@keyframes spin` to `style.css`.

**4. Animation Sync (setAnimation → server → clients)**
- Protocol: Added `SetAnimationMsg` (client→server) and `PlayerAnimationMsg` (server→client) to `EchoAvatarProtocol`.
- Server: `BaseRoom.onGameMessage` handles `setAnimation` by broadcasting `playerAnimation` with the sender's session ID and animation name.
- Client: `useMultiplayer.sendAnimation` now actually sends `{ type: 'setAnimation', animation }`. `onMessage` handles `playerAnimation` by updating `remotePlayerAnimations.current[sessionId]`. Animations are cleaned up on player leave.

**5. Reconnection Re-Sync**
- `onReconnected` callback now sends `{ type: 'requestSync' }` to the server to re-hydrate all remote player positions/avatars after a disconnection recovery.

**6. Join-by-Code UX Polish**
- `RoomBrowser` code input: auto-uppercases, monospace font, bold weight, placeholder "ROOM CODE".
- Matches `InvitesPanel` styling for consistency.

**7. Debug Probe Cleanup**
- Removed the `RundotGameAPI.rooms.joinRoomByCodeAsync` / `getUserRoomsAsync` probe block that was left from earlier debugging.

**Files Modified:**
- `rundotserver/src/rooms/types.ts` — Added `SetAnimationMsg`, `PlayerAnimationMsg` to protocol union
- `rundotserver/src/rooms/BaseRoom.ts` — Added `setAnimation` handler in `onGameMessage`
- `src/multiplayer/useMultiplayer.ts` — Room name support, descriptive errors, animation send/receive, reconnect re-sync, probe cleanup
- `src/ui/RoomBrowser.tsx` — `lastError` prop + banner, room name passthrough, uppercase code input
- `src/tabs/WorldTab.tsx` — `lastJoinError` state, auto-return on error, loading overlay, error forwarding to RoomBrowser
- `src/style.css` — `@keyframes spin` animation

**Verification:**
- Client `npm run build` ✅ — zero errors, production build passes

### CDN Asset URL Fix (2026-03-13)
**What:** Fixed deployed builds failing to load GLB assets. The preloader was using `fetchAsset()` + `URL.createObjectURL(blob)` which double-downloaded assets and fell back to the raw local path (`cdn-assets/characters/base.glb`) on any failure — a path that doesn't exist on the CDN (files are content-hashed). Switched to `resolveAssetUrl()` which returns the actual hashed CDN URL directly.

**Files Modified:**
- `src/lib/cdnAssets.ts` — Replaced `fetchAsset()` + blob approach with `resolveAssetUrl()`. Logs each resolved URL at boot. Fallback path now warns that it will fail in production.

---

## Planned: Architecture Refactoring

**Status:** PLANNED — implement after current branch merge

**Problems:**
1. **Multiplayer god hook** — `useMultiplayer.ts` is 447 lines with 16 useState vars, two switch statements, 6 lifecycle callbacks, 5 send functions. Adding any message type means editing this one file.
2. **5 parallel player state collections** — `remotePlayerIds`, `remotePlayerPositions`, `remotePlayerAvatarUrls`, `remotePlayerAnimations`, `remotePlayerNames` must be kept in sync. Add/remove player code is duplicated 3×.
3. **Dumb relay server** — BaseRoom does zero validation. Clients can teleport, speed hack, spam messages.
4. **Character controller god components** — ✅ **Addressed (2026-03):** `LocalPlayer` split into `usePlayerMovementFrame`, `usePlayerInteraction`, `PlayerAvatar` (see `docs/ARCHITECTURE_REFACTOR_4_CHARACTER_CONTROLLER.md`). `AvatarGlbMesh` was already a thin composer post Phase 5.
5. **Duplicated code** — Camera drag is copy-pasted between HomeTab and WorldTab.
6. **Firebase invite polling** — Invites go through Firestore HTTP polling (5s delay) instead of the existing websocket.

**Goal:** Split into pluggable modules so new features (emotes, postures, voice chat) are additive — new files only, not invasive edits to existing code.

---

### Phase 1 — Protocol & Player Store ✅ COMPLETED (2026-03-13)
*Unblocks everything else. Fixes the worst duplication and the foundation all features sit on.*

| # | Task | Status | What was done |
|---|---|---|---|
| 1.1 | Split protocol types | ✅ | `types.ts` now exports `ClientMessage`, `BroadcastMessage`, `PrivateMessage` as direction-typed unions. `EchoAvatarProtocol` stays as the combined union for SDK generic. |
| 1.2 | Create unified `RemotePlayer` interface | ✅ | `multiplayer/types.ts` has `RemotePlayer` (id, username, avatarUrl, animation, position + interpolation fields). Old `RemotePlayerState` kept temporarily as separate interface for RemotePlayers compat. |
| 1.3 | Create `PlayerStore` | ✅ | `multiplayer/core/PlayerStore.ts` — pure TS class wrapping `Map<string, RemotePlayer>` with `addPlayer`, `removePlayer`, `updatePosition`, `updateAvatar`, `updateAnimation`, `clear`. Subscribe/notify pattern for React re-renders. Position updates intentionally skip `notify()` (read via ref in useFrame). Backward-compat helpers: `getAvatarUrls()`, `getAnimations()`, `getNames()`, `getIds()`. |
| 1.4 | Refactor `useMultiplayer` to use PlayerStore | ✅ | Removed 5 parallel state vars (`remotePlayerIds`, `remotePlayerAvatarUrls`, `remotePlayerAnimations`, `remotePlayerNames`, `playerCount`). Replaced with single `PlayerStore` instance + `useReducer` forceUpdate subscribed to store changes. `playerCount` derived as `1 + store.size`. `positionsRef` points to store's internal map. Extracted `makePlayer()` helper. Separated `handlePrivateMessage()` and `handleBroadcast()` from inline switch. 447 → 290 lines, 13 → 8 useState. |

**Files created:** `src/multiplayer/core/PlayerStore.ts`
**Files modified:** `rundotserver/src/rooms/types.ts`, `src/multiplayer/types.ts`, `src/multiplayer/useMultiplayer.ts`
**Behavior change:** None — same wire format, same React output, same return API

---

### Phase 2 — Client Message Router & Connection Manager ✅ COMPLETED (2026-03-13)
*Makes useMultiplayer extensible. Adding a new message type = dropping in a feature hook.*

| # | Task | Status | What was done |
|---|---|---|---|
| 2.1 | `MessageRouter` | ✅ | `multiplayer/core/MessageRouter.ts` — `register(type, handler)` / `dispatch(msg)` / `unregister(type)`. Generic over message union type. |
| 2.2 | `ConnectionManager` | ✅ | `multiplayer/core/ConnectionManager.ts` — state machine (disconnected → connecting → connected → reconnecting). Encapsulates room ref, player ID, SDK callbacks, connect/disconnect, error parsing, room naming. Handles `playerKicked` and `roomInfo` internally. Subscribe/notify for React. |
| 2.3 | `useMovementSync` | ✅ | `multiplayer/features/useMovementSync.ts` — registers `playerJoined`, `playerLeft`, `playerMoved`, `syncPlayers` handlers. Manages PlayerStore add/remove/updatePosition. Exposes `sendPosition`. |
| 2.4 | `useChatSync` | ✅ | `multiplayer/features/useChatSync.ts` — registers `chatMessage` handler. Manages own `messages` state. Exposes `sendChat`, `clearMessages`. |
| 2.5 | `useAvatarSync` | ✅ | `multiplayer/features/useAvatarSync.ts` — registers `playerAvatar` handler. Updates store. Exposes `sendAvatar`. |
| 2.6 | `useAnimationSync` | ✅ | `multiplayer/features/useAnimationSync.ts` — registers `playerAnimation` handler. Updates store. Exposes `sendAnimation`. |
| 2.7 | Slim `useMultiplayer` | ✅ | 447 → 290 → **120 lines**. Creates core objects + composes feature hooks. Return API unchanged — HomeTab/WorldTab need zero changes. |

**Files created:** `multiplayer/core/MessageRouter.ts`, `multiplayer/core/ConnectionManager.ts`, `multiplayer/helpers.ts`, `multiplayer/features/useMovementSync.ts`, `multiplayer/features/useChatSync.ts`, `multiplayer/features/useAvatarSync.ts`, `multiplayer/features/useAnimationSync.ts`
**Files modified:** `multiplayer/useMultiplayer.ts` (rewritten as thin composer)
**Behavior change:** None — same external API, same wire format

---

### Refactor #4 — LocalPlayer decomposition ✅ COMPLETED (2026-03)
*Architecture Refactoring problem #4 — character controller “god component” split.*

| Piece | File | Role |
|-------|------|------|
| Movement frame loop | `character/usePlayerMovementFrame.ts` | Per-frame: sample input → movement → ~12 Hz position broadcast; exposes `movementAnimation` (idle/walk2/run2). |
| Interaction bundle | `interaction/usePlayerInteraction.ts` | `useKeyboardInput` + `useInteractionDetection` + `usePostureState`; returns `keysRef`, `nearestRef`, posture refs. |
| Avatar shell | `scene/PlayerAvatar.tsx` | `<group>` + `AvatarGlbMesh`; effective clip = posture → debug `activeAnimation` → movement state. |
| Composition | `scene/LocalPlayer.tsx` | ~75 lines: wires hooks + `InteractionPrompt`. |

**Behavior:** Unchanged wire protocol, posture lock, wave, animation sync. **Docs:** `docs/ARCHITECTURE_REFACTOR_4_CHARACTER_CONTROLLER.md`.

---

### Phase 3 — Config & Character Controller Cleanup ✅ COMPLETED (2026-03-13)
*Centralizes magic numbers. Eliminates HomeTab/WorldTab duplication. Slims LocalPlayer.*

| # | Task | Status | What was done |
|---|---|---|---|
| 3.1 | Create `config/character.ts` | ✅ | `SPEED`, `ROTATION_SMOOTHING`, `GLB_SCALE`, `RUN_THRESHOLD` — single source of truth for all movement tuning. |
| 3.2 | Create `config/network.ts` | ✅ | `BROADCAST_INTERVAL`, `SNAP_DISTANCE`, `INTERP_K`, `CAM_DRAG_SENSITIVITY` — single source of truth for all network tuning. |
| 3.3 | Extract `input/useKeyboardInput.ts` | ✅ | 22-line hook returning stable `keysRef`. Removed keyboard listener from LocalPlayer. |
| 3.4 | Extract `input/useCameraDrag.ts` | ✅ | Returns `{ containerRef, dragHandlers }`. Eliminated ~25 lines of duplicated pointer handling from HomeTab and WorldTab. |
| 3.5 | Extract `input/useMovementInput.ts` | ✅ | `sampleMovementInput()` merges keyboard + joystick → `{ ix, iy, magnitude, isMoving, state }`. Called once per frame. |
| 3.6 | Extract `character/useCharacterMovement.ts` | ✅ | `applyCharacterMovement()` — camera-relative movement + exp-decay rotation. Pure function, no React. |
| 3.7 | Extract `character/useNetworkBroadcast.ts` | ✅ | `useNetworkBroadcast()` returns `{ tick }` — accumulates time, broadcasts at ~12 Hz, sends final "stopped" update. |
| 3.8 | Extract `character/useRemoteInterpolation.ts` | ✅ | `applyRemoteInterpolation()` — exp-decay lerp + snap threshold. Pure function, no React. |

**Files created:** `config/character.ts`, `config/network.ts`, `input/useKeyboardInput.ts`, `input/useCameraDrag.ts`, `input/useMovementInput.ts`, `character/useCharacterMovement.ts`, `character/useNetworkBroadcast.ts`, `character/useRemoteInterpolation.ts`
**Files modified:** `LocalPlayer.tsx` (~150 → ~85 lines), `RemotePlayers.tsx` (inline interpolation → `applyRemoteInterpolation()`), `HomeTab.tsx` (camera drag → `useCameraDrag()`), `WorldTab.tsx` (camera drag → `useCameraDrag()`), `AvatarGlbMesh.tsx` (`GLB_SCALE` → imported from config)
**Behavior change:** None — same physics, same wire format, same visual output

---

### Phase 4 — Server Handlers & Validation ✅ COMPLETED (2026-03-13)
*Production readiness. Prevents cheating and abuse.*

| # | Task | Status | What was done |
|---|---|---|---|
| 4.1 | `PlayerManager` | ✅ | `rooms/core/PlayerManager.ts` — wraps `Map<id, ManagedPlayer>` with `add`, `remove`, `get`, `has`, `entries`. Each player stores position + avatar + username + `lastPositionMs` + `lastChatMs` for rate limiting. |
| 4.2 | `MovementHandler` | ✅ | NaN/Infinity guard, rate limit (~20 Hz cap), speed check (max 8 units/sec = 2× client speed), world bounds clamp (±200). Clamped-but-accepted on overspeed instead of full reject. |
| 4.3 | `ChatHandler` | ✅ | Empty check, rate limit (1 msg/sec), max 200 chars. |
| 4.4 | `KickHandler` | ✅ | Owner verification, target existence check, self-kick prevention. Removes target from PlayerManager. |
| 4.5 | `SyncHandler` | ✅ | Builds `SyncPlayerEntry[]` snapshot excluding requester. Pure function. |
| 4.6 | `AvatarHandler` + `AnimationHandler` + `WaveHandler` | ✅ | Avatar: string validation + 512 char cap. Animation: non-empty string + 64 char cap. Wave: existence check. |
| 4.7 | Refactor `BaseRoom` | ✅ | Replaced inline `positions` Map with `PlayerManager`. Each `case` in the switch delegates to its handler function. Switch kept (simple dispatch) — handlers do the validation. Verbose debug logs removed from requestSync. |

**Files created:** `rundotserver/src/rooms/core/PlayerManager.ts`, `rundotserver/src/rooms/handlers/MovementHandler.ts`, `ChatHandler.ts`, `KickHandler.ts`, `SyncHandler.ts`, `AvatarHandler.ts`, `AnimationHandler.ts`, `WaveHandler.ts`
**Files modified:** `rundotserver/src/rooms/BaseRoom.ts` (rewritten to use PlayerManager + handlers)
**Behavior change:** Cheaters get rejected (speed hack, teleport, spam). Honest clients see no difference. Server bundle 6.4KB → 7.5KB.

---

### Phase 5 — Animation System Refactor ✅ COMPLETED (2026-03-13)
*Breaks apart the AvatarGlbMesh god component. Makes the animation system extensible for emotes and postures.*

| # | Task | Status | What was done |
|---|---|---|---|
| 5.1 | `config/animation.ts` | ✅ | `CLIP_NAMES`, `CROSSFADE_DURATION`, `ONESHOT_LEAD_TIME` — single source of truth for animation tuning. |
| 5.2 | `animation/useAnimationLoader.ts` | ✅ | Loads multi-GLB clips via `useGLTF(urls)`, renames each clip from its URL stem (`idle`/`walk2`/`run2`/`wave`, …), binds to clone via `useAnimations`. Returns `{ actions, mixer, allClips }`. |
| 5.3 | `animation/useLoopingAnimation.ts` | ✅ | Crossfade state machine for looping clips. Accepts shared `currentActionRef` and `isOneShotActive` flag to suppress transitions during one-shots. |
| 5.4 | `animation/useOneShotAnimation.ts` | ✅ | Plays a named one-shot clip once with `LoopOnce`, uses `useFrame` to detect near-end and smoothly transitions back to the looping animation. Returns `{ isOneShotActive }`. |
| 5.5 | `scene/AvatarModel.tsx` | ✅ | `useAvatarModel(url)` — `useGLTF` + `SkeletonUtils.clone` + shadow setup. Also exports `preloadDefaultAvatar()`. |
| 5.6 | Slim `AvatarGlbMesh.tsx` | ✅ | 267 → 130 lines. Inner component is now 5 numbered steps: load model → load animations → create shared action ref → one-shot hook → looping hook. Fallback layers unchanged. |

**Files created:** `config/animation.ts`, `animation/useAnimationLoader.ts`, `animation/useLoopingAnimation.ts`, `animation/useOneShotAnimation.ts`, `scene/AvatarModel.tsx`
**Files modified:** `scene/AvatarGlbMesh.tsx` (rewritten as thin composer)
**Behavior change:** None — same crossfade logic, same wave behavior, same fallback chain

---

### Phase 6 — Posture & Interaction System ✨ NEW FEATURE ✅ COMPLETED (2026-03-13)
*Enables sit, sleep, dance-on-spot, meditate — all config-driven.*

| # | Task | Status |
|---|---|---|
| 6.1 | Create `config/postures.ts` — PostureDefinition registry (sit, sleep, meditate, dance) | ✅ |
| 6.2 | Create `interaction/InteractionPoint.ts` — anchor class with position, rotation, posture type, capacity, occupancy tracking | ✅ |
| 6.3 | Add `setPosture` / `playerPosture` messages to protocol + server `PostureHandler` | ✅ |
| 6.4 | Add `posture` field to `RemotePlayer` + `updatePosture`/`getPostures` to `PlayerStore` | ✅ |
| 6.5 | Create `multiplayer/features/usePostureSync.ts` — network send/receive for posture changes | ✅ |
| 6.6 | Create `interaction/useInteractionDetection.ts` — per-frame nearest InteractionPoint proximity scan | ✅ |
| 6.7 | Create `interaction/usePostureState.ts` — enter/exit posture, movement lock, anchor snap, E key toggle, exit-on-movement | ✅ |
| 6.8 | Add posture-lock guard in `LocalPlayer.tsx` — skips movement+input when posture active | ✅ |
| 6.9 | Create `interaction/InteractionPrompt.tsx` — 3D Html billboard "Press E to sit" | ✅ |
| 6.10 | Wire posture into `useMultiplayer`, `LocalPlayer`, `HomeTab`, `WorldTab` | ✅ |

**Files created:**
- `src/config/postures.ts` — PostureDefinition interface + POSTURES registry (sit, sleep, meditate, dance)
- `src/interaction/InteractionPoint.ts` — anchor class with occupy/vacate, range detection, capacity
- `src/interaction/useInteractionDetection.ts` — per-frame proximity scan, returns nearestRef
- `src/interaction/usePostureState.ts` — full posture lifecycle (E toggle, movement exit, anchor snap, network broadcast)
- `src/interaction/InteractionPrompt.tsx` — 3D Html prompt above nearest interaction point
- `src/multiplayer/features/usePostureSync.ts` — registers playerPosture handler, exposes sendPosture
- `rundotserver/src/rooms/handlers/PostureHandler.ts` — validates setPosture, caps postureId at 32 chars

**Files modified:**
- `rundotserver/src/rooms/types.ts` — added `SetPostureMsg`, `PlayerPostureMsg` to protocol
- `rundotserver/src/rooms/BaseRoom.ts` — added `setPosture` case, delegates to `handlePosture`
- `src/multiplayer/types.ts` — added `posture: string | null` to `RemotePlayer`
- `src/multiplayer/helpers.ts` — added `posture: null` to `makePlayer`
- `src/multiplayer/core/PlayerStore.ts` — added `updatePosture`, `getPostures`, posture in auto-add
- `src/multiplayer/useMultiplayer.ts` — composed `usePostureSync`, exports `sendPosture` + `remotePlayerPostures`
- `src/scene/LocalPlayer.tsx` — integrated interaction detection, posture state, movement lock guard, InteractionPrompt
- `src/tabs/HomeTab.tsx` — passes `sendPosture`/`sendAnimation` to LocalPlayer
- `src/tabs/WorldTab.tsx` — passes `sendPosture`/`sendAnimation` to LocalPlayer

**How to use:**
1. Create `InteractionPoint` instances with a `postureId` matching a key in `POSTURES`
2. Pass them as `interactionPoints` prop to `<LocalPlayer />`
3. When the player walks within range, "Press E to sit" appears above the anchor
4. Press E → player snaps to anchor, plays posture animation, movement locked
5. Press E again or any WASD/arrow key → exits posture, resumes idle
6. Posture changes are broadcast to all remote players via `playerPosture` message
7. To add new postures: add an entry to `POSTURES` in `config/postures.ts` — zero code changes needed

---

### Phase 7 — Social & Group Activities ✨ NEW FEATURE
*Enables "Join Dance?", high-five, campfire circles — all config-driven.*

| # | Task | Risk | Why |
|---|---|---|---|
| 7.1 | Create `social/SocialState.ts` — SocialActivity definitions (joinable, maxParticipants, formationType, promptText) | Low | Config-driven |
| 7.2 | Create `social/useSocialState.ts` — local: "I'm hosting a group dance" | Medium | Manages host lifecycle |
| 7.3 | Create `social/useRemoteSocialStates.ts` — tracks all players' social states | Low | Receives broadcasts |
| 7.4 | Create `social/useSocialPrompt.ts` — proximity-based join prompt detection | Medium | Finds joinable activities nearby |
| 7.5 | Create `social/useSocialFormation.ts` — circle/mirror/line position calculation for joiners | Medium | Spatial math |
| 7.6 | Create `social/SocialPromptBubble.tsx` — 3D "Join Dance?" prompt above players | Low | UI component |
| 7.7 | Add `setSocialState`, `joinSocial`, `leaveSocial` messages | Low | Network sync |

**Files created:** `social/*.ts`, `social/SocialPromptBubble.tsx`
**Files modified:** `multiplayer/protocol.ts`, server handler

---

### Phase 8 — Invite Migration & Voice Chat 🔮 FUTURE
*Cleans up Firebase dependency. Adds real-time voice.*

| # | Task | Risk | Why |
|---|---|---|---|
| 8.1 | Move invites from Firebase Firestore polling → websocket private messages | High | Eliminates 5s polling latency + Firebase dependency |
| 8.2 | Create `voice/VoiceChatManager.ts` — WebRTC connection management | High | New infrastructure |
| 8.3 | Create `voice/useVoiceCapture.ts` — mic access + mute toggle | Medium | Browser API |
| 8.4 | Create `voice/useVoicePlayback.ts` — receive streams, play audio | Medium | Web Audio API |
| 8.5 | Create `voice/useSpatialAudio.ts` — 3D positioned audio relative to listener | Medium | Spatial math |
| 8.6 | Create `voice/useVoiceActivity.ts` — VAD detection → "who's talking" | Medium | Audio analysis |
| 8.7 | Create `ui/VoiceChatControls.tsx` — mute button + speaker indicators | Low | UI component |
| 8.8 | Create `scene/VoiceIndicator.tsx` — 3D talking indicator above players | Low | 3D UI |

---

### Target File Structure (all phases complete)

```
src/
├── config/
│   ├── character.ts              ← speed, rotation, scale (Phase 3)
│   ├── animation.ts              ← clip names, crossfade, layers (Phase 5)
│   ├── network.ts                ← broadcast Hz, snap distance, interp K (Phase 3)
│   └── postures.ts               ← posture definitions (Phase 6)
│
├── input/
│   ├── useKeyboardInput.ts       ← keysRef (Phase 3)
│   ├── useMovementInput.ts       ← keyboard + joystick → direction (Phase 3)
│   └── useCameraDrag.ts          ← pointer handlers (Phase 3)
│
├── character/
│   ├── useCharacterMovement.ts   ← camera-relative movement (Phase 3)
│   ├── usePlayerMovementFrame.ts ← LocalPlayer frame loop (Refactor #4)
│   ├── useNetworkBroadcast.ts    ← throttled position send (Phase 3)
│   └── useRemoteInterpolation.ts ← exp-decay lerp + snap (Phase 3)
│
├── animation/
│   ├── AnimationStateMachine.ts  ← pure class: states + transitions (Phase 5)
│   ├── useAnimationLoader.ts     ← multi-GLB clip loading (Phase 5)
│   ├── useLoopingAnimation.ts    ← crossfade state machine (Phase 5)
│   ├── useOneShotAnimation.ts    ← one-shot with revert (Phase 5)
│   ├── useAnimationLayers.ts     ← upper/full body blending (Phase 6+)
│   └── EmoteRegistry.ts          ← emote catalog (Phase 6+)
│
├── interaction/
│   ├── InteractionPoint.ts       ← anchor class (Phase 6)
│   ├── useInteractionDetection.ts← proximity check (Phase 6)
│   ├── usePlayerInteraction.ts   ← bundles keyboard + nearest + posture (Refactor #4)
│   ├── usePostureState.ts        ← enter/exit posture (Phase 6)
│   └── InteractionPrompt.tsx     ← "Press E" UI (Phase 6)
│
├── social/
│   ├── SocialState.ts            ← activity config (Phase 7)
│   ├── useSocialState.ts         ← host management (Phase 7)
│   ├── useRemoteSocialStates.ts  ← remote tracking (Phase 7)
│   ├── useSocialPrompt.ts        ← proximity prompts (Phase 7)
│   ├── useSocialFormation.ts     ← formation math (Phase 7)
│   └── SocialPromptBubble.tsx    ← 3D prompt (Phase 7)
│
├── voice/
│   ├── VoiceChatManager.ts       ← WebRTC (Phase 8)
│   ├── useVoiceCapture.ts        ← mic capture (Phase 8)
│   ├── useVoicePlayback.ts       ← stream playback (Phase 8)
│   ├── useSpatialAudio.ts        ← 3D audio (Phase 8)
│   └── useVoiceActivity.ts       ← VAD (Phase 8)
│
├── multiplayer/
│   ├── core/
│   │   ├── ConnectionManager.ts  ← state machine (Phase 2)
│   │   ├── MessageRouter.ts      ← register/dispatch (Phase 2)
│   │   └── PlayerStore.ts        ← unified Map<id, RemotePlayer> (Phase 1)
│   ├── features/
│   │   ├── useMovementSync.ts    ← position send/receive (Phase 2)
│   │   ├── useChatSync.ts        ← chat send/receive (Phase 2)
│   │   ├── useAvatarSync.ts      ← avatar send/receive (Phase 2)
│   │   ├── useAnimationSync.ts   ← animation send/receive (Phase 2)
│   │   ├── useEmoteSync.ts       ← emote send/receive (Phase 7)
│   │   ├── usePostureSync.ts     ← posture send/receive (Phase 6)
│   │   └── useVoiceSignaling.ts  ← WebRTC signaling (Phase 8)
│   ├── protocol.ts               ← ClientMessage / BroadcastMessage / PrivateMessage (Phase 1)
│   ├── types.ts                  ← RemotePlayer, ChatMessage (Phase 1)
│   └── useMultiplayer.ts         ← thin composer (Phase 2)
│
├── scene/
│   ├── LocalPlayer.tsx           ← composes movement + interaction + PlayerAvatar (Refactor #4)
│   ├── PlayerAvatar.tsx          ← group + AvatarGlbMesh + clip selection (Refactor #4)
│   ├── RemotePlayer.tsx          ← interpolation + AvatarModel (Phase 3)
│   ├── RemotePlayers.tsx         ← maps playerIds → RemotePlayer (unchanged)
│   ├── AvatarModel.tsx           ← GLB load + clone (Phase 5)
│   ├── AvatarGlbMesh.tsx         ← thin shell composing anim hooks (Phase 5)
│   ├── VoiceIndicator.tsx        ← 3D speaking indicator (Phase 8)
│   ├── ThirdPersonCamera.tsx     ← UNCHANGED
│   └── Joystick.tsx              ← UNCHANGED
│
├── ui/
│   ├── EmoteWheel.tsx            ← radial picker (Phase 7)
│   ├── VoiceChatControls.tsx     ← mute/speaker (Phase 8)
│   ├── ChatPanel.tsx             ← UNCHANGED
│   ├── RoomBrowser.tsx           ← UNCHANGED
│   ├── InvitesPanel.tsx          ← UNCHANGED (Firebase until Phase 8)
│   └── KickPanel.tsx             ← UNCHANGED
│
rundotserver/src/rooms/
├── core/
│   ├── PlayerManager.ts          ← server player state (Phase 4)
│   └── MessageRouter.ts          ← validate + dispatch (Phase 4)
├── handlers/
│   ├── MovementHandler.ts        ← speed/bounds validation (Phase 4)
│   ├── ChatHandler.ts            ← rate limit, sanitize (Phase 4)
│   ├── KickHandler.ts            ← owner verification (Phase 4)
│   └── SyncHandler.ts            ← requestSync (Phase 4)
├── BaseRoom.ts                   ← composes PlayerManager + handlers (Phase 4)
├── PlayerRoom.ts                 ← UNCHANGED
├── WorldRoom.ts                  ← UNCHANGED
├── AvatarRoom.ts                 ← UNCHANGED
└── types.ts                      ← updated protocol (Phase 1)
```

### Design Principles
- **Open/Closed:** features are added by creating new files, not rewriting existing ones
- **Single Responsibility:** each hook/file does exactly one thing
- **Pure logic vs React:** `AnimationStateMachine`, `VoiceChatManager`, `InteractionPoint`, `PlayerStore`, `ConnectionManager` are plain TS classes — unit-testable without React
- **Composition over inheritance:** `LocalPlayer` composes hooks, `useMultiplayer` composes feature hooks
- **Config-driven:** postures, emotes, social activities are data entries — zero code changes to add new ones
- **Direction-typed protocol:** compiler prevents sending server-only messages from client and vice versa
- **Feature isolation:** voice touches zero animation files, emotes touch zero movement files, postures touch zero chat files

### Layer Separation

| Layer | Concern | Example |
|---|---|---|
| Protocol | What messages exist | `ClientMessage`, `BroadcastMessage` |
| PlayerStore | Who is in the room | `Map<id, RemotePlayer>` |
| Feature Sync | How data flows over the wire | `useMovementSync`, `useChatSync` |
| Animation | What clip is playing | `'dance_loop'` |
| Posture | Is movement locked? | `locksMovement: true` |
| Social | Can others interact with me? | `'dancingOpen'`, max 4 players |

Six layers, each independent. The social layer *uses* postures but doesn't modify them. The posture layer *triggers* animations but doesn't manage crossfading.

---

## Fly.io — Colyseus server

**Layout:** `server/Dockerfile` expects **Docker build context = `echoAvatar/`** (so `src/multiplayer/protocol` is available for server imports). **`fly.toml`** lives in `echoAvatar/` and points `[build] dockerfile = "server/Dockerfile"`.

**Runtime:** `COLYSEUS_PORT=8080` matches Fly `[http_service] internal_port = 8080`. Production start is **`tsx src/index.ts`** (`tsx` is a runtime dependency) because plain `tsc` emit breaks under Node ESM without `.js` import suffixes.

**Client:** Set `VITE_COLYSEUS_URL=https://<your-app>.fly.dev` (no trailing slash) when building the game; the Colyseus client upgrades to `wss` automatically for `https` URLs.

**Fly deploy checklist (from `echoAvatar/`):**
1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/), then `fly auth login`.
2. First time: `fly launch --org <slug>` — use existing `fly.toml` when asked; **do not** change app name to collide with `avatar-creator-server` (that app uses `avatar-creator-server/fly.toml`). Pick region (e.g. `iad`).
3. Every deploy: `fly deploy`.
4. Client build: `VITE_COLYSEUS_URL=https://<app-name>.fly.dev` (no trailing slash).
5. Optional: `fly secrets set KEY=value`, `fly logs`, `fly status`.

---

## Render.com — Colyseus server

**Blueprint:** `moonshots/render.yaml` at **repository root** (Render only auto-loads `render.yaml` from the repo root). Uses `rootDir: echoAvatar`, same Docker build as Fly (`server/Dockerfile`, context `.` = `echoAvatar/`).

**Port:** Server listens on **`PORT`** first (Render injects it), then **`COLYSEUS_PORT`** (Fly). Dockerfile no longer hardcodes `COLYSEUS_PORT`.

**Client:** `VITE_COLYSEUS_URL=https://<service-name>.onrender.com` (no trailing slash).

**Manual setup (no Blueprint):** New → Web Service → Docker; root directory **`echoAvatar`**; Dockerfile path **`server/Dockerfile`**; Docker build context **`.`** (same as root directory).

---

## Trial Log
- **Render prep (2026-03-26):** Added `moonshots/render.yaml`; `server/src/index.ts` prefers `PORT` then `COLYSEUS_PORT`; Dockerfile env comment only (no fixed Colyseus port in image).
- **Fly.io prep (2026-03-26):** Added `server/Dockerfile`, `fly.toml`, `.dockerignore`; fixed server `start` to use `tsx` and moved `tsx` to `dependencies`; `build` = `tsc --noEmit`. Local `docker build` not run (Docker CLI absent on dev machine).
- **Colyseus server (2026-03-03):** Created 6-file server from reference pattern. Server boots and registers room on first attempt. No build/runtime errors.
- **Colyseus client (2026-03-03):** Created types, useColyseus hook, and RemotePlayers with snapshot interpolation. Two TS errors fixed (room.id→roomId, onError message optional). Build passes.
- **Phase 4 refactor (2026-03-05):** Full architecture refactor. Server: 2 new room classes (PlayerRoom, WorldRoom), updated app.config for 3 room types + world pre-creation + merged /rooms endpoint. Client: 7 new files (types, presets, HomeRoom, WorldEnvironment, ActiveTabContext, GameContext, InvitesPanel), 7 modified files (useColyseus with joinPlayerRoom mode, HomeTab 3D rewrite, WorldTab frameloop+WorldEnv+Invites, Ground stripped of lighting, types.ts with RoomType, RoomBrowser with roomType, App.tsx providers). One type error fixed (RoomType assignability in RoomBrowser). Both builds pass.