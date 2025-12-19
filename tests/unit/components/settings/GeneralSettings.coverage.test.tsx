import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeneralSettingsTab } from '@/src/components/settings/GeneralSettings';
import { GeneralSettings } from '@/src/types/settings';

// Mock ThemeSelector
jest.mock('@/src/components/ThemeSelector', () => ({
  ThemeSelector: () => <div>ThemeSelector Mock</div>
}));

describe('GeneralSettingsTab', () => {
  const mockSettings: GeneralSettings = {
    language: 'en',
    defaultMode: 'browser',
    autoLoadDefaultPak: true,
    defaultFileTreeSort: 'name',
    confirmBeforeClose: true,
    theme: 'dark'
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all settings controls', () => {
    render(<GeneralSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('ThemeSelector Mock')).toBeInTheDocument();
    expect(screen.getByText('Startup Mode')).toBeInTheDocument();
    expect(screen.getByText('Auto-load PAK')).toBeInTheDocument();
    expect(screen.getByText('Default Sort Order')).toBeInTheDocument();
    expect(screen.getByText('Confirm Close')).toBeInTheDocument();
  });

  it('updates language', () => {
    render(<GeneralSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const selects = screen.getAllByRole('combobox');
    expect(selects[0]).toBeDisabled();

    fireEvent.change(selects[0], { target: { value: 'fr' } });
    expect(mockOnChange).toHaveBeenCalledWith({ language: 'fr' });
  });

  it('updates startup mode', () => {
    render(<GeneralSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const selects = screen.getAllByRole('combobox');
    // Startup mode is likely the second one
    fireEvent.change(selects[1], { target: { value: 'last-used' } });
    expect(mockOnChange).toHaveBeenCalledWith({ defaultMode: 'last-used' });
  });

  it('updates auto-load pak', () => {
    render(<GeneralSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(mockOnChange).toHaveBeenCalledWith({ autoLoadDefaultPak: false });
  });

  it('updates default sort order', () => {
    render(<GeneralSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: 'size' } });
    expect(mockOnChange).toHaveBeenCalledWith({ defaultFileTreeSort: 'size' });
  });

  it('updates confirm before close', () => {
    render(<GeneralSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(mockOnChange).toHaveBeenCalledWith({ confirmBeforeClose: false });
  });
});
