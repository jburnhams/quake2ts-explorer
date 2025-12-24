import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ModelInspector } from '../../../src/components/ModelInspector';
import { ParsedFile } from '../../../src/services/pakService';
import { ViewerAdapter } from '../../../src/components/UniversalViewer/adapters/types';
import React from 'react';

// Mock UniversalViewer
vi.mock('../../../src/components/UniversalViewer/UniversalViewer', () => ({
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
      getAnimations: vi.fn().mockReturnValue([
        { name: 'idle', firstFrame: 0, lastFrame: 10, fps: 10 },
        { name: 'run', firstFrame: 11, lastFrame: 20, fps: 10 },
      ]),
      setAnimation: vi.fn(),
      getFrameInfo: vi.fn().mockReturnValue({ currentFrame: 0, totalFrames: 21, interpolatedFrame: 0 }),
      seekFrame: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(true),
    };
    (global as any).lastOnAdapterReady = null;
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
        return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders and initializes adapter', () => {
    const parsedFile: ParsedFile = {
        type: 'md2',
        model: { header: { numVertices: 100, numTriangles: 50, numSkins: 1 } } as any,
        animations: []
    };
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
    const parsedFile: ParsedFile = {
        type: 'md2',
        model: { header: { numVertices: 100, numTriangles: 50, numSkins: 1 } } as any,
        animations: []
    };
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
    const parsedFile: ParsedFile = {
        type: 'md2',
        model: { header: { numVertices: 100, numTriangles: 50, numSkins: 1 } } as any,
        animations: []
    };
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
      const parsedFile: ParsedFile = {
          type: 'md2',
          model: { header: { numVertices: 100, numTriangles: 50, numSkins: 1 } } as any,
          animations: []
      };
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

  it('triggers export', () => {
    // Mock URL.createObjectURL and revokeObjectURL
    const mockCreateObjectURL = vi.fn();
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const parsedFile: ParsedFile = {
        type: 'md2',
        model: {
          header: { numVertices: 100, numTriangles: 50, numSkins: 1 },
          frames: [{ name: 'frame1', vertices: [], scale: [1,1,1], translate: [0,0,0] }],
          texCoords: [],
          triangles: []
        } as any,
        animations: []
    };
    render(<ModelInspector parsedFile={parsedFile} pakService={pakServiceMock} filePath="test.md2" />);

    act(() => {
      if ((global as any).lastOnAdapterReady) {
        (global as any).lastOnAdapterReady(adapterMock);
      }
    });

    const exportBtn = screen.getByText('Export');
    fireEvent.click(exportBtn);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });
});
