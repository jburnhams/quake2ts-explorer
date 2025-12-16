import React from 'react';
import { ControlSettings } from '@/src/types/settings';

interface ControlsSettingsTabProps {
  settings: ControlSettings;
  onChange: (settings: Partial<ControlSettings>) => void;
  onOpenKeybindings?: () => void;
}

export function ControlsSettingsTab({ settings, onChange, onOpenKeybindings }: ControlsSettingsTabProps) {
  const handleChange = (key: keyof ControlSettings, value: any) => {
    onChange({ [key]: value });
  };

  return (
    <div className="settings-tab-content">
      <div className="settings-group">
        <h3>Mouse</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Sensitivity X</span>
            <span className="setting-description">Horizontal mouse speed ({settings.mouseSensitivityX.toFixed(1)})</span>
          </div>
          <div className="setting-control">
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={settings.mouseSensitivityX}
              onChange={(e) => handleChange('mouseSensitivityX', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Sensitivity Y</span>
            <span className="setting-description">Vertical mouse speed ({settings.mouseSensitivityY.toFixed(1)})</span>
          </div>
          <div className="setting-control">
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={settings.mouseSensitivityY}
              onChange={(e) => handleChange('mouseSensitivityY', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Invert Y Axis</span>
            <span className="setting-description">Invert vertical mouse look</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.invertMouseY}
              onChange={(e) => handleChange('invertMouseY', e.target.checked)}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Keyboard & Gamepad</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Keyboard Layout</span>
            <span className="setting-description">Physical key mapping</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.keyboardLayout}
              onChange={(e) => handleChange('keyboardLayout', e.target.value)}
            >
              <option value="qwerty">QWERTY</option>
              <option value="azerty">AZERTY</option>
              <option value="qwertz">QWERTZ</option>
            </select>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Gamepad Support</span>
            <span className="setting-description">Enable controller input</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.enableGamepad}
              onChange={(e) => handleChange('enableGamepad', e.target.checked)}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Keybindings</span>
            <span className="setting-description">Customize controls</span>
          </div>
          <div className="setting-control">
            <button
                className="btn btn-secondary"
                onClick={onOpenKeybindings}
                disabled // Task 2
            >
                Configure Bindings...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
