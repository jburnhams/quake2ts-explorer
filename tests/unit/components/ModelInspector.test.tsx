import { render, screen, fireEvent, act } from '@testing-library/react';
import { ModelInspector } from '../../../src/components/ModelInspector';
import { ParsedFile } from '../../../src/services/pakService';
import { ViewerAdapter } from '../../../src/components/UniversalViewer/adapters/types';
import React from 'react';

// Mock UniversalViewer
jest.mock('../../../src/components/UniversalViewer/UniversalViewer', () => ({
  UniversalViewer: ({ onAdapterReady }: any) => {
    if (onAdapterReady) {
       (global as any).lastOnAdapterReady = onAdapterReady;
    }
    return <div data-testid="universal-viewer" />;
  },
}));

describe('ModelInspector', () => {
  let pakServiceMock: any;
  let adapterMock: Partial<ViewerAdapter>;

  beforeEach(() => {
    pakServiceMock = {};
    adapterMock = {
      getAnimations: jest.fn().mockReturnValue([
        { name: 'idle', firstFrame: 0, lastFrame: 10, fps: 10 },
        { name: 'run', firstFrame: 11, lastFrame: 20, fps: 10 },
      ]),
      setAnimation: jest.fn(),
      getFrameInfo: jest.fn().mockReturnValue({ currentFrame: 0, totalFrames: 21, interpolatedFrame: 0 }),
      seekFrame: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      isPlaying: jest.fn().mockReturnValue(true),
    };
    (global as any).lastOnAdapterReady = null;
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
        return 1;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders and initializes adapter', () => {
    const parsedFile: ParsedFile = { type: 'md2', model: {} as any, animations: [] };
    render(<ModelInspector parsedFile={parsedFile} pakService={pakServiceMock} filePath="test.md2" />);

    expect(screen.getByTestId('universal-viewer')).toBeInTheDocument();

    // Trigger adapter ready
    act(() => {
      if ((global as any).lastOnAdapterReady) {
        (global as any).lastOnAdapterReady(adapterMock);
      }
    });

    // Check animations loaded
    expect(screen.getAllByText('idle')[0]).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('(11f)'))).toBeInTheDocument(); // idle has 11 frames (0-10)
    expect(adapterMock.getAnimations).toHaveBeenCalled();
  });

  it('selects animation', () => {
    const parsedFile: ParsedFile = { type: 'md2', model: {} as any, animations: [] };
    render(<ModelInspector parsedFile={parsedFile} pakService={pakServiceMock} filePath="test.md2" />);

    act(() => {
      if ((global as any).lastOnAdapterReady) {
        (global as any).lastOnAdapterReady(adapterMock);
      }
    });

    fireEvent.click(screen.getByText('run'));
    expect(adapterMock.setAnimation).toHaveBeenCalledWith('run');
  });

  it('scrubs timeline', () => {
    const parsedFile: ParsedFile = { type: 'md2', model: {} as any, animations: [] };
    render(<ModelInspector parsedFile={parsedFile} pakService={pakServiceMock} filePath="test.md2" />);

    act(() => {
      if ((global as any).lastOnAdapterReady) {
        (global as any).lastOnAdapterReady(adapterMock);
      }
    });

    const range = screen.getByRole('slider'); // input type=range
    fireEvent.change(range, { target: { value: '5' } });

    expect(adapterMock.pause).toHaveBeenCalled();
    expect(adapterMock.seekFrame).toHaveBeenCalledWith(5);
  });

  it('toggles play/pause', () => {
      const parsedFile: ParsedFile = { type: 'md2', model: {} as any, animations: [] };
      render(<ModelInspector parsedFile={parsedFile} pakService={pakServiceMock} filePath="test.md2" />);

      act(() => {
        if ((global as any).lastOnAdapterReady) {
          (global as any).lastOnAdapterReady(adapterMock);
        }
      });

      const button = screen.getByText('Pause'); // Starts playing by default
      fireEvent.click(button);

      expect(adapterMock.pause).toHaveBeenCalled();
      expect(screen.getByText('Play')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Play'));
      expect(adapterMock.play).toHaveBeenCalled();
  });
});
