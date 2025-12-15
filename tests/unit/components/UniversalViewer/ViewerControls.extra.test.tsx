import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ViewerControls } from '@/src/components/UniversalViewer/ViewerControls';
import { DebugMode } from '@/src/types/debugMode';
import { vec3 } from 'gl-matrix';

// Mock Colorful component
jest.mock('@uiw/react-color-colorful', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <div data-testid="color-picker" onClick={() => onChange({ hsva: { h: 0, s: 0, v: 0, a: 1 } })}>
      Color Picker
    </div>
  ),
}));

describe('ViewerControls Interaction Coverage', () => {
  const mockSetOrbit = jest.fn((update) => {
      if (typeof update === 'function') {
          update({ radius: 100, theta: 0, phi: Math.PI/4, target: [0, 0, 0] });
      }
  });
  const mockSetFreeCamera = jest.fn((update) => {
      if (typeof update === 'function') {
          update({ position: [0, 0, 0], rotation: [0, 0, 0] });
      }
  });
  const mockSetSpeed = jest.fn();
  const mockSetCameraMode = jest.fn();
  const mockSetRenderMode = jest.fn();
  const mockSetRenderColor = jest.fn();
  const mockOnPlayPause = jest.fn();
  const mockSetDebugMode = jest.fn();
  const mockSetShowStats = jest.fn();

  const defaultProps = {
    isPlaying: true,
    onPlayPause: mockOnPlayPause,
    orbit: { radius: 100, theta: 0, phi: Math.PI/4, target: [0, 0, 0] as vec3 },
    setOrbit: mockSetOrbit,
    freeCamera: { position: [0, 0, 0] as vec3, rotation: [0, 0, 0] as vec3 },
    setFreeCamera: mockSetFreeCamera,
    hasPlayback: true,
    speed: 1.0,
    setSpeed: mockSetSpeed,
    showCameraControls: true,
    cameraMode: 'orbit' as const,
    setCameraMode: mockSetCameraMode,
    renderMode: 'textured' as const,
    setRenderMode: mockSetRenderMode,
    renderColor: [1, 1, 1] as [number, number, number],
    setRenderColor: mockSetRenderColor,
    debugMode: DebugMode.None,
    setDebugMode: mockSetDebugMode,
    setShowStats: mockSetShowStats,
    showStats: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exercises camera movement logic in orbit mode', () => {
    render(<ViewerControls {...defaultProps} cameraMode="orbit" />);
    // Forward
    fireEvent.click(screen.getAllByText('▲')[0]);
    expect(mockSetOrbit).toHaveBeenCalled();

    // Backward
    fireEvent.click(screen.getAllByText('▼')[0]);
    expect(mockSetOrbit).toHaveBeenCalled();

    // Left
    fireEvent.click(screen.getAllByText('◀')[0]);
    expect(mockSetOrbit).toHaveBeenCalled();

    // Right
    fireEvent.click(screen.getAllByText('▶')[0]);
    expect(mockSetOrbit).toHaveBeenCalled();
  });

  it('exercises camera rotation logic in orbit mode', () => {
    render(<ViewerControls {...defaultProps} cameraMode="orbit" />);
    // Up
    fireEvent.click(screen.getAllByText('▲')[1]);
    expect(mockSetOrbit).toHaveBeenCalled();

    // Down
    fireEvent.click(screen.getAllByText('▼')[1]);
    expect(mockSetOrbit).toHaveBeenCalled();

    // Left
    fireEvent.click(screen.getAllByText('◀')[1]);
    expect(mockSetOrbit).toHaveBeenCalled();

    // Right
    fireEvent.click(screen.getAllByText('▶')[1]);
    expect(mockSetOrbit).toHaveBeenCalled();
  });

  it('exercises camera movement logic in free mode', () => {
    render(<ViewerControls {...defaultProps} cameraMode="free" />);
    // Forward
    fireEvent.click(screen.getAllByText('▲')[0]);
    expect(mockSetFreeCamera).toHaveBeenCalled();

    // Backward
    fireEvent.click(screen.getAllByText('▼')[0]);
    expect(mockSetFreeCamera).toHaveBeenCalled();

    // Left
    fireEvent.click(screen.getAllByText('◀')[0]);
    expect(mockSetFreeCamera).toHaveBeenCalled();

    // Right
    fireEvent.click(screen.getAllByText('▶')[0]);
    expect(mockSetFreeCamera).toHaveBeenCalled();
  });

  it('exercises camera rotation logic in free mode', () => {
    render(<ViewerControls {...defaultProps} cameraMode="free" />);
    // Up
    fireEvent.click(screen.getAllByText('▲')[1]);
    expect(mockSetFreeCamera).toHaveBeenCalled();

    // Down
    fireEvent.click(screen.getAllByText('▼')[1]);
    expect(mockSetFreeCamera).toHaveBeenCalled();

    // Left
    fireEvent.click(screen.getAllByText('◀')[1]);
    expect(mockSetFreeCamera).toHaveBeenCalled();

    // Right
    fireEvent.click(screen.getAllByText('▶')[1]);
    expect(mockSetFreeCamera).toHaveBeenCalled();
  });

  it('exercises stats checkbox', () => {
      render(<ViewerControls {...defaultProps} />);
      const checkbox = screen.getByLabelText('Show Performance Stats');
      fireEvent.click(checkbox);
      expect(mockSetShowStats).toHaveBeenCalledWith(true);
  });

  it('exercises camera mode toggle', () => {
      render(<ViewerControls {...defaultProps} cameraMode="orbit" />);
      fireEvent.click(screen.getByText('Mode: Orbit'));
      expect(mockSetCameraMode).toHaveBeenCalledWith('free');
  });

  it('exercises camera mode toggle from free', () => {
      render(<ViewerControls {...defaultProps} cameraMode="free" />);
      fireEvent.click(screen.getByText('Mode: Free Look'));
      expect(mockSetCameraMode).toHaveBeenCalledWith('orbit');
  });
});
