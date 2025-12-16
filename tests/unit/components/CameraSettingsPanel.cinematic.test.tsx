import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CameraSettingsPanel } from '@/src/components/CameraSettingsPanel';
import { DEFAULT_CAMERA_SETTINGS } from '@/src/types/CameraSettings';

describe('CameraSettingsPanel with Cinematic Controls', () => {
  it('renders cinematic path controls when provided', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    const onAddKeyframe = jest.fn();
    const onClearPath = jest.fn();

    render(
      <CameraSettingsPanel
        settings={DEFAULT_CAMERA_SETTINGS}
        onChange={onChange}
        onClose={onClose}
        onAddKeyframe={onAddKeyframe}
        onClearPath={onClearPath}
        pathKeyframeCount={2}
      />
    );

    expect(screen.getByText('Cinematic Path')).toBeInTheDocument();
    expect(screen.getByText('2 keyframes')).toBeInTheDocument();
    expect(screen.getByText('+ Add Keyframe (Current View)')).toBeInTheDocument();
    expect(screen.getByText('Clear Path')).toBeInTheDocument();
  });

  it('calls onAddKeyframe when add button is clicked', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    const onAddKeyframe = jest.fn();

    render(
      <CameraSettingsPanel
        settings={DEFAULT_CAMERA_SETTINGS}
        onChange={onChange}
        onClose={onClose}
        onAddKeyframe={onAddKeyframe}
      />
    );

    fireEvent.click(screen.getByText('+ Add Keyframe (Current View)'));
    expect(onAddKeyframe).toHaveBeenCalled();
  });

  it('disables clear path button when no keyframes', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    const onClearPath = jest.fn();

    render(
      <CameraSettingsPanel
        settings={DEFAULT_CAMERA_SETTINGS}
        onChange={onChange}
        onClose={onClose}
        onAddKeyframe={jest.fn()}
        onClearPath={onClearPath}
        pathKeyframeCount={0}
      />
    );

    const clearBtn = screen.getByText('Clear Path');
    expect(clearBtn).toBeDisabled();
  });
});
