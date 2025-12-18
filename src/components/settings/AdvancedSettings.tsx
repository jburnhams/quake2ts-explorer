import React from 'react';
import { AdvancedSettings } from '@/src/types/settings';
import { settingsService } from '@/src/services/settingsService';
import { cacheService } from '@/src/services/cacheService';

interface AdvancedSettingsTabProps {
  settings: AdvancedSettings;
  onChange: (settings: Partial<AdvancedSettings>) => void;
}

export function AdvancedSettingsTab({ settings, onChange }: AdvancedSettingsTabProps) {
  const handleChange = (key: keyof AdvancedSettings, value: any) => {
    onChange({ [key]: value });
  };

  const handleClearCache = async () => {
    try {
      await cacheService.clearAll();
      alert('Cache cleared successfully.');
    } catch (e) {
      console.error('Failed to clear cache', e);
      alert('Failed to clear cache.');
    }
  };

  const handleClearData = async () => {
    if (confirm('DANGER: This will delete all saved games, demos, settings, and cached files. This action cannot be undone. Are you sure?')) {
        try {
            // Clear localStorage (except critical if needed, but "Reset all data" implies all)
            localStorage.clear();

            // Close connections to allow deletion
            cacheService.close();

            // Clear IndexedDB (paks, etc)
            const dbs = ['Quake2TS', 'Quake2TS-Saves', 'Quake2TS-Demos', 'quake2ts-cache']; // Known DB names

            await Promise.all(dbs.map(dbName => new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase(dbName);
                req.onerror = () => {
                    console.error(`Failed to delete database ${dbName}`);
                    resolve();
                };
                req.onsuccess = () => {
                    console.log(`Deleted database ${dbName}`);
                    resolve();
                };
                req.onblocked = () => {
                    console.warn(`Database ${dbName} deletion blocked`);
                    resolve();
                };
            })));

            alert('All data cleared. The application will now reload.');
            window.location.reload();
        } catch (e) {
            console.error('Failed to clear data', e);
            alert('Failed to clear some data. Check console for details.');
        }
    }
  };

  return (
    <div className="settings-tab-content">
      <div className="settings-group">
        <h3>Developer</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Developer Mode</span>
            <span className="setting-description">Enable advanced debugging tools and inspector overlays</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.developerMode}
              onChange={(e) => handleChange('developerMode', e.target.checked)}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Verbose Logging</span>
            <span className="setting-description">Log detailed information to console (affects performance)</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.verboseLogging}
              onChange={(e) => handleChange('verboseLogging', e.target.checked)}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Experimental Features</span>
            <span className="setting-description">Enable unstable or work-in-progress features</span>
          </div>
          <div className="setting-control">
            <input
              type="checkbox"
              checked={settings.experimentalFeatures}
              onChange={(e) => handleChange('experimentalFeatures', e.target.checked)}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Storage</h3>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Cache Size Limit (MB)</span>
            <span className="setting-description">Maximum storage for cached assets</span>
          </div>
          <div className="setting-control">
            <input
              type="number"
              min="64"
              max="4096"
              step="64"
              value={settings.cacheSizeLimit}
              onChange={(e) => handleChange('cacheSizeLimit', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name">Clear Cache</span>
            <span className="setting-description">Free up storage space by deleting cached assets</span>
          </div>
          <div className="setting-control">
             <button className="btn btn-secondary" onClick={handleClearCache}>
                 Clear Cache
             </button>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span className="setting-name" style={{ color: '#ff4444' }}>Danger Zone</span>
            <span className="setting-description">Irreversible actions</span>
          </div>
          <div className="setting-control">
            <button
                className="btn btn-danger"
                onClick={handleClearData}
            >
                Clear All Data & Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
