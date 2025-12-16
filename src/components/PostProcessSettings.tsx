import React from 'react';
import { PostProcessOptions, defaultPostProcessOptions } from '../utils/postProcessing';

export interface PostProcessSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  options: PostProcessOptions;
  onChange: (options: PostProcessOptions) => void;
}

export const PostProcessSettings: React.FC<PostProcessSettingsProps> = ({
  isOpen,
  onClose,
  options,
  onChange
}) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof PostProcessOptions, value: number | boolean) => {
    onChange({
      ...options,
      [key]: value
    });
  };

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h3>Post Processing</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="settings-content">

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={options.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
              />
              Enable Post Processing
            </label>
          </div>

          <div className="setting-section">
            <h4>Bloom</h4>
            <div className="setting-group">
                <label className="checkbox-label">
                <input
                    type="checkbox"
                    checked={options.bloomEnabled}
                    disabled={!options.enabled}
                    onChange={(e) => handleChange('bloomEnabled', e.target.checked)}
                />
                Enable Bloom
                </label>
            </div>
            <div className="setting-group">
              <label htmlFor="pp-threshold">Threshold: {options.bloomThreshold.toFixed(2)}</label>
              <input
                id="pp-threshold"
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={options.bloomThreshold}
                disabled={!options.enabled || !options.bloomEnabled}
                onChange={(e) => handleChange('bloomThreshold', parseFloat(e.target.value))}
              />
            </div>
            <div className="setting-group">
              <label htmlFor="pp-intensity">Intensity: {options.bloomIntensity.toFixed(1)}</label>
              <input
                id="pp-intensity"
                type="range"
                min="0.0"
                max="5.0"
                step="0.1"
                value={options.bloomIntensity}
                disabled={!options.enabled || !options.bloomEnabled}
                onChange={(e) => handleChange('bloomIntensity', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="setting-section">
            <h4>Anti-Aliasing</h4>
            <div className="setting-group">
                <label className="checkbox-label">
                <input
                    type="checkbox"
                    checked={options.fxaaEnabled}
                    disabled={!options.enabled}
                    onChange={(e) => handleChange('fxaaEnabled', e.target.checked)}
                />
                FXAA (Fast Approximate Anti-Aliasing)
                </label>
            </div>
          </div>

          <div className="setting-section">
            <h4>Color Grading</h4>
            <div className="setting-group">
              <label htmlFor="pp-brightness">Brightness: {options.brightness.toFixed(2)}</label>
              <input
                id="pp-brightness"
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={options.brightness}
                disabled={!options.enabled}
                onChange={(e) => handleChange('brightness', parseFloat(e.target.value))}
              />
            </div>
            <div className="setting-group">
              <label htmlFor="pp-contrast">Contrast: {options.contrast.toFixed(2)}</label>
              <input
                id="pp-contrast"
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={options.contrast}
                disabled={!options.enabled}
                onChange={(e) => handleChange('contrast', parseFloat(e.target.value))}
              />
            </div>
            <div className="setting-group">
              <label htmlFor="pp-saturation">Saturation: {options.saturation.toFixed(2)}</label>
              <input
                id="pp-saturation"
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={options.saturation}
                disabled={!options.enabled}
                onChange={(e) => handleChange('saturation', parseFloat(e.target.value))}
              />
            </div>
            <div className="setting-group">
              <label htmlFor="pp-gamma">Gamma: {options.gamma.toFixed(2)}</label>
              <input
                id="pp-gamma"
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={options.gamma}
                disabled={!options.enabled}
                onChange={(e) => handleChange('gamma', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="setting-actions">
              <button onClick={() => onChange(defaultPostProcessOptions)}>Reset to Defaults</button>
          </div>

        </div>
      </div>
      <style>{`
        .setting-section {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .setting-section h4 {
            margin: 5px 0 10px 0;
            color: #ddd;
        }
      `}</style>
    </div>
  );
};
