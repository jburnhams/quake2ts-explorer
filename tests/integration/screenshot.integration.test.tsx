import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { PakService } from '@/src/services/pakService';
import { MapEditorProvider } from '@/src/context/MapEditorContext';
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

// Mock ViewerControls to ensure it renders and we can find the button
jest.mock('@/src/components/UniversalViewer/ViewerControls', () => {
    return {
        ViewerControls: ({ onScreenshot }: { onScreenshot: () => void }) => (
            <button data-testid="screenshot-btn" onClick={onScreenshot}>Screenshot</button>
        )
    };
});

describe('Screenshot Integration', () => {
  let mockPakService: PakService;
  let mockGlContext: any;
  let mockMd2Adapter: any;

  beforeEach(() => {
    jest.clearAllMocks();

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
    };
    (Md2Adapter as jest.Mock).mockImplementation(() => mockMd2Adapter);

    // Mock screenshot service
    (screenshotService.captureScreenshot as jest.Mock).mockResolvedValue(new Blob(['test'], { type: 'image/png' }));
    (screenshotService.generateScreenshotFilename as jest.Mock).mockReturnValue('screenshot.png');
    (screenshotService.downloadScreenshot as jest.Mock).mockImplementation(() => {});
  });

  it('should trigger screenshot capture and download when button is clicked', async () => {
    await act(async () => {
      render(
        <MapEditorProvider>
          <UniversalViewer
            parsedFile={{ type: 'md2', name: 'tris.md2', data: new ArrayBuffer(0) }}
            pakService={mockPakService}
          />
        </MapEditorProvider>
      );
    });

    // Wait for adapter to load
    await waitFor(() => {
      expect(mockMd2Adapter.load).toHaveBeenCalled();
    });

    const screenshotBtn = screen.getByTestId('screenshot-btn');

    await act(async () => {
        fireEvent.click(screenshotBtn);
    });

    await waitFor(() => {
        expect(screenshotService.captureScreenshot).toHaveBeenCalled();
        expect(screenshotService.generateScreenshotFilename).toHaveBeenCalled();
        expect(screenshotService.downloadScreenshot).toHaveBeenCalled();
    });
  });

  it('should handle screenshot errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (screenshotService.captureScreenshot as jest.Mock).mockRejectedValue(new Error('Capture failed'));

    await act(async () => {
      render(
        <MapEditorProvider>
          <UniversalViewer
            parsedFile={{ type: 'md2', name: 'tris.md2', data: new ArrayBuffer(0) }}
            pakService={mockPakService}
          />
        </MapEditorProvider>
      );
    });

    const screenshotBtn = screen.getByTestId('screenshot-btn');

    await act(async () => {
        fireEvent.click(screenshotBtn);
    });

    await waitFor(() => {
        expect(screen.getByText('Error: Screenshot failed: Capture failed')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
