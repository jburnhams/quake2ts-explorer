# Feature Requests for `quake2ts` Library

## 1. Enhanced DebugRenderer for Editor Gizmos

To support a robust 3D Map Editor (Task 1 in Section 06), we need richer debug primitives and interaction capabilities.

### Current Limitations
- `DebugRenderer` only supports `gl.LINES` (wireframe).
- No support for solid meshes (cones, cylinders, spheres) needed for Gizmo handles.
- No built-in way to "pick" or raycast against debug geometry (needed to click on a specific axis arrow).
- `render()` method clears the buffer implicitly if `clear()` was called, but usage in `BspAdapter` suggests managing state manually is tricky.

### Requested Features

#### 1. Solid Primitives
Add methods to draw solid shapes, useful for gizmo handles and selection highlights.
```typescript
interface DebugRenderer {
  // Existing
  addLine(start: Vec3, end: Vec3, color: Vec4): void;
  addBox(min: Vec3, max: Vec3, color: Vec4): void; // Currently draws wireframe box

  // New
  addSolidBox(min: Vec3, max: Vec3, color: Vec4): void;
  addCone(tip: Vec3, base: Vec3, radius: number, color: Vec4): void; // For translation arrows
  addSphere(center: Vec3, radius: number, color: Vec4): void; // For center handle
  addTorus(center: Vec3, normal: Vec3, radius: number, thickness: number, color: Vec4): void; // For rotation rings
}
```

#### 2. Depth Test Control
Allow disabling depth testing for certain debug groups so Gizmos always appear "on top" of the map geometry.
```typescript
interface DebugRenderer {
  setDepthTest(enabled: boolean): void;
}
```

#### 3. Mesh/Geometry Batching
Instead of immediate mode `addXXX` every frame, allow creating persistent debug meshes that can be transformed.
```typescript
class GizmoMesh {
  updateTransform(position: Vec3, rotation: Quat, scale: Vec3): void;
  render(viewProjection: Mat4): void;
}
```

## 2. Entity Manipulation API

### Current Limitations
- `BspEntity` properties are essentially read-only or raw strings in the engine.
- Modifying `entity.origin` string requires reparsing.
- No "dirty" state tracking for map entities.

### Requested Features

#### 1. Mutable Entity Properties
First-class support for updating entity position/rotation that automatically synchronizes with the engine's spatial structures (if necessary, e.g., for `linkentity`).
```typescript
interface GameEntity {
  setOrigin(origin: Vec3): void;
  setAngles(angles: Vec3): void;
}
```

#### 2. ENT Lump Serialization
Helper to serialize the current state of `BspMap.entities` back to a string format for export.
```typescript
function serializeEntities(entities: BspEntity[]): string;
```

## 3. Interaction / Picking

#### 1. Gizmo Picking
Utilities to raycast against the specific primitives (Cone, Box, Torus) used in the Gizmo, returning which axis was hit.
```typescript
interface GizmoTraceResult {
  axis: 'x' | 'y' | 'z';
  mode: 'translate' | 'rotate' | 'scale';
}
```
