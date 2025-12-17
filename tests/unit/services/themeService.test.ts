import { ThemeService, themeService } from '../../../src/services/themeService';
import { darkTheme } from '../../../src/themes/darkTheme';
import { lightTheme } from '../../../src/themes/lightTheme';
import { highContrastTheme } from '../../../src/themes/highContrastTheme';

describe('ThemeService', () => {
  // We need to reset the service state between tests because it's a singleton
  // However, since it's exported as a const, we might need to instantiate a new one or mock localStorage

  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    // Reset singleton state if possible, or just re-instantiate for testing
    // Since we can't easily reset the exported singleton, we'll instantiate a new class for unit testing
    // We need to export the class in the service file as well (which I did)
    service = new ThemeService();
    document.documentElement.style.cssText = '';
  });

  test('initializes with default dark theme', () => {
    expect(service.getTheme().id).toBe('dark');
  });

  test('loads saved theme from localStorage', () => {
    localStorage.setItem('quake2ts-theme', 'light');
    const newService = new ThemeService();
    expect(newService.getTheme().id).toBe('light');
  });

  test('changes theme and persists to localStorage', () => {
    service.setTheme('light');
    expect(service.getTheme().id).toBe('light');
    expect(localStorage.getItem('quake2ts-theme')).toBe('light');
  });

  test('applies CSS variables to document', () => {
    service.setTheme('light');

    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--bg-primary')).toBe(lightTheme.colors.primary);
    expect(rootStyle.getPropertyValue('--text-primary')).toBe(lightTheme.colors.text);
    expect(rootStyle.getPropertyValue('--accent')).toBe(lightTheme.colors.accent);
  });

  test('notifies listeners on change', () => {
    const listener = jest.fn();
    service.subscribe(listener);

    service.setTheme('light');
    expect(listener).toHaveBeenCalledWith(lightTheme);

    service.setTheme('dark');
    expect(listener).toHaveBeenCalledWith(darkTheme);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('returns available themes', () => {
    const themes = service.getAvailableThemes();
    expect(themes).toHaveLength(3);
    expect(themes.map(t => t.id)).toContain('dark');
    expect(themes.map(t => t.id)).toContain('light');
    expect(themes.map(t => t.id)).toContain('high-contrast');
  });
});
