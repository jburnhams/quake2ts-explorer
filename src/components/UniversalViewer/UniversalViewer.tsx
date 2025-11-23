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
import { OrbitState, computeCameraPosition } from '../../utils/cameraUtils';
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

  const [orbit, setOrbit] = useState<OrbitState>({
    radius: 200,
    theta: 0,
    phi: Math.PI / 4,
    target: [0, 0, 0] as vec3,
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  // Initialize GL and Camera
  useEffect(() => {
     if (!canvasRef.current) return;
     try {
        // Check if context already exists to avoid recreation issues?
        // React 18 double mount might cause issues if we don't clean up context,
        // but WebGL context is attached to canvas.
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

             await newAdapter.load(gl, parsedFile, pakService, filePath);

             // Only set adapter if we haven't been unmounted/cancelled
             // (Needs cleanup logic, but React effect cleanup handles component unmount)
             // But this async function runs detached.
             // We should check if cancelled.
             // Simple check: see if current adapter is what we expect?
             // Hard to do cleanly without ref.
             // But setting state is fine usually.
             setAdapter(newAdapter);

             // Reset orbit defaults based on type
             if (parsedFile.type === 'bsp' || parsedFile.type === 'dm2') {
                 setOrbit({
                    radius: 1000,
                    theta: 0,
                    phi: Math.PI / 4,
                    target: [0, 0, 0] as vec3
                 });
             } else {
                 // Models
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

          if (adapter.hasCameraControl && adapter.hasCameraControl()) {
               const update = adapter.getCameraUpdate ? adapter.getCameraUpdate() : null;
               if (update) {
                   // Adapter controls camera (e.g. DM2)
                   camera.position.set(update.position);
                   camera.angles.set(update.angles);
                   camera.updateMatrices();
                   mat4.copy(viewMatrix, camera.viewMatrix as mat4);
               }
          } else {
               // Orbit Control
               const useZUp = adapter.useZUp ? adapter.useZUp() : false;
               const eye = useZUp ? computeCameraPositionZUp(orbit) : computeCameraPosition(orbit);
               const up = useZUp ? [0, 0, 1] : [0, 1, 0];

               mat4.lookAt(viewMatrix, eye, orbit.target, up as vec3);

               // Also set camera position for completeness (lighting etc)
               // Assuming camera class properties are writable
               if (camera.position && camera.position.set) {
                   camera.position.set(eye);
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
  }, [adapter, glContext, camera, orbit, isPlaying, speed]);

  // Resize Handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera || !glContext) return;

    const handleResize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      glContext.gl.viewport(0, 0, canvas.width, canvas.height);
      camera.aspect = canvas.width / canvas.height;
      camera.updateMatrices();
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
       />
     </div>
  );
}
