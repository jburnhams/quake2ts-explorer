import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CameraSettingsPanel } from '@/src/components/CameraSettingsPanel';
import { DEFAULT_CAMERA_SETTINGS } from '@/src/types/CameraSettings';

describe('CameraSettingsPanel', () => {
  it('renders all settings fields', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <CameraSettingsPanel
        settings={DEFAULT_CAMERA_SETTINGS}
        onChange={onChange}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Camera Settings')).toBeInTheDocument();
    expect(screen.getByText('Third Person Distance')).toBeInTheDocument();
    expect(screen.getByText('Third Person FOV')).toBeInTheDocument();
    expect(screen.getByText('Free Cam Speed')).toBeInTheDocument();
    expect(screen.getByText('Cinematic Playback Speed')).toBeInTheDocument();
  });

  it('calls onChange when a slider is moved', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <CameraSettingsPanel
        settings={DEFAULT_CAMERA_SETTINGS}
        onChange={onChange}
        onClose={onClose}
      />
    );

    // Get input by label text is hard because label is separate from input in my component structure
    // Let's rely on value display or order
    const distanceInput = screen.getAllByRole('slider')[0]; // First slider

    fireEvent.change(distanceInput, { target: { value: '200' } });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_CAMERA_SETTINGS,
      thirdPersonDistance: 200
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <CameraSettingsPanel
        settings={DEFAULT_CAMERA_SETTINGS}
        onChange={onChange}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  it('resets to defaults', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    const customSettings = { ...DEFAULT_CAMERA_SETTINGS, thirdPersonDistance: 500 };

    render(
      <CameraSettingsPanel
        settings={customSettings}
        onChange={onChange}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Reset Defaults'));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_CAMERA_SETTINGS);
  });
});
