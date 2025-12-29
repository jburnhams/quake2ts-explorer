import { Theme } from '../types/theme';
import { darkTheme } from '../themes/darkTheme';
import { lightTheme } from '../themes/lightTheme';
import { highContrastTheme } from '../themes/highContrastTheme';

const THEME_STORAGE_KEY = 'quake2ts-theme';

export class ThemeService {
  private currentTheme: Theme = darkTheme;
  private themes: Map<string, Theme> = new Map();
  private listeners: Set<(theme: Theme) => void> = new Set();

  constructor() {
    this.registerTheme(darkTheme);
    this.registerTheme(lightTheme);
    this.registerTheme(highContrastTheme);

    // Load persisted theme
    let savedThemeId: string | null = null;
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to access localStorage:', e);
    }

    if (savedThemeId && this.themes.has(savedThemeId)) {
      this.setTheme(savedThemeId);
    } else {
      this.applyTheme(darkTheme);
    }
  }

  public registerTheme(theme: Theme): void {
    this.themes.set(theme.id, theme);
  }

  public getTheme(): Theme {
    return this.currentTheme;
  }

  public getAvailableThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  public setTheme(themeId: string): void {
    const theme = this.themes.get(themeId);
    if (theme) {
      this.currentTheme = theme;
      this.applyTheme(theme);

      try {
        if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
          localStorage.setItem(THEME_STORAGE_KEY, themeId);
        }
      } catch (e) {
        console.warn('Failed to save theme to localStorage:', e);
      }

      this.notifyListeners();
    }
  }

  public subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }

  private applyTheme(theme: Theme): void {
    // Check if document is available (for SSR/Node environments)
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Map theme properties to CSS variables
    // Based on App.css variable names
    root.style.setProperty('--bg-primary', theme.colors.primary);
    root.style.setProperty('--bg-secondary', theme.colors.secondary);
    root.style.setProperty('--bg-tertiary', theme.colors.tertiary);

    root.style.setProperty('--text-primary', theme.colors.text);
    root.style.setProperty('--text-secondary', theme.colors.textSecondary);

    root.style.setProperty('--accent', theme.colors.accent);
    root.style.setProperty('--accent-hover', theme.colors.accentHover);

    root.style.setProperty('--border', theme.colors.border);
    root.style.setProperty('--selection', theme.colors.selection);

    // Additional colors not originally in App.css but useful
    root.style.setProperty('--surface', theme.colors.surface);
    root.style.setProperty('--success', theme.colors.success);
    root.style.setProperty('--warning', theme.colors.warning);
    root.style.setProperty('--error', theme.colors.error);

    // Set color scheme for browser UI
    root.style.colorScheme = theme.isDark ? 'dark' : 'light';
  }
}

export const themeService = new ThemeService();
