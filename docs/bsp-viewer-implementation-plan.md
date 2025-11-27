# Technical Overview: BSP Viewer Implementation Plan

This document outlines a technical plan for extending the BSP viewer with interactive features. It has been updated to leverage new APIs available in `quake2ts@0.0.180`.

## 1. Core Concepts

New, higher-level APIs in `quake2ts` simplify the implementation of the desired features. The application logic can now focus more on UI and state management, as the library handles the complex geometry and data processing.

-   **Picking:** We will use the `map.pickEntity(ray)` method to directly identify which entity is under the user's cursor.
-   **Metadata:** We will use the `map.entities.getUniqueClassnames()` method to easily populate our UI legend.
-   **Visibility:** We will use the new `hiddenClassnames` option in the `buildBspGeometry` function to efficiently show and hide groups of entities.

All three of these features are **now available** in `quake2ts`.

## 2. Implementation Plan

### Task 1: Display Entity Legend (Small)

The first step is to display a legend of all available entity types in a new sidebar.

1.  **Modify `BspAdapter.ts`**:
    -   Add a public method `getUniqueClassnames(): string[]` that returns `this.map?.entities.getUniqueClassnames() ?? []`.
2.  **Modify `UniversalViewer.tsx`**:
    -   After an adapter is loaded, check if it has a `getUniqueClassnames` method.
    -   If it does, call it and store the result in a state variable (e.g., `useState<string[]>([])`).
3.  **Create a New Component `EntityLegend.tsx`**:
    -   Create a component that accepts an array of `classname` strings.
    -   It should render a list of these names, each with a checkbox or toggle switch.
    -   Integrate this component into `App.tsx` so it appears in a new sidebar panel to the right of the viewer.

**Acceptance Criteria:** When a BSP map is loaded, a list of all unique entity `classname`s appears in the sidebar with toggle switches.

### Task 2: Implement Toggling Visibility (Small)

This task uses the legend created in Task 1 to control which objects are visible.

1.  **Manage Visibility State**:
    -   In `App.tsx` or a similar high-level component, create a state variable to hold the set of hidden `classname`s (e.g., `useState<Set<string>>(new Set())`).
    -   When a user toggles a classname in the `EntityLegend`, update this set.
2.  **Modify `BspAdapter.ts`**:
    -   Add a new public method `setHiddenClasses(hidden: Set<string>)`.
    -   Inside this method, re-build the renderable geometry by calling `buildBspGeometry` again, passing the `map` object and the new set to the `hiddenClassnames` option: `buildBspGeometry(gl, surfaces, this.map, { hiddenClassnames: hidden })`.
3.  **Update `UniversalViewer.tsx`**:
    -   When the `hiddenClassnames` set changes, call the adapter's `setHiddenClasses` method to trigger the geometry rebuild.

**Acceptance Criteria:** Toggling a `classname` in the legend hides or shows all corresponding objects in the 3D viewer.

### Task 3: Implement Mouse Picking and Metadata Display (Medium)

This task adds the ability to click on an object and see its metadata.

1.  **Create a Ray-Casting Utility (`src/utils/camera.ts`)**:
    -   Implement a function `createPickingRay(camera: Camera, mouseCoords: { x: number, y: number }, viewport: { width: number, height: number }): Ray`. This is needed to generate a ray from the mouse coordinates.
2.  **Modify `UniversalViewer.tsx`**:
    -   Add an `onClick` event handler to the canvas.
    -   Inside the handler, generate a picking ray.
    -   Call a new method on the adapter, `pickEntity(ray)`, which will in turn call the `quake2ts` library's `map.pickEntity(ray)`.
    -   The result will be the `BspEntity` of the clicked object, or `null`. Store this entity in a state variable (e.g., `useState<BspEntity | null>(null)`).
3.  **Create `EntityMetadata.tsx` Component**:
    -   Create a component to display the properties of a `BspEntity`. It should show the `classname` and a list of all key-value pairs from the `properties` object.
    -   It should also render a small overlay next to the clicked object with a brief description (e.g., the `classname`).
4.  **Update Sidebar**:
    -   The sidebar will now use `EntityMetadata.tsx` to display the details of the selected entity. When nothing is selected, it can show a summary or remain empty.

**Acceptance Criteria:** Clicking an object in the viewer displays its metadata in the sidebar and shows a descriptive overlay in the 3D view.

### Task 4: Highlighting on Hover (Small)

This task adds a visual cue to show which object is currently under the mouse.

1.  **Modify `UniversalViewer.tsx`**:
    -   Add a `mousemove` event listener to the canvas.
    -   On each mouse move, call the `pickEntity` method to find the hovered entity.
    -   Store the hovered entity in a new state variable (e.g., `useState<BspEntity | null>(null)`).
2.  **Modify `BspAdapter.ts`**:
    -   Add a method `setHoveredEntity(entity: BspEntity | null)`.
    -   In the `render` method, check if the currently drawing model corresponds to the hovered entity.
    -   If it does, use the `renderOptions` to apply a highlight effect (e.g., render as `solid` or with a different color).

**Acceptance Criteria:** As the user moves the mouse over different objects, they are highlighted in real-time.
