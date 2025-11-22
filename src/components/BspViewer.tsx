import React, { useEffect, useRef, useState } from 'react';
import {
  BspMap,
  createWebGLContext,
  BspSurfacePipeline,
  createBspSurfaces,
  buildBspGeometry,
  Camera,
  Texture2D,
  parseWal,
  walToRgba,
  BspGeometryBuildResult,
  resolveLightStyles,
  applySurfaceState
} from 'quake2ts/engine';
import { mat4, vec3 } from 'gl-matrix';
import { CameraControls } from './CameraControls';
import { computeCameraPosition, OrbitState } from '../utils/cameraUtils';
import { PakService } from '../services/pakService';

export interface BspViewerProps {
  map: BspMap;
  pakService: PakService;
}

export function BspViewer({ map, pakService }: BspViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glContext, setGlContext] = useState<{ gl: WebGL2RenderingContext } | null>(null);
  const [pipeline, setPipeline] = useState<BspSurfacePipeline | null>(null);
  const [geometry, setGeometry] = useState<BspGeometryBuildResult | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [textures, setTextures] = useState<Map<string, Texture2D>>(new Map());

  const [orbit, setOrbit] = useState<OrbitState>({
    radius: 1000,
    theta: 0,
    phi: Math.PI / 4,
    target: [0, 0, 0] as vec3,
  });
  const [autoRotate, setAutoRotate] = useState(false);

  // Initialize GL and Pipeline
  useEffect(() => {
    if (!canvasRef.current) return;
    try {
        const context = createWebGLContext(canvasRef.current, {
            contextAttributes: {
                depth: true,
                antialias: true,
                preserveDrawingBuffer: false
            }
        });
        setGlContext(context);
        const { gl } = context;
        setPipeline(new BspSurfacePipeline(gl));
    } catch (e) {
        console.error("Failed to initialize WebGL:", e);
    }
  }, []);

  // Build Geometry and Center Camera
  useEffect(() => {
    if (!glContext || !map) return;
    const { gl } = glContext;

    try {
        const surfaces = createBspSurfaces(map);
        const geo = buildBspGeometry(gl, surfaces);
        setGeometry(geo);

        // Calculate center based on world model (model 0)
        if (map.models.length > 0) {
            const world = map.models[0];
            const center = vec3.create();
            // Cast to vec3 to satisfy type checker if needed, assuming array matches vec3
            const mins = world.mins as unknown as vec3;
            const maxs = world.maxs as unknown as vec3;

            vec3.add(center, mins, maxs);
            vec3.scale(center, center, 0.5);
            setOrbit(prev => ({
                ...prev,
                target: center,
                radius: Math.max(vec3.distance(mins, maxs), 500)
            }));
        }
    } catch (e) {
        console.error("Failed to build BSP geometry:", e);
    }
  }, [glContext, map]);

  // Load Textures
  useEffect(() => {
    if (!glContext || !geometry || !pakService) return;
    const { gl } = glContext;
    const neededTextures = new Set<string>();
    geometry.surfaces.forEach(s => neededTextures.add(s.texture));

    let isCancelled = false;

    const loadTexture = async (name: string) => {
        const path = `textures/${name}.wal`;
        if (pakService.hasFile(path)) {
            try {
                const data = await pakService.readFile(path);
                // We need the raw buffer
                const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
                const wal = parseWal(buffer);
                const palette = pakService.getPalette();
                if (palette) {
                     const prepared = walToRgba(wal, palette);
                     // Create texture
                     const tex = new Texture2D(gl);
                     tex.bind();
                     tex.setParameters({
                         minFilter: gl.LINEAR_MIPMAP_LINEAR,
                         magFilter: gl.LINEAR,
                         wrapS: gl.REPEAT,
                         wrapT: gl.REPEAT
                     });

                     if (prepared.levels.length > 0) {
                         const level0 = prepared.levels[0];
                         tex.uploadImage(0, gl.RGBA, level0.width, level0.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, level0.rgba);
                         gl.generateMipmap(gl.TEXTURE_2D);
                         return tex;
                     }
                }
            } catch (e) {
                console.warn(`Failed to load texture ${name}`, e);
            }
        }
        return null;
    };

    const loadAll = async () => {
        const newTextures = new Map<string, Texture2D>();

        // Load textures in parallel? Might be too many. Sequential for now or batched.
        // There can be hundreds of textures.
        const promises = Array.from(neededTextures).map(async name => {
            const tex = await loadTexture(name);
            if (tex && !isCancelled) newTextures.set(name, tex);
        });

        await Promise.all(promises);

        if (!isCancelled) {
            setTextures(newTextures);
        }
    };

    loadAll();

    return () => { isCancelled = true; };
  }, [glContext, geometry, pakService]);

  // Setup Camera
  useEffect(() => {
    const newCamera = new Camera();
    newCamera.fov = 60;
    setCamera(newCamera);
  }, []);

  // Handle Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera || !glContext) return;

    const handleResize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      glContext.gl.viewport(0, 0, canvas.width, canvas.height);
      camera.aspect = canvas.width / canvas.height;
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef, camera, glContext]);

  // Render Loop
  useEffect(() => {
    if (!glContext || !pipeline || !geometry || !camera) return;
    const { gl } = glContext;

    let animationFrameId: number;
    let lastTime = performance.now();

    const lightStyles = resolveLightStyles();
    // Convert Float32Array to ReadonlyArray<number> as expected by type definition if needed
    // But assuming the runtime handles Float32Array or the type def is compatible
    const styleValues = Array.from(lightStyles);

    const render = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      if (autoRotate) {
        setOrbit(prev => ({ ...prev, theta: (prev.theta + delta * 0.0002) % (Math.PI * 2) }));
      }

      gl.clearColor(0.05, 0.05, 0.08, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);

      const eye = computeCameraPosition(orbit);
      const view = mat4.create();
      // Quake 2 uses Z-up.
      mat4.lookAt(view, eye, orbit.target, [0, 0, 1] as vec3);

      const projection = camera.projectionMatrix;
      const mvp = mat4.create();
      mat4.multiply(mvp, projection, view);

      // Render surfaces
      for (const surface of geometry.surfaces) {
          // Bind Diffuse
          const texture = textures.get(surface.texture);
          if (texture) {
              gl.activeTexture(gl.TEXTURE0);
              texture.bind();
          } else {
              // Maybe bind a default white texture or checkerboard?
              // For now, if missing, it might render black or last bound.
              // We could have a fallback texture.
          }

          // Bind Lightmap
          if (surface.lightmap) {
             const atlas = geometry.lightmaps[surface.lightmap.atlasIndex];
             if (atlas) {
                 gl.activeTexture(gl.TEXTURE1);
                 atlas.texture.bind();
             }
          }

          const state = pipeline.bind({
              modelViewProjection: mvp as any,
              diffuseSampler: 0,
              lightmapSampler: 1,
              styleValues: styleValues,
              surfaceFlags: surface.surfaceFlags,
              timeSeconds: currentTime / 1000
          });

          applySurfaceState(gl, state);

          surface.vao.bind();
          gl.drawElements(gl.TRIANGLES, surface.indexCount, gl.UNSIGNED_SHORT, 0);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [glContext, pipeline, geometry, camera, orbit, textures, autoRotate]);

  return (
    <div className="bsp-viewer" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="bsp-canvas-container" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <canvas
            ref={canvasRef}
            className="bsp-viewer-canvas"
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>
      <div className="bsp-controls-panel" style={{ padding: '10px', background: '#2a2a2a', borderTop: '1px solid #333' }}>
        <CameraControls
            orbit={orbit}
            setOrbit={setOrbit}
            autoRotate={autoRotate}
            setAutoRotate={setAutoRotate}
            minDistance={100}
            maxDistance={8000}
            defaultRadius={1000}
        />
      </div>
    </div>
  );
}
