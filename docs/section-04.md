# Section 4: Advanced Rendering Features

This section covers the implementation of advanced debug visualization modes. These features are essential for inspecting the internal state of the engine, verifying geometry, and debugging collision or visibility issues.

## Tasks

### 1. Debug Visualization Modes
- [x] **1.1 Bounding Boxes**: Visualize AABB (Axis-Aligned Bounding Box) for entities and models.
- [x] **1.2 Normals**: Render vertex and face normals to verify geometry orientation.
- [x] **1.3 PVS (Potentially Visible Set)**: Visualize the PVS clusters to debug visibility culling.
- [x] **1.4 Collision Hulls**: Render the collision meshes used for physics interactions.
- [x] **1.5 Lightmaps**: Display raw lightmap textures on surfaces to inspect lighting data.
- [x] **1.6 UI Integration**: Add a selector in the `ViewerControls` to switch between these debug modes.

## Implementation Details

### DebugRenderer
A shared `DebugRenderer` class has been implemented to handle low-level WebGL drawing for debug primitives (lines, points). It supports:
- Drawing colored lines (e.g., for normals, bounding box edges).
- Drawing points (e.g., for cluster centers).
- Managing its own WebGL buffers and state.

### Adapter Integration
Each viewer adapter (`BspAdapter`, `Md2Adapter`, `Md3Adapter`) has been updated to:
- Accept a `debugMode` parameter.
- Compute the necessary debug geometry (e.g., extracting normals, calculating AABBs).
- Delegate drawing to the `DebugRenderer`.

### UI Updates
The `ViewerControls` component now includes a "Debug Mode" dropdown, allowing users to select:
- **None**: Standard rendering.
- **Bounding Boxes**: Shows entity bounds.
- **Normals**: Shows vertex/face normals (green/blue lines).
- **PVS**: Shows visible clusters (BSP only).
- **Collision**: Shows collision hulls (BSP only).
- **Lightmaps**: Renders geometry with full-bright white textures (approximating lightmap inspection mode).
