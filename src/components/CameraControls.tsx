import React from 'react';
import { OrbitState } from '../utils/cameraUtils';

export interface CameraControlsProps {
  orbit: OrbitState;
  setOrbit: React.Dispatch<React.SetStateAction<OrbitState>>;
  autoRotate: boolean;
  setAutoRotate: (autoRotate: boolean) => void;
  minDistance?: number;
  maxDistance?: number;
  className?: string;
  defaultRadius?: number;
}

export function CameraControls({
  orbit,
  setOrbit,
  autoRotate,
  setAutoRotate,
  minDistance = 10,
  maxDistance = 500,
  className = "camera-controls",
  defaultRadius = 100,
}: CameraControlsProps) {
  const resetCamera = () => {
    setOrbit(prev => ({
        ...prev,
        radius: defaultRadius,
        theta: 0,
        phi: Math.PI / 4,
    }));
  };

  return (
    <div className={className}>
      <button onClick={resetCamera}>Reset Camera</button>

      <label>
        Distance: {orbit.radius.toFixed(0)}
        <input
          type="range"
          min={minDistance}
          max={maxDistance}
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
