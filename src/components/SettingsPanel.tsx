import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import { settingsService } from '@/src/services/settingsService';
import { AppSettings, DEFAULT_SETTINGS } from '@/src/types/settings';
import { GeneralSettingsTab } from './settings/GeneralSettings';
import { GraphicsSettingsTab } from './settings/GraphicsSettings';
import { AudioSettingsTab } from './settings/AudioSettings';
import { ControlsSettingsTab } from './settings/ControlsSettings';
import { AccessibilitySettingsTab } from './settings/AccessibilitySettings';
import { AdvancedSettingsTab } from './settings/AdvancedSettings';

interface SettingsPanelProps {
  onClose: () => void;
  initialTab?: keyof AppSettings;
}

export function SettingsPanel({ onClose, initialTab = 'general' }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<keyof AppSettings>(initialTab);
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleUpdate = (category: keyof AppSettings, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...updates
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    settingsService.updateSettings(settings);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      setSettings(defaults);
      setHasChanges(true);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettingsTab
            settings={settings.general}
            onChange={(updates) => handleUpdate('general', updates)}
          />
        );
      case 'graphics':
        return (
          <GraphicsSettingsTab
            settings={settings.graphics}
            onChange={(updates) => handleUpdate('graphics', updates)}
          />
        );
      case 'audio':
        return (
          <AudioSettingsTab
            settings={settings.audio}
            onChange={(updates) => handleUpdate('audio', updates)}
          />
        );
      case 'controls':
        return (
          <ControlsSettingsTab
            settings={settings.controls}
            onChange={(updates) => handleUpdate('controls', updates)}
            onOpenKeybindings={() => { /* TODO: Open Keybinding Editor */ }}
          />
        );
      case 'accessibility':
        return (
          <AccessibilitySettingsTab
            settings={settings.accessibility}
            onChange={(updates) => handleUpdate('accessibility', updates)}
          />
        );
      case 'advanced':
        return (
          <AdvancedSettingsTab
            settings={settings.advanced}
            onChange={(updates) => handleUpdate('advanced', updates)}
          />
        );
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <div className="settings-overlay" data-testid="settings-overlay">
      <div className="settings-modal" role="dialog" aria-labelledby="settings-title">
        <header className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button className="close-button" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
        </header>

        <div className="settings-content">
          <nav className="settings-sidebar">
            <button
              className={`settings-tab-button ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
              data-testid="tab-general"
            >
              General
            </button>
            <button
              className={`settings-tab-button ${activeTab === 'graphics' ? 'active' : ''}`}
              onClick={() => setActiveTab('graphics')}
              data-testid="tab-graphics"
            >
              Graphics
            </button>
            <button
              className={`settings-tab-button ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveTab('audio')}
              data-testid="tab-audio"
            >
              Audio
            </button>
            <button
              className={`settings-tab-button ${activeTab === 'controls' ? 'active' : ''}`}
              onClick={() => setActiveTab('controls')}
              data-testid="tab-controls"
            >
              Controls
            </button>
            <button
              className={`settings-tab-button ${activeTab === 'accessibility' ? 'active' : ''}`}
              onClick={() => setActiveTab('accessibility')}
              data-testid="tab-accessibility"
            >
              Accessibility
            </button>
            <button
              className={`settings-tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
              onClick={() => setActiveTab('advanced')}
              data-testid="tab-advanced"
            >
              Advanced
            </button>
          </nav>

          <main className="settings-panel-content">
            {renderContent()}
          </main>
        </div>

        <footer className="settings-footer">
          <button
            className="btn btn-danger"
            onClick={handleReset}
            title="Reset to default settings"
          >
            Reset Defaults
          </button>
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!hasChanges}
            data-testid="save-settings-button"
          >
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
}
