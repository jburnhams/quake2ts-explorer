import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { PakService } from '@/src/services/pakService';
import * as screenshotService from '@/src/services/screenshotService';
import { createWebGLContext } from '@quake2ts/engine';
import { Md2Adapter } from '@/src/components/UniversalViewer/adapters/Md2Adapter';
import { createMockWebGL2Context } from '@quake2ts/test-utils';

// Mock dependencies
vi.mock('@quake2ts/engine', () => ({
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

// Mock ViewerControls to ensure it renders and we can find the button
vi.mock('@/src/components/UniversalViewer/ViewerControls', () => {
    return {
        ViewerControls: ({ onScreenshot }: { onScreenshot: () => void }) => (
            <button data-testid="screenshot-btn" onClick={onScreenshot}>Screenshot</button>
        )
    };
});

describe('Screenshot Integration', () => {
  let mockPakService: PakService;
  let mockGl: any;
  let mockMd2Adapter: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPakService = {} as PakService;

    // Use test-utils for WebGL mock
    mockGl = createMockWebGL2Context();
    // Add canvas mock that is missing in the return type but present in implementation/needed
    mockGl.canvas = {
        width: 800,
        height: 600,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        style: {},
    };

    (createWebGLContext as vi.Mock).mockReturnValue({ gl: mockGl });

    mockMd2Adapter = {
      load: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      update: vi.fn(),
      cleanup: vi.fn(),
      setRenderOptions: vi.fn(),
      setDebugMode: vi.fn(),
    };
    (Md2Adapter as vi.Mock).mockImplementation(() => mockMd2Adapter);

    // Mock screenshot service
    (screenshotService.captureScreenshot as vi.Mock).mockResolvedValue(new Blob(['test'], { type: 'image/png' }));
    (screenshotService.generateScreenshotFilename as vi.Mock).mockReturnValue('screenshot.png');
    (screenshotService.downloadScreenshot as vi.Mock).mockImplementation(() => {});
  });

  it('should trigger screenshot capture and download when button is clicked', async () => {
    await act(async () => {
      render(
        <UniversalViewer
          parsedFile={{ type: 'md2', name: 'tris.md2', data: new ArrayBuffer(0) }}
          pakService={mockPakService}
        />
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

    // Now that the modal is open, we need to click the capture button in the modal
    // However, since we are mocking ViewerControls, the modal opening logic in UniversalViewer might not be triggered
    // if ViewerControls just calls onScreenshot prop directly.
    // In UniversalViewer, onScreenshot sets showScreenshotSettings(true).
    // The ScreenshotSettings component is rendered by UniversalViewer, NOT ViewerControls.
    // So we need to interact with ScreenshotSettings.

    // ScreenshotSettings is rendered by UniversalViewer when showScreenshotSettings is true.
    // We need to verify that ScreenshotSettings appears.

    const captureBtn = await screen.findByText('Capture');
    await act(async () => {
        fireEvent.click(captureBtn);
    });

    await waitFor(() => {
        expect(screenshotService.captureScreenshot).toHaveBeenCalled();
        expect(screenshotService.generateScreenshotFilename).toHaveBeenCalled();
        expect(screenshotService.downloadScreenshot).toHaveBeenCalled();
    });
  });

  it('should handle screenshot errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (screenshotService.captureScreenshot as vi.Mock).mockRejectedValue(new Error('Capture failed'));

    await act(async () => {
      render(
        <UniversalViewer
          parsedFile={{ type: 'md2', name: 'tris.md2', data: new ArrayBuffer(0) }}
          pakService={mockPakService}
        />
      );
    });

    const screenshotBtn = screen.getByTestId('screenshot-btn');

    await act(async () => {
        fireEvent.click(screenshotBtn);
    });

    const captureBtn = await screen.findByText('Capture');
    await act(async () => {
        fireEvent.click(captureBtn);
    });

    await waitFor(() => {
        expect(screen.getByText('Error: Screenshot failed: Capture failed')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
