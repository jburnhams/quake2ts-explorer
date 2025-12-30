import React from 'react';
import { render, fireEvent, act, screen, waitFor } from '@testing-library/react';
import { UniversalViewer } from '../../../../src/components/UniversalViewer/UniversalViewer';
import { PakService } from '../../../../src/services/pakService';
import { Md2Adapter } from '../../../../src/components/UniversalViewer/adapters/Md2Adapter';
import * as screenshotService from '../../../../src/services/screenshotService';
import { performanceService } from '../../../../src/services/performanceService';
import { ViewerControls } from '../../../../src/components/UniversalViewer/ViewerControls';
import { createMockWebGL2Context } from '@quake2ts/test-utils';

vi.mock('../../../../src/services/pakService');
vi.mock('@quake2ts/engine', () => ({
  VirtualFileSystem: vi.fn(),
  // Use createMockWebGL2Context from test-utils
  createWebGLContext: vi.fn().mockImplementation(() => {
      const mockContext = createMockWebGL2Context();
      return { gl: mockContext };
  }),
  Camera: vi.fn().mockImplementation(() => ({
      position: [0,0,0],
      angles: [0,0,0],
      viewMatrix: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
      projectionMatrix: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
      updateMatrices: vi.fn()
  })),
}));

vi.mock('../../../../src/components/UniversalViewer/adapters/Md2Adapter');
vi.mock('../../../../src/services/screenshotService');

// Mock PerformanceGraph to avoid canvas issues
vi.mock('../../../../src/components/PerformanceGraph', () => ({
    PerformanceGraph: () => <div data-testid="perf-graph" />
}));

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('UniversalViewer Branch Coverage', () => {
    let mockPakService: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPakService = new PakService();
    });

    it('handles resize events', () => {
        render(<UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} />);

        act(() => {
            global.innerWidth = 1000;
            global.innerHeight = 800;
            fireEvent(window, new Event('resize'));
        });
    });

    it('handles screenshot errors', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (screenshotService.captureScreenshot as vi.Mock).mockRejectedValue(new Error('Capture failed'));

        render(<UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} />);

        // Wait for useEffect to initialize GL context
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await act(async () => {
            fireEvent.keyDown(window, { code: 'F12' });
        });

        await waitFor(() => {
             expect(screenshotService.captureScreenshot).toHaveBeenCalled();
             expect(screen.getByText('Error: Screenshot failed: Capture failed')).toBeInTheDocument();
        });

        consoleErrorSpy.mockRestore();
    });

    it('handles key shortcuts for playback', async () => {
         const mockController = {
             stepForward: vi.fn(),
             stepBackward: vi.fn(),
             seekToTime: vi.fn(),
             getDuration: vi.fn().mockReturnValue(100),
             getCurrentFrame: vi.fn().mockReturnValue(10),
             seekToFrame: vi.fn(),
             getFrameCount: vi.fn().mockReturnValue(1000),
             getDemoEvents: vi.fn().mockReturnValue([]),
         };

         const mockAdapter = {
             load: vi.fn(),
             cleanup: vi.fn(),
             getDemoController: vi.fn().mockReturnValue(mockController),
             hasCameraControl: vi.fn().mockReturnValue(true),
             update: vi.fn(),
             render: vi.fn(),
             play: vi.fn(),
             pause: vi.fn(),
             isPlaying: vi.fn().mockReturnValue(true), // Initially playing
         };

         (Md2Adapter as vi.Mock).mockImplementation(() => mockAdapter);

         render(<UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} showControls={true} />);

         await waitFor(() => expect(mockAdapter.load).toHaveBeenCalled());

         // Pause first by clicking button
         const pauseButton = screen.getByText('Pause');
         fireEvent.click(pauseButton);

         // Arrow Keys
         fireEvent.keyDown(window, { code: 'ArrowRight', shiftKey: false });
         expect(mockController.stepForward).toHaveBeenCalled();

         fireEvent.keyDown(window, { code: 'ArrowLeft', shiftKey: false });
         expect(mockController.stepBackward).toHaveBeenCalled();

         fireEvent.keyDown(window, { code: 'ArrowRight', shiftKey: true });
         expect(mockController.seekToFrame).toHaveBeenCalledWith(20); // 10 + 10

         fireEvent.keyDown(window, { code: 'ArrowLeft', shiftKey: true });
         expect(mockController.seekToFrame).toHaveBeenCalledWith(0); // 10 - 10

         fireEvent.keyDown(window, { code: 'Home' });
         expect(mockController.seekToTime).toHaveBeenCalledWith(0);

         fireEvent.keyDown(window, { code: 'End' });
         expect(mockController.seekToTime).toHaveBeenCalledWith(100);
    });

    it('handles mouse interactions for camera', async () => {
         const mockAdapterInstance = {
             load: vi.fn(),
             cleanup: vi.fn(),
             hasCameraControl: vi.fn().mockReturnValue(false), // Allow orbit
             update: vi.fn(),
             render: vi.fn(),
             pickEntity: vi.fn(),
             setHoveredEntity: vi.fn(),
         };
         (Md2Adapter as vi.Mock).mockImplementation(() => mockAdapterInstance);

         let capturedAdapter: any;
         const onAdapterReady = (adapter: any) => { capturedAdapter = adapter; };

         render(<UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} onAdapterReady={onAdapterReady} />);
         await waitFor(() => expect(capturedAdapter).toBeDefined());
         expect(capturedAdapter).toBe(mockAdapterInstance);

         // Ensure effects have run and listeners are attached
         await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
         });

         const canvas = document.querySelector('canvas')!;

         // Dragging (should not pick)
         fireEvent.mouseDown(canvas, { clientX: 0, clientY: 0, button: 0 });
         fireEvent.mouseMove(window, { clientX: 10, clientY: 10 });
         fireEvent.mouseUp(window);

         // Click (should not pick if dragged)
         fireEvent.click(canvas, { clientX: 10, clientY: 10 });
         expect(mockAdapterInstance.pickEntity).not.toHaveBeenCalled();

         // Clean click
         fireEvent.mouseDown(canvas, { clientX: 20, clientY: 20, button: 0 });
         fireEvent.mouseUp(window);
         fireEvent.click(canvas, { clientX: 20, clientY: 20 });
         expect(mockAdapterInstance.pickEntity).toHaveBeenCalled();

         // Hover
         fireEvent.mouseMove(canvas, { clientX: 25, clientY: 25 });
         expect(mockAdapterInstance.pickEntity).toHaveBeenCalledTimes(2);
    });

    it('updates stats loop', async () => {
         vi.useFakeTimers();
         const mockAdapter = {
             load: vi.fn(),
             cleanup: vi.fn(),
             update: vi.fn(),
             render: vi.fn(),
             getStatistics: vi.fn().mockReturnValue({
                 cpuFrameTimeMs: 1,
                 drawCalls: 10,
                 triangles: 100,
                 vertices: 300,
                 textureBinds: 2,
                 visibleSurfaces: 50
             }),
             setSpeed: vi.fn(),
         };
         (Md2Adapter as vi.Mock).mockImplementation(() => mockAdapter);

         render(<UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} showControls={true} />);
         await waitFor(() => expect(mockAdapter.load).toHaveBeenCalled());

         const statsLabel = screen.getByText('Show Performance Stats');
         fireEvent.click(statsLabel);

         // Advance time significantly
         act(() => {
             vi.advanceTimersByTime(1000);
         });

         expect(screen.getByText('FPS')).toBeInTheDocument();

         vi.useRealTimers();
    });
});
