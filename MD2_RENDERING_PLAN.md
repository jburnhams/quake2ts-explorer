# MD2 Model Rendering Plan

## Overview
Implement a 3D viewer for MD2 models using the quake2ts library's built-in WebGL2 rendering pipeline. The viewer will support camera controls, animation playback, and texture display.

## Architecture

### Components
```
PreviewPanel.tsx
  └─> Md2Viewer.tsx (new component)
       ├─> WebGL Canvas
       ├─> Animation Controls
       ├─> Camera Controls UI
       └─> Render Settings
```

### Core Dependencies from quake2ts
- **Rendering**: `Md2Pipeline`, `Md2MeshBuffers`, `buildMd2Geometry`, `buildMd2VertexData`
- **Animation**: `groupMd2Animations`, `advanceAnimation`, `computeFrameBlend`, `createAnimationState`
- **Camera**: `Camera` class (for projection/view matrices)
- **Shaders**: `MD2_VERTEX_SHADER`, `MD2_FRAGMENT_SHADER` (built-in)
- **Textures**: `parsePcx`, `pcxToRgba`, `Texture2D`, `createWebGLContext`

---

## Implementation Steps

### Phase 1: Basic WebGL Setup

#### 1.1 Create Md2Viewer Component
**File**: `src/components/Md2Viewer.tsx`

```typescript
interface Md2ViewerProps {
  model: Md2Model;
  animations: Md2Animation[];
  skinPath?: string;
  hasFile: (path: string) => boolean;
  loadFile: (path: string) => Promise<Uint8Array>;
}
```

#### 1.2 WebGL Context Initialization
Use quake2ts's `createWebGLContext`:
```typescript
const { gl, state } = createWebGLContext(canvasRef.current, {
  alpha: false,
  depth: true,
  antialias: true,
  preserveDrawingBuffer: false
});
```

#### 1.3 Initialize Rendering Pipeline
```typescript
// Create pipeline (manages shaders and uniforms)
const pipeline = new Md2Pipeline(gl);

// Build geometry (vertex indices, texcoords)
const geometry = buildMd2Geometry(model);

// Create mesh buffers (manages VBOs/VAOs)
const initialBlend: Md2FrameBlend = {
  currentFrame: 0,
  nextFrame: 0,
  lerp: 0.0
};
const meshBuffers = new Md2MeshBuffers(gl, model, initialBlend);
```

---

### Phase 2: Camera System

#### 2.1 Camera Setup
Use quake2ts `Camera` class for projection matrices:
```typescript
import { Camera } from 'quake2ts/engine';

const camera = new Camera();
camera.setFov(60); // Field of view
camera.setAspect(canvas.width / canvas.height);
camera.setNear(0.1);
camera.setFar(1000);
```

#### 2.2 Orbit Controls State
```typescript
interface OrbitState {
  radius: number;      // Distance from model
  theta: number;       // Horizontal rotation (azimuth)
  phi: number;         // Vertical rotation (elevation)
  target: Vec3;        // Look-at point (model center)
  panOffset: Vec3;     // Pan offset
}

const [orbit, setOrbit] = useState<OrbitState>({
  radius: 100,
  theta: 0,
  phi: Math.PI / 4,
  target: { x: 0, y: 0, z: 0 },
  panOffset: { x: 0, y: 0, z: 0 }
});
```

#### 2.3 Camera Position Calculation
```typescript
function computeCameraPosition(orbit: OrbitState): Vec3 {
  return {
    x: orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
    y: orbit.target.y + orbit.radius * Math.cos(orbit.phi),
    z: orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta)
  };
}

function computeViewMatrix(orbit: OrbitState): Float32Array {
  const eye = computeCameraPosition(orbit);
  // Use mat4.lookAt to create view matrix
  return lookAt(eye, orbit.target, { x: 0, y: 1, z: 0 });
}
```

#### 2.4 Mouse/Touch Controls
```typescript
// Mouse drag for rotation
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    setOrbit(prev => ({
      ...prev,
      theta: prev.theta + e.movementX * 0.01,
      phi: Math.max(0.1, Math.min(Math.PI - 0.1, prev.phi - e.movementY * 0.01))
    }));
  }
});

// Wheel for zoom
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  setOrbit(prev => ({
    ...prev,
    radius: Math.max(10, Math.min(500, prev.radius + e.deltaY * 0.1))
  }));
});

// Right-click drag for pan
// Middle-click drag for alternative control
```

---

### Phase 3: Animation System

#### 3.1 Animation State
```typescript
import { createAnimationState, advanceAnimation, computeFrameBlend } from 'quake2ts/engine';

const [animState, setAnimState] = useState(() =>
  createAnimationState(animations[0], 0) // Start with first animation
);

const [isPlaying, setIsPlaying] = useState(false);
const [animSpeed, setAnimSpeed] = useState(1.0); // Playback speed multiplier
```

#### 3.2 Animation Update Loop
```typescript
useEffect(() => {
  if (!isPlaying) return;

  let lastTime = performance.now();
  let animationFrameId: number;

  const animate = (currentTime: number) => {
    const deltaSeconds = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Advance animation
    const newState = advanceAnimation(animState, deltaSeconds * animSpeed);
    setAnimState(newState);

    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationFrameId);
}, [isPlaying, animSpeed, animState]);
```

#### 3.3 Frame Blend Calculation
```typescript
function getCurrentFrameBlend(animState: AnimationState): Md2FrameBlend {
  return computeFrameBlend(animState);
}
```

---

### Phase 4: Rendering Loop

#### 4.1 Main Render Function
```typescript
function render() {
  if (!gl || !pipeline || !meshBuffers) return;

  // Clear
  gl.clearColor(0.15, 0.15, 0.2, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  // Update mesh with current animation frame
  const frameBlend = getCurrentFrameBlend(animState);
  meshBuffers.update(model, frameBlend);

  // Compute matrices
  const projection = camera.getProjectionMatrix();
  const view = computeViewMatrix(orbit);
  const mvp = mat4.multiply(projection, view); // model matrix is identity for now

  // Bind pipeline and set uniforms
  pipeline.bind({
    modelViewProjection: mvp,
    lightDirection: [0.5, 1.0, 0.3], // Sun-like directional light
    tint: [1.0, 1.0, 1.0, 1.0],      // White tint (no color modification)
    diffuseSampler: 0                 // Texture unit 0
  });

  // Bind mesh and draw
  meshBuffers.bind();
  gl.drawElements(gl.TRIANGLES, meshBuffers.indexCount, gl.UNSIGNED_SHORT, 0);
}

useEffect(() => {
  const frameId = requestAnimationFrame(function loop() {
    render();
    requestAnimationFrame(loop);
  });
  return () => cancelAnimationFrame(frameId);
}, [orbit, animState]);
```

#### 4.2 Viewport Resize Handling
```typescript
useEffect(() => {
  const handleResize = () => {
    if (!canvas || !gl) return;
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);
    camera.setAspect(canvas.width / canvas.height);
  };

  window.addEventListener('resize', handleResize);
  handleResize();
  return () => window.removeEventListener('resize', handleResize);
}, [canvas, camera]);
```

---

### Phase 5: Texture Loading

#### 5.1 Load Skin Texture
```typescript
async function loadSkinTexture(skinPath: string): Promise<Texture2D | null> {
  if (!hasFile(skinPath)) return null;

  const data = await loadFile(skinPath);
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

  const pcx = parsePcx(buffer);
  const rgba = pcxToRgba(pcx);

  const texture = new Texture2D(gl);
  texture.upload({
    width: pcx.width,
    height: pcx.height,
    data: rgba,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    minFilter: gl.LINEAR_MIPMAP_LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.REPEAT,
    wrapT: gl.REPEAT,
    generateMipmaps: true
  });

  return texture;
}
```

#### 5.2 Apply Texture to Rendering
```typescript
// In render function, before pipeline.bind():
if (skinTexture) {
  gl.activeTexture(gl.TEXTURE0);
  skinTexture.bind();
}

// If no texture, use a fallback checkerboard or solid color
```

---

### Phase 6: UI Controls

#### 6.1 Animation Controls Component
```tsx
<div className="md2-animation-controls">
  <select
    value={currentAnimIndex}
    onChange={(e) => switchAnimation(parseInt(e.target.value))}
  >
    {animations.map((anim, i) => (
      <option key={i} value={i}>
        {anim.name} (frames {anim.firstFrame}-{anim.lastFrame})
      </option>
    ))}
  </select>

  <button onClick={() => setIsPlaying(!isPlaying)}>
    {isPlaying ? '⏸ Pause' : '▶ Play'}
  </button>

  <input
    type="range"
    min="0"
    max="1"
    step="0.01"
    value={animSpeed}
    onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
  />
  <span>Speed: {animSpeed.toFixed(2)}x</span>

  <input
    type="range"
    min={animations[currentAnimIndex].firstFrame}
    max={animations[currentAnimIndex].lastFrame}
    step="0.1"
    value={animState.time}
    onChange={(e) => scrubToFrame(parseFloat(e.target.value))}
  />
</div>
```

#### 6.2 Camera Controls UI
```tsx
<div className="md2-camera-controls">
  <button onClick={resetCamera}>Reset Camera</button>

  <label>
    Distance: {orbit.radius.toFixed(0)}
    <input
      type="range"
      min="10"
      max="500"
      value={orbit.radius}
      onChange={(e) => setOrbit(prev => ({ ...prev, radius: parseFloat(e.target.value) }))}
    />
  </label>

  <label>
    <input
      type="checkbox"
      checked={autoRotate}
      onChange={(e) => setAutoRotate(e.target.checked)}
    />
    Auto-rotate
  </label>
</div>
```

#### 6.3 Render Settings
```tsx
<div className="md2-render-settings">
  <label>
    <input
      type="checkbox"
      checked={showWireframe}
      onChange={(e) => setShowWireframe(e.target.checked)}
    />
    Wireframe
  </label>

  <label>
    <input
      type="checkbox"
      checked={showNormals}
      onChange={(e) => setShowNormals(e.target.checked)}
    />
    Show Normals
  </label>

  <label>
    <input
      type="checkbox"
      checked={showBounds}
      onChange={(e) => setShowBounds(e.target.checked)}
    />
    Show Bounding Box
  </label>
</div>
```

---

### Phase 7: Advanced Features (Optional)

#### 7.1 Model Bounds Calculation
```typescript
function computeModelBounds(model: Md2Model): { min: Vec3; max: Vec3 } {
  const frame = model.frames[0];
  let min = { x: Infinity, y: Infinity, z: Infinity };
  let max = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (const vertex of frame.vertices) {
    min.x = Math.min(min.x, vertex.position.x);
    min.y = Math.min(min.y, vertex.position.y);
    min.z = Math.min(min.z, vertex.position.z);
    max.x = Math.max(max.x, vertex.position.x);
    max.y = Math.max(max.y, vertex.position.y);
    max.z = Math.max(max.z, vertex.position.z);
  }

  return { min, max };
}

// Use bounds to auto-compute camera radius
const bounds = computeModelBounds(model);
const size = Math.max(
  bounds.max.x - bounds.min.x,
  bounds.max.y - bounds.min.y,
  bounds.max.z - bounds.min.z
);
const initialRadius = size * 2.5;
```

#### 7.2 Auto-rotation
```typescript
useEffect(() => {
  if (!autoRotate) return;

  const interval = setInterval(() => {
    setOrbit(prev => ({
      ...prev,
      theta: (prev.theta + 0.01) % (Math.PI * 2)
    }));
  }, 16); // ~60fps

  return () => clearInterval(interval);
}, [autoRotate]);
```

#### 7.3 Wireframe Rendering
```typescript
if (showWireframe) {
  gl.polygonMode?.(gl.FRONT_AND_BACK, gl.LINE); // WebGL2 may not support this
  // Alternative: render twice with different shaders, or use line rendering
}
```

#### 7.4 Multiple Skins Support
```typescript
const [skinIndex, setSkinIndex] = useState(0);

<select value={skinIndex} onChange={(e) => switchSkin(parseInt(e.target.value))}>
  {model.skins.map((skin, i) => (
    <option key={i} value={i}>{skin.name}</option>
  ))}
</select>
```

---

## CSS Styling

### Viewer Layout
```css
.md2-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
}

.md2-canvas-container {
  flex: 1;
  position: relative;
  min-height: 400px;
}

.md2-viewer-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
}

.md2-viewer-canvas:active {
  cursor: grabbing;
}

.md2-controls-panel {
  padding: 12px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.md2-control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.md2-control-group label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.md2-control-group select,
.md2-control-group input[type="range"] {
  flex: 1;
  min-width: 120px;
}

.md2-control-group button {
  padding: 6px 12px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.md2-control-group button:hover {
  background: #ff6b6b;
}
```

---

## File Structure

```
src/
├─ components/
│  ├─ Md2Viewer.tsx              # Main viewer component
│  ├─ Md2AnimationControls.tsx   # Animation UI
│  ├─ Md2CameraControls.tsx      # Camera UI
│  └─ PreviewPanel.tsx            # Updated to use Md2Viewer
├─ utils/
│  ├─ md2Rendering.ts             # Rendering utilities
│  └─ cameraUtils.ts              # Camera math helpers
└─ styles/
   └─ md2Viewer.css               # Viewer styles
```

---

## Integration with Existing Code

### Update PreviewPanel.tsx
```typescript
case 'md2':
  return (
    <Md2Viewer
      model={parsedFile.model}
      animations={parsedFile.animations}
      skinPath={parsedFile.model.skins[0]?.name}
      hasFile={hasFile}
      loadFile={async (path) => await pakService.readFile(path)}
    />
  );
```

---

## Testing Strategy

### Unit Tests
- Camera position calculations
- Frame blend interpolation
- Bounds computation
- Animation state transitions

### Integration Tests
- Load tris.md2 and render to canvas
- Verify WebGL context creation
- Test animation playback
- Test texture loading

---

## Performance Considerations

1. **Memoization**: Memoize geometry building (only rebuild on model change)
2. **RAF Management**: Single requestAnimationFrame loop for both animation and rendering
3. **Texture Caching**: Cache loaded textures to avoid re-parsing
4. **Viewport Cull**: Skip rendering when viewer is not visible
5. **LOD**: Consider level-of-detail for large models (future enhancement)

---

## Dependencies Summary

### From quake2ts
- `Md2Pipeline`, `Md2MeshBuffers`, `buildMd2Geometry`, `buildMd2VertexData`
- `Camera`, `createWebGLContext`
- `groupMd2Animations`, `advanceAnimation`, `computeFrameBlend`, `createAnimationState`
- `parsePcx`, `pcxToRgba`, `Texture2D`
- `MD2_VERTEX_SHADER`, `MD2_FRAGMENT_SHADER`

### Additional Utilities Needed
- Matrix math library (for MVP matrix calculation) - check if quake2ts exports mat4 utilities
- If not available, use `gl-matrix` or implement minimal mat4 helpers

---

## Next Steps

1. Create `Md2Viewer.tsx` skeleton with WebGL canvas
2. Initialize `Md2Pipeline` and render first frame (static)
3. Add camera orbit controls
4. Implement animation playback
5. Add texture loading
6. Polish UI controls
7. Add tests

---

## Notes

- The quake2ts library provides a complete rendering pipeline, so we don't need to write custom shaders
- The `Md2Pipeline` handles all uniform binding and shader management
- `Md2MeshBuffers` handles GPU buffer updates for animation frames
- The built-in interpolation (`computeFrameBlend`) provides smooth animation between keyframes
