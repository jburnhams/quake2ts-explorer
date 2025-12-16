import { SettingsService, settingsService } from '@/src/services/settingsService';
import { DEFAULT_SETTINGS, AppSettings } from '@/src/types/settings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    localStorage.clear();
    // We need to re-instantiate the service or reset it because it's a singleton export
    // Since we can't easily re-instantiate the exported singleton without jest.resetModules,
    // we'll rely on the resetToDefaults method or creating a new instance if we exported the class.
    // Ideally we should export the class for testing.
    service = new SettingsService();
  });

  test('should load default settings when localStorage is empty', () => {
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  test('should load settings from localStorage', () => {
    const customSettings: DeepPartial<AppSettings> = {
      general: { language: 'fr' }
    };
    localStorage.setItem('quake2ts-settings', JSON.stringify(customSettings));
    service = new SettingsService(); // Reload service

    // Should merge with defaults
    const settings = service.getSettings();
    expect(settings.general.language).toBe('fr');
    expect(settings.general.defaultMode).toBe(DEFAULT_SETTINGS.general.defaultMode);
  });

  test('should update settings and persist them', () => {
    service.updateSettings({
      graphics: { fov: 110 }
    });

    const settings = service.getSettings();
    expect(settings.graphics.fov).toBe(110);

    const stored = JSON.parse(localStorage.getItem('quake2ts-settings') || '{}');
    expect(stored.graphics.fov).toBe(110);
  });

  test('should perform deep merge on updates', () => {
    service.updateSettings({
      audio: { masterVolume: 0.5 }
    });

    service.updateSettings({
      audio: { musicVolume: 0.2 }
    });

    const settings = service.getSettings();
    expect(settings.audio.masterVolume).toBe(0.5);
    expect(settings.audio.musicVolume).toBe(0.2);
    // Unchanged values should remain default
    expect(settings.audio.sfxVolume).toBe(DEFAULT_SETTINGS.audio.sfxVolume);
  });

  test('should notify listeners on change', () => {
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);

    service.updateSettings({
      controls: { invertMouseY: true }
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      controls: expect.objectContaining({ invertMouseY: true })
    }));

    unsubscribe();
    service.updateSettings({
      controls: { invertMouseY: false }
    });
    expect(listener).toHaveBeenCalledTimes(1); // Should not increase
  });

  test('should reset to defaults', () => {
    service.updateSettings({
      general: { language: 'de' },
      graphics: { fov: 120 }
    });

    service.resetToDefaults();
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  test('get() should return specific category', () => {
    const graphics = service.get('graphics');
    expect(graphics).toEqual(DEFAULT_SETTINGS.graphics);
  });
});

// Helper for DeepPartial in tests
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
