import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlsSettingsTab } from '@/src/components/settings/ControlsSettings';
import { ControlSettings } from '@/src/types/settings';

describe('ControlsSettingsTab', () => {
  const mockSettings: ControlSettings = {
    mouseSensitivityX: 3.0,
    mouseSensitivityY: 3.0,
    invertMouseY: false,
    enableGamepad: true,
    keyboardLayout: 'qwerty',
    gamepadDeadzone: 0.1,
    gamepadSensitivity: 1.0,
    autoAim: false,
  };

  const mockOnChange = vi.fn();
  const mockOnOpenKeybindings = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnOpenKeybindings.mockClear();
  });

  it('renders all settings controls', () => {
    render(
      <ControlsSettingsTab
        settings={mockSettings}
        onChange={mockOnChange}
        onOpenKeybindings={mockOnOpenKeybindings}
      />
    );

    expect(screen.getByText('Sensitivity X')).toBeInTheDocument();
    expect(screen.getByText('Sensitivity Y')).toBeInTheDocument();
    expect(screen.getByText('Invert Y Axis')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Layout')).toBeInTheDocument();
    expect(screen.getByText('Gamepad Support')).toBeInTheDocument();
    expect(screen.getByText('Configure Bindings...')).toBeInTheDocument();
  });

  it('updates mouse sensitivity X', () => {
    render(<ControlsSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '5.0' } });
    expect(mockOnChange).toHaveBeenCalledWith({ mouseSensitivityX: 5.0 });
  });

  it('updates mouse sensitivity Y', () => {
    render(<ControlsSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[1], { target: { value: '4.0' } });
    expect(mockOnChange).toHaveBeenCalledWith({ mouseSensitivityY: 4.0 });
  });

  it('updates invert mouse Y', () => {
    render(<ControlsSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    // There are multiple checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    // First is Invert Y Axis
    fireEvent.click(checkboxes[0]);
    expect(mockOnChange).toHaveBeenCalledWith({ invertMouseY: true });
  });

  it('updates keyboard layout', () => {
    render(<ControlsSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'azerty' } });
    expect(mockOnChange).toHaveBeenCalledWith({ keyboardLayout: 'azerty' });
  });

  it('updates gamepad support', () => {
    render(<ControlsSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // Second is Gamepad Support
    fireEvent.click(checkboxes[1]);
    expect(mockOnChange).toHaveBeenCalledWith({ enableGamepad: false });
  });

  it('calls onOpenKeybindings when button is clicked', () => {
    render(
      <ControlsSettingsTab
        settings={mockSettings}
        onChange={mockOnChange}
        onOpenKeybindings={mockOnOpenKeybindings}
      />
    );

    fireEvent.click(screen.getByText('Configure Bindings...'));
    expect(mockOnOpenKeybindings).toHaveBeenCalled();
  });
});
