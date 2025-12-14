import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { PakService } from '@/src/services/pakService';
import * as screenshotService from '@/src/services/screenshotService';
import { createWebGLContext } from 'quake2ts/engine';
import { Md2Adapter } from '@/src/components/UniversalViewer/adapters/Md2Adapter';

// Mock dependencies
jest.mock('quake2ts/engine', () => ({
  createWebGLContext: jest.fn(),
  Camera: jest.fn().mockImplementation(() => ({
    fov: 60,
    aspect: 1,
    position: [0,0,0],
    angles: [0,0,0],
    updateMatrices: jest.fn(),
  })),
}));

jest.mock('@/src/components/UniversalViewer/adapters/Md2Adapter');
jest.mock('@/src/services/screenshotService');

// Mock DebugRenderer
jest.mock('@/src/components/UniversalViewer/adapters/DebugRenderer', () => {
    return {
        DebugRenderer: jest.fn().mockImplementation(() => ({
            init: jest.fn(),
            render: jest.fn(),
            clear: jest.fn(),
            destroy: jest.fn()
        }))
    };
});

describe('UniversalViewer Screenshot Integration', () => {
  let mockPakService: PakService;
  let mockGlContext: any;
  let mockMd2Adapter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockPakService = {} as PakService;

    mockGlContext = {
      gl: {
        clearColor: jest.fn(),
        clear: jest.fn(),
        enable: jest.fn(),
        viewport: jest.fn(),
        createShader: jest.fn(),
        createProgram: jest.fn(),
      }
    };
    (createWebGLContext as jest.Mock).mockReturnValue(mockGlContext);

    mockMd2Adapter = {
      load: jest.fn().mockResolvedValue(undefined),
      render: jest.fn(),
      update: jest.fn(),
      cleanup: jest.fn(),
      setRenderOptions: jest.fn(),
      setDebugMode: jest.fn(),
      isPlaying: jest.fn().mockReturnValue(true),
    };
    (Md2Adapter as jest.Mock).mockImplementation(() => mockMd2Adapter);

    (screenshotService.captureScreenshot as jest.Mock).mockResolvedValue(new Blob(['test'], { type: 'image/png' }));
    (screenshotService.generateScreenshotFilename as jest.Mock).mockReturnValue('screenshot.png');
    (screenshotService.downloadScreenshot as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
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
      jest.advanceTimersByTime(150);
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
      expect(screenshotService.captureScreenshot).toHaveBeenCalledWith(expect.anything(), { format: 'png', quality: 0.95 });
  });
});
