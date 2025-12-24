import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ViewerControls } from '../../../../src/components/UniversalViewer/ViewerControls';
import { DebugMode } from '../../../../src/types/debugMode';
import { OrbitState, FreeCameraState } from '../../../../src/utils/cameraUtils';
import { vec3 } from 'gl-matrix';

describe('ViewerControls Demo Stepping', () => {
  const mockProps = {
    isPlaying: true,
    onPlayPause: vi.fn(),
    orbit: { radius: 100, theta: 0, phi: 0, target: [0, 0, 0] as vec3 } as OrbitState,
    setOrbit: vi.fn(),
    freeCamera: { position: [0, 0, 0] as vec3, rotation: [0, 0, 0] as vec3 } as FreeCameraState,
    setFreeCamera: vi.fn(),
    hasPlayback: true,
    speed: 1.0,
    setSpeed: vi.fn(),
    showCameraControls: true,
    cameraMode: 'orbit' as const,
    setCameraMode: vi.fn(),
    renderMode: 'textured' as const,
    setRenderMode: vi.fn(),
    renderColor: [1, 1, 1] as [number, number, number],
    setRenderColor: vi.fn(),
    debugMode: DebugMode.None,
    setDebugMode: vi.fn(),
  };

  it('renders step buttons when stepping handlers are provided', () => {
    render(<ViewerControls {...mockProps} onStepForward={vi.fn()} onStepBackward={vi.fn()} />);

    expect(screen.getByTitle(/Step Backward/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Step Forward/i)).toBeInTheDocument();
  });

  it('does not render step buttons when handlers are missing', () => {
    render(<ViewerControls {...mockProps} />);

    expect(screen.queryByTitle(/Step Backward/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Step Forward/i)).not.toBeInTheDocument();
  });

  it('calls onStepForward when forward button is clicked', () => {
    const onStepForward = vi.fn();
    render(<ViewerControls {...mockProps} onStepForward={onStepForward} isPlaying={false} />);

    fireEvent.click(screen.getByTitle(/Step Forward/i));
    expect(onStepForward).toHaveBeenCalled();
  });

  it('calls onStepBackward when backward button is clicked', () => {
    const onStepBackward = vi.fn();
    render(<ViewerControls {...mockProps} onStepBackward={onStepBackward} isPlaying={false} />);

    fireEvent.click(screen.getByTitle(/Step Backward/i));
    expect(onStepBackward).toHaveBeenCalled();
  });

  it('disables step buttons when playing', () => {
    render(<ViewerControls {...mockProps} onStepForward={vi.fn()} onStepBackward={vi.fn()} isPlaying={true} />);

    expect(screen.getByTitle(/Step Backward/i)).toBeDisabled();
    expect(screen.getByTitle(/Step Forward/i)).toBeDisabled();
  });
});
