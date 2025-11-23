import React from 'react';
import { vec3 } from 'gl-matrix';
import { OrbitState } from '../utils/cameraUtils';

interface Md2CameraControlsProps {
  orbit: OrbitState;
  setOrbit: React.Dispatch<React.SetStateAction<OrbitState>>;
}

export function Md2CameraControls({
  orbit,
  setOrbit,
}: Md2CameraControlsProps) {

  const handleMove = (direction: 'forward' | 'backward' | 'left' | 'right') => {
    setOrbit(prev => {
      const newOrbit = { ...prev };
      const step = 5; // Zoom/Pan step size

      if (direction === 'forward') {
        newOrbit.radius = Math.max(10, prev.radius - step);
      } else if (direction === 'backward') {
        newOrbit.radius = Math.min(500, prev.radius + step);
      } else {
        // Calculate camera position relative to target
        const eyeX = prev.radius * Math.sin(prev.phi) * Math.cos(prev.theta);
        const eyeY = prev.radius * Math.cos(prev.phi);
        const eyeZ = prev.radius * Math.sin(prev.phi) * Math.sin(prev.theta);

        // Forward vector (target - eye) normalized
        const f = vec3.fromValues(-eyeX, -eyeY, -eyeZ);
        vec3.normalize(f, f);

        // Up vector
        const up = vec3.fromValues(0, 1, 0);

        // Right vector (Cross product of F and Up)
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
      const step = 0.1; // Rotation step size (radians)

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
      target: [0, 0, 24] as vec3,
    });
  };

  return (
    <div className="md2-gamepad-controls">
      {/* Move/Zoom D-Pad */}
      <div className="d-pad-group">
        <span className="d-pad-label">Move / Zoom</span>
        <div className="d-pad">
          <button className="d-pad-btn up" onClick={() => handleMove('forward')} title="Zoom In">▲</button>
          <button className="d-pad-btn left" onClick={() => handleMove('left')} title="Pan Left">◀</button>
          <button className="d-pad-btn center" disabled>MOVE</button>
          <button className="d-pad-btn right" onClick={() => handleMove('right')} title="Pan Right">▶</button>
          <button className="d-pad-btn down" onClick={() => handleMove('backward')} title="Zoom Out">▼</button>
        </div>
      </div>

      <button className="md2-reset-btn" onClick={resetCamera}>
        Reset
      </button>

      {/* Rotate D-Pad */}
      <div className="d-pad-group">
        <span className="d-pad-label">Rotate</span>
        <div className="d-pad">
          <button className="d-pad-btn up" onClick={() => handleRotate('up')} title="Pitch Up">▲</button>
          <button className="d-pad-btn left" onClick={() => handleRotate('left')} title="Rotate Left">◀</button>
          <button className="d-pad-btn center" disabled>LOOK</button>
          <button className="d-pad-btn right" onClick={() => handleRotate('right')} title="Rotate Right">▶</button>
          <button className="d-pad-btn down" onClick={() => handleRotate('down')} title="Pitch Down">▼</button>
        </div>
      </div>
    </div>
  );
}
