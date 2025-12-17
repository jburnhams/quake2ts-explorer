import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeSelector } from '../../../src/components/ThemeSelector';
import { themeService } from '../../../src/services/themeService';

describe('ThemeSelector', () => {
  beforeEach(() => {
    // Reset to default theme
    themeService.setTheme('dark');
  });

  test('renders theme selector with options', () => {
    render(<ThemeSelector />);

    const select = screen.getByTestId('theme-select');
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3); // Dark, Light, High Contrast
    expect(options[0]).toHaveTextContent('Dark (Default)');
    expect(options[1]).toHaveTextContent('Light');
    expect(options[2]).toHaveTextContent('High Contrast');
  });

  test('shows current theme as selected', () => {
    themeService.setTheme('light');
    render(<ThemeSelector />);

    const select = screen.getByTestId('theme-select') as HTMLSelectElement;
    expect(select.value).toBe('light');
  });

  test('changes theme when new option is selected', () => {
    const handleChange = jest.fn();
    render(<ThemeSelector onChange={handleChange} />);

    const select = screen.getByTestId('theme-select');
    fireEvent.change(select, { target: { value: 'light' } });

    expect(themeService.getTheme().id).toBe('light');
    expect(handleChange).toHaveBeenCalledWith('light');
  });

  test('updates when theme changes externally', () => {
    render(<ThemeSelector />);

    const select = screen.getByTestId('theme-select') as HTMLSelectElement;
    expect(select.value).toBe('dark');

    act(() => {
      themeService.setTheme('high-contrast');
    });

    expect(select.value).toBe('high-contrast');
  });
});
