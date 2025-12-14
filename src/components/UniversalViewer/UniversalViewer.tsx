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
import { DemoTimeline } from '../DemoTimeline';
import { FrameInfo } from '../FrameInfo';
import { OrbitState, computeCameraPosition, FreeCameraState, updateFreeCamera, computeFreeCameraViewMatrix } from '../../utils/cameraUtils';
import { createPickingRay } from '../../utils/camera';
import { DebugMode } from '@/src/types/debugMode';
import { CameraMode } from '@/src/types/cameraMode';
import { captureScreenshot, downloadScreenshot, generateScreenshotFilename } from '@/src/services/screenshotService';
import { videoRecorderService } from '@/src/services/videoRecorder';
import { PerformanceStats } from '../PerformanceStats';
import { RenderStatistics } from '@/src/types/renderStatistics';
import { performanceService } from '@/src/services/performanceService';
import { SurfaceFlags } from '../SurfaceFlags';
import '../../styles/md2Viewer.css';

export interface UniversalViewerProps {
  parsedFile: ParsedFile;
  pakService: PakService;
  filePath?: string;
  onClassnamesLoaded?: (classnames: string[]) => void;
  hiddenClassnames?: Set<string>;
  onEntitySelected?: (entity: any) => void;
  onAdapterReady?: (adapter: ViewerAdapter) => void;
  showControls?: boolean;
}

function computeCameraPositionZUp(orbit: OrbitState): vec3 {
  // Z-up spherical coordinates
  const x = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
  const y = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
  const z = orbit.radius * Math.cos(orbit.phi);
  return vec3.fromValues(x, y, z);
}

export function UniversalViewer({ parsedFile, pakService, filePath = '', onClassnamesLoaded, hiddenClassnames, onEntitySelected, onAdapterReady, showControls = true }: UniversalViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [adapter, setAdapter] = useState<ViewerAdapter | null>(null);
  const [glContext, setGlContext] = useState<{ gl: WebGL2RenderingContext } | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'free'>('orbit');
  const [demoCameraMode, setDemoCameraMode] = useState<CameraMode>(CameraMode.FirstPerson);
  const [renderMode, setRenderMode] = useState<'textured' | 'wireframe' | 'solid' | 'solid-faceted' | 'random'>('textured');
  const [renderColor, setRenderColor] = useState<[number, number, number]>([1, 1, 1]);
  const [debugMode, setDebugMode] = useState<DebugMode>(DebugMode.None);
  const [hoveredEntity, setHoveredEntity] = useState<any | null>(null);
  const [hoveredSurfaceProps, setHoveredSurfaceProps] = useState<any | null>(null);
  const [showFrameInfo, setShowFrameInfo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<RenderStatistics | null>(null);
  const [fps, setFps] = useState(0);
  const [minFps, setMinFps] = useState(0);
  const [maxFps, setMaxFps] = useState(0);
  const [perfHistory, setPerfHistory] = useState<{ fps: number; frameTime: number }[]>([]);

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
  const [showFlash, setShowFlash] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        setRecordingDuration((Date.now() - recordingStartTime) / 1000);
      }, 100);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (videoRecorderService.isRecording()) {
        videoRecorderService.stopRecording().catch(() => {});
      }
    };
  }, []);

  const handleScreenshot = async () => {
    if (!canvasRef.current) return;

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

    try {
        const blob = await captureScreenshot(canvasRef.current, { format: 'png' });
        const filename = generateScreenshotFilename();
        downloadScreenshot(blob, filename);
    } catch (e) {
        console.error("Screenshot failed:", e);
        setError(`Screenshot failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleStartRecording = () => {
    if (!canvasRef.current) return;
    try {
      videoRecorderService.startRecording(canvasRef.current);
      setIsRecording(true);
      setRecordingStartTime(Date.now());
    } catch (e) {
      console.error("Recording failed:", e);
      setError(`Recording failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      const blob = await videoRecorderService.stopRecording();
      setIsRecording(false);
      setRecordingStartTime(null);
      const filename = generateScreenshotFilename('quake2ts_recording').replace('.png', '.webm');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Stop recording failed:", e);
      setError(`Stop recording failed: ${e instanceof Error ? e.message : String(e)}`);
      setIsRecording(false);
    }
  };

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

  const handleStepForward = (frames: number = 1) => {
      // Use adapter's custom step logic if available (for smooth stepping)
      if (adapter && (adapter as any).stepForward) {
          (adapter as any).stepForward(frames);
          setIsPlaying(false);
          return;
      }

      // Fallback to controller logic
      if (adapter && adapter.getDemoController) {
          const controller = adapter.getDemoController();
          if (controller) {
              if (frames > 1 && (controller as any).seekToFrame) {
                  const current = controller.getCurrentFrame();
                  controller.seekToFrame(current + frames);
              } else {
                  controller.stepForward();
              }
              setIsPlaying(false); // Auto-pause when stepping
          }
      }
  };

  const handleStepBackward = (frames: number = 1) => {
      // Use adapter's custom step logic if available
      if (adapter && (adapter as any).stepBackward) {
          (adapter as any).stepBackward(frames);
          setIsPlaying(false);
          return;
      }

      if (adapter && adapter.getDemoController) {
          const controller = adapter.getDemoController();
          if (controller) {
              if (frames > 1 && (controller as any).seekToFrame) {
                  const current = controller.getCurrentFrame();
                  controller.seekToFrame(Math.max(0, current - frames));
              } else {
                  controller.stepBackward();
              }
              setIsPlaying(false); // Auto-pause when stepping
          }
      }
  };

  // Handle Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        keysPressed.current[e.code] = true;

        if (e.code === 'KeyF') {
            setShowFrameInfo(prev => !prev);
        }

        if (e.code === 'F12' || e.code === 'PrintScreen') {
            e.preventDefault(); // Prevent browser dev tools or system screenshot
            handleScreenshot();
        }

        // Frame Stepping Shortcuts
        if (adapter && adapter.getDemoController && adapter.hasCameraControl && adapter.hasCameraControl()) {
            const controller = adapter.getDemoController();

            if (e.code === 'ArrowRight' && !isPlaying) {
                 if (e.shiftKey) {
                    handleStepForward(10);
                 } else {
                    handleStepForward(1);
                 }
            } else if (e.code === 'ArrowLeft' && !isPlaying) {
                 if (e.shiftKey) {
                    handleStepBackward(10);
                 } else {
                    handleStepBackward(1);
                 }
            } else if (e.code === 'Home') {
                 if (controller) {
                     controller.seekToTime(0);
                     setIsPlaying(false);
                 }
            } else if (e.code === 'End') {
                 if (controller) {
                     controller.seekToTime(controller.getDuration());
                     setIsPlaying(false);
                 }
            }
        }
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
  }, [adapter, isPlaying]); // Depend on adapter/isPlaying to capture current state for shortcuts

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
            contextAttributes: { depth: true, antialias: true, preserveDrawingBuffer: true }
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
                 if (onAdapterReady) {
                     onAdapterReady(newAdapter);
                 }

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
    if (adapter && adapter.setCameraMode) {
        // If we are switching TO free or orbital mode, we should sync the local camera state
        // to the current camera position so there is no jump.
        if (demoCameraMode === CameraMode.Free || demoCameraMode === CameraMode.Orbital) {
            if (camera) {
                // Sync Free Camera
                if (camera.position) {
                    vec3.copy(freeCameraRef.current.position, camera.position);
                    setFreeCamera(prev => ({ ...prev, position: vec3.clone(camera.position) }));
                }

                // For rotation, we need to extract from view matrix or angles.
                // Camera object usually has 'angles' in degrees if updated by adapter.
                if (camera.angles) {
                    // Convert degrees to radians for FreeCameraState
                    const radX = camera.angles[0] * (Math.PI / 180);
                    const radY = camera.angles[1] * (Math.PI / 180);
                    const radZ = camera.angles[2] * (Math.PI / 180);

                    freeCameraRef.current.rotation = [radX, radY, radZ];
                    setFreeCamera(prev => ({ ...prev, rotation: [radX, radY, radZ] }));
                }

                // Sync Orbital Camera target
                if (camera.position) {
                    // Set target to slightly ahead of camera?
                    // Or set target to camera position and radius to something small?
                    // Actually, usually orbital mode is around a target.
                    // If we switch to orbital, we probably want to orbit the *player* or the current view center.
                    // For now, let's just default to keeping the radius but centering on current pos
                    vec3.copy(orbitRef.current.target, camera.position);
                    // Adjust radius to see the target
                    setOrbit(prev => ({ ...prev, target: vec3.clone(camera.position), radius: 200 }));
                }
            }

            // Explicitly switch the main UI mode to Free or Orbit so inputs are processed
            if (demoCameraMode === CameraMode.Free) setCameraMode('free');
            else if (demoCameraMode === CameraMode.Orbital) setCameraMode('orbit');
        }

        adapter.setCameraMode(demoCameraMode);
    }
  }, [adapter, demoCameraMode]);

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

        // Task 7: Surface properties
        if (result && adapter instanceof BspAdapter) {
            // Need to check if result includes face index
            if (result.faceIndex !== undefined) {
                 const props = (adapter as BspAdapter).getSurfaceProperties(result.faceIndex);
                 setHoveredSurfaceProps(props);
            } else {
                 setHoveredSurfaceProps(null);
            }
        } else {
             setHoveredSurfaceProps(null);
        }
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
      const fpsCounter = performanceService.createFpsCounter();

      // We use refs for stats to avoid triggering re-renders inside the loop unless throttled
      let lastTime = performance.now();
      let frameId: number;
      let running = true;
      let lastStatsUpdate = 0;
      const statsUpdateInterval = 200; // Update stats UI every 200ms

      const loop = (currentTime: number) => {
          if (!running) return;
          const delta = (currentTime - lastTime) / 1000;
          const frameTimeMs = currentTime - lastTime;
          lastTime = currentTime;

          // Update FPS counter
          fpsCounter.update(currentTime);

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

          const cpuStart = performance.now();
          adapter.render(gl, camera, viewMatrix);
          const cpuEnd = performance.now();

          // Collect stats if enabled
          if (showStats && currentTime - lastStatsUpdate > statsUpdateInterval) {
             const currentFps = Math.round(1000 / (frameTimeMs || 16.66)); // Instantaneous FPS

             // Get renderer stats if available
             let renderStats: RenderStatistics | null = null;
             if ((adapter as any).getStatistics) {
                 renderStats = (adapter as any).getStatistics();
             }

             // If adapter doesn't provide full stats, create basic ones
             if (!renderStats) {
                 renderStats = {
                     cpuFrameTimeMs: cpuEnd - cpuStart,
                     drawCalls: 0,
                     triangles: 0,
                     vertices: 0,
                     textureBinds: 0,
                     visibleSurfaces: 0
                 };
             } else {
                 // Ensure CPU time is captured if not provided
                 if (!renderStats.cpuFrameTimeMs) {
                     renderStats.cpuFrameTimeMs = cpuEnd - cpuStart;
                 }
             }

             setStats(renderStats);
             setFps(fpsCounter.getAverageFps());
             setMinFps(fpsCounter.getMinFps());
             setMaxFps(fpsCounter.getMaxFps());

             setPerfHistory(prev => {
                 const newHistory = [...prev, { fps: currentFps, frameTime: frameTimeMs }];
                 if (newHistory.length > 300) { // Keep last ~5 seconds at 60fps
                     return newHistory.slice(newHistory.length - 300);
                 }
                 return newHistory;
             });

             lastStatsUpdate = currentTime;
          } else if (!showStats && stats) {
              // Clear stats if hidden
              setStats(null);
          }

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
       {showFrameInfo && adapter && adapter.getDemoController && adapter.getDemoController() && (
          <FrameInfo controller={adapter.getDemoController()!} />
       )}
       {hoveredSurfaceProps && (
           <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 50 }}>
               <SurfaceFlags properties={hoveredSurfaceProps} />
           </div>
       )}
       {showStats && (
          <PerformanceStats
              fps={fps}
              minFps={minFps}
              maxFps={maxFps}
              stats={stats}
              history={perfHistory}
          />
       )}
       {showFlash && (
          <div data-testid="screenshot-flash" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'white',
              opacity: 0.5,
              pointerEvents: 'none',
              zIndex: 1000,
              transition: 'opacity 0.15s ease-out'
          }} />
       )}
       <div className="md2-canvas-container" style={{ width: '100%', height: '100%' }}>
         <canvas ref={canvasRef} className="md2-viewer-canvas" style={{ width: '100%', height: '100%' }} />
       </div>
       {showControls && (
         <ViewerControls
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            orbit={orbit}
            setOrbit={setOrbit}
            freeCamera={freeCamera}
            setFreeCamera={setFreeCamera}
            hasPlayback={adapter?.play !== undefined}
            onStepForward={() => adapter?.getDemoController && handleStepForward()}
            onStepBackward={() => adapter?.getDemoController && handleStepBackward()}
            speed={speed}
            setSpeed={setSpeed}
            showCameraControls={!(adapter?.hasCameraControl && adapter?.hasCameraControl())}
            cameraMode={cameraMode}
            setCameraMode={setCameraMode}
            demoCameraMode={demoCameraMode}
            setDemoCameraMode={(adapter?.setCameraMode) ? setDemoCameraMode : undefined}
            renderMode={renderMode}
            setRenderMode={setRenderMode}
            renderColor={renderColor}
            setRenderColor={setRenderColor}
            debugMode={debugMode}
            setDebugMode={setDebugMode}
            onScreenshot={handleScreenshot}
            showStats={showStats}
            setShowStats={setShowStats}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            isRecording={isRecording}
            recordingTime={recordingDuration}
         />
       )}
       {adapter && adapter.getDemoController && adapter.getDemoController() && (
          <DemoTimeline controller={adapter.getDemoController()!} />
       )}
     </div>
  );
}
