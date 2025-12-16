import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

const STORAGE_KEY = 'quake2ts-settings';

type SettingsListener = (settings: AppSettings) => void;

export class SettingsService {
  private settings: AppSettings;
  private listeners: Set<SettingsListener> = new Set();

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to handle new fields in future versions
        return this.deepMerge(DEFAULT_SETTINGS, parsed);
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); // Return copy of defaults
  }

  private deepMerge(target: any, source: any): any {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  public getSettings(): AppSettings {
    // Return a copy to prevent direct mutation
    return JSON.parse(JSON.stringify(this.settings));
  }

  public updateSettings(partialSettings: DeepPartial<AppSettings>) {
    this.settings = this.deepMerge(this.settings, partialSettings);
    this.saveSettings();
    this.notifyListeners();
  }

  public resetToDefaults() {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.saveSettings();
    this.notifyListeners();
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const settingsCopy = this.getSettings();
    this.listeners.forEach(listener => listener(settingsCopy));
  }

  // Helper to get nested value quickly
  public get<K extends keyof AppSettings>(category: K): AppSettings[K] {
    return { ...this.settings[category] };
  }
}

// Utility type for deep partial updates
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const settingsService = new SettingsService();
