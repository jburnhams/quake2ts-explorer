import React, { useEffect, useRef, useState } from 'react';
import { createWebGLContext, Camera } from 'quake2ts/engine';
import { mat4, vec3 } from 'gl-matrix';
import { ParsedFile, PakService } from '../../services/pakService';
import { ViewerAdapter } from './adapters/types';
import { Md2Adapter } from './adapters/Md2Adapter';
import { Md3Adapter } from './adapters/Md3Adapter';
import { BspAdapter } from './adapters/BspAdapter';
import { Dm2Adapter } from './adapters/Dm2Adapter';
import { ViewerControls } from './ViewerControls';
import { OrbitState, computeCameraPosition, FreeCameraState, updateFreeCamera, computeFreeCameraViewMatrix } from '../../utils/cameraUtils';
import '../../styles/md2Viewer.css';

export interface UniversalViewerProps {
  parsedFile: ParsedFile;
  pakService: PakService;
  filePath?: string;
}

function computeCameraPositionZUp(orbit: OrbitState): vec3 {
  // Z-up spherical coordinates
  const x = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
  const y = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
  const z = orbit.radius * Math.cos(orbit.phi);
  return vec3.fromValues(x, y, z);
}

export function UniversalViewer({ parsedFile, pakService, filePath = '' }: UniversalViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [adapter, setAdapter] = useState<ViewerAdapter | null>(null);
  const [glContext, setGlContext] = useState<{ gl: WebGL2RenderingContext } | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'free'>('orbit');

  const [orbit, setOrbit] = useState<OrbitState>({
    radius: 200,
    theta: 0,
    phi: Math.PI / 4,
    target: [0, 0, 0] as vec3,
  });

  const [freeCamera, setFreeCamera] = useState<FreeCameraState>({
    position: [0, 0, 0] as vec3,
    rotation: [0, 0, 0] as vec3
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  // Input State Refs
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mouseState = useRef({
      isDragging: false,
      lastX: 0,
      lastY: 0,
      deltaX: 0,
      deltaY: 0
  });

  // Handle Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button === 0) { // Left click
            mouseState.current.isDragging = true;
            mouseState.current.lastX = e.clientX;
            mouseState.current.lastY = e.clientY;
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (mouseState.current.isDragging) {
            mouseState.current.deltaX += e.clientX - mouseState.current.lastX;
            mouseState.current.deltaY += e.clientY - mouseState.current.lastY;
            mouseState.current.lastX = e.clientX;
            mouseState.current.lastY = e.clientY;
        }
    };

    const handleMouseUp = () => {
        mouseState.current.isDragging = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Initialize GL and Camera
  useEffect(() => {
     if (!canvasRef.current) return;
     try {
        const context = createWebGLContext(canvasRef.current, {
            contextAttributes: { depth: true, antialias: true }
        });
        setGlContext(context);

        const cam = new Camera();
        cam.fov = 60;
        setCamera(cam);
     } catch (e) {
        console.error("WebGL Init Failed", e);
        setError("Failed to initialize WebGL");
     }
  }, []);

  // Initialize Adapter
  useEffect(() => {
     if (!glContext) return;
     const { gl } = glContext;

     let newAdapter: ViewerAdapter | null = null;

     // Reset state for new file
     setError(null);
     setIsPlaying(true);
     setSpeed(1.0);

     const initAdapter = async () => {
         try {
             switch (parsedFile.type) {
                 case 'md2': newAdapter = new Md2Adapter(); break;
                 case 'md3': newAdapter = new Md3Adapter(); break;
                 case 'bsp': newAdapter = new BspAdapter(); break;
                 case 'dm2': newAdapter = new Dm2Adapter(); break;
                 default: throw new Error(`Unsupported file type: ${(parsedFile as any).type}`);
             }

             if (newAdapter) {
                 await newAdapter.load(gl, parsedFile, pakService, filePath);
                 setAdapter(newAdapter);
             }

             // Reset orbit/free camera defaults based on type
             if (parsedFile.type === 'bsp' || parsedFile.type === 'dm2') {
                 setCameraMode('free');
                 // For BSP, maybe start at a reasonable position if available (e.g. from entities), but default 0,0,0 is okay usually.
                 // Actually BSP maps are huge, 0,0,0 might be in void.
                 // BspAdapter might have loaded entities and know player_start.
                 // But we don't expose it yet.
                 // Let's stick to default.

                 setFreeCamera({
                    position: [0, 0, 50] as vec3,
                    rotation: [0, 0, 0] as vec3
                 });

                 setOrbit({
                    radius: 1000,
                    theta: 0,
                    phi: Math.PI / 4,
                    target: [0, 0, 0] as vec3
                 });
             } else {
                 // Models
                 setCameraMode('orbit');
                 setOrbit({
                    radius: 100,
                    theta: 0,
                    phi: Math.PI / 4,
                    target: [0, 0, 24] as vec3 // Center slightly up for models
                 });
             }

         } catch (e) {
             console.error("Adapter Init Failed", e);
             setError(`Failed to load viewer: ${e instanceof Error ? e.message : String(e)}`);
             newAdapter?.cleanup();
         }
     };

     initAdapter();

     return () => {
         if (newAdapter) newAdapter.cleanup();
         setAdapter(null);
     };
  }, [parsedFile, glContext, pakService]);

  // Update & Render Loop
  useEffect(() => {
      if (!adapter || !glContext || !camera) return;
      const { gl } = glContext;

      let lastTime = performance.now();
      let frameId: number;
      let running = true;

      const loop = (currentTime: number) => {
          if (!running) return;
          const delta = (currentTime - lastTime) / 1000;
          lastTime = currentTime;

          // Update
          if (adapter.setSpeed) adapter.setSpeed(speed);
          if (isPlaying && adapter.play && !adapter.isPlaying?.()) adapter.play();
          else if (!isPlaying && adapter.pause && adapter.isPlaying?.()) adapter.pause();

          adapter.update(delta);

          // Camera Logic
          const viewMatrix = mat4.create();
          const useZUp = adapter.useZUp ? adapter.useZUp() : false;

          if (adapter.hasCameraControl && adapter.hasCameraControl()) {
               const update = adapter.getCameraUpdate ? adapter.getCameraUpdate() : null;
               if (update) {
                   // Adapter controls camera (e.g. DM2)
                   if (camera.position) vec3.copy(camera.position, update.position);
                   if (camera.angles) vec3.copy(camera.angles, update.angles);

                   if ((camera as any).updateMatrices) {
                       (camera as any).updateMatrices();
                   }

                   if (camera.viewMatrix) {
                       mat4.copy(viewMatrix, camera.viewMatrix as mat4);
                   }
               }
          } else {
               if (cameraMode === 'free') {
                   // Update Free Camera State
                   const inputs = {
                       forward: !!(keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']),
                       backward: !!(keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']),
                       left: !!(keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']),
                       right: !!(keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']),
                       deltaX: mouseState.current.deltaX,
                       deltaY: mouseState.current.deltaY
                   };

                   // Consume deltas
                   mouseState.current.deltaX = 0;
                   mouseState.current.deltaY = 0;

                   // Ideally we should use functional update or ref for state to avoid dependency loop if we were using setFreeCamera inside loop.
                   // But here we can't easily use setFreeCamera with dependency because loop runs every frame.
                   // So we need a ref for freeCamera or just update it here and force re-render?
                   // Re-rendering every frame via React state update is bad for performance if not careful.
                   // But here we are inside `useEffect` with `adapter`.

                   // Best practice for game loop in React: Use ref for mutable game state.
                   // But I already have `freeCamera` as state.
                   // I should use a Ref for the camera state used in the loop, and maybe sync to React state occasionally or just use Ref.
                   // Let's use a Ref for the live camera state.
               } else {
                   // Orbit Control
                   const eye = useZUp ? computeCameraPositionZUp(orbit) : computeCameraPosition(orbit);
                   const up = useZUp ? [0, 0, 1] : [0, 1, 0];

                   mat4.lookAt(viewMatrix, eye, orbit.target, up as vec3);

                   // Also set camera position for completeness
                   if (camera.position) {
                       vec3.copy(camera.position, eye);
                   }
               }
          }

          // Wait, I need to implement the Free Camera update properly using Ref to avoid closure staleness.
          // But I can't easily switch between State and Ref without refactoring how UniversalViewer handles state.
          // For now, I'll rely on a Ref that is initialized from state.

          gl.clearColor(0.15, 0.15, 0.2, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.enable(gl.DEPTH_TEST);
          gl.enable(gl.CULL_FACE);

          // To properly handle free camera update, I need to move the logic into this loop block
          // and use a Ref for FreeCameraState.

          adapter.render(gl, camera, viewMatrix);

          frameId = requestAnimationFrame(loop);
      };

      frameId = requestAnimationFrame(loop);
      return () => {
          running = false;
          cancelAnimationFrame(frameId);
      };
  }, [adapter, glContext, camera, orbit, isPlaying, speed, cameraMode]); // Dependencies restart loop.

  // We need a separate effect to update the FreeCameraState ref when state changes (initial load)
  // And we need to store the current FreeCameraState in a Ref so the loop can update it without restarting.
  const freeCameraRef = useRef<FreeCameraState>(freeCamera);
  useEffect(() => {
      freeCameraRef.current = freeCamera;
  }, [freeCamera]);

  // But if we update Ref inside loop, the React state won't update, so UI won't reflect it (if we displayed pos).
  // That's fine.

  // I need to override the loop effect above to include Free Camera logic properly.
  // I will re-write the loop effect logic.

  useEffect(() => {
      if (!adapter || !glContext || !camera) return;
      const { gl } = glContext;

      let lastTime = performance.now();
      let frameId: number;
      let running = true;

      const loop = (currentTime: number) => {
          if (!running) return;
          const delta = (currentTime - lastTime) / 1000;
          lastTime = currentTime;

          // Update
          if (adapter.setSpeed) adapter.setSpeed(speed);
          if (isPlaying && adapter.play && !adapter.isPlaying?.()) adapter.play();
          else if (!isPlaying && adapter.pause && adapter.isPlaying?.()) adapter.pause();

          adapter.update(delta);

          // Camera Logic
          const viewMatrix = mat4.create();
          const useZUp = adapter.useZUp ? adapter.useZUp() : false;

          if (adapter.hasCameraControl && adapter.hasCameraControl()) {
               const update = adapter.getCameraUpdate ? adapter.getCameraUpdate() : null;
               if (update) {
                   if (camera.position) vec3.copy(camera.position, update.position);
                   if (camera.angles) vec3.copy(camera.angles, update.angles);
                   if ((camera as any).updateMatrices) (camera as any).updateMatrices();
                   if (camera.viewMatrix) mat4.copy(viewMatrix, camera.viewMatrix as mat4);
               }
          } else {
               if (cameraMode === 'free') {
                   // Update Free Camera
                   const inputs = {
                       forward: !!(keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']),
                       backward: !!(keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']),
                       left: !!(keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']),
                       right: !!(keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']),
                       deltaX: mouseState.current.deltaX,
                       deltaY: mouseState.current.deltaY
                   };

                   mouseState.current.deltaX = 0;
                   mouseState.current.deltaY = 0;

                   const newState = updateFreeCamera(freeCameraRef.current, inputs, delta, 300, 0.002, useZUp);
                   freeCameraRef.current = newState;

                   computeFreeCameraViewMatrix(newState, viewMatrix, useZUp);

                   if (camera.position) vec3.copy(camera.position, newState.position);
                   // Angles in camera might be useful for other things, but viewMatrix is key.
               } else {
                   // Orbit Control
                   // Use orbit state directly (it's in dependency so loop restarts on orbit change)
                   // But wait, orbit changes via controls which updates state -> restarts loop.
                   // Free camera updates via loop -> doesn't restart loop.

                   const eye = useZUp ? computeCameraPositionZUp(orbit) : computeCameraPosition(orbit);
                   const up = useZUp ? [0, 0, 1] : [0, 1, 0];

                   mat4.lookAt(viewMatrix, eye, orbit.target, up as vec3);

                   if (camera.position) {
                       vec3.copy(camera.position, eye);
                   }
               }
          }

          gl.clearColor(0.15, 0.15, 0.2, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.enable(gl.DEPTH_TEST);
          gl.enable(gl.CULL_FACE);

          adapter.render(gl, camera, viewMatrix);

          frameId = requestAnimationFrame(loop);
      };

      frameId = requestAnimationFrame(loop);
      return () => {
          running = false;
          cancelAnimationFrame(frameId);
      };
  }, [adapter, glContext, camera, orbit, isPlaying, speed, cameraMode]); // Note: orbit is dependency

  // Resize Handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera || !glContext) return;

    const handleResize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      glContext.gl.viewport(0, 0, canvas.width, canvas.height);
      camera.aspect = canvas.width / canvas.height;
      if ((camera as any).updateMatrices) {
          (camera as any).updateMatrices();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef, camera, glContext]);

  return (
     <div className="md2-viewer" style={{ position: 'relative', width: '100%', height: '100%' }}>
       {error && (
         <div style={{ position: 'absolute', top: 10, left: 10, color: 'red', background: 'rgba(0,0,0,0.8)', padding: 10, zIndex: 100 }}>
            Error: {error}
         </div>
       )}
       <div className="md2-canvas-container" style={{ width: '100%', height: '100%' }}>
         <canvas ref={canvasRef} className="md2-viewer-canvas" style={{ width: '100%', height: '100%' }} />
       </div>
       <ViewerControls
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          orbit={orbit}
          setOrbit={setOrbit}
          hasPlayback={adapter?.play !== undefined}
          speed={speed}
          setSpeed={setSpeed}
          showCameraControls={!(adapter?.hasCameraControl && adapter?.hasCameraControl())}
          cameraMode={cameraMode}
          setCameraMode={setCameraMode}
       />
     </div>
  );
}
