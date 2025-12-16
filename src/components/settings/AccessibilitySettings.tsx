import React from 'react';
import { AccessibilitySettings } from '@/src/types/settings';

interface AccessibilitySettingsTabProps {
  settings: AccessibilitySettings;
  onChange: (settings: Partial<AccessibilitySettings>) => void;
}

export function AccessibilitySettingsTab({ settings, onChange }: AccessibilitySettingsTabProps) {
  const handleChange = (key: keyof AccessibilitySettings, value: any) => {
    onChange({ [key]: value });
  };

  return (
    <div className="settings-tab-content">
      <div className="settings-group">
        <h3>Visual</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">High Contrast</span>
            <span className="setting-description">Increase contrast of UI elements</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => handleChange('highContrast', e.target.checked)}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Large Text</span>
            <span className="setting-description">Increase font size</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.largeFont}
              onChange={(e) => handleChange('largeFont', e.target.checked)}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Color Blind Mode</span>
            <span className="setting-description">Adjust colors for color blindness</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.colorBlindMode}
              onChange={(e) => handleChange('colorBlindMode', e.target.value)}
            >
              <option value="none">None</option>
              <option value="deuteranopia">Deuteranopia (Red/Green)</option>
              <option value="protanopia">Protanopia (Red/Green)</option>
              <option value="tritanopia">Tritanopia (Blue/Yellow)</option>
            </select>
          </div>
        </div>

        <div className="setting-item">
            <div className="setting-label">
                <span className="setting-name">Reduce Motion</span>
                <span className="setting-description">Minimize animations and transitions</span>
            </div>
            <div className="setting-control">
                <input
                    type="checkbox"
                    checked={settings.reduceMotion}
                    onChange={(e) => handleChange('reduceMotion', e.target.checked)}
                />
            </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Assistive Technologies</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Screen Reader Support</span>
            <span className="setting-description">Optimize UI for screen readers</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.screenReader}
              onChange={(e) => handleChange('screenReader', e.target.checked)}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Subtitles</span>
            <span className="setting-description">Show captions for audio</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.subtitles}
              onChange={(e) => handleChange('subtitles', e.target.checked)}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Keyboard Only</span>
            <span className="setting-description">Enhance keyboard navigation</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.keyboardOnly}
              onChange={(e) => handleChange('keyboardOnly', e.target.checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
