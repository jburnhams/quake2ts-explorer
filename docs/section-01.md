# Section 01: Single Player Game Mode

## Overview

Implement **Pattern 4: Single Player Game** from `docs/usage.md`. This adds full game simulation with physics, AI, combat, and HUD rendering, transforming the application from a viewer into a playable game.

**Complexity**: High
**Dependencies**: None (foundation for other game features)
**Estimated Scope**: Core gameplay loop, input handling, HUD, save/load system

## Objectives

- Integrate `@quake2ts/game` package for authoritative game simulation
- Implement `@quake2ts/engine` FixedTimestepLoop for 40Hz game ticks
- Create input controller with configurable key bindings
- Render player HUD (health, ammo, armor, weapons, crosshair)
- Support game state persistence (save/load)
- Provide console interface for commands and cheats

## Current State

**Already Implemented**:
- Asset loading (PAK files, VFS) via `src/services/pakService.ts`
- Rendering infrastructure via `src/components/UniversalViewer/`
- Camera system in `src/utils/cameraUtils.ts`, `src/utils/camera.ts`

**Missing**:
- Game simulation integration
- Player input handling beyond camera controls
- HUD rendering
- Entity AI and behavior
- Weapon system
- Save/load functionality

## Tasks and Subtasks

### Task 1: Game Service Foundation

**Objective**: Create service layer for game simulation lifecycle.

#### Subtasks

- [x] **1.1**: Create `src/services/gameService.ts`
  - Export `createGameSimulation(vfs: VirtualFileSystem, mapName: string): GameSimulation`
  - Export interface `GameSimulation` with methods: `start()`, `stop()`, `tick(deltaMs: number, cmd: UserCommand)`, `getSnapshot(): GameStateSnapshot`
  - Import `createGame, GameImports, GameExports` from `@quake2ts/game`
  - Import `AssetManager` from `@quake2ts/engine`
  - Implement `GameImports` interface methods (trace, pointcontents, multicast, unicast, configstring, etc.)
  - Store game instance and expose via service singleton

- [x] **1.2**: Implement game imports callbacks
  - Define `trace(start: Vec3, mins: Vec3, maxs: Vec3, end: Vec3, passent: Entity | null, contentmask: number): GameTraceResult`
    - Delegate to BSP collision detection (from loaded map)
  - Define `pointcontents(point: Vec3): number`
    - Query BSP leaf contents
  - Define `configstring(index: number, value: string): void`
    - Store in Map for client consumption
  - Define `soundIndex(name: string): number`, `modelIndex(name: string): number`, `imageIndex(name: string): number`
    - Register assets and return index

- [x] **1.3**: Create game lifecycle methods
  - `initGame(mapName: string, options: GameCreateOptions): void`
    - Load map via `assetManager.getMap(mapName)`
    - Call `game.init()`
    - Find player start position from BSP entities
  - `shutdownGame(): void`
    - Call `game.shutdown()`
    - Clean up resources
  - `resetGame(): void`
    - Restart current map

- [x] **1.4**: Implement game state snapshot conversion
  - Convert `GameStateSnapshot` from library to application state format
  - Extract `PlayerState` for rendering
  - Extract `EntityState[]` for entity rendering
  - Extract `GameEvent[]` for audio/visual effects

**File References**:
- Create: `src/services/gameService.ts`
- Reference: `@quake2ts/game` (`/packages/game/src/index.ts`)
- Reference: `src/services/pakService.ts` (asset access pattern)

**Test Requirements**:
- Unit: `tests/unit/gameService.test.ts`
  - Mock `createGame` and verify initialization
  - Test game lifecycle (init, tick, shutdown)
  - Verify game imports callbacks are called correctly
- Integration: `tests/integration/gameService.integration.test.ts`
  - Load real map and run game simulation for 100 frames
  - Verify player spawns correctly
  - Verify entities are created from BSP entity list

---

### Task 2: Fixed Timestep Loop Integration

**Objective**: Implement game loop that runs simulation at 40Hz with rendering interpolation.

#### Subtasks

- [ ] **2.1**: Create `src/utils/gameLoop.ts`
  - Import `FixedTimestepLoop` from `@quake2ts/engine`
  - Export `createGameLoop(simulate: (deltaMs: number) => void, render: (alpha: number) => void): GameLoop`
  - Export interface `GameLoop` with methods: `start()`, `stop()`, `isRunning(): boolean`
  - Store loop instance and RAF handle

- [ ] **2.2**: Implement loop callbacks
  - Define `simulate(deltaMs: number)` callback
    - Generate `UserCommand` from input controller
    - Call `gameService.tick(deltaMs, cmd)`
  - Define `render(alpha: number)` callback
    - Get snapshot from game service
    - Interpolate entity positions using `alpha`
    - Render frame via existing `UniversalViewer`

- [ ] **2.3**: Connect loop to game mode activation
  - Add `startGameMode(mapName: string)` to application hook
  - Initialize game service and loop
  - Start loop with `requestAnimationFrame`
  - Stop loop on component unmount or mode switch

- [ ] **2.4**: Handle pause/resume
  - Add `pauseGame()` and `resumeGame()` methods
  - Store paused state and skip simulation when paused
  - Continue rendering paused state

**File References**:
- Create: `src/utils/gameLoop.ts`
- Modify: `src/hooks/usePakExplorer.ts` (add game mode state)
- Reference: `@quake2ts/engine` (`/packages/engine/src/loop/fixedTimestep.ts`)

**Test Requirements**:
- Unit: `tests/unit/gameLoop.test.ts`
  - Mock RAF and verify tick rate
  - Verify simulation called at 40Hz
  - Verify render called with correct alpha
  - Test pause/resume behavior
- Integration: `tests/integration/gameLoop.integration.test.ts`
  - Run loop for 1 second and verify ~40 simulation ticks
  - Verify smooth rendering between ticks

---

### Task 3: Input Controller

**Objective**: Capture keyboard/mouse input and generate `UserCommand` for game simulation.

#### Subtasks

- [ ] **3.1**: Create `src/services/inputService.ts`
  - Import `InputController, KeyBindings` from `@quake2ts/client`
  - Export `initInputController(bindings?: KeyBindings): void`
  - Export `generateUserCommand(deltaMs: number): UserCommand`
  - Store active keys, mouse movement, button states

- [ ] **3.2**: Define default key bindings
  - Create `src/config/defaultBindings.ts`
  - Export `DEFAULT_BINDINGS: KeyBindings`
    - Movement: W/A/S/D, Space (jump), Ctrl (crouch)
    - Look: Mouse X/Y
    - Actions: Mouse1 (attack), E (use), R (reload)
    - Weapons: 1-9 (weapon select), Q/E (next/prev)
  - Support rebinding via settings (Section 08)

- [ ] **3.3**: Implement input handlers
  - Create `handleKeyDown(event: KeyboardEvent): void`
    - Prevent default for game keys
    - Update active keys set
  - Create `handleKeyUp(event: KeyboardEvent): void`
    - Remove from active keys set
  - Create `handleMouseMove(event: MouseEvent): void`
    - Accumulate delta X/Y
    - Apply mouse sensitivity
  - Create `handleMouseDown/Up(event: MouseEvent): void`
    - Track button states

- [ ] **3.4**: Generate UserCommand from input state
  - Implement `generateUserCommand(deltaMs: number): UserCommand`
    - Map active keys to `forwardmove`, `sidemove`, `upmove` (-400 to 400)
    - Map mouse delta to `angles` (pitch/yaw)
    - Map buttons to `buttons` bitfield (BUTTON_ATTACK, BUTTON_USE, etc.)
    - Set `msec` to deltaMs
    - Clear accumulated mouse delta after generation

- [ ] **3.5**: Integrate with game loop
  - Call `inputService.generateUserCommand(deltaMs)` in loop's `simulate` callback
  - Pass command to `gameService.tick(deltaMs, cmd)`

- [ ] **3.6**: Handle input mode switching
  - Disable game input when in menu/console
  - Re-enable when returning to game
  - Pointer lock for mouse capture (request on game start)

**File References**:
- Create: `src/services/inputService.ts`
- Create: `src/config/defaultBindings.ts`
- Modify: `src/utils/gameLoop.ts` (use input service)
- Reference: `@quake2ts/client` (`/packages/client/src/input/controller.ts`)

**Test Requirements**:
- Unit: `tests/unit/inputService.test.ts`
  - Verify key presses generate correct move values
  - Verify mouse movement generates correct angles
  - Verify button presses set correct bitfield
  - Test input buffering and reset
- Unit: `tests/unit/inputService.bindings.test.ts`
  - Test custom key bindings
  - Test binding conflicts detection

---

### Task 4: HUD Rendering

**Objective**: Display player stats (health, ammo, armor) and game UI (crosshair, messages).

#### Subtasks

- [ ] **4.1**: Create `src/components/GameHUD.tsx`
  - Accept `playerState: PlayerState` prop
  - Render as overlay on top of 3D canvas
  - Use absolute positioning with pointer-events: none (except interactive elements)

- [ ] **4.2**: Implement HUD layout
  - Bottom-left: Health, Armor
  - Bottom-right: Ammo, Weapon
  - Bottom-center: Pickup messages, obituaries
  - Top-center: Objectives, timer (if applicable)
  - Center: Crosshair (small dot, changes color when over target)

- [ ] **4.3**: Extract stats from PlayerState
  - Health: `playerState.stats[STAT_HEALTH]`
  - Armor: `playerState.stats[STAT_ARMOR]`
  - Ammo: `playerState.stats[STAT_AMMO]`
  - Active weapon: `playerState.stats[STAT_WEAPON]`
  - Inventory items: `playerState.stats[STAT_*]`
  - Reference protocol constants from `@quake2ts/shared`

- [ ] **4.4**: Render weapon icons
  - Load weapon icons from PAK (pics/w_*.pcx)
  - Display current weapon icon
  - Highlight selected weapon in weapon wheel (if implemented)

- [ ] **4.5**: Implement damage/pickup flash effects
  - Detect health/armor changes
  - Flash red on damage (screen blend)
  - Flash green/blue on pickup
  - Use CSS animations or canvas overlay

- [ ] **4.6**: Center print messages
  - Display centerprint messages from `PlayerState.centerprint` (if available)
  - Auto-dismiss after timeout
  - Support multi-line text

- [ ] **4.7**: Death screen
  - Detect `playerState.stats[STAT_HEALTH] <= 0`
  - Display death overlay with respawn button
  - Show death reason (if available from game events)

**File References**:
- Create: `src/components/GameHUD.tsx`
- Create: `src/components/GameHUD.css` (styles)
- Reference: `@quake2ts/shared` (`/packages/shared/src/protocol/`)
- Modify: `src/components/UniversalViewer/UniversalViewer.tsx` (add HUD overlay)

**Test Requirements**:
- Unit: `tests/unit/GameHUD.test.tsx`
  - Render with mock PlayerState
  - Verify health/armor/ammo display
  - Verify death screen on health <= 0
  - Test damage flash animation
- Integration: `tests/integration/gameHUD.integration.test.tsx`
  - Render HUD with real game snapshot
  - Verify all stats displayed correctly

---

### Task 5: Game State Persistence (Save/Load)

**Objective**: Allow players to save game progress and load from saved state.

#### Subtasks

- [ ] **5.1**: Create `src/services/saveService.ts`
  - Export `saveGame(slot: number, name: string): Promise<void>`
  - Export `loadGame(slot: number): Promise<SavedGame>`
  - Export `listSaves(): SavedGame[]`
  - Export `deleteSave(slot: number): void`
  - Use `localStorage` for save data (or IndexedDB for larger saves)

- [ ] **5.2**: Define save data format
  - Create interface `SavedGame`:
    - `slot: number`
    - `name: string`
    - `timestamp: number`
    - `mapName: string`
    - `playerState: PlayerState`
    - `gameState: SerializedGameState` (from library if available, else custom)
    - `screenshot?: string` (base64 thumbnail)

- [ ] **5.3**: Implement save game
  - Capture current game snapshot
  - Serialize to JSON
  - Store in localStorage with key `quake2ts-save-${slot}`
  - Capture canvas screenshot for thumbnail

- [ ] **5.4**: Implement load game
  - Read save data from localStorage
  - Deserialize JSON
  - Restore game state via `gameService.loadState(savedGame.gameState)`
    - **Library Enhancement Needed**: `Game.loadState()` method
    - If not available, restart map and restore player position/inventory manually
  - Resume game loop

- [ ] **5.5**: Create save/load UI
  - Add "Save Game" button to pause menu (Section 08)
  - Show save slot selection dialog
  - Allow naming saves
  - Display save list with thumbnails and metadata
  - Add "Load Game" button with slot selection
  - Confirm before overwriting existing save

- [ ] **5.6**: Handle save failures
  - Catch localStorage quota errors
  - Show error message to user
  - Optionally export save to file download

**File References**:
- Create: `src/services/saveService.ts`
- Create: `src/components/SaveLoadDialog.tsx`
- Modify: `src/services/gameService.ts` (add loadState method)
- **Library Enhancement**: Request `Game.serialize()` and `Game.loadState()` in `library-enhancements.md`

**Test Requirements**:
- Unit: `tests/unit/saveService.test.ts`
  - Mock localStorage
  - Test save/load round-trip
  - Test slot management
  - Test quota error handling
- Integration: `tests/integration/saveLoad.integration.test.ts`
  - Save game state, load, verify state matches
  - Test with real PlayerState data

---

### Task 6: Console Interface

**Objective**: Provide developer console for commands, cheats, and debugging.

#### Subtasks

- [ ] **6.1**: Create `src/components/Console.tsx`
  - Toggle with backtick (`) or F1 key
  - Overlay at top of screen, semi-transparent background
  - Command input field at bottom
  - Scrollable output log above
  - Command history (up/down arrows)

- [ ] **6.2**: Implement console command system
  - Create `src/services/consoleService.ts`
  - Export `registerCommand(name: string, handler: (args: string[]) => void): void`
  - Export `executeCommand(input: string): void`
  - Parse command string into name and arguments
  - Call registered handler

- [ ] **6.3**: Register default commands
  - `map <mapname>` - Load map
  - `quit` - Return to file browser
  - `restart` - Restart current map
  - `save <slot> <name>` - Save game
  - `load <slot>` - Load game
  - `give <item>` - Give item/weapon (cheat)
  - `god` - Toggle god mode (cheat)
  - `noclip` - Toggle noclip (cheat)
  - `notarget` - Toggle notarget (cheat)
  - `kill` - Suicide

- [ ] **6.4**: Integrate with game service
  - Commands like `give`, `god`, `noclip` require game API
    - **Library Enhancement Needed**: Expose cheat/admin APIs
    - If unavailable, implement via direct entity manipulation
  - `map` command calls `gameService.initGame(mapName)`

- [ ] **6.5**: Add console output logging
  - Redirect game messages to console output
  - Show errors, warnings, info messages
  - Add timestamps
  - Support colored output (error=red, warn=yellow, info=white)

- [ ] **6.6**: Implement autocomplete
  - Show suggestions when typing
  - Tab completion for commands
  - Show command syntax hints

**File References**:
- Create: `src/components/Console.tsx`
- Create: `src/components/Console.css`
- Create: `src/services/consoleService.ts`
- Modify: `src/services/gameService.ts` (integrate console commands)
- **Library Enhancement**: Request admin/cheat APIs in `library-enhancements.md`

**Test Requirements**:
- Unit: `tests/unit/consoleService.test.ts`
  - Test command registration and execution
  - Test argument parsing
  - Test unknown command handling
- Unit: `tests/unit/Console.test.tsx`
  - Render console
  - Test toggle visibility
  - Test command input and submission
  - Test history navigation

---

### Task 7: Game Mode UI Integration

**Objective**: Add UI to enter/exit game mode and switch maps.

#### Subtasks

- [ ] **7.1**: Modify `src/App.tsx`
  - Add state for current mode: `'browser' | 'game'`
  - Conditionally render browser UI or game UI based on mode

- [ ] **7.2**: Create "Play" button for BSP files
  - Modify `src/components/PreviewPanel.tsx`
  - Add "Play Map" button when BSP file selected
  - Button calls `setMode('game')` and `startGameMode(selectedFile)`

- [ ] **7.3**: Create in-game menu overlay
  - Pause game when menu opened (ESC key)
  - Show menu options:
    - Resume
    - Save Game
    - Load Game
    - Settings (Section 08)
    - Return to Browser
  - Blur background, show menu centered

- [ ] **7.4**: Handle mode transitions
  - Browser → Game: Initialize game service, start loop, capture input
  - Game → Browser: Stop loop, shutdown game, release pointer lock
  - Clean up resources on transition

- [ ] **7.5**: Add loading screen
  - Show progress when loading map assets
  - Display map name, loading bar
  - Hide when game ready

**File References**:
- Modify: `src/App.tsx`
- Modify: `src/components/PreviewPanel.tsx`
- Create: `src/components/GameMenu.tsx`
- Create: `src/components/LoadingScreen.tsx`
- Modify: `src/hooks/usePakExplorer.ts` (add game mode state)

**Test Requirements**:
- Unit: `tests/unit/GameMenu.test.tsx`
  - Render menu
  - Test button interactions
  - Test ESC key toggle
- Integration: `tests/integration/gameMode.integration.test.tsx`
  - Switch from browser to game mode
  - Verify game initializes
  - Switch back to browser, verify cleanup

---

## Acceptance Criteria

Section 01 is complete when:

- ✅ User can select a BSP map and click "Play Map" to enter game mode
- ✅ Game simulation runs at 40Hz with smooth 60 FPS rendering
- ✅ Player can move (WASD), look (mouse), jump (Space), crouch (Ctrl)
- ✅ Player can shoot weapons (Mouse1) and use items (E)
- ✅ HUD displays health, armor, ammo, weapon correctly
- ✅ Player can save game to multiple slots and load saved games
- ✅ Console opens with backtick, accepts commands, executes cheats
- ✅ Pause menu (ESC) allows resume, save, load, return to browser
- ✅ Loading screen shows when starting game mode
- ✅ All code has 90%+ unit test coverage
- ✅ Integration tests verify full gameplay loop with real PAK files

## Library Dependencies

**Required from quake2ts**:
- `@quake2ts/game`: `createGame()`, `GameImports`, `GameExports`
- `@quake2ts/engine`: `FixedTimestepLoop`, `AssetManager`
- `@quake2ts/client`: `InputController`, `KeyBindings`
- `@quake2ts/shared`: Protocol constants (`STAT_*`, `BUTTON_*`), `UserCommand`, `PlayerState`

**Enhancements Needed** (see `library-enhancements.md`):
- `Game.serialize()` and `Game.loadState()` for save/load
- Admin/cheat APIs: `setGodMode()`, `setNoclip()`, `giveItem()`, etc.
- Debug hooks for console logging

## Notes

- Single-player mode is foundation for Section 02 (Multiplayer) and Section 07 (Mods)
- Input controller will be extended in Section 08 for custom bindings UI
- HUD can be enhanced in Section 04 with debug overlays
- Console will be extended in Section 10 with help system
