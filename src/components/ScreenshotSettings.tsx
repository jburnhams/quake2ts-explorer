import React, { useState } from 'react';
import { ScreenshotOptions } from '../services/screenshotService';
import './ScreenshotSettings.css';

interface ScreenshotSettingsProps {
  onCapture: (options: ScreenshotOptions) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ScreenshotSettings({ onCapture, isOpen, onClose }: ScreenshotSettingsProps) {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [quality, setQuality] = useState<number>(0.95);
  const [resolutionMultiplier, setResolutionMultiplier] = useState<number>(1);

  if (!isOpen) return null;

  const handleCapture = () => {
    onCapture({
      format,
      quality,
      resolutionMultiplier
    });
    onClose();
  };

  return (
    <div className="screenshot-settings-modal">
      <div className="screenshot-settings-content">
        <h3>Screenshot Settings</h3>

        <div className="setting-group">
          <label>Format:</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as 'png' | 'jpeg')}>
            <option value="png">PNG (Lossless)</option>
            <option value="jpeg">JPEG (Compressed)</option>
          </select>
        </div>

        {format === 'jpeg' && (
          <div className="setting-group">
            <label>Quality: {Math.round(quality * 100)}%</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
            />
          </div>
        )}

        <div className="setting-group">
          <label htmlFor="resolution-multiplier">Resolution Multiplier:</label>
          <select
            id="resolution-multiplier"
            value={resolutionMultiplier}
            onChange={(e) => setResolutionMultiplier(parseFloat(e.target.value))}
          >
            <option value="1">1x (Native)</option>
            <option value="2">2x (High Res)</option>
            <option value="4">4x (Ultra Res)</option>
          </select>
        </div>

        <div className="button-group">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={handleCapture} className="capture-btn">Capture</button>
        </div>
      </div>
    </div>
  );
}
