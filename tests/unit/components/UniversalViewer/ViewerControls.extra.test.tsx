import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ViewerControls } from '@/src/components/UniversalViewer/ViewerControls';
import { DebugMode } from '@/src/types/debugMode';
import { vec3 } from 'gl-matrix';

// Mock Colorful component
vi.mock('@uiw/react-color-colorful', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <div data-testid="color-picker" onClick={() => onChange({ hsva: { h: 0, s: 0, v: 0, a: 1 } })}>
      Color Picker
    </div>
  ),
}));

describe('ViewerControls Interaction Coverage', () => {
  const mockSetOrbit = vi.fn((update) => {
      if (typeof update === 'function') {
          update({ radius: 100, theta: 0, phi: Math.PI/4, target: [0, 0, 0] });
      }
  });
  const mockSetFreeCamera = vi.fn((update) => {
      if (typeof update === 'function') {
          update({ position: [0, 0, 0], rotation: [0, 0, 0] });
      }
  });
  const mockSetSpeed = vi.fn();
  const mockSetCameraMode = vi.fn();
  const mockSetRenderMode = vi.fn();
  const mockSetRenderColor = vi.fn();
  const mockOnPlayPause = vi.fn();
  const mockSetDebugMode = vi.fn();
  const mockSetShowStats = vi.fn();

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
    showStats: false,
    onScreenshot: vi.fn(),
    onMetadata: vi.fn(),
    onLightingSettings: vi.fn(),
    onPostProcessSettings: vi.fn(),
    onCameraSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  // New tests for Demo Stats Button
  it('renders Demo Stats button when onToggleDemoStats is provided', () => {
      const onToggleDemoStats = vi.fn();
      render(<ViewerControls {...defaultProps} onToggleDemoStats={onToggleDemoStats} />);

      const button = screen.getByTitle(/Toggle Demo Stats Overlay/i);
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onToggleDemoStats).toHaveBeenCalled();
  });

  it('highlights Demo Stats button when stats are visible', () => {
      render(<ViewerControls {...defaultProps} onToggleDemoStats={vi.fn()} showDemoStats={true} />);

      const button = screen.getByTitle(/Toggle Demo Stats Overlay/i);
      expect(button).toHaveStyle('background-color: #444');
  });

  it('does not render Demo Stats button when onToggleDemoStats is missing', () => {
      render(<ViewerControls {...defaultProps} onToggleDemoStats={undefined} />);

      const button = screen.queryByTitle(/Toggle Demo Stats Overlay/i);
      expect(button).not.toBeInTheDocument();
  });
});
