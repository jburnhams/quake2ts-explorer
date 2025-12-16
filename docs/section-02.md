# Section 02: Multiplayer Client

## Overview

Implement **Pattern 5: Multiplayer Client** from `docs/usage.md`. This adds network client capabilities with WebSocket communication, client-side prediction, and server browser, enabling players to connect to dedicated Quake II servers.

**Complexity**: High
**Dependencies**: Section 01 (requires single-player game foundation)
**Estimated Scope**: Network protocol, prediction, server browser, lobby UI, latency visualization

## Objectives

- Establish WebSocket connection to dedicated servers
- Implement client-side prediction for smooth local player movement
- Handle network protocol messages (entity updates, configstrings, events)
- Build server browser UI for server discovery and connection
- Display network diagnostics (ping, packet loss, prediction errors)
- Support graceful disconnection and error handling

## Current State

**Already Implemented** (from Section 01):
- Game simulation loop
- Input controller generating `UserCommand`
- Rendering system for entities and HUD
- Player state management

**Missing**:
- Network client implementation
- Client prediction system
- Server communication protocol
- Lobby and matchmaking UI
- Network diagnostics

## Tasks and Subtasks

### Task 1: Network Client Service

**Objective**: Create WebSocket-based network client for server communication.

#### Subtasks

- [x] **1.1**: Create `src/services/networkService.ts`
  - Export `connect(serverUrl: string): Promise<void>`
  - Export `disconnect(): void`
  - Export `sendCommand(cmd: UserCommand): void`
  - Export `onSnapshot?: (snapshot: GameStateSnapshot) => void`
  - Export `onDisconnect?: (reason: string) => void`
  - Store WebSocket instance

- [x] **1.2**: Implement WebSocket connection
  - Create WebSocket to `ws://` or `wss://` URL
  - Handle connection open event
    - Send client info (name, version, capabilities)
  - Handle connection close event
    - Call `onDisconnect` callback
    - Clean up resources
  - Handle connection error event
    - Retry with exponential backoff (max 3 retries)
    - Show error to user if all retries fail

- [x] **1.3**: Implement protocol message handling
  - Define message types:
    - `ServerInfo` - Server metadata (map, maxClients, gamemode)
    - `Snapshot` - Entity updates, player state
    - `Configstring` - Global server configuration
    - `Sound` - Positional sound events
    - `TempEntity` - Temporary visual effects
  - Parse incoming binary/JSON messages
  - Route to appropriate handlers

- [x] **1.4**: Implement outbound message sending
  - `sendCommand(cmd: UserCommand)` - Send player input
  - `sendChat(message: string)` - Send chat message
  - `sendClientCommand(cmd: string)` - Send console command to server
  - Queue messages if not connected
  - Throttle outbound rate to prevent flooding

- [x] **1.5**: Handle connection state
  - Track state: `'disconnected' | 'connecting' | 'connected' | 'error'`
  - Emit state change events
  - Prevent sending messages when disconnected

**File References**:
- Create: `src/services/networkService.ts`
- Reference: `@quake2ts/client` (`/packages/client/src/index.ts`)
- Reference: `@quake2ts/shared` (protocol types)

**Test Requirements**:
- Unit: `tests/unit/networkService.test.ts`
  - Mock WebSocket
  - Test connection lifecycle
  - Test message parsing and routing
  - Test error handling and retries
- Integration: `tests/integration/networkService.integration.test.ts`
  - Mock WebSocket server
  - Send/receive real protocol messages
  - Test connection timeout and retry

---

### Task 2: Client Prediction System

**Objective**: Implement client-side prediction to eliminate input lag despite network latency.

#### Subtasks

- [x] **2.1**: Create `src/services/predictionService.ts`
  - Import `ClientPrediction` from `@quake2ts/client`
  - Export `initPrediction(trace: TraceFunction, pointContents: PointContentsFunction): void`
  - Export `predict(serverState: PlayerState, commands: UserCommand[]): PredictionState`
  - Export `getMispredictionCount(): number`

- [x] **2.2**: Implement prediction integration
  - Store last N user commands (command history buffer, typically 32)
  - When server snapshot arrives:
    - Extract authoritative `PlayerState`
    - Run prediction from server time to current time using buffered commands
    - Compare predicted position to local simulated position
  - If mismatch detected (misprediction):
    - Replay from server state with buffered commands
    - Snap player to corrected position

- [ ] **2.3**: Handle prediction edge cases
  - Teleportation: Disable prediction for 1 frame after teleport
  - Large corrections: Smoothly interpolate to correct position if error < threshold
  - High latency: Cap prediction time to prevent spiral of death

- [x] **2.4**: Integrate with game loop
  - Modify `src/utils/gameLoop.ts` to use prediction instead of local game simulation
  - In `simulate()` callback:
    - Generate UserCommand
    - Send to server via network service
    - Run local prediction
  - In `render()` callback:
    - Render predicted player state
    - Render server-authoritative other entities

- [ ] **2.5**: Visualize prediction errors
  - Track misprediction count and magnitude
  - Display in debug overlay (Section 04)
  - Log large corrections to console

**File References**:
- Create: `src/services/predictionService.ts`
- Modify: `src/utils/gameLoop.ts` (use prediction)
- Reference: `@quake2ts/client` (`/packages/client/src/prediction.ts`)
- Reference: `@quake2ts/shared` (`/packages/shared/src/pmove/`)

**Test Requirements**:
- Unit: `tests/unit/predictionService.test.ts`
  - Mock trace and pointContents
  - Test prediction with no latency (should match exactly)
  - Test prediction with simulated latency
  - Test misprediction detection and correction
- Integration: `tests/integration/prediction.integration.test.ts`
  - Run prediction with real pmove and BSP collision
  - Verify determinism (same inputs = same outputs)

---

### Task 3: Server Browser UI

**Objective**: Discover and connect to available servers.

#### Subtasks

- [x] **3.1**: Create `src/components/ServerBrowser.tsx`
  - Display as modal overlay or dedicated screen
  - Show table of available servers with columns:
    - Server name
    - Map
    - Players (current/max)
    - Ping
    - Gamemode (DM, CTF, Coop)
  - Refresh button to re-query servers
  - Connect button to join selected server

- [x] **3.2**: Implement server discovery
  - Option 1: Manual server entry (IP:port)
  - Option 2: Master server query (if available)
    - **Library Enhancement Needed**: Master server client
    - Fallback: Hardcoded server list or community-maintained JSON
  - Option 3: LAN broadcast discovery (WebRTC data channels)

- [x] **3.3**: Implement server ping
  - Send UDP-like ping packet via WebSocket
  - Measure round-trip time
  - Display latency in milliseconds
  - Color-code by latency (green <50ms, yellow <100ms, red >100ms)

- [x] **3.4**: Implement server info query
  - Query server for metadata (name, map, players, rules)
  - Parse response and populate table
  - Handle query timeout (mark server as offline)

- [x] **3.5**: Handle connection flow
  - Click "Connect" button
  - Show connecting dialog with progress
  - Call `networkService.connect(serverUrl)`
  - On success: Hide browser, enter game mode
  - On failure: Show error, return to browser

- [ ] **3.6**: Add favorites and history
  - Store favorite servers in localStorage
  - Show recently connected servers
  - Quick-connect to favorites

**File References**:
- Create: `src/components/ServerBrowser.tsx`
- Create: `src/components/ServerBrowser.css`
- Modify: `src/services/networkService.ts` (add ping/query methods)
- Create: `src/services/masterServerService.ts` (if master server available)

**Test Requirements**:
- Unit: `tests/unit/ServerBrowser.test.tsx`
  - Render with mock server list
  - Test server selection
  - Test connect button
  - Test favorites and history
- Integration: `tests/integration/serverBrowser.integration.test.tsx`
  - Mock server query responses
  - Test connection flow

---

### Task 4: Lobby and Matchmaking UI

**Objective**: Provide pre-game lobby for chat, team selection, and ready status.

#### Subtasks

- [ ] **4.1**: Create `src/components/Lobby.tsx`
  - Display after successful server connection
  - Show connected players list with names, teams, ready status
  - Chat interface (message log + input)
  - Team selection buttons (Red, Blue, Spectator)
  - Ready button (toggle ready state)
  - Leave button (disconnect)

- [ ] **4.2**: Implement chat system
  - Create `src/services/chatService.ts`
  - `sendMessage(text: string): void` - Send chat via network
  - `onMessage?: (sender: string, text: string) => void` - Receive chat
  - Store chat history
  - Support team chat vs all chat

- [ ] **4.3**: Implement team selection
  - Send team change command to server
  - Server responds with updated player list
  - Update UI to reflect team assignments
  - Balance teams (show player count per team)

- [ ] **4.4**: Implement ready system
  - Toggle ready state locally
  - Send ready status to server
  - Server tracks ready count
  - When all players ready, server starts match
  - Display countdown before match starts

- [ ] **4.5**: Handle lobby events
  - Player joined: Add to player list, show chat notification
  - Player left: Remove from list, show notification
  - Map change: Update map name display
  - Match start: Hide lobby, enter game mode

**File References**:
- Create: `src/components/Lobby.tsx`
- Create: `src/components/Lobby.css`
- Create: `src/services/chatService.ts`
- Modify: `src/services/networkService.ts` (add lobby message handlers)

**Test Requirements**:
- Unit: `tests/unit/Lobby.test.tsx`
  - Render with mock player list
  - Test chat message send/receive
  - Test team selection
  - Test ready toggle
- Unit: `tests/unit/chatService.test.ts`
  - Test message queuing
  - Test chat history

---

### Task 5: Network Diagnostics UI

**Objective**: Display real-time network statistics for debugging and monitoring.

#### Subtasks

- [ ] **5.1**: Create `src/components/NetGraph.tsx`
  - Small overlay in corner of screen (toggleable with net_graph cvar)
  - Display metrics:
    - Ping (round-trip time)
    - Packet loss percentage
    - Client FPS
    - Server tickrate
    - Prediction errors (misprediction count)

- [ ] **5.2**: Implement metrics tracking
  - Modify `src/services/networkService.ts`:
    - Track sent/received packet counts
    - Track acknowledgments and losses
    - Calculate packet loss percentage over rolling window
  - Modify `src/services/predictionService.ts`:
    - Count mispredictions per second
    - Track average correction magnitude

- [ ] **5.3**: Implement ping measurement
  - Send timestamp with each UserCommand
  - Server echoes timestamp in snapshot
  - Calculate RTT = current time - echoed timestamp
  - Display smoothed average (exponential moving average)

- [ ] **5.4**: Visualize network quality
  - Green: Good (ping <50ms, loss <1%)
  - Yellow: Acceptable (ping <100ms, loss <5%)
  - Red: Poor (ping >100ms, loss >5%)
  - Flashing red: Severe (packet loss spike, timeout imminent)

- [ ] **5.5**: Add detailed statistics panel
  - Toggle with F3 or console command
  - Show full breakdown:
    - Upload/download bandwidth
    - Packet send/receive rates
    - Snapshot frequency
    - Command buffer size
    - Last 100 ping samples (graph)
  - Useful for debugging network issues

**File References**:
- Create: `src/components/NetGraph.tsx`
- Create: `src/components/NetGraph.css`
- Create: `src/components/NetworkStats.tsx` (detailed panel)
- Modify: `src/services/networkService.ts` (add metrics tracking)
- Modify: `src/services/predictionService.ts` (expose misprediction stats)

**Test Requirements**:
- Unit: `tests/unit/NetGraph.test.tsx`
  - Render with mock metrics
  - Test color coding by quality
- Unit: `tests/unit/networkService.metrics.test.ts`
  - Test ping calculation
  - Test packet loss calculation
  - Test moving averages

---

### Task 6: Multiplayer Game Mode Integration

**Objective**: Integrate multiplayer into application flow.

#### Subtasks

- [ ] **6.1**: Add multiplayer entry point
  - Modify `src/App.tsx` to support mode: `'browser' | 'singleplayer' | 'multiplayer'`
  - Add "Multiplayer" button to main menu
  - Shows server browser on click

- [ ] **6.2**: Modify game loop for multiplayer
  - Detect multiplayer mode
  - Skip local game simulation
  - Use client prediction instead
  - Render server snapshots for other entities
  - Render predicted state for local player

- [ ] **6.3**: Handle disconnection
  - Server disconnects client → Show disconnect reason, return to server browser
  - Client disconnects intentionally → Send disconnect message, return to browser
  - Connection timeout → Auto-disconnect after N seconds without snapshot

- [ ] **6.4**: Support spectator mode
  - Allow joining as spectator (no team)
  - Free camera movement
  - Cycle between player views
  - Display spectator UI (different HUD)

- [ ] **6.5**: Handle map changes
  - Server sends map change command
  - Client downloads/loads new map
  - Show loading screen during transition
  - Rejoin automatically when loaded

**File References**:
- Modify: `src/App.tsx` (add multiplayer mode)
- Modify: `src/utils/gameLoop.ts` (support multiplayer simulation)
- Modify: `src/hooks/usePakExplorer.ts` (add multiplayer state)
- Create: `src/components/SpectatorHUD.tsx`

**Test Requirements**:
- Integration: `tests/integration/multiplayer.integration.test.tsx`
  - Mock WebSocket server
  - Connect client
  - Send snapshots
  - Verify rendering
  - Disconnect and verify cleanup

---

## Acceptance Criteria

Section 02 is complete when:

- ✅ User can open server browser and see list of available servers
- ✅ User can connect to a server via WebSocket
- ✅ User can join lobby, select team, mark ready, and chat
- ✅ Client prediction runs smoothly with no visible input lag (<100ms latency)
- ✅ Network diagnostics display ping, packet loss, and prediction errors
- ✅ User can play multiplayer match with other players
- ✅ User can spectate matches as observer
- ✅ Disconnection is handled gracefully with error messages
- ✅ All code has 90%+ unit test coverage
- ✅ Integration tests verify client-server communication with mock server

## Library Dependencies

**Required from quake2ts**:
- `@quake2ts/client`: `ClientPrediction`, `InputController`
- `@quake2ts/shared`: `UserCommand`, `PlayerState`, `EntityState`, protocol types
- `@quake2ts/server` (for reference): Network protocol specification

**Enhancements Needed** (see `library-enhancements.md`):
- Master server client API (for server discovery)
- WebSocket protocol documentation (if not already available)
- Spectator mode APIs (camera override for spectators)

## Notes

- Multiplayer depends on Section 01 single-player foundation
- Server browser could be extended with community features (favorites, filters, search)
- Chat system will be reused in Section 07 for mod/clan features
- Network diagnostics will inform Section 09 performance optimizations
- Spectator mode is foundation for demo recording enhancements (Section 03)
