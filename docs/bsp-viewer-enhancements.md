# Technical Overview: BSP Viewer Enhancements

This document outlines a technical plan for extending the BSP viewer with interactive features, including object inspection and visibility controls. The plan is designed to be implemented by a developer, with tasks broken down from simple to more complex.

## 1. Core Concepts

The foundation of these enhancements lies in the `BspMap` object provided by the `quake2ts` library. This object contains two key pieces of information:

-   **Entities:** `map.entities.entities` is an array of `BspEntity` objects. Each entity represents an interactive item in the map (e.g., a door, a button, a health pack) and contains a `classname` and a `properties` record with metadata from the map editor.
-   **Models:** `map.models` is an array of `BspModel` objects. The first model (`map.models[0]`) represents the static world geometry. Subsequent models (`map.models[1]` and onward) correspond to the brush-based entities defined in the entity list. Each `BspModel` has `mins` and `maxs` properties that define its 3D bounding box.

Our strategy is to link these two datasets. The index of a `BspModel` (minus one) corresponds to its `BspEntity`. This relationship allows us to visually represent and interact with entities.

## 2. Implementation Plan

### Task 1: Expose Entity Data (Small)

The first step is to make the entity data from the `BspMap` available to the React component for display.

1.  **Modify `BspAdapter.ts`**:
    -   Add a public method `getEntities(): BspEntity[]` that returns `this.map?.entities.entities ?? []`.
2.  **Modify `UniversalViewer.tsx`**:
    -   After an adapter is loaded, check if it has a `getEntities` method.
    -   If it does, call it and store the returned entity list in a new React state variable (e.g., `useState<BspEntity[]>([])`).
3.  **Create a New Component `EntityList.tsx`**:
    -   Create a simple component that accepts an array of `BspEntity` objects and displays their `classname`s in a list.
    -   Integrate this component into `App.tsx` so it appears in a new sidebar panel to the right of the viewer.

**Acceptance Criteria:** When a BSP map is loaded, a list of all entity `classname`s appears in a new sidebar.

### Task 2: Implement Mouse Picking/Ray-Casting (Medium)

This task involves adding the ability to identify which object is under the mouse cursor.

1.  **Create a Ray-Casting Utility (`src/utils/picking.ts`)**:
    -   Implement a function `createPickingRay(camera: Camera, mouseCoords: { x: number, y: number }, viewport: { width: number, height: number }): Ray`. This function will create a ray from the camera's position through the mouse cursor's position in the 3D world.
    -   Implement a function `intersectRayBox(ray: Ray, box: { mins: Vec3, maxs: Vec3 }): boolean`. This function will check if the given ray intersects with a bounding box.
2.  **Modify `UniversalViewer.tsx`**:
    -   Add a `useEffect` hook to attach a `mousemove` event listener to the canvas.
    -   On `mousemove`, create a picking ray using the utility function.
    -   Iterate through the `BspModel`s (from index 1 onward) provided by the adapter. For each model, check for an intersection between the ray and the model's bounding box.
    -   Store the index of the hovered model in a new state variable (e.g., `useState<number | null>(null)`).
3.  **Modify `BspAdapter.ts`**:
    -   In the `render` method, check if the currently drawing model's index matches the hovered index.
    -   If it does, modify the rendering options to highlight it (e.g., by setting the render mode to `solid` with a bright color). The `renderOptions` object in the adapter can be extended to support highlighting.

**Acceptance Criteria:** When the user hovers the mouse over an interactive object in the viewer, that object is highlighted.

### Task 3: Display Metadata on Click (Small)

This task builds on the picking mechanism to display information about a clicked object.

1.  **Modify `UniversalViewer.tsx`**:
    -   Add an `onClick` event handler to the canvas.
    -   Inside the handler, perform the same ray-casting logic as in Task 2 to identify the clicked model.
    -   Store the clicked model's index in a new state variable (e.g., `useState<number | null>(null)`).
    -   Pass the selected entity's data to the sidebar panel.
2.  **Create `EntityMetadata.tsx` Component**:
    -   Create a new component to display the properties of a `BspEntity`.
    -   It should show the `classname` and then list all key-value pairs from the `properties` object.
    -   It should also display a small overlay next to the mouse cursor with a brief description (e.g., the `classname`).
3.  **Update Sidebar**:
    -   The sidebar should now use `EntityMetadata.tsx` to show the details of the selected entity. When no entity is selected, it can show a summary or remain empty.

**Acceptance Criteria:** Clicking an object highlights it and displays its full metadata in the sidebar panel. A small overlay with the classname appears next to the object.

### Task 4: Interactive Legend for Visibility (Medium)

This task adds the legend for toggling object visibility.

1.  **Modify the Sidebar**:
    -   At the top of the sidebar, create a legend from the entity list.
    -   Generate a list of unique `classname`s from all entities in the map.
    -   For each unique `classname`, display it with a checkbox or a toggle button.
2.  **Manage Visibility State**:
    -   In `App.tsx` or a higher-level state management context, maintain a map or set of hidden `classname`s (e.g., `useState<Set<string>>(new Set())`).
    -   When a user toggles a `classname` in the legend, update this state.
3.  **Modify `BspAdapter.ts`**:
    -   Add a new method `setHiddenClasses(hidden: Set<string>)`.
    -   In the `render` method, before drawing each model, retrieve its corresponding entity.
    -   If the entity's `classname` is in the `hidden` set, skip the draw call for that model.

**Acceptance Criteria:** The sidebar displays a legend of all entity types. Toggling a type hides or shows all corresponding objects in the 3D viewer.

### Task 5: Advanced Features (Fanciful)

These are more complex ideas that can be built on top of the previous tasks.

-   **Ghost Camera Mode:** Add a camera mode that ignores collision with the world geometry, allowing the user to fly through walls to explore the map freely.
-   **Isolate Layers:** In the legend, add the ability to "isolate" a `classname`, which would hide all other entities *and* potentially make the world geometry semi-transparent.
-   **Draw Entity Connections:** For entities that have `target` and `targetname` properties, draw lines in the 3D view connecting them to visualize trigger systems.

## 3. `quake2ts` Library Improvements

While the current API is sufficient for these features, the following improvements to `quake2ts` could simplify the implementation:

-   **Built-in Picking API:** A function like `map.pick(ray)` that returns the intersected model or entity directly would eliminate the need for manual ray-casting in the application code.
-   **Direct Entity-Model Links:** While the index-based correlation works, a more explicit link (e.g., `entity.modelIndex` or `model.entityIndex`) would make the relationship more robust and readable.
-   **Visibility Flags on Models:** If the `BspModel` object had a mutable `visible` flag, the rendering logic in `quake2ts` itself could be made to skip drawing hidden models, which might be more efficient than checking visibility in the application-level render loop.
