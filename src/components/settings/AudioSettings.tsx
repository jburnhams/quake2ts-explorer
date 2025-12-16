import React from 'react';
import { AudioSettings } from '@/src/types/settings';

interface AudioSettingsTabProps {
  settings: AudioSettings;
  onChange: (settings: Partial<AudioSettings>) => void;
}

export function AudioSettingsTab({ settings, onChange }: AudioSettingsTabProps) {
  const handleChange = (key: keyof AudioSettings, value: any) => {
    onChange({ [key]: value });
  };

  const toPercent = (val: number) => Math.round(val * 100);

  return (
    <div className="settings-tab-content">
      <div className="settings-group">
        <h3>Volume</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Master Volume</span>
            <span className="setting-description">Global volume level ({toPercent(settings.masterVolume)}%)</span>
          </div>
          <div className="setting-control">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => handleChange('masterVolume', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Sound Effects</span>
            <span className="setting-description">Weapons, explosions, environment ({toPercent(settings.sfxVolume)}%)</span>
          </div>
          <div className="setting-control">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => handleChange('sfxVolume', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Music</span>
            <span className="setting-description">Background music ({toPercent(settings.musicVolume)}%)</span>
          </div>
          <div className="setting-control">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVolume}
              onChange={(e) => handleChange('musicVolume', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Configuration</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Spatial Audio</span>
            <span className="setting-description">Enable 3D sound positioning</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.spatialAudio}
              onChange={(e) => handleChange('spatialAudio', e.target.checked)}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Audio Quality</span>
            <span className="setting-description">Sample rate and precision</span>
          </div>
          <div className="setting-control">
            <select
              value={settings.audioQuality}
              onChange={(e) => handleChange('audioQuality', e.target.value)}
            >
              <option value="low">Low (Performance)</option>
              <option value="high">High (Quality)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
