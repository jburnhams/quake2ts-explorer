# Section 07: Mod Support

## Overview

Enable loading and running Quake II mods (modifications) and custom content. Mods extend the base game with new mechanics, entities, assets, and gameplay. This section makes the application a platform for mod developers and players.

**Complexity**: Medium
**Dependencies**: Section 01 (requires game simulation for mod execution)
**Estimated Scope**: Mod detection, PAK priority system, custom entity registration, mod UI, compatibility checking

## Objectives

- Detect installed mods from PAK files and directory structure
- Implement PAK mounting priority (mod PAKs override base PAKs)
- Support custom entity spawn function registration
- Execute mod initialization scripts (if library supports)
- Build mod selection UI with metadata display
- Validate mod compatibility and show warnings
- Provide mod configuration interface

## Current State

**Already Implemented**:
- PAK file loading via `src/services/pakService.ts`
- Multiple PAK mounting via VirtualFileSystem

**Missing**:
- Mod detection logic
- PAK priority/override system (currently last-loaded wins, but not explicit)
- Custom entity registration
- Mod metadata parsing
- Mod selection UI
- Mod compatibility checking

## Tasks and Subtasks

### Task 1: Mod Detection and Metadata

**Objective**: Automatically detect mods from PAK files and parse mod information.

#### Subtasks

- [x] **1.1**: Define mod structure
  - Mods are identified by:
    - Separate PAK files (e.g., `rogue.pak`, `xatrix.pak`, `chaosmod.pak`)
    - Optional `mod.json` metadata file inside PAK
    - Directory-based mods (if supporting loose files later)

- [x] **1.2**: Create `src/services/modDetectionService.ts`
  - Export `detectMods(vfs: VirtualFileSystem): ModInfo[]`
  - Scan VFS for `mod.json` files
  - Parse metadata
  - Return list of detected mods

- [x] **1.3**: Define `ModInfo` interface
  - `id`: Unique identifier (e.g., "rogue", "chaosmod")
  - `name`: Display name (e.g., "Ground Zero")
  - `version`: Mod version
  - `author`: Creator name
  - `description`: Brief description
  - `pakFiles`: List of PAK files belonging to this mod
  - `dependencies`: Required base game or other mods
  - `homepage`: Link to mod website/repo
  - `thumbnail`: Icon or screenshot (base64 or URL)

- [x] **1.4**: Implement metadata parsing
  - Read `mod.json` from VFS
  - Parse JSON
  - Validate required fields
  - Fallback to defaults if mod.json missing (detect from PAK filename)

- [x] **1.5**: Support official expansions
  - Detect Rogue (Ground Zero) and Xatrix (The Reckoning) expansions
  - **Library Enhancement Needed**: Library supports expansion content
  - Pre-populate metadata for official expansions

**File References**:
- Create: `src/services/modDetectionService.ts`
- Create: `src/types/modInfo.ts`
- Reference: `src/services/pakService.ts` (VFS access)

**Test Requirements**:
- Unit: `tests/unit/modDetectionService.test.ts`
  - Mock VFS with mod.json
  - Test metadata parsing
  - Test fallback for missing metadata
- Integration: `tests/integration/modDetection.integration.test.ts`
  - Load PAK with mod.json, verify detection

---

### Task 2: PAK Priority and Override System

**Objective**: Ensure mod PAKs correctly override base game assets.

#### Subtasks

- [x] **2.1**: Implement PAK priority levels
  - Modify `src/services/pakService.ts`
  - Assign priority to each PAK:
    - Base game: Priority 0
    - Official expansions: Priority 50
    - Custom mods: Priority 100 (higher priority = later override)
  - Store PAKs sorted by priority

- [x] **2.2**: Modify VFS lookup to respect priority
  - When reading file, search PAKs in reverse priority order (highest first)
  - First match wins (higher priority PAK overrides lower)
  - **Library Enhancement Needed**: VirtualFileSystem priority support
    - If not available, implement wrapper service

- [x] **2.3**: Add explicit PAK ordering UI
  - Create `src/components/PakOrderManager.tsx`
  - List all mounted PAKs with drag-to-reorder
  - Show which files each PAK provides
  - Highlight overridden files (grayed out in lower-priority PAKs)

- [ ] **2.4**: Implement mod profiles
  - Save PAK load order as "profile" (e.g., "Base Game", "Ground Zero", "My Custom Mod")
  - Quick-switch between profiles
  - Store in localStorage

- [ ] **2.5**: Handle conflicting assets
  - Detect when multiple PAKs provide same file
  - Show warning if unexpected override (e.g., mod overrides core game files)
  - Allow user to resolve conflicts manually

**File References**:
- Modify: `src/services/pakService.ts` (priority system)
- Create: `src/components/PakOrderManager.tsx`
- Create: `src/services/modProfileService.ts`

**Test Requirements**:
- Unit: `tests/unit/pakService.priority.test.ts`
  - Mount PAKs with different priorities
  - Verify correct file override behavior
- Unit: `tests/unit/PakOrderManager.test.tsx`
  - Render PAK list
  - Test reordering

---

### Task 3: Custom Entity Registration

**Objective**: Allow mods to register custom entity spawn functions.

#### Subtasks

- [ ] **3.1**: Create `src/services/customEntityService.ts`
  - Export `registerEntitySpawn(classname: string, factory: EntityFactory): void`
  - Export `getEntitySpawn(classname: string): EntityFactory | null`
  - Maintain registry of custom entities

- [ ] **3.2**: Define `EntityFactory` interface
  - ```typescript
    type EntityFactory = (entity: Entity, world: GameWorld) => void
    ```
  - Factory initializes entity properties and behavior
  - `world` provides access to game APIs (trace, spawning, etc.)

- [ ] **3.3**: Integrate with game service (Section 01)
  - Modify `src/services/gameService.ts`
  - When spawning entities, check custom registry first
  - Fall back to library's built-in entity spawns
  - **Library Enhancement Needed**: Custom entity registration API
    - If library doesn't support, implement via wrapper

- [ ] **3.4**: Support mod entity definitions in JSON
  - Allow mods to define entities declaratively
  - Create `entities.json` in mod PAK:
    ```json
    {
      "custom_laser_trap": {
        "classname": "custom_laser_trap",
        "model": "models/laser.md2",
        "health": 100,
        "damage": 25,
        "sound": "weapons/laser.wav",
        "think": "laser_trap_think"
      }
    }
    ```
  - Parse and register at mod load time

- [ ] **3.5**: Implement mod initialization hooks
  - Call mod's `init()` function on game start
  - Pass game API to mod code
  - **Library Enhancement Needed**: Mod initialization API
  - If library doesn't support, use declarative JSON approach only

**File References**:
- Create: `src/services/customEntityService.ts`
- Modify: `src/services/gameService.ts` (integrate custom entities)
- Create: `src/parsers/modEntityParser.ts`

**Test Requirements**:
- Unit: `tests/unit/customEntityService.test.ts`
  - Test entity registration
  - Test spawn function lookup
- Unit: `tests/unit/modEntityParser.test.ts`
  - Parse entities.json
  - Test entity creation from JSON
- Integration: `tests/integration/customEntities.integration.test.ts`
  - Register custom entity, spawn in game, verify behavior

---

### Task 4: Mod Selection UI

**Objective**: User-friendly interface for browsing and activating mods.

#### Subtasks

- [ ] **4.1**: Create `src/components/ModBrowser.tsx`
  - Modal overlay or dedicated screen
  - List of detected mods with cards:
    - Mod thumbnail
    - Name and version
    - Author
    - Description (truncated, expand on click)
    - "Activate" / "Deactivate" button

- [ ] **4.2**: Implement mod activation
  - Click "Activate" to load mod's PAKs
  - Mount PAKs with appropriate priority
  - Register custom entities
  - Reload current map (or prompt user to restart)

- [ ] **4.3**: Display mod details panel
  - Click mod card to show full details:
    - Full description
    - Screenshots (if provided in mod metadata)
    - Changelog
    - Dependencies (show status: met/missing)
    - Conflicts (if any)
    - Homepage link

- [ ] **4.4**: Implement mod search and filtering
  - Search by name, author, description
  - Filter by category (gameplay, graphics, maps, total conversion)
  - Sort by name, date installed, rating (if community integration)

- [ ] **4.5**: Show active mod status
  - Display currently active mods in HUD or toolbar
  - Quick access to deactivate

**File References**:
- Create: `src/components/ModBrowser.tsx`
- Create: `src/components/ModBrowser.css`
- Create: `src/components/ModDetailPanel.tsx`
- Modify: `src/services/pakService.ts` (mod activation)

**Test Requirements**:
- Unit: `tests/unit/ModBrowser.test.tsx`
  - Render with mock mod list
  - Test activation/deactivation
  - Test search and filtering
- Integration: `tests/integration/modActivation.integration.test.tsx`
  - Activate mod, verify PAKs loaded
  - Verify asset override behavior

---

### Task 5: Mod Compatibility and Validation

**Objective**: Ensure mods are compatible with application and base game version.

#### Subtasks

- [ ] **5.1**: Define compatibility rules
  - Mod specifies required base game version in `mod.json`
  - Mod specifies required library version (quake2ts)
  - Mod lists dependencies (other mods)
  - Mod lists conflicts (incompatible mods)

- [ ] **5.2**: Create `src/services/modCompatibilityService.ts`
  - Export `checkCompatibility(mod: ModInfo): CompatibilityResult`
  - Return:
    - `compatible: boolean`
    - `warnings: string[]` (e.g., "Requires Ground Zero expansion")
    - `errors: string[]` (e.g., "Conflicts with active mod")

- [ ] **5.3**: Implement dependency checking
  - Verify required base game present
  - Verify required library version matches
  - Verify dependency mods installed
  - If dependencies missing, show error and prevent activation

- [ ] **5.4**: Implement conflict detection
  - Check if mod conflicts with active mods
  - Warn before activation
  - Offer to deactivate conflicting mod

- [ ] **5.5**: Display compatibility status in UI
  - Show badges on mod cards:
    - ✅ Compatible
    - ⚠️ Warnings (hover for details)
    - ❌ Incompatible (cannot activate)
  - Disable "Activate" button for incompatible mods

- [ ] **5.6**: Add version checking
  - Compare mod's target game version with current
  - Warn if mod is outdated or requires newer version
  - Allow user to proceed at their own risk (with warning)

**File References**:
- Create: `src/services/modCompatibilityService.ts`
- Modify: `src/components/ModBrowser.tsx` (display compatibility status)
- Create: `src/types/compatibilityResult.ts`

**Test Requirements**:
- Unit: `tests/unit/modCompatibilityService.test.ts`
  - Test dependency checking
  - Test conflict detection
  - Test version comparison
- Integration: `tests/integration/modCompatibility.integration.test.tsx`
  - Attempt to activate incompatible mod
  - Verify error shown and activation prevented

---

### Task 6: Mod Configuration

**Objective**: Allow users to configure mod settings.

#### Subtasks

- [ ] **6.1**: Define mod configuration schema
  - Mods can specify configurable settings in `mod.json`:
    ```json
    {
      "config": [
        {
          "key": "laser_damage",
          "name": "Laser Damage",
          "type": "number",
          "default": 25,
          "min": 1,
          "max": 100,
          "description": "Damage dealt by laser trap"
        },
        {
          "key": "enable_gore",
          "name": "Enable Gore",
          "type": "boolean",
          "default": true
        }
      ]
    }
    ```

- [ ] **6.2**: Create `src/components/ModConfigPanel.tsx`
  - Show when mod is selected in mod browser
  - Display each config option with appropriate input:
    - Number: Slider or number input
    - Boolean: Checkbox or toggle
    - String: Text input
    - Choice: Dropdown
  - "Save" button to apply changes

- [ ] **6.3**: Implement config storage
  - Store mod config in localStorage
  - Key: `mod-config-{modId}`
  - Load config when mod activated
  - Pass config values to mod entities/code

- [ ] **6.4**: Apply config to game
  - Mod entities read config values from global config object
  - Example: `laser_trap` entity reads `laser_damage` config
  - **Library Enhancement Needed**: Cvar system exposure
    - If available, use cvars (console variables)
    - Otherwise, use custom config object

- [ ] **6.5**: Add config presets
  - Allow users to save config profiles (e.g., "Easy", "Hard", "Realistic")
  - Quick-switch between presets
  - Export/import presets as JSON

**File References**:
- Create: `src/components/ModConfigPanel.tsx`
- Create: `src/services/modConfigService.ts`
- Modify: `src/components/ModBrowser.tsx` (integrate config panel)

**Test Requirements**:
- Unit: `tests/unit/ModConfigPanel.test.tsx`
  - Render with mock config schema
  - Test input interactions
- Unit: `tests/unit/modConfigService.test.ts`
  - Test config save/load
  - Test preset management

---

### Task 7: Mod Development Tools

**Objective**: Provide tools to help mod creators test and debug their mods.

#### Subtasks

- [ ] **7.1**: Add "Reload Mod" function
  - Refresh mod without restarting application
  - Useful during development
  - Unmount PAKs, re-mount, re-register entities

- [ ] **7.2**: Implement mod asset hot-reloading
  - Watch mod PAK files for changes (if using local file system)
  - Auto-reload when PAK modified
  - Show notification: "Mod reloaded"

- [ ] **7.3**: Add mod validation tool
  - Check mod.json schema validity
  - Verify referenced assets exist (models, textures, sounds)
  - Detect missing entity spawn functions
  - Report unused assets
  - Output validation report

- [ ] **7.4**: Provide mod export/packaging
  - Export active mod as PAK file
  - Include mod.json, entities.json, all assets
  - Generate README with installation instructions
  - Create distributable ZIP

- [ ] **7.5**: Add mod documentation generator
  - Scan mod entities and generate documentation
  - Output as markdown or HTML
  - Include entity descriptions, properties, usage examples

**File References**:
- Create: `src/services/modDevToolsService.ts`
- Create: `src/components/ModValidator.tsx`
- Create: `src/components/ModExporter.tsx`

**Test Requirements**:
- Unit: `tests/unit/modDevToolsService.test.ts`
  - Test mod reload
  - Test validation rules
- Unit: `tests/unit/ModValidator.test.tsx`
  - Render with mock validation results

---

## Acceptance Criteria

Section 07 is complete when:

- ✅ Application detects mods from PAK files and metadata
- ✅ User can browse mods in mod browser with rich metadata
- ✅ User can activate/deactivate mods with correct PAK priority
- ✅ Custom mod entities spawn and function correctly in-game
- ✅ Compatibility checking prevents incompatible mod activation
- ✅ User can configure mod settings via config panel
- ✅ Mod conflicts and dependencies are properly handled
- ✅ Mod development tools support rapid iteration
- ✅ All code has 90%+ unit test coverage
- ✅ Integration tests verify mod activation, custom entities, and configuration

## Library Dependencies

**Required from quake2ts**:
- `@quake2ts/game`: `createGame`, entity system
- `@quake2ts/engine`: `VirtualFileSystem`, `AssetManager`

**Enhancements Needed** (see `library-enhancements.md`):
- Custom entity registration API (`registerEntitySpawn`)
- Mod initialization hooks (`onModInit`, `onModShutdown`)
- Cvar system exposure (for mod configuration)
- VirtualFileSystem priority support
- Rogue and Xatrix expansion support (already partially in library)
- Script execution support (optional, for advanced mods)

## Notes

- Mod support depends on Section 01 (game mode) for execution
- PAK priority system benefits all sections (ensures correct asset loading)
- Mod browser UI follows patterns from Section 02 (server browser)
- Custom entity system enables endless extensibility
- Declarative JSON approach (entities.json) makes modding accessible to non-programmers
- Mod compatibility checking prevents user frustration
- Mod dev tools make application attractive to content creators
