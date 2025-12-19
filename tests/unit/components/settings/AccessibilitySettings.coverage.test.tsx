import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessibilitySettingsTab } from '@/src/components/settings/AccessibilitySettings';
import { AccessibilitySettings } from '@/src/types/settings';

describe('AccessibilitySettingsTab', () => {
  const mockSettings: AccessibilitySettings = {
    highContrast: false,
    largeFont: false,
    reduceMotion: false,
    screenReader: false,
    colorBlindMode: 'none',
    subtitles: false,
    keyboardOnly: false,
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all settings controls', () => {
    render(<AccessibilitySettingsTab settings={mockSettings} onChange={mockOnChange} />);

    expect(screen.getByText('High Contrast')).toBeInTheDocument();
    expect(screen.getByText('Large Text')).toBeInTheDocument();
    expect(screen.getByText('Color Blind Mode')).toBeInTheDocument();
    expect(screen.getByText('Reduce Motion')).toBeInTheDocument();
    expect(screen.getByText('Screen Reader Support')).toBeInTheDocument();
    expect(screen.getByText('Subtitles')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Only')).toBeInTheDocument();
  });

  it('updates high contrast', () => {
    render(<AccessibilitySettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(mockOnChange).toHaveBeenCalledWith({ highContrast: true });
  });

  it('updates large text', () => {
    render(<AccessibilitySettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(mockOnChange).toHaveBeenCalledWith({ largeFont: true });
  });

  it('updates color blind mode', () => {
    render(<AccessibilitySettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'deuteranopia' } });
    expect(mockOnChange).toHaveBeenCalledWith({ colorBlindMode: 'deuteranopia' });
  });

  it('updates reduce motion', () => {
    render(<AccessibilitySettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[2]);
    expect(mockOnChange).toHaveBeenCalledWith({ reduceMotion: true });
  });

  it('updates screen reader support', () => {
    render(<AccessibilitySettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[3]);
    expect(mockOnChange).toHaveBeenCalledWith({ screenReader: true });
  });

  it('updates subtitles', () => {
    render(<AccessibilitySettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[4]);
    expect(mockOnChange).toHaveBeenCalledWith({ subtitles: true });
  });

  it('updates keyboard only', () => {
    render(<AccessibilitySettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[5]);
    expect(mockOnChange).toHaveBeenCalledWith({ keyboardOnly: true });
  });
});
