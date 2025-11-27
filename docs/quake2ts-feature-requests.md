# Feature Requests for `quake2ts` Library

This document outlines a series of proposed feature enhancements for the `quake2ts` library. These additions are designed to be non-breaking and would significantly simplify the development of applications like `quake2ts-explorer` by providing higher-level APIs for common tasks related to BSP map interaction.

---

### 1. Scene Picking and Ray-Casting API

**Problem:**
Applications currently need to implement their own 3D math for ray-casting and bounding box intersection to detect which entity a user is pointing at or clicking on. This involves manually transforming mouse coordinates into a 3D ray and iterating through all entity models to check for intersections.

**Proposed Feature:**
A built-in picking function on the `BspMap` object that handles the intersection logic internally.

**API Signature:**
```typescript
// To be added to the BspMap interface or a new helper class
interface BspMap {
    // ... existing properties

    /**
     * Finds the closest brush-based entity that intersects with the given ray.
     * @param ray An object defining the origin and direction of the ray.
     * @returns An object containing the intersected entity, its model, and the
     *          distance from the ray's origin, or null if no intersection occurs.
     */
    pickEntity(ray: { origin: Vec3, direction: Vec3 }): { entity: BspEntity, model: BspModel, distance: number } | null;
}
```

**How It Works:**
The `pickEntity` function would iterate through the brush-based models (`map.models[1]` onwards). For each model, it would perform a ray-AABB (Axis-Aligned Bounding Box) intersection test using the model's `mins` and `maxs` properties. It would keep track of the closest intersection found and, upon completing the search, return the corresponding `BspEntity`, `BspModel`, and the distance. This abstracts all the complex 3D math away from the consumer.

---

### 2. Enhanced Geometry Builder with Visibility Options

**Problem:**
To implement visibility controls (e.g., hiding all entities of a certain `classname`), an application must manually filter entities, find their corresponding models, identify all the faces belonging to those models, and then ensure those faces are excluded from rendering. This is complex and tightly couples the application's UI logic to the BSP data structure.

**Proposed Feature:**
Extend the existing `buildBspGeometry` function to support filtering by `classname`.

**API Signature:**
```typescript
/**
 * Extends the existing buildBspGeometry function with an optional options object.
 */
function buildBspGeometry(
    gl: WebGL2RenderingContext,
    surfaces: BspSurface[],
    map: BspMap,
    options?: {
        hiddenClassnames?: Set<string>;
    }
): BspGeometryBuildResult;
```

**How It Works:**
This is a non-breaking change that adds an optional `options` parameter. If `options.hiddenClassnames` is provided, the function will perform the following steps internally:
1.  Iterate through all entities in `map.entities.entities`.
2.  If an entity's `classname` is present in the `hiddenClassnames` set, it is marked for exclusion.
3.  The function identifies the `BspModel` corresponding to the hidden entity (via its index).
4.  It then determines the range of faces associated with that model using `model.firstFace` and `model.numFaces`.
5.  All surfaces derived from that range of faces are excluded from the final `BspGeometryBuildResult`.

The application's render loop remains unchanged; it simply re-builds the geometry with the appropriate `hiddenClassnames` set, and the library handles the rest.

---

### 3. Entity Classname Aggregation

**Problem:**
To build a UI legend of all available entity types in a map, the application needs to manually iterate through the entire entity list and build a unique, sorted set of `classname`s.

**Proposed Feature:**
A simple convenience method on the `BspEntities` object to perform this aggregation.

**API Signature:**
```typescript
// To be added to the BspEntities interface
interface BspEntities {
    // ... existing properties

    /**
     * Returns a sorted array of unique entity classnames present in the map.
     */
    getUniqueClassnames(): string[];
}
```

**How It Works:**
This function would iterate through `this.entities`, collect all `classname` values into a `Set` to ensure uniqueness, and then return the result as a sorted array. This is a minor quality-of-life improvement that helps keep application code clean and focused on UI rather than data manipulation.
