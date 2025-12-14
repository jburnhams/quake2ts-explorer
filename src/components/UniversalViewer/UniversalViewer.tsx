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
import { createPickingRay } from '../../utils/camera';
import { DebugMode } from '@/src/types/debugMode';
import '../../styles/md2Viewer.css';

export interface UniversalViewerProps {
  parsedFile: ParsedFile;
  pakService: PakService;
  filePath?: string;
  onClassnamesLoaded?: (classnames: string[]) => void;
  hiddenClassnames?: Set<string>;
  onEntitySelected?: (entity: any) => void;
}

function computeCameraPositionZUp(orbit: OrbitState): vec3 {
  // Z-up spherical coordinates
  const x = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
  const y = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
  const z = orbit.radius * Math.cos(orbit.phi);
  return vec3.fromValues(x, y, z);
}

export function UniversalViewer({ parsedFile, pakService, filePath = '', onClassnamesLoaded, hiddenClassnames, onEntitySelected }: UniversalViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [adapter, setAdapter] = useState<ViewerAdapter | null>(null);
  const [glContext, setGlContext] = useState<{ gl: WebGL2RenderingContext } | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'free'>('orbit');
  const [renderMode, setRenderMode] = useState<'textured' | 'wireframe' | 'solid' | 'solid-faceted' | 'random'>('textured');
  const [renderColor, setRenderColor] = useState<[number, number, number]>([1, 1, 1]);
  const [debugMode, setDebugMode] = useState<DebugMode>(DebugMode.None);
  const [hoveredEntity, setHoveredEntity] = useState<any | null>(null);

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
      deltaY: 0,
      hasMoved: false
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
            mouseState.current.hasMoved = false;
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (mouseState.current.isDragging) {
            const dx = e.clientX - mouseState.current.lastX;
            const dy = e.clientY - mouseState.current.lastY;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                mouseState.current.hasMoved = true;
            }
            mouseState.current.deltaX += dx;
            mouseState.current.deltaY += dy;
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

                 if ((newAdapter as any).getUniqueClassnames) {
                    const classnames = (newAdapter as any).getUniqueClassnames();
                    onClassnamesLoaded?.(classnames);
                 } else {
                    onClassnamesLoaded?.([]);
                 }
             }

             // Reset orbit/free camera defaults based on type
             if (parsedFile.type === 'bsp' || parsedFile.type === 'dm2') {
                 setCameraMode('free');
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


  const freeCameraRef = useRef<FreeCameraState>(freeCamera);
  useEffect(() => {
      freeCameraRef.current = freeCamera;
  }, [freeCamera]);

  const orbitRef = useRef<OrbitState>(orbit);
  useEffect(() => {
    orbitRef.current = orbit;
  }, [orbit]);

  useEffect(() => {
    if (adapter && adapter.setRenderOptions) {
      if (renderMode === 'random') {
        adapter.setRenderOptions({ mode: 'solid', color: renderColor, generateRandomColor: true });
      } else {
        adapter.setRenderOptions({ mode: renderMode as 'textured' | 'wireframe' | 'solid' | 'solid-faceted', color: renderColor });
      }
    }
  }, [adapter, renderMode, renderColor]);

  useEffect(() => {
    if (adapter && (adapter as any).setDebugMode) {
        (adapter as any).setDebugMode(debugMode);
    }
  }, [adapter, debugMode]);

  useEffect(() => {
    if (adapter && adapter.setHiddenClasses && hiddenClassnames) {
      adapter.setHiddenClasses(hiddenClassnames);
    }
  }, [adapter, hiddenClassnames]);

  // Picking Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !adapter || !adapter.pickEntity || !camera) return;

    const getCurrentViewMatrix = () => {
        const viewMatrix = mat4.create();
        const useZUp = adapter.useZUp ? adapter.useZUp() : false;

        if (adapter.hasCameraControl && adapter.hasCameraControl()) {
            // Picking generally not supported in demo/playback mode or if adapter controls camera rigidly
            return null;
        }

        if (cameraMode === 'free') {
             computeFreeCameraViewMatrix(freeCameraRef.current, viewMatrix, useZUp);
        } else {
             const eye = useZUp ? computeCameraPositionZUp(orbitRef.current) : computeCameraPosition(orbitRef.current);
             const up = useZUp ? [0, 0, 1] : [0, 1, 0];
             mat4.lookAt(viewMatrix, eye, orbitRef.current.target, up as vec3);
        }
        return viewMatrix;
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (mouseState.current.isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const viewMatrix = getCurrentViewMatrix();
        if (!viewMatrix) return;

        const pickRay = createPickingRay(camera, viewMatrix, { x, y }, { width: rect.width, height: rect.height });

        const result = adapter.pickEntity!(pickRay);
        setHoveredEntity(result ? result.entity : null);
    };

    const handleClick = (e: MouseEvent) => {
        if (mouseState.current.isDragging || mouseState.current.hasMoved) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const viewMatrix = getCurrentViewMatrix();
        if (!viewMatrix) return;

        const pickRay = createPickingRay(camera, viewMatrix, { x, y }, { width: rect.width, height: rect.height });

        const result = adapter.pickEntity!(pickRay);
        if (onEntitySelected) {
            onEntitySelected(result ? result.entity : null);
        }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
    };
  }, [adapter, camera, cameraMode, onEntitySelected]);

  useEffect(() => {
      if (adapter && adapter.setHoveredEntity) {
          adapter.setHoveredEntity(hoveredEntity);
      }
  }, [adapter, hoveredEntity]);


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
                   setFreeCamera(newState);

                   computeFreeCameraViewMatrix(newState, viewMatrix, useZUp);

                   if (camera.position) vec3.copy(camera.position, newState.position);
               } else {
                    // Orbit Control
                    if (mouseState.current.isDragging) {
                        const sensitivity = 0.01;
                        const newOrbit = { ...orbitRef.current };
                        newOrbit.theta -= mouseState.current.deltaX * sensitivity;
                        newOrbit.phi -= mouseState.current.deltaY * sensitivity;

                        newOrbit.phi = Math.max(0.1, Math.min(Math.PI - 0.1, newOrbit.phi));

                        orbitRef.current = newOrbit;
                        setOrbit(newOrbit);
                    }

                    mouseState.current.deltaX = 0;
                    mouseState.current.deltaY = 0;

                    const eye = useZUp ? computeCameraPositionZUp(orbitRef.current) : computeCameraPosition(orbitRef.current);
                    const up = useZUp ? [0, 0, 1] : [0, 1, 0];

                    mat4.lookAt(viewMatrix, eye, orbitRef.current.target, up as vec3);

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
  }, [adapter, glContext, camera, orbit, isPlaying, speed, cameraMode]);

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
          freeCamera={freeCamera}
          setFreeCamera={setFreeCamera}
          hasPlayback={adapter?.play !== undefined}
          speed={speed}
          setSpeed={setSpeed}
          showCameraControls={!(adapter?.hasCameraControl && adapter?.hasCameraControl())}
          cameraMode={cameraMode}
          setCameraMode={setCameraMode}
          renderMode={renderMode}
          setRenderMode={setRenderMode}
          renderColor={renderColor}
          setRenderColor={setRenderColor}
          debugMode={debugMode}
          setDebugMode={setDebugMode}
       />
     </div>
  );
}
