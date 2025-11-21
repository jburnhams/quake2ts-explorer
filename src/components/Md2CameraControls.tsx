import React from 'react';

interface Md2CameraControlsProps {
  radius: number;
  autoRotate: boolean;
  onReset: () => void;
  onRadiusChange: (radius: number) => void;
  onAutoRotateChange: (autoRotate: boolean) => void;
}

export function Md2CameraControls({
  radius,
  autoRotate,
  onReset,
  onRadiusChange,
  onAutoRotateChange,
}: Md2CameraControlsProps) {
  return (
    <div className="md2-camera-controls">
      <button onClick={onReset}>Reset Camera</button>
      <label>
        Distance: {radius.toFixed(0)}
        <input
          type="range"
          min="10"
          max="500"
          value={radius}
          onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={autoRotate}
          onChange={(e) => onAutoRotateChange(e.target.checked)}
        />
        Auto-rotate
      </label>
    </div>
  );
}
