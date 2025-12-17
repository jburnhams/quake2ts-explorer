import React, { useEffect, useState } from 'react';
import { themeService } from '../services/themeService';
import { Theme } from '../types/theme';

interface ThemeSelectorProps {
  // Optional callback if parent needs to know
  onChange?: (themeId: string) => void;
}

export function ThemeSelector({ onChange }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themeService.getTheme());
  const themes = themeService.getAvailableThemes();

  useEffect(() => {
    const unsubscribe = themeService.subscribe((theme) => {
      setCurrentTheme(theme);
    });
    return unsubscribe;
  }, []);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newThemeId = e.target.value;
    themeService.setTheme(newThemeId);
    if (onChange) {
      onChange(newThemeId);
    }
  };

  return (
    <div className="theme-selector" data-testid="theme-selector">
      <div className="setting-item">
        <div className="setting-label">
          <span className="setting-name">Theme</span>
          <span className="setting-description">Select application color scheme</span>
        </div>
        <div className="setting-control">
          <select
            value={currentTheme.id}
            onChange={handleThemeChange}
            data-testid="theme-select"
          >
            {themes.map(theme => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
