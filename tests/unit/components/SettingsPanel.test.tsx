import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '@/src/components/SettingsPanel';
import { settingsService } from '@/src/services/settingsService';

// Mock dependencies
jest.mock('@/src/services/settingsService', () => ({
  settingsService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  }
}));

const mockSettings = {
  general: {
    language: 'en',
    defaultMode: 'browser',
    autoLoadDefaultPak: true,
    defaultFileTreeSort: 'name',
    confirmBeforeClose: true
  },
  graphics: {},
  audio: {},
  controls: {},
  accessibility: {},
  advanced: {}
};

describe('SettingsPanel', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    (settingsService.getSettings as jest.Mock).mockReturnValue(mockSettings);
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByTestId('tab-general')).toBeInTheDocument();
    expect(screen.getByTestId('tab-graphics')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument(); // Inside General tab
  });

  test('switches tabs', () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    const graphicsTab = screen.getByTestId('tab-graphics');
    fireEvent.click(graphicsTab);

    expect(screen.getByText('Render Quality Preset')).toBeInTheDocument();

    const generalTab = screen.getByTestId('tab-general');
    fireEvent.click(generalTab);

    expect(screen.getByText('Application')).toBeInTheDocument();
  });

  test('closes on close button click', () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close settings');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('closes on Escape key', () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('updates settings locally and saves', () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    // Find a setting input (e.g. checkbox for auto-load)
    // Note: We need to find the checkbox associated with "Auto-load PAK"
    // Since we don't have unique IDs/labels hooked up in the mock component yet perfectly,
    // we'll look for the checkbox by type in the specific setting container if possible,
    // or rely on implementation detail.
    // The GeneralSettingsTab uses a checkbox for autoLoadDefaultPak.
    // We can assume it's one of the checkboxes.

    // For specific targeting, let's assume order or add testids in component (better practice)
    // But for now, we'll try to find by label text if we wrapped in label or associated it.
    // The current implementation has separate label and input.

    // Let's modify the component to have labels or test-ids in a separate step or assume index.
    // Actually, let's use the 'Save Changes' button disabled state to verify changes.

    const saveButton = screen.getByTestId('save-settings-button');
    expect(saveButton).toBeDisabled();

    // Find the select for defaultMode
    // We use getByDisplayValue because getByRole index is fragile (affected by ThemeSelector)
    const modeSelect = screen.getByDisplayValue('File Browser');
    fireEvent.change(modeSelect, { target: { value: 'last-used' } });

    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    expect(settingsService.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
      general: expect.objectContaining({
        defaultMode: 'last-used'
      })
    }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('reset button prompts confirmation', () => {
    window.confirm = jest.fn(() => true);
    render(<SettingsPanel onClose={mockOnClose} />);

    const resetButton = screen.getByText('Reset Defaults');
    fireEvent.click(resetButton);

    expect(window.confirm).toHaveBeenCalled();
    // After reset, save button should be enabled because local state changed (even if it matches default,
    // strictly speaking it's a change from "loaded" state if we consider dirty checking.
    // But wait, if defaults match current, maybe not?
    // In our implementation, we set setHasChanges(true) on reset.
    const saveButton = screen.getByTestId('save-settings-button');
    expect(saveButton).toBeEnabled();
  });
});
