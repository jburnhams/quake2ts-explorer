import React from 'react';
import '../styles/md2Viewer.css';
import { CameraSettings, DEFAULT_CAMERA_SETTINGS } from '../types/CameraSettings';

interface CameraSettingsPanelProps {
  settings: CameraSettings;
  onChange: (settings: CameraSettings) => void;
  onClose: () => void;
  onAddKeyframe?: () => void;
  onClearPath?: () => void;
  pathKeyframeCount?: number;
}

export const CameraSettingsPanel: React.FC<CameraSettingsPanelProps> = ({
  settings,
  onChange,
  onClose,
  onAddKeyframe,
  onClearPath,
  pathKeyframeCount = 0
}) => {
  const handleChange = (key: keyof CameraSettings, value: number) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="md2-metadata-editor">
      <div className="md2-metadata-header">
        <h3>Camera Settings</h3>
        <button className="md2-close-btn" onClick={onClose}>×</button>
      </div>
      <div className="md2-metadata-content">
        <div className="md2-metadata-field">
          <label>Third Person Distance</label>
          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={settings.thirdPersonDistance}
            onChange={(e) => handleChange('thirdPersonDistance', parseFloat(e.target.value))}
          />
          <span className="value-display">{settings.thirdPersonDistance} units</span>
        </div>

        <div className="md2-metadata-field">
          <label>Third Person FOV</label>
          <input
            type="range"
            min="60"
            max="140"
            step="5"
            value={settings.thirdPersonFOV}
            onChange={(e) => handleChange('thirdPersonFOV', parseFloat(e.target.value))}
          />
          <span className="value-display">{settings.thirdPersonFOV}°</span>
        </div>

        <div className="md2-metadata-field">
          <label>Free Cam Speed</label>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={settings.freeCamSpeed}
            onChange={(e) => handleChange('freeCamSpeed', parseFloat(e.target.value))}
          />
          <span className="value-display">{settings.freeCamSpeed} u/s</span>
        </div>

        <div className="md2-metadata-field">
            <label>Cinematic Playback Speed</label>
            <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={settings.cinematicSpeed}
                onChange={(e) => handleChange('cinematicSpeed', parseFloat(e.target.value))}
            />
            <span className="value-display">{settings.cinematicSpeed}x</span>
        </div>

        <div className="md2-metadata-actions">
           <button onClick={() => onChange(DEFAULT_CAMERA_SETTINGS)}>Reset Defaults</button>
        </div>

        {onAddKeyframe && (
            <>
            <div className="md2-metadata-header" style={{ marginTop: '20px' }}>
                <h3>Cinematic Path</h3>
            </div>
            <div className="md2-metadata-content">
                 <div style={{ fontSize: '0.9em', color: '#aaa', marginBottom: '10px' }}>
                     {pathKeyframeCount} keyframes
                 </div>
                 <div className="md2-metadata-actions">
                    <button onClick={onAddKeyframe}>+ Add Keyframe (Current View)</button>
                    <button onClick={onClearPath} disabled={pathKeyframeCount === 0}>Clear Path</button>
                 </div>
            </div>
            </>
        )}

      </div>
    </div>
  );
};
