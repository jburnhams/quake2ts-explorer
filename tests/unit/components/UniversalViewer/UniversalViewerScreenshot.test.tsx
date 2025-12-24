import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { PakService } from '@/src/services/pakService';
import * as screenshotService from '@/src/services/screenshotService';
import { createWebGLContext } from 'quake2ts/engine';
import { Md2Adapter } from '@/src/components/UniversalViewer/adapters/Md2Adapter';

// Mock dependencies
vi.mock('quake2ts/engine', () => ({
  createWebGLContext: vi.fn(),
  Camera: vi.fn().mockImplementation(() => ({
    fov: 60,
    aspect: 1,
    position: [0,0,0],
    angles: [0,0,0],
    updateMatrices: vi.fn(),
  })),
}));

vi.mock('@/src/components/UniversalViewer/adapters/Md2Adapter');
vi.mock('@/src/services/screenshotService');

// Mock DebugRenderer
vi.mock('@/src/components/UniversalViewer/adapters/DebugRenderer', () => {
    return {
        DebugRenderer: vi.fn().mockImplementation(() => ({
            init: vi.fn(),
            render: vi.fn(),
            clear: vi.fn(),
            destroy: vi.fn()
        }))
    };
});

describe('UniversalViewer Screenshot Integration', () => {
  let mockPakService: PakService;
  let mockGlContext: any;
  let mockMd2Adapter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockPakService = {} as PakService;

    mockGlContext = {
      gl: {
        clearColor: vi.fn(),
        clear: vi.fn(),
        enable: vi.fn(),
        viewport: vi.fn(),
        createShader: vi.fn(),
        createProgram: vi.fn(),
      }
    };
    (createWebGLContext as vi.Mock).mockReturnValue(mockGlContext);

    mockMd2Adapter = {
      load: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      update: vi.fn(),
      cleanup: vi.fn(),
      setRenderOptions: vi.fn(),
      setDebugMode: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(true),
    };
    (Md2Adapter as vi.Mock).mockImplementation(() => mockMd2Adapter);

    (screenshotService.captureScreenshot as vi.Mock).mockResolvedValue(new Blob(['test'], { type: 'image/png' }));
    (screenshotService.generateScreenshotFilename as vi.Mock).mockReturnValue('screenshot.png');
    (screenshotService.downloadScreenshot as vi.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger screenshot on F12 key press', async () => {
    await act(async () => {
      render(
        <UniversalViewer
          parsedFile={{ type: 'md2', name: 'tris.md2', data: new ArrayBuffer(0) }}
          pakService={mockPakService}
        />
      );
    });

    fireEvent.keyDown(window, { code: 'F12' });

    expect(screenshotService.captureScreenshot).toHaveBeenCalledWith(expect.anything(), { format: 'png' });
  });

  it('should trigger screenshot on PrintScreen key press', async () => {
    await act(async () => {
      render(
        <UniversalViewer
          parsedFile={{ type: 'md2', name: 'tris.md2', data: new ArrayBuffer(0) }}
          pakService={mockPakService}
        />
      );
    });

    fireEvent.keyDown(window, { code: 'PrintScreen' });

    expect(screenshotService.captureScreenshot).toHaveBeenCalledWith(expect.anything(), { format: 'png' });
  });

  it('should show flash effect during screenshot', async () => {
    await act(async () => {
      render(
        <UniversalViewer
          parsedFile={{ type: 'md2', name: 'tris.md2', data: new ArrayBuffer(0) }}
          pakService={mockPakService}
        />
      );
    });

    // Initial state: no flash
    expect(screen.queryByTestId('screenshot-flash')).not.toBeInTheDocument();

    // Trigger screenshot
    await act(async () => {
      fireEvent.keyDown(window, { code: 'F12' });
    });

    // Flash should be visible
    expect(screen.getByTestId('screenshot-flash')).toBeInTheDocument();

    // Fast forward timer to remove flash
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    // Flash should be gone
    expect(screen.queryByTestId('screenshot-flash')).not.toBeInTheDocument();
  });

  it('should open settings when screenshot button is clicked', async () => {
    await act(async () => {
        render(
          <UniversalViewer
            parsedFile={{ type: 'md2', name: 'tris.md2', data: new ArrayBuffer(0) }}
            pakService={mockPakService}
          />
        );
      });

      // Find and click the screenshot button
      const screenshotButton = screen.getByTitle('Take Screenshot');
      fireEvent.click(screenshotButton);

      // Settings modal should appear
      expect(screen.getByText('Screenshot Settings')).toBeInTheDocument();

      // Click capture in settings
      const captureButton = screen.getByText('Capture');
      await act(async () => {
        fireEvent.click(captureButton);
      });

      // Should capture with default settings
      expect(screenshotService.captureScreenshot).toHaveBeenCalledWith(expect.anything(), { format: 'png', quality: 0.95, resolutionMultiplier: 1, includeHud: false });
  });

  it('should handle resolution multiplier correctly', async () => {
    // Mock canvas client dimensions
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, value: 600 });
    Object.defineProperty(HTMLCanvasElement.prototype, 'width', { configurable: true, value: 800, writable: true });
    Object.defineProperty(HTMLCanvasElement.prototype, 'height', { configurable: true, value: 600, writable: true });

    await act(async () => {
        render(
          <UniversalViewer
            parsedFile={{ type: 'md2', name: 'tris.md2', data: new ArrayBuffer(0) }}
            pakService={mockPakService}
          />
        );
    });

    // Open settings
    const screenshotButton = screen.getByTitle('Take Screenshot');
    fireEvent.click(screenshotButton);

    // Change resolution multiplier to 2x
    // Use getByRole for better robustness
    const multiplierSelect = screen.getByRole('combobox', { name: /Resolution Multiplier/i });
    fireEvent.change(multiplierSelect, { target: { value: '2' } });

    // Capture
    const captureButton = screen.getByText('Capture');
    await act(async () => {
        fireEvent.click(captureButton);
    });

    // We can't easily inspect the transient state of canvas.width inside the function due to async nature,
    // but we can verify that gl.viewport was called with scaled dimensions.
    // 800 * 2 = 1600, 600 * 2 = 1200
    // Note: The mockGlContext.gl.viewport might need to be spyable.
    expect(mockGlContext.gl.viewport).toHaveBeenCalledWith(0, 0, 1600, 1200);

    // And verify it was restored (last call should be original size or close to it if resize handler fired)
    // Actually, finally block restores it.
    // Let's check capture options
    expect(screenshotService.captureScreenshot).toHaveBeenCalledWith(expect.anything(), { format: 'png', quality: 0.95, resolutionMultiplier: 2, includeHud: false });
  });
});
