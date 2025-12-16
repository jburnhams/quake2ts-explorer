import React from 'react';
import { GraphicsSettings } from '@/src/types/settings';

interface GraphicsSettingsTabProps {
  settings: GraphicsSettings;
  onChange: (settings: Partial<GraphicsSettings>) => void;
}

export function GraphicsSettingsTab({ settings, onChange }: GraphicsSettingsTabProps) {
  const handleChange = (key: keyof GraphicsSettings, value: any) => {
    onChange({ [key]: value });
  };

  return (
    <div className="settings-tab-content">
      <div className="settings-group">
        <h3>Quality</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Render Quality Preset</span>
            <span className="setting-description">Automatically adjust all settings</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.renderQuality}
              onChange={(e) => handleChange('renderQuality', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>
        </div>

        <div className="setting-item">
            <div className="setting-label">
                <span className="setting-name">Resolution Scale</span>
                <span className="setting-description">Render at a different resolution than the screen ({Math.round(settings.resolutionScale * 100)}%)</span>
            </div>
            <div className="setting-control">
                <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.resolutionScale}
                    onChange={(e) => handleChange('resolutionScale', parseFloat(e.target.value))}
                />
            </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Display</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Field of View</span>
            <span className="setting-description">Horizontal FOV in degrees</span>
          </div>
          <div className="setting-control">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                <input
                  type="range"
                  min="60"
                  max="120"
                  step="1"
                  value={settings.fov}
                  onChange={(e) => handleChange('fov', parseInt(e.target.value))}
                />
                <span style={{ minWidth: '30px', textAlign: 'right', color: '#fff' }}>{settings.fov}°</span>
            </div>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Frame Rate Limit</span>
            <span className="setting-description">Max frames per second (0 for unlimited)</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.frameRateLimit}
              onChange={(e) => handleChange('frameRateLimit', parseInt(e.target.value))}
            >
              <option value="30">30 FPS</option>
              <option value="60">60 FPS</option>
              <option value="120">120 FPS</option>
              <option value="0">Unlimited</option>
            </select>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">VSync</span>
            <span className="setting-description">Synchronize with monitor refresh rate</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.vsync}
              onChange={(e) => handleChange('vsync', e.target.checked)}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Advanced Rendering</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Anti-Aliasing</span>
            <span className="setting-description">Smooth jagged edges</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.antialiasing}
              onChange={(e) => handleChange('antialiasing', e.target.value)}
            >
              <option value="none">None</option>
              <option value="fxaa">FXAA (Fast)</option>
              <option value="msaa">MSAA (High Quality)</option>
            </select>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Texture Filtering</span>
            <span className="setting-description">Texture quality at distance and angles</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.textureFiltering}
              onChange={(e) => handleChange('textureFiltering', e.target.value)}
            >
              <option value="nearest">Nearest (Pixelated)</option>
              <option value="bilinear">Bilinear</option>
              <option value="trilinear">Trilinear</option>
            </select>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Anisotropic Filtering</span>
            <span className="setting-description">Improves texture clarity on oblique surfaces</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.anisotropicFiltering}
              onChange={(e) => handleChange('anisotropicFiltering', parseInt(e.target.value))}
            >
              <option value="1">1x (Off)</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
              <option value="8">8x</option>
              <option value="16">16x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
