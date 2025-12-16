import React from 'react';
import { GeneralSettings } from '@/src/types/settings';

interface GeneralSettingsTabProps {
  settings: GeneralSettings;
  onChange: (settings: Partial<GeneralSettings>) => void;
}

export function GeneralSettingsTab({ settings, onChange }: GeneralSettingsTabProps) {
  const handleChange = (key: keyof GeneralSettings, value: any) => {
    onChange({ [key]: value });
  };

  return (
    <div className="settings-tab-content">
      <div className="settings-group">
        <h3>Application</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Language</span>
            <span className="setting-description">Select user interface language</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.language}
              onChange={(e) => handleChange('language', e.target.value)}
              disabled // Future implementation
            >
              <option value="en">English</option>
              <option value="fr">Français (Coming soon)</option>
              <option value="de">Deutsch (Coming soon)</option>
              <option value="es">Español (Coming soon)</option>
              <option value="ja">日本語 (Coming soon)</option>
            </select>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Startup Mode</span>
            <span className="setting-description">Choose what to show when the application starts</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.defaultMode}
              onChange={(e) => handleChange('defaultMode', e.target.value)}
            >
              <option value="browser">File Browser</option>
              <option value="last-used">Last Used</option>
            </select>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Auto-load PAK</span>
            <span className="setting-description">Automatically load pak.pak from server if available</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.autoLoadDefaultPak}
              onChange={(e) => handleChange('autoLoadDefaultPak', e.target.checked)}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>File Browser</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Default Sort Order</span>
            <span className="setting-description">How files are sorted in the tree view</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.defaultFileTreeSort}
              onChange={(e) => handleChange('defaultFileTreeSort', e.target.value)}
            >
              <option value="name">Name</option>
              <option value="type">Type</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Behavior</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Confirm Close</span>
            <span className="setting-description">Ask for confirmation before closing if there are unsaved changes</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.confirmBeforeClose}
              onChange={(e) => handleChange('confirmBeforeClose', e.target.checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
