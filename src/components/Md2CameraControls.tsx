import React from 'react';
import { OrbitState } from '../utils/cameraUtils';

interface Md2CameraControlsProps {
  orbit: OrbitState;
  setOrbit: React.Dispatch<React.SetStateAction<OrbitState>>;
  autoRotate: boolean;
  setAutoRotate: (autoRotate: boolean) => void;
}

export function Md2CameraControls({
  orbit,
  setOrbit,
  autoRotate,
  setAutoRotate,
}: Md2CameraControlsProps) {
  const resetCamera = () => {
    setOrbit(prev => ({
        ...prev,
        radius: 100,
        theta: 0,
        phi: Math.PI / 4,
    }));
  };

  return (
    <div className="md2-control-group">
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
  );
}