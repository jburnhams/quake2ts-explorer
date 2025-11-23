import React from 'react';
import { vec3 } from 'gl-matrix';
import { OrbitState } from '../../utils/cameraUtils';
import '../../styles/md2Viewer.css';

interface ViewerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  orbit: OrbitState;
  setOrbit: React.Dispatch<React.SetStateAction<OrbitState>>;
  hasPlayback: boolean;
  speed: number;
  setSpeed: (speed: number) => void;
  showCameraControls: boolean;
}

export function ViewerControls({
  isPlaying,
  onPlayPause,
  orbit,
  setOrbit,
  hasPlayback,
  speed,
  setSpeed,
  showCameraControls
}: ViewerControlsProps) {

  const handleMove = (direction: 'forward' | 'backward' | 'left' | 'right') => {
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

        // Assume Y-up for controls calculation logic from Md2Viewer?
        // Md2CameraControls used Y-up.
        // UniversalViewer might be Z-up.
        // This control logic depends on coordinate system used for orbit.
        // If UniversalViewer normalizes inputs, we are fine.
        // Let's stick to Md2CameraControls logic for now.

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
  };

  const handleRotate = (direction: 'up' | 'down' | 'left' | 'right') => {
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
  };

  const resetCamera = () => {
    setOrbit({
      radius: 100,
      theta: 0,
      phi: Math.PI / 4,
      target: [0, 0, 0] as vec3,
    });
  };

  return (
    <div className="md2-controls-panel">
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
           {/* Reusing structure from Md2CameraControls */}
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
        </div>
      )}
    </div>
  );
}
