import React from 'react';
import { vec3 } from 'gl-matrix';
import Colorful from '@uiw/react-color-colorful';
import { hsvaToRgba, rgbaToHsva } from '@uiw/color-convert';
import { OrbitState, FreeCameraState } from '../../utils/cameraUtils';
import { DebugMode } from '../../types/debugMode';
import '../../styles/md2Viewer.css';

interface ViewerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  orbit: OrbitState;
  setOrbit: React.Dispatch<React.SetStateAction<OrbitState>>;
  freeCamera: FreeCameraState;
  setFreeCamera: React.Dispatch<React.SetStateAction<FreeCameraState>>;
  hasPlayback: boolean;
  speed: number;
  setSpeed: (speed: number) => void;
  showCameraControls: boolean;
  cameraMode: 'orbit' | 'free';
  setCameraMode: (mode: 'orbit' | 'free') => void;
  renderMode: 'textured' | 'wireframe' | 'solid' | 'solid-faceted' | 'random';
  setRenderMode: (mode: 'textured' | 'wireframe' | 'solid' | 'solid-faceted' | 'random') => void;
  renderColor: [number, number, number];
  setRenderColor: (color: [number, number, number]) => void;
  debugMode: DebugMode;
  setDebugMode: (mode: DebugMode) => void;
}

export function ViewerControls({
  isPlaying,
  onPlayPause,
  orbit,
  setOrbit,
  freeCamera,
  setFreeCamera,
  hasPlayback,
  speed,
  setSpeed,
  showCameraControls,
  cameraMode,
  setCameraMode,
  renderMode,
  setRenderMode,
  renderColor,
  setRenderColor,
  debugMode,
  setDebugMode
}: ViewerControlsProps) {

  const handleMove = (direction: 'forward' | 'backward' | 'left' | 'right') => {
    if (cameraMode === 'orbit') {
      setOrbit(prev => {
        const newOrbit = { ...prev };
        const step = 5;

        if (direction === 'forward') {
          newOrbit.radius = Math.max(10, prev.radius - step);
        } else if (direction === 'backward') {
          newOrbit.radius = Math.min(2000, prev.radius + step);
        } else {
          const eyeX = prev.radius * Math.sin(prev.phi) * Math.cos(prev.theta);
          const eyeY = prev.radius * Math.cos(prev.phi);
          const eyeZ = prev.radius * Math.sin(prev.phi) * Math.sin(prev.theta);

          const f = vec3.fromValues(-eyeX, -eyeY, -eyeZ);
          vec3.normalize(f, f);

          const up = vec3.fromValues(0, 1, 0);
          const right = vec3.create();
          vec3.cross(right, f, up);
          vec3.normalize(right, right);

          const panStep = 2.0;
          const moveVec = vec3.create();

          if (direction === 'left') {
            vec3.scale(moveVec, right, -panStep);
          } else if (direction === 'right') {
            vec3.scale(moveVec, right, panStep);
          }

          const newTarget = vec3.create();
          vec3.add(newTarget, prev.target, moveVec);
          newOrbit.target = newTarget;
        }
        return newOrbit;
      });
    } else {
      setFreeCamera(prev => {
        const newState = { ...prev, position: vec3.clone(prev.position) };
        const moveSpeed = 10;
        const forward = vec3.create();
        const right = vec3.create();

        vec3.set(forward,
          Math.cos(newState.rotation[1]) * Math.cos(newState.rotation[0]),
          Math.sin(newState.rotation[1]),
          Math.cos(newState.rotation[1]) * Math.sin(newState.rotation[0])
        );
        vec3.normalize(forward, forward);

        vec3.cross(right, forward, [0, 1, 0]);
        vec3.normalize(right, right);

        if (direction === 'forward') {
          vec3.scaleAndAdd(newState.position, newState.position, forward, moveSpeed);
        } else if (direction === 'backward') {
          vec3.scaleAndAdd(newState.position, newState.position, forward, -moveSpeed);
        } else if (direction === 'left') {
          vec3.scaleAndAdd(newState.position, newState.position, right, -moveSpeed);
        } else if (direction === 'right') {
          vec3.scaleAndAdd(newState.position, newState.position, right, moveSpeed);
        }
        return newState;
      });
    }
  };

  const handleRotate = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (cameraMode === 'orbit') {
      setOrbit(prev => {
        const newOrbit = { ...prev };
        const step = 0.1;

        if (direction === 'left') {
          newOrbit.theta = (prev.theta - step) % (Math.PI * 2);
        } else if (direction === 'right') {
          newOrbit.theta = (prev.theta + step) % (Math.PI * 2);
        } else if (direction === 'up') {
          newOrbit.phi = Math.max(0.1, prev.phi - step);
        } else if (direction === 'down') {
          newOrbit.phi = Math.min(Math.PI - 0.1, prev.phi + step);
        }
        return newOrbit;
      });
    } else {
      setFreeCamera(prev => {
        const newState = { ...prev, rotation: vec3.clone(prev.rotation) };
        const rotateSpeed = 0.1;

        if (direction === 'left') {
          newState.rotation[0] -= rotateSpeed;
        } else if (direction === 'right') {
          newState.rotation[0] += rotateSpeed;
        } else if (direction === 'up') {
          newState.rotation[1] = Math.min(Math.PI / 2 - 0.01, newState.rotation[1] + rotateSpeed);
        } else if (direction === 'down') {
          newState.rotation[1] = Math.max(-Math.PI / 2 + 0.01, newState.rotation[1] - rotateSpeed);
        }
        return newState;
      });
    }
  };

  const resetCamera = () => {
    setOrbit({
      radius: 100,
      theta: 0,
      phi: Math.PI / 4,
      target: [0, 0, 0] as vec3,
    });
  };

  const handleColorChange = (color: { hsva: { h: number; s: number; v: number; a: number; }; }) => {
    const rgba = hsvaToRgba(color.hsva);
    const newColor: [number, number, number] = [rgba.r / 255, rgba.g / 255, rgba.b / 255];
    setRenderColor(newColor);
  };

  return (
    <div className="md2-controls-panel">
       <div className="render-mode-controls" style={{ marginBottom: '10px' }}>
         <button onClick={() => setRenderMode('textured')} disabled={renderMode === 'textured'}>Textured</button>
         <button onClick={() => setRenderMode('wireframe')} disabled={renderMode === 'wireframe'}>Wireframe</button>
         <button onClick={() => setRenderMode('solid')} disabled={renderMode === 'solid'}>Solid</button>
         <button onClick={() => setRenderMode('solid-faceted')} disabled={renderMode === 'solid-faceted'}>Faceted</button>
         <button onClick={() => setRenderMode('random')} disabled={renderMode === 'random'}>Random</button>
       </div>
       <div className="debug-mode-controls" style={{ marginBottom: '10px' }}>
         <label htmlFor="debug-mode-select" style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Debug Mode:</label>
         <select
           id="debug-mode-select"
           value={debugMode}
           onChange={(e) => setDebugMode(e.target.value as DebugMode)}
           style={{ width: '100%', padding: '5px', fontSize: '12px' }}
         >
           <option value={DebugMode.None}>None</option>
           <option value={DebugMode.BoundingBoxes}>Bounding Boxes</option>
           <option value={DebugMode.Normals}>Normals</option>
           <option value={DebugMode.PVSClusters}>PVS Clusters</option>
           <option value={DebugMode.CollisionHulls}>Collision Hulls</option>
           <option value={DebugMode.Lightmaps}>Lightmaps</option>
         </select>
       </div>
       {renderMode !== 'textured' && (
        <div className="color-controls" style={{ marginBottom: '10px' }}>
          <Colorful
            color={rgbaToHsva({ r: renderColor[0] * 255, g: renderColor[1] * 255, b: renderColor[2] * 255, a: 1 })}
            onChange={handleColorChange}
            disableAlpha={true}
          />
        </div>
       )}
      {hasPlayback && (
        <div className="md2-anim-controls">
             <button onClick={onPlayPause}>
                {isPlaying ? 'Pause' : 'Play'}
             </button>
             <div className="speed-control">
                <span>Speed: {speed.toFixed(1)}x</span>
                <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                />
             </div>
        </div>
      )}

      {showCameraControls && (
        <div className="md2-gamepad-controls">
           <div className="camera-mode-toggle" style={{ marginBottom: '10px' }}>
              <button
                 onClick={() => setCameraMode(cameraMode === 'orbit' ? 'free' : 'orbit')}
                 style={{ width: '100%' }}
              >
                 Mode: {cameraMode === 'orbit' ? 'Orbit' : 'Free Look'}
              </button>
              {cameraMode === 'free' && (
                  <div style={{ fontSize: '10px', marginTop: '5px', color: '#aaa', textAlign: 'center' }}>
                      Click & Drag to Look<br/>WASD / Arrows to Move
                  </div>
              )}
           </div>

           {
             <>
               <div className="d-pad-group">
                <span className="d-pad-label">Move / Zoom</span>
                <div className="d-pad">
                  <button className="d-pad-btn up" onClick={() => handleMove('forward')}>▲</button>
                  <button className="d-pad-btn left" onClick={() => handleMove('left')}>◀</button>
                  <button className="d-pad-btn center" disabled>MV</button>
                  <button className="d-pad-btn right" onClick={() => handleMove('right')}>▶</button>
                  <button className="d-pad-btn down" onClick={() => handleMove('backward')}>▼</button>
                </div>
              </div>

              <button className="md2-reset-btn" onClick={resetCamera}>
                Reset Cam
              </button>

              <div className="d-pad-group">
                <span className="d-pad-label">Rotate</span>
                <div className="d-pad">
                  <button className="d-pad-btn up" onClick={() => handleRotate('up')}>▲</button>
                  <button className="d-pad-btn left" onClick={() => handleRotate('left')}>◀</button>
                  <button className="d-pad-btn center" disabled>ROT</button>
                  <button className="d-pad-btn right" onClick={() => handleRotate('right')}>▶</button>
                  <button className="d-pad-btn down" onClick={() => handleRotate('down')}>▼</button>
                </div>
              </div>
             </>
           }
        </div>
      )}
    </div>
  );
}
