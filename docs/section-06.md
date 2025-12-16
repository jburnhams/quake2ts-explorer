# Section 06: Map Editor Integration

## Overview

Provide basic map editing capabilities for entity manipulation and prototyping. This section focuses on **read-mostly** editing - users can inspect, modify entities, and export changes, but not edit BSP geometry (which requires recompilation). This makes the application useful for rapid entity placement and testing.

**Complexity**: High
**Dependencies**: None (but benefits from Section 05 entity analysis tools)
**Estimated Scope**: Entity placement/editing, property inspector, validation, ENT export, preview mode

## Objectives

- Enable entity selection, movement, rotation in 3D view
- Provide property editor for modifying entity attributes
- Support entity creation (spawn new entities)
- Implement entity copy/paste/delete operations
- Add validation and error checking for entity properties
- Export modified entity data as ENT lump
- Preview changes without permanent modification
- Provide undo/redo functionality

## Current State

**Already Implemented**:
- Entity picking in `src/components/UniversalViewer/adapters/BspAdapter.ts` (`pickEntity()`)
- Entity metadata display in `src/components/EntityMetadata.tsx`
- Entity legend with visibility toggling in `src/components/EntityLegend.tsx`
- BSP entity parsing via quake2ts library

**Missing**:
- Entity manipulation (move, rotate, scale)
- Entity creation and deletion
- Property editing UI
- Validation system
- Export functionality
- Undo/redo system

## Tasks and Subtasks

### Task 1: Entity Selection and Manipulation

**Objective**: Allow users to select and transform entities in 3D view.

#### Subtasks

- [ ] **1.1**: Implement entity selection modes
  - Modify `BspAdapter.ts`
  - [x] Single selection (click entity)
  - [x] Multi-selection (Ctrl+click to add/remove)
  - [ ] Box selection (drag rectangle to select multiple)
  - [x] Deselect (click empty space)

- [x] **1.2**: Visual selection feedback
  - [x] Highlight selected entities (different color than hover)
  - [x] Draw bounding boxes around selected entities
  - [ ] Show selection count in UI ("3 entities selected")

- [x] **1.3**: Implement transform gizmo
  - Created `src/components/UniversalViewer/adapters/GizmoRenderer.ts`
  - Integrated into `BspAdapter` render loop for proper depth handling and synchronization
  - 3D widget overlay on selected entity
  - Modes:
    - Translate (arrows for X, Y, Z axis movement)
    - Rotate (rings for pitch, yaw, roll rotation)
    - Scale (boxes for uniform/non-uniform scaling)
  - Switch modes with W (translate), E (rotate), R (scale) keys

- [x] **1.4**: Implement entity translation
  - [x] Click and drag axis arrow to move along that axis
  - [x] Shift+drag for grid snapping (configurable snap size: 1, 8, 16, 32 units)
  - [x] Update entity `origin` property in real-time
  - [ ] Show coordinates as tooltip while dragging

- [x] **1.5**: Implement entity rotation
  - [x] Click and drag rotation ring to rotate around axis
  - [x] Snap to 15° increments (configurable)
  - [x] Update entity `angles` property
  - [ ] Show angle as tooltip (optional enhancement)

- [ ] **1.6**: Implement entity duplication
  - Ctrl+D to duplicate selected entities
  - Place duplicate at same position (user moves after)
  - Copy all properties
  - Auto-increment targetname if present

**File References**:
- Modify: `src/components/UniversalViewer/adapters/BspAdapter.ts` (selection)
- Create: `src/components/TransformGizmo.tsx`
- Create: `src/services/entityEditorService.ts`
- Create: `src/utils/transformUtils.ts` (gizmo math)

**Test Requirements**:
- Unit: `tests/unit/entityEditorService.test.ts`
  - Test selection logic
  - Test transform calculations
- Unit: `tests/unit/TransformGizmo.test.tsx`
  - Render gizmo
  - Test interaction (mock mouse events)
- Integration: `tests/integration/entityManipulation.integration.test.tsx`
  - Load map, select entity, move it
  - Verify position updated

---

### Task 2: Entity Property Editor

**Objective**: Edit entity properties (key-value pairs) with validation.

#### Subtasks

- [ ] **2.1**: Create `src/components/EntityPropertyEditor.tsx`
  - Display in right panel when entity selected
  - Replace or extend `EntityMetadata.tsx`
  - List all entity properties as editable fields

- [ ] **2.2**: Implement property editing UI
  - Each property shown as key-value row
  - Key: Editable text input (or dropdown for common keys)
  - Value: Type-appropriate input:
    - String: Text input
    - Number: Number input with spinners
    - Vec3 (origin, angles): Three number inputs (X, Y, Z)
    - Boolean (spawnflags bits): Checkboxes
    - Choice (model, target): Dropdown or autocomplete

- [ ] **2.3**: Add property type inference
  - Create `src/data/entityPropertyTypes.json`
  - Define expected types for common properties:
    - `origin`: vec3
    - `angles`: vec3 (degrees)
    - `targetname`: string
    - `target`: string (reference to targetname)
    - `health`: number
    - `spawnflags`: bitfield
  - Use appropriate input based on type

- [ ] **2.4**: Implement property validation
  - Required properties (warn if missing)
  - Type checking (e.g., `health` must be number)
  - Range checking (e.g., `angles` should be 0-360)
  - Reference validation (`target` must point to existing `targetname`)
  - Show validation errors inline (red border, error message)

- [ ] **2.5**: Add property documentation
  - Create `src/data/entityPropertyDocs.json`
  - Show tooltip when hovering over property name
  - Explain what the property does
  - Link to entity reference (Section 05)

- [ ] **2.6**: Implement spawnflags editor
  - Spawnflags are bitfield (each bit is a boolean flag)
  - Display as checkboxes with labels
  - E.g., for `func_door`:
    - Bit 0: "Start Open"
    - Bit 1: "Reverse"
    - Bit 2: "Crusher"
    - Bit 8: "Toggle"
  - Auto-calculate spawnflags value from checkboxes

- [ ] **2.7**: Add property search
  - Filter properties by name
  - Show "Common" vs "Advanced" properties
  - Add new property button (opens dialog)

**File References**:
- Create: `src/components/EntityPropertyEditor.tsx`
- Create: `src/components/EntityPropertyEditor.css`
- Create: `src/data/entityPropertyTypes.json`
- Create: `src/data/entityPropertyDocs.json`
- Create: `src/services/entityValidationService.ts`

**Test Requirements**:
- Unit: `tests/unit/EntityPropertyEditor.test.tsx`
  - Render with mock entity
  - Test editing properties
  - Test validation errors
- Unit: `tests/unit/entityValidationService.test.ts`
  - Test type validation
  - Test reference validation

---

### Task 3: Entity Creation and Deletion

**Objective**: Add and remove entities from the map.

#### Subtasks

- [ ] **3.1**: Implement entity creation UI
  - Add "Create Entity" button to toolbar
  - Opens entity type selector dialog
  - Categorized list:
    - Info (player starts, teleport destinations)
    - Items (health, armor, ammo)
    - Weapons
    - Monsters
    - Triggers
    - Func (doors, buttons, platforms)
    - Misc
  - Search/filter entity types

- [ ] **3.2**: Implement entity spawning
  - Select entity type from dialog
  - Click in 3D view to place
  - Entity spawned at clicked position
  - Initialize with default properties:
    - `classname`: Selected type
    - `origin`: Clicked position
    - Other defaults from entity definition

- [ ] **3.3**: Add entity templates
  - Create `src/data/entityTemplates.json`
  - Predefined entities with common configurations
  - E.g., "Shotgun with 20 shells" template for `weapon_shotgun`
  - User can create custom templates (save frequently used configs)

- [ ] **3.4**: Implement entity deletion
  - Select entity(s), press Delete key
  - Show confirmation dialog
  - Remove from map entity list
  - Mark as deleted (for undo)

- [ ] **3.5**: Handle entity linking
  - When creating trigger entity, show "Link to..." option
  - Allows setting `target` to existing entity's `targetname`
  - Visual link line drawn in 3D view (dotted line from trigger to target)

**File References**:
- Create: `src/components/EntityCreator.tsx` (dialog)
- Create: `src/data/entityTemplates.json`
- Modify: `src/services/entityEditorService.ts` (create/delete methods)
- Modify: `src/components/UniversalViewer/adapters/BspAdapter.ts` (render links)

**Test Requirements**:
- Unit: `tests/unit/EntityCreator.test.tsx`
  - Render entity type selector
  - Test selection and spawning
- Unit: `tests/unit/entityEditorService.creation.test.ts`
  - Test entity creation
  - Test default property initialization
  - Test deletion

---

### Task 4: Undo/Redo System

**Objective**: Allow reverting changes with comprehensive undo/redo.

#### Subtasks

- [ ] **4.1**: Create `src/services/undoService.ts`
  - Export `registerAction(action: EditorAction): void`
  - Export `undo(): void`
  - Export `redo(): void`
  - Export `canUndo(): boolean`, `canRedo(): boolean`
  - Store action history (stack, max 100 actions)

- [ ] **4.2**: Define action types
  - Create interface `EditorAction`:
    - `type`: 'create' | 'delete' | 'modify' | 'move' | 'rotate'
    - `entityId`: string
    - `previousState`: any
    - `newState`: any
    - `undo()`: Function to revert
    - `redo()`: Function to reapply

- [ ] **4.3**: Implement action recording
  - Wrap all entity modifications
  - On modify: Record old and new values
  - Push action to undo stack
  - Clear redo stack (can't redo after new action)

- [ ] **4.4**: Implement undo/redo execution
  - `undo()`: Pop from undo stack, call `action.undo()`, push to redo stack
  - `redo()`: Pop from redo stack, call `action.redo()`, push to undo stack

- [ ] **4.5**: Add undo/redo UI
  - Toolbar buttons (curved arrows)
  - Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z or Ctrl+Y (redo)
  - Show action description on hover (e.g., "Undo move entity")
  - Display undo/redo stack in history panel (optional)

- [ ] **4.6**: Group actions (batch undo)
  - When moving multiple selected entities, group into single undo action
  - "Begin transaction" / "End transaction" API
  - Single undo reverts entire transaction

**File References**:
- Create: `src/services/undoService.ts`
- Modify: `src/components/Toolbar.tsx` (undo/redo buttons)
- Modify: `src/services/entityEditorService.ts` (integrate undo)

**Test Requirements**:
- Unit: `tests/unit/undoService.test.ts`
  - Test undo/redo stack
  - Test action execution
  - Test batched actions
- Integration: `tests/integration/undoRedo.integration.test.tsx`
  - Perform edits, undo, redo
  - Verify state restored correctly

---

### Task 5: Entity Validation and Error Checking

**Objective**: Detect and report entity configuration errors.

#### Subtasks

- [ ] **5.1**: Implement validation rules
  - Required properties check (e.g., `func_door` needs `targetname` if triggered)
  - Type validation (already in Task 2)
  - Logical validation:
    - `target` references existing `targetname`
    - Trigger entities have valid targets
    - No duplicate `targetname` (unless intentional multi-target)
    - Entities not in void (outside world bounds)

- [ ] **5.2**: Create `src/components/ValidationPanel.tsx`
  - List all validation errors and warnings
  - Grouped by severity:
    - Error (red): Breaks functionality
    - Warning (yellow): Suspicious but might be intentional
    - Info (blue): Optimization suggestions
  - Click error to select affected entity

- [ ] **5.3**: Visual error indicators
  - Draw red outline around entities with errors
  - Show error icon badge on entity in 3D view
  - Highlight errors in property editor

- [ ] **5.4**: Add "Fix" suggestions
  - For common errors, offer quick fixes
  - E.g., "target 'door1' not found" → "Create door1 entity"
  - Click "Fix" button to apply suggestion

- [ ] **5.5**: Implement pre-export validation
  - Run full validation before allowing export
  - Block export if critical errors present
  - Allow proceeding with warnings (show confirmation)

**File References**:
- Create: `src/components/ValidationPanel.tsx`
- Modify: `src/services/entityValidationService.ts` (validation rules)
- Modify: `src/components/UniversalViewer/adapters/BspAdapter.ts` (visual error indicators)

**Test Requirements**:
- Unit: `tests/unit/entityValidationService.rules.test.ts`
  - Test each validation rule
  - Test error severity classification
- Unit: `tests/unit/ValidationPanel.test.tsx`
  - Render with mock errors
  - Test error selection

---

### Task 6: ENT Export and Import

**Objective**: Export modified entity data and import external entity lumps.

#### Subtasks

- [ ] **6.1**: Implement ENT export
  - Create `src/services/entExportService.ts`
  - Export `exportEntities(entities: BspEntity[]): string`
  - Format: Standard Quake II .ent format (key-value pairs in braces)
  - Example:
    ```
    {
    "classname" "info_player_start"
    "origin" "0 0 24"
    "angle" "90"
    }
    {
    "classname" "weapon_shotgun"
    "origin" "128 0 24"
    }
    ```

- [ ] **6.2**: Add export UI
  - "Export Entities" button in editor toolbar
  - Opens save dialog
  - Filename defaults to `mapname.ent`
  - Downloads file or copies to clipboard

- [ ] **6.3**: Implement ENT import
  - "Import Entities" button
  - Opens file picker
  - Parse .ent file
    - **Library Enhancement Needed**: ENT parser utility
    - Or implement custom parser (simple key-value format)
  - Replace current entities or merge (user choice)

- [ ] **6.4**: Add BSP+ENT export
  - **Library Enhancement Needed**: Replace entity lump in BSP file
  - If library supports, export modified BSP with new entity lump
  - If not, export ENT separately and document external tool usage (bspinfo, qbsp)

- [ ] **6.5**: Validate on import
  - Run validation checks on imported entities
  - Show errors before applying
  - Allow user to fix errors or cancel import

**File References**:
- Create: `src/services/entExportService.ts`
- Create: `src/parsers/entParser.ts` (if library doesn't provide)
- Modify: `src/components/Toolbar.tsx` (export/import buttons)

**Test Requirements**:
- Unit: `tests/unit/entExportService.test.ts`
  - Test ENT format generation
  - Test export/import round-trip
- Unit: `tests/unit/entParser.test.ts`
  - Test parsing various ENT formats
  - Test error handling
- Integration: `tests/integration/entExport.integration.test.tsx`
  - Export entities, re-import, verify match

---

### Task 7: Editor Mode UI

**Objective**: Distinct "Edit Mode" with appropriate UI and controls.

#### Subtasks

- [ ] **7.1**: Add "Edit Mode" toggle
  - Button in toolbar: "Edit Map"
  - Switches application mode from viewer to editor
  - Shows editor-specific UI (gizmo, property editor, validation panel)
  - Hides viewer-only UI (playback controls)

- [ ] **7.2**: Implement editor viewport
  - Reuse UniversalViewer with editor enhancements
  - Show grid overlay (world units)
  - Display axis indicators (X=red, Y=green, Z=blue)
  - Snap cursor to grid (optional)

- [ ] **7.3**: Add editor toolbar
  - Tools:
    - Select (default)
    - Create entity
    - Delete
    - Undo / Redo
    - Grid settings (size, visibility)
    - Snap settings
    - Validation panel toggle
  - Keyboard shortcuts for all tools

- [ ] **7.4**: Implement preview mode
  - "Preview" button in editor
  - Temporarily disables editing
  - Allows testing entity behavior (triggers, doors)
    - **Requires Section 01**: Run game simulation in preview
  - "Stop Preview" returns to editing

- [ ] **7.5**: Add save/discard changes prompt
  - Track "dirty" state (unsaved changes)
  - Prompt before leaving editor mode
  - Options: Save, Discard, Cancel

**File References**:
- Modify: `src/App.tsx` (add editor mode)
- Create: `src/components/EditorToolbar.tsx`
- Create: `src/components/EditorViewport.tsx`
- Modify: `src/hooks/usePakExplorer.ts` (editor state)

**Test Requirements**:
- Unit: `tests/unit/EditorToolbar.test.tsx`
  - Render toolbar
  - Test tool selection
- Integration: `tests/integration/editorMode.integration.test.tsx`
  - Enter edit mode, make changes, export
  - Verify undo/redo works end-to-end

---

## Acceptance Criteria

Section 06 is complete when:

- ✅ User can enter Edit Mode for BSP maps
- ✅ User can select, move, rotate entities with transform gizmo
- ✅ User can edit entity properties with validation feedback
- ✅ User can create new entities from templates
- ✅ User can delete entities
- ✅ User can undo/redo all changes
- ✅ Validation panel shows errors and warnings
- ✅ User can export modified entities as ENT file
- ✅ User can import ENT files
- ✅ Preview mode allows testing changes (if Section 01 implemented)
- ✅ All code has 90%+ unit test coverage
- ✅ Integration tests verify editing workflow and export integrity

## Library Dependencies

**Required from quake2ts**:
- `@quake2ts/engine`: `parseBsp`, `BspEntity`, `BspMap`

**Enhancements Needed** (see `library-enhancements.md`):
- ENT parser utility (`parseEntLump(text: string): BspEntity[]`)
- ENT serializer (`serializeEntLump(entities: BspEntity[]): string`)
- BSP entity lump replacement (optional, for direct BSP modification)
- Entity template definitions (default property values)

## Notes

- Map editor is **read-mostly**: Can edit entities, not BSP geometry
- For geometry editing, users would need external tools (Radiant, Hammer, TrenchBroom)
- This editor focuses on rapid entity prototyping and testing
- Preview mode (Task 7.4) requires Section 01 (single-player game mode)
- Advanced features like brush editing are out of scope (would require BSP recompilation)
- Export/import ENT files allows integration with external workflows
- Coordinate with Section 05 (Entity Database) to avoid duplicate entity inspection UI
