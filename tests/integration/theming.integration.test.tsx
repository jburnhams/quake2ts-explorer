import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GeneralSettingsTab } from '@/src/components/settings/GeneralSettings';
import { themeService } from '@/src/services/themeService';

describe('Theming Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    themeService.setTheme('dark');
  });

  test('switching theme in settings updates document styles', () => {
    // Render the settings tab which contains ThemeSelector
    const mockSettings = {
      language: 'en',
      defaultMode: 'browser',
      autoLoadDefaultPak: true,
      defaultFileTreeSort: 'name',
      confirmBeforeClose: false
    };

    render(<GeneralSettingsTab settings={mockSettings} onChange={() => {}} />);

    // Find theme selector
    const select = screen.getByTestId('theme-select');

    // Initial state
    expect((select as HTMLSelectElement).value).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#1a1a2e');

    // Change to light theme
    fireEvent.change(select, { target: { value: 'light' } });

    // Verify changes
    expect(themeService.getTheme().id).toBe('light');
    expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#f5f5f5');

    // Change to high contrast
    fireEvent.change(select, { target: { value: 'high-contrast' } });

    // Verify changes
    expect(themeService.getTheme().id).toBe('high-contrast');
    expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#000000');
  });

  test('theme selection is persisted', () => {
    const mockSettings = {
        language: 'en',
        defaultMode: 'browser',
        autoLoadDefaultPak: true,
        defaultFileTreeSort: 'name',
        confirmBeforeClose: false
    };
    render(<GeneralSettingsTab settings={mockSettings} onChange={() => {}} />);

    const select = screen.getByTestId('theme-select');
    fireEvent.change(select, { target: { value: 'light' } });

    expect(localStorage.getItem('quake2ts-theme')).toBe('light');
  });
});
