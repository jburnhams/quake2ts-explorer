import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ViewerControls } from '@/src/components/UniversalViewer/ViewerControls';
import { OrbitState, FreeCameraState } from '@/src/utils/cameraUtils';
import { DebugMode } from '@/src/types/debugMode';
import { vec3 } from 'gl-matrix';

// Mock Colorful component since it uses canvas and might be tricky in jsdom
vi.mock('@uiw/react-color-colorful', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <div data-testid="color-picker" onClick={() => onChange({ hsva: { h: 0, s: 0, v: 0, a: 1 } })}>
      Color Picker
    </div>
  ),
}));

describe('ViewerControls', () => {
  const mockSetOrbit = vi.fn((update) => {
      if (typeof update === 'function') {
          update({ radius: 100, theta: 0, phi: 0, target: [0, 0, 0] });
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

  const defaultProps = {
    isPlaying: true,
    onPlayPause: mockOnPlayPause,
    orbit: { radius: 100, theta: 0, phi: 0, target: [0, 0, 0] as vec3 },
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders playback controls when hasPlayback is true', () => {
    render(<ViewerControls {...defaultProps} />);
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText(/Speed:/)).toBeInTheDocument();
  });

  it('does not render playback controls when hasPlayback is false', () => {
    render(<ViewerControls {...defaultProps} hasPlayback={false} />);
    expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    expect(screen.queryByText(/Speed:/)).not.toBeInTheDocument();
  });

  it('toggles play/pause button text based on isPlaying', () => {
    const { rerender } = render(<ViewerControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByText('Pause')).toBeInTheDocument();

    rerender(<ViewerControls {...defaultProps} isPlaying={false} />);
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('calls onPlayPause when play/pause button is clicked', () => {
    render(<ViewerControls {...defaultProps} />);
    fireEvent.click(screen.getByText('Pause'));
    expect(mockOnPlayPause).toHaveBeenCalledTimes(1);
  });

  it('updates speed when range input changes', () => {
    render(<ViewerControls {...defaultProps} />);
    const slider = screen.getByRole('slider'); // range input
    fireEvent.change(slider, { target: { value: '2.0' } });
    expect(mockSetSpeed).toHaveBeenCalledWith(2.0);
  });

  it('renders camera controls when showCameraControls is true', () => {
    render(<ViewerControls {...defaultProps} showCameraControls={true} />);
    expect(screen.getByText('Reset Cam')).toBeInTheDocument();
    expect(screen.getAllByText('▲')).toHaveLength(2); // Move and Rotate
  });

  it('does not render camera controls when showCameraControls is false', () => {
    render(<ViewerControls {...defaultProps} showCameraControls={false} />);
    expect(screen.queryByText('Reset Cam')).not.toBeInTheDocument();
  });

  it('calls setOrbit when reset camera button is clicked', () => {
    render(<ViewerControls {...defaultProps} />);
    fireEvent.click(screen.getByText('Reset Cam'));
    expect(mockSetOrbit).toHaveBeenCalledWith(expect.objectContaining({
      radius: 100,
      theta: 0,
      phi: Math.PI / 4,
      target: expect.any(Array),
    }));
  });

  describe('Camera Movement', () => {
    it('handles forward movement (zoom in)', () => {
        render(<ViewerControls {...defaultProps} />);
        // First ▲ is forward/up move
        const buttons = screen.getAllByText('▲');
        fireEvent.click(buttons[0]);
        expect(mockSetOrbit).toHaveBeenCalled();
    });

    it('handles backward movement (zoom out)', () => {
        render(<ViewerControls {...defaultProps} />);
        const buttons = screen.getAllByText('▼');
        fireEvent.click(buttons[0]);
        expect(mockSetOrbit).toHaveBeenCalled();
    });

    it('handles left movement (pan left)', () => {
        render(<ViewerControls {...defaultProps} />);
        const buttons = screen.getAllByText('◀');
        fireEvent.click(buttons[0]);
        expect(mockSetOrbit).toHaveBeenCalled();
    });

    it('handles right movement (pan right)', () => {
        render(<ViewerControls {...defaultProps} />);
        const buttons = screen.getAllByText('▶');
        fireEvent.click(buttons[0]);
        expect(mockSetOrbit).toHaveBeenCalled();
    });
  });

  describe('Camera Rotation', () => {
      it('handles left rotation', () => {
          render(<ViewerControls {...defaultProps} />);
          const buttons = screen.getAllByText('◀');
          fireEvent.click(buttons[1]); // Second is rotate
          expect(mockSetOrbit).toHaveBeenCalled();
      });

       it('handles right rotation', () => {
          render(<ViewerControls {...defaultProps} />);
          const buttons = screen.getAllByText('▶');
          fireEvent.click(buttons[1]);
          expect(mockSetOrbit).toHaveBeenCalled();
      });

      it('handles up rotation', () => {
          render(<ViewerControls {...defaultProps} />);
          const buttons = screen.getAllByText('▲');
          fireEvent.click(buttons[1]);
          expect(mockSetOrbit).toHaveBeenCalled();
      });

      it('handles down rotation', () => {
          render(<ViewerControls {...defaultProps} />);
          const buttons = screen.getAllByText('▼');
          fireEvent.click(buttons[1]);
          expect(mockSetOrbit).toHaveBeenCalled();
      });
  });

  describe('Free Look Camera', () => {
      it('updates free camera position on move', () => {
          render(<ViewerControls {...defaultProps} cameraMode="free" />);
          const buttons = screen.getAllByText('▲');
          fireEvent.click(buttons[0]);
          expect(mockSetFreeCamera).toHaveBeenCalled();
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
        expect(screen.getByText('Textured')).not.toBeDisabled();
    });
  });

  describe('Color Controls', () => {
     it('does not show color picker when in textured mode', () => {
         render(<ViewerControls {...defaultProps} renderMode="textured" />);
         expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();
     });

     it('shows color picker when in wireframe mode', () => {
         render(<ViewerControls {...defaultProps} renderMode="wireframe" />);
         expect(screen.queryByTestId('color-picker')).toBeInTheDocument();
     });

     it('shows color picker when in solid mode', () => {
         render(<ViewerControls {...defaultProps} renderMode="solid" />);
         expect(screen.queryByTestId('color-picker')).toBeInTheDocument();
     });

     it('calls setRenderColor when the color is changed', () => {
         render(<ViewerControls {...defaultProps} renderMode="solid" />);
         const picker = screen.getByTestId('color-picker');
         fireEvent.click(picker);
         expect(mockSetRenderColor).toHaveBeenCalled();
     });
  });

  describe('Debug Mode Controls', () => {
    it('renders debug mode selector', () => {
      render(<ViewerControls {...defaultProps} />);
      expect(screen.getByLabelText('Debug Mode:')).toBeInTheDocument();
    });

    it('calls setDebugMode when changed', () => {
      render(<ViewerControls {...defaultProps} />);
      const select = screen.getByLabelText('Debug Mode:');
      fireEvent.change(select, { target: { value: DebugMode.BoundingBoxes } });
      expect(mockSetDebugMode).toHaveBeenCalledWith(DebugMode.BoundingBoxes);
    });

    it('shows all debug options', () => {
        render(<ViewerControls {...defaultProps} />);
        expect(screen.getByText('None')).toBeInTheDocument();
        expect(screen.getByText('Bounding Boxes')).toBeInTheDocument();
        expect(screen.getByText('Normals')).toBeInTheDocument();
        expect(screen.getByText('PVS Clusters')).toBeInTheDocument();
        expect(screen.getByText('Collision Hulls')).toBeInTheDocument();
        expect(screen.getByText('Lightmaps')).toBeInTheDocument();
    });
  });

  describe('Screenshot Controls', () => {
    it('renders screenshot button when onScreenshot is provided', () => {
      const mockScreenshot = vi.fn();
      render(<ViewerControls {...defaultProps} onScreenshot={mockScreenshot} />);
      expect(screen.getByTitle('Take Screenshot')).toBeInTheDocument();
    });

    it('does not render screenshot button when onScreenshot is not provided', () => {
      render(<ViewerControls {...defaultProps} onScreenshot={undefined} />);
      expect(screen.queryByTitle('Take Screenshot')).not.toBeInTheDocument();
    });

    it('calls onScreenshot when button is clicked', () => {
       const mockScreenshot = vi.fn();
       render(<ViewerControls {...defaultProps} onScreenshot={mockScreenshot} />);
       fireEvent.click(screen.getByTitle('Take Screenshot'));
       expect(mockScreenshot).toHaveBeenCalled();
    });
  });

  describe('Video Recording Controls', () => {
    it('renders record button when onStartRecording and onStopRecording are provided', () => {
      render(<ViewerControls {...defaultProps} onScreenshot={vi.fn()} onStartRecording={vi.fn()} onStopRecording={vi.fn()} />);
      expect(screen.getByText('● Rec')).toBeInTheDocument();
    });

    it('does not render record button if props missing', () => {
       render(<ViewerControls {...defaultProps} onScreenshot={vi.fn()} />);
       expect(screen.queryByText('● Rec')).not.toBeInTheDocument();
    });

    it('calls onStartRecording when clicked and not recording', () => {
        const mockStart = vi.fn();
        render(<ViewerControls {...defaultProps} onScreenshot={vi.fn()} onStartRecording={mockStart} onStopRecording={vi.fn()} isRecording={false} />);
        fireEvent.click(screen.getByText('● Rec'));
        expect(mockStart).toHaveBeenCalled();
    });

    it('shows stop button when isRecording is true', () => {
        render(<ViewerControls {...defaultProps} onScreenshot={vi.fn()} onStartRecording={vi.fn()} onStopRecording={vi.fn()} isRecording={true} />);
        expect(screen.getByText('■')).toBeInTheDocument();
    });

    it('calls onStopRecording when clicked and recording', () => {
        const mockStop = vi.fn();
        render(<ViewerControls {...defaultProps} onScreenshot={vi.fn()} onStartRecording={vi.fn()} onStopRecording={mockStop} isRecording={true} />);
        fireEvent.click(screen.getByTitle('Stop Recording'));
        expect(mockStop).toHaveBeenCalled();
    });

    it('displays elapsed time when recording', () => {
        render(<ViewerControls {...defaultProps} onScreenshot={vi.fn()} onStartRecording={vi.fn()} onStopRecording={vi.fn()} isRecording={true} recordingTime={65} />);
        expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('displays estimated size when recording', () => {
        render(<ViewerControls {...defaultProps} onScreenshot={vi.fn()} onStartRecording={vi.fn()} onStopRecording={vi.fn()} isRecording={true} recordingTime={10} recordingSizeEstimate={1048576} />);
        expect(screen.getByText('1.0 MB')).toBeInTheDocument();
    });

    it('highlights time in yellow if warning limit exceeded', () => {
        render(<ViewerControls {...defaultProps} onScreenshot={vi.fn()} onStartRecording={vi.fn()} onStopRecording={vi.fn()} isRecording={true} recordingTime={61} />);
        const timer = screen.getByText('1:01');
        expect(timer).toHaveStyle('color: yellow');
    });

    it('shows normal time color if below warning limit', () => {
        render(<ViewerControls {...defaultProps} onScreenshot={vi.fn()} onStartRecording={vi.fn()} onStopRecording={vi.fn()} isRecording={true} recordingTime={59} />);
        const timer = screen.getByText('0:59');
        expect(timer).toHaveStyle('color: inherit');
    });
  });
});
