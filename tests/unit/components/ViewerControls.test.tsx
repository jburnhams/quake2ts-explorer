import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewerControls } from '../../../src/components/UniversalViewer/ViewerControls';
import { OrbitState } from '../../../src/utils/cameraUtils';
import { vec3 } from 'gl-matrix';

describe('ViewerControls', () => {
  const mockSetOrbit = jest.fn();
  const mockSetSpeed = jest.fn();
  const mockOnPlayPause = jest.fn();

  const defaultOrbit: OrbitState = {
    radius: 100,
    theta: 0,
    phi: Math.PI / 4,
    target: [0, 0, 0] as unknown as vec3,
  };

  const defaultProps = {
    isPlaying: false,
    onPlayPause: mockOnPlayPause,
    orbit: defaultOrbit,
    setOrbit: mockSetOrbit,
    hasPlayback: true,
    speed: 1.0,
    setSpeed: mockSetSpeed,
    showCameraControls: true,
    cameraMode: 'orbit' as const,
    setCameraMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders playback controls when hasPlayback is true', () => {
    render(<ViewerControls {...defaultProps} />);

    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByText('Speed: 1.0x')).toBeInTheDocument();
  });

  it('does not render playback controls when hasPlayback is false', () => {
    render(<ViewerControls {...defaultProps} hasPlayback={false} />);

    expect(screen.queryByText('Play')).not.toBeInTheDocument();
    expect(screen.queryByText(/Speed/)).not.toBeInTheDocument();
  });

  it('toggles play/pause button text based on isPlaying', () => {
    const { rerender } = render(<ViewerControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByText('Pause')).toBeInTheDocument();

    rerender(<ViewerControls {...defaultProps} isPlaying={false} />);
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('calls onPlayPause when play/pause button is clicked', () => {
    render(<ViewerControls {...defaultProps} />);

    fireEvent.click(screen.getByText('Play'));
    expect(mockOnPlayPause).toHaveBeenCalledTimes(1);
  });

  it('updates speed when range input changes', () => {
    render(<ViewerControls {...defaultProps} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '2.0' } });

    expect(mockSetSpeed).toHaveBeenCalledWith(2.0);
  });

  it('renders camera controls when showCameraControls is true', () => {
    render(<ViewerControls {...defaultProps} />);

    expect(screen.getByText('Move / Zoom')).toBeInTheDocument();
    expect(screen.getByText('Reset Cam')).toBeInTheDocument();
  });

  it('does not render camera controls when showCameraControls is false', () => {
    render(<ViewerControls {...defaultProps} showCameraControls={false} />);

    expect(screen.queryByText('Move / Zoom')).not.toBeInTheDocument();
  });

  it('calls setOrbit when reset camera button is clicked', () => {
    render(<ViewerControls {...defaultProps} />);

    fireEvent.click(screen.getByText('Reset Cam'));

    expect(mockSetOrbit).toHaveBeenCalled();
    const updater = mockSetOrbit.mock.calls[0][0];
    // In React setState, it can be a value or a function. In this case, it's a value (object).
    // Wait, let's check ViewerControls implementation of resetCamera.
    // It calls setOrbit({...}) directly.
    expect(updater).toEqual({
      radius: 100,
      theta: 0,
      phi: Math.PI / 4,
      target: [0, 0, 0],
    });
  });

  describe('Camera Movement', () => {
    it('handles forward movement (zoom in)', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('▲'); // There are two up buttons (Move and Rotate)
      // The first one is in "Move / Zoom" section because of order in JSX
      fireEvent.click(buttons[0]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      // It passes a function
      const newState = updater(defaultOrbit);
      expect(newState.radius).toBe(95); // 100 - 5
    });

    it('handles backward movement (zoom out)', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('▼');
      fireEvent.click(buttons[0]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      expect(newState.radius).toBe(105); // 100 + 5
    });

    it('handles left movement (pan left)', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('◀');
      fireEvent.click(buttons[0]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      // We need to check if target changed.
      // With theta=0, phi=PI/4:
      // eyeX = 0, eyeY = R*cos(PI/4), eyeZ = R*sin(PI/4) (approx)
      // Actually let's just check target is not [0,0,0]
      expect(newState.target).not.toEqual([0, 0, 0]);
    });

    it('handles right movement (pan right)', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('▶');
      fireEvent.click(buttons[0]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      expect(newState.target).not.toEqual([0, 0, 0]);
    });
  });

  describe('Camera Rotation', () => {
    it('handles left rotation', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('◀');
      fireEvent.click(buttons[1]); // Second one is Rotate

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      expect(newState.theta).toBeLessThan(defaultOrbit.theta); // Decreases theta
    });

    it('handles right rotation', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('▶');
      fireEvent.click(buttons[1]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      expect(newState.theta).toBeGreaterThan(defaultOrbit.theta);
    });

    it('handles up rotation', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('▲');
      fireEvent.click(buttons[1]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      expect(newState.phi).toBeLessThan(defaultOrbit.phi);
    });

    it('handles down rotation', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('▼');
      fireEvent.click(buttons[1]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      expect(newState.phi).toBeGreaterThan(defaultOrbit.phi);
    });
  });
});
