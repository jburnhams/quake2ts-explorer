import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewerControls } from '../../../../src/components/UniversalViewer/ViewerControls';
import { OrbitState } from '../../../../src/utils/cameraUtils';
import { vec3 } from 'gl-matrix';
import { DebugMode } from '../../../../src/types/debugMode';
import '@testing-library/jest-dom';

jest.mock('@uiw/react-color-colorful', () => {
  const Colorful = ({ onChange }: { onChange: (color: any) => void }) => (
    <div data-testid="colorful-picker" onClick={() => onChange({ hsva: { h: 240, s: 100, v: 100, a: 1 } })}>
      Mock Colorful
    </div>
  );
  return {
    __esModule: true,
    default: Colorful,
  };
});

describe('ViewerControls', () => {
  const mockSetOrbit = jest.fn();
  const mockSetSpeed = jest.fn();
  const mockOnPlayPause = jest.fn();
  const mockSetRenderColor = jest.fn();
  const mockSetRenderMode = jest.fn();
  const mockSetDebugMode = jest.fn();

  const defaultOrbit: OrbitState = {
    radius: 100,
    theta: 0,
    phi: Math.PI / 4,
    target: [0, 0, 0] as unknown as vec3,
  };

  const defaultFreeCamera = {
    position: [0, 0, 0] as vec3,
    rotation: [0, 0, 0] as vec3,
  };

  const defaultProps = {
    isPlaying: false,
    onPlayPause: mockOnPlayPause,
    orbit: defaultOrbit,
    setOrbit: mockSetOrbit,
    freeCamera: defaultFreeCamera,
    setFreeCamera: jest.fn(),
    hasPlayback: true,
    speed: 1.0,
    setSpeed: mockSetSpeed,
    showCameraControls: true,
    cameraMode: 'orbit' as const,
    setCameraMode: jest.fn(),
    renderMode: 'textured' as const,
    setRenderMode: mockSetRenderMode,
    renderColor: [1, 1, 1] as [number, number, number],
    setRenderColor: mockSetRenderColor,
    debugMode: DebugMode.None,
    setDebugMode: mockSetDebugMode,
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

      const buttons = screen.getAllByText('▲');
      fireEvent.click(buttons[0]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      expect(newState.radius).toBe(95);
    });

    it('handles backward movement (zoom out)', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('▼');
      fireEvent.click(buttons[0]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      expect(newState.radius).toBe(105);
    });

    it('handles left movement (pan left)', () => {
      render(<ViewerControls {...defaultProps} />);

      const buttons = screen.getAllByText('◀');
      fireEvent.click(buttons[0]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
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
      fireEvent.click(buttons[1]);

      expect(mockSetOrbit).toHaveBeenCalled();
      const updater = mockSetOrbit.mock.calls[0][0];
      const newState = updater(defaultOrbit);
      expect(newState.theta).toBeLessThan(defaultOrbit.theta);
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

  describe('Free Look Camera', () => {
    it('updates free camera position on move', () => {
      const setFreeCamera = jest.fn();
      render(
        <ViewerControls
          {...defaultProps}
          cameraMode="free"
          setFreeCamera={setFreeCamera}
        />
      );

      const buttons = screen.getAllByText('▲');
      fireEvent.click(buttons[0]);

      expect(setFreeCamera).toHaveBeenCalled();
      const updater = setFreeCamera.mock.calls[0][0];
      const newState = updater(defaultFreeCamera);
      expect(newState.position[0]).not.toBe(0);
    });
  });

  describe('Render Mode Controls', () => {
    it('renders render mode buttons', () => {
      render(<ViewerControls {...defaultProps} />);
      expect(screen.getByText('Textured')).toBeInTheDocument();
      expect(screen.getByText('Wireframe')).toBeInTheDocument();
      expect(screen.getByText('Solid')).toBeInTheDocument();
    });

    it('calls setRenderMode when a render mode button is clicked', () => {
      render(<ViewerControls {...defaultProps} />);
      fireEvent.click(screen.getByText('Wireframe'));
      expect(mockSetRenderMode).toHaveBeenCalledWith('wireframe');
    });

    it('disables the currently active render mode button', () => {
      render(<ViewerControls {...defaultProps} renderMode="wireframe" />);
      expect(screen.getByText('Wireframe')).toBeDisabled();
    });
  });

  describe('Color Controls', () => {
    it('does not show color picker when in textured mode', () => {
      const { queryByTestId } = render(<ViewerControls {...defaultProps} renderMode="textured" />);
      expect(queryByTestId('colorful-picker')).not.toBeInTheDocument();
    });

    it('shows color picker when in wireframe mode', () => {
      const { getByTestId } = render(<ViewerControls {...defaultProps} renderMode="wireframe" />);
      expect(getByTestId('colorful-picker')).toBeInTheDocument();
    });

    it('shows color picker when in solid mode', () => {
        const { getByTestId } = render(<ViewerControls {...defaultProps} renderMode="solid" />);
        expect(getByTestId('colorful-picker')).toBeInTheDocument();
    });

    it('calls setRenderColor when the color is changed', () => {
      const { getByTestId } = render(<ViewerControls {...defaultProps} renderMode="solid" />);
      const colorPicker = getByTestId('colorful-picker');
      fireEvent.click(colorPicker);
      expect(mockSetRenderColor).toHaveBeenCalledWith([0, 0, 1]);
    });
  });

  describe('Debug Mode Controls', () => {
    it('renders debug mode selector', () => {
      render(<ViewerControls {...defaultProps} />);
      expect(screen.getByLabelText('Debug Mode:')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Debug Mode:' })).toBeInTheDocument();
    });

    it('calls setDebugMode when changed', () => {
      render(<ViewerControls {...defaultProps} />);
      const select = screen.getByRole('combobox', { name: 'Debug Mode:' });
      fireEvent.change(select, { target: { value: DebugMode.BoundingBoxes } });
      expect(mockSetDebugMode).toHaveBeenCalledWith(DebugMode.BoundingBoxes);
    });

    it('shows all debug options', () => {
      render(<ViewerControls {...defaultProps} />);
      const options = screen.getAllByRole('option');
      const values = options.map(opt => (opt as HTMLOptionElement).value);
      expect(values).toContain(DebugMode.None);
      expect(values).toContain(DebugMode.BoundingBoxes);
      expect(values).toContain(DebugMode.Normals);
      expect(values).toContain(DebugMode.PVSClusters);
      expect(values).toContain(DebugMode.CollisionHulls);
      expect(values).toContain(DebugMode.Lightmaps);
    });
  });

  describe('Screenshot Controls', () => {
    it('renders screenshot button when onScreenshot is provided', () => {
      render(<ViewerControls {...defaultProps} onScreenshot={jest.fn()} />);
      expect(screen.getByText('📷 Screen')).toBeInTheDocument();
    });

    it('does not render screenshot button when onScreenshot is not provided', () => {
      render(<ViewerControls {...defaultProps} onScreenshot={undefined} />);
      expect(screen.queryByText('📷 Screen')).not.toBeInTheDocument();
    });

    it('calls onScreenshot when button is clicked', () => {
      const mockOnScreenshot = jest.fn();
      render(<ViewerControls {...defaultProps} onScreenshot={mockOnScreenshot} />);
      fireEvent.click(screen.getByText('📷 Screen'));
      expect(mockOnScreenshot).toHaveBeenCalledTimes(1);
    });
  });

  describe('Video Recording Controls', () => {
    it('renders record button when onStartRecording and onStopRecording are provided', () => {
       render(<ViewerControls {...defaultProps} onScreenshot={jest.fn()} onStartRecording={jest.fn()} onStopRecording={jest.fn()} />);
       expect(screen.getByText('● Rec')).toBeInTheDocument();
    });

    it('does not render record button if props missing', () => {
        render(<ViewerControls {...defaultProps} onScreenshot={jest.fn()} />);
        expect(screen.queryByText('● Rec')).not.toBeInTheDocument();
    });

    it('calls onStartRecording when clicked and not recording', () => {
        const mockStart = jest.fn();
        render(<ViewerControls {...defaultProps} onScreenshot={jest.fn()} onStartRecording={mockStart} onStopRecording={jest.fn()} isRecording={false} />);
        fireEvent.click(screen.getByText('● Rec'));
        expect(mockStart).toHaveBeenCalled();
    });

    it('shows stop button when isRecording is true', () => {
        render(<ViewerControls {...defaultProps} onScreenshot={jest.fn()} onStartRecording={jest.fn()} onStopRecording={jest.fn()} isRecording={true} />);
        expect(screen.getByText(/■/)).toBeInTheDocument();
    });

    it('calls onStopRecording when clicked and recording', () => {
        const mockStop = jest.fn();
        render(<ViewerControls {...defaultProps} onScreenshot={jest.fn()} onStartRecording={jest.fn()} onStopRecording={mockStop} isRecording={true} />);
        fireEvent.click(screen.getByText(/■/)); // Match by icon since text is now complex
        expect(mockStop).toHaveBeenCalled();
    });

    it('displays elapsed time when recording', () => {
        render(<ViewerControls {...defaultProps} onScreenshot={jest.fn()} onStartRecording={jest.fn()} onStopRecording={jest.fn()} isRecording={true} recordingTime={65} />);
        expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('displays estimated size when recording', () => {
        render(
          <ViewerControls
            {...defaultProps}
            onScreenshot={jest.fn()}
            onStartRecording={jest.fn()}
            onStopRecording={jest.fn()}
            isRecording={true}
            recordingTime={10}
            recordingSizeEstimate={5 * 1024 * 1024} // 5 MB
          />
        );

        expect(screen.getByText('5.0 MB')).toBeInTheDocument();
    });
  });
});
