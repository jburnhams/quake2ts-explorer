import React from 'react';
import { render, fireEvent, act, screen, waitFor } from '@testing-library/react';
import { UniversalViewer } from '../../../../src/components/UniversalViewer/UniversalViewer';
import { PakService } from '../../../../src/services/pakService';
import { Md2Adapter } from '../../../../src/components/UniversalViewer/adapters/Md2Adapter';
import { MapEditorProvider } from '../../../../src/context/MapEditorContext';
import * as screenshotService from '../../../../src/services/screenshotService';
import { performanceService } from '../../../../src/services/performanceService';
import { ViewerControls } from '../../../../src/components/UniversalViewer/ViewerControls';

jest.mock('../../../../src/services/pakService');
jest.mock('quake2ts/engine', () => ({
  createWebGLContext: jest.fn().mockReturnValue({ gl: {
      viewport: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
      enable: jest.fn(),
      createShader: jest.fn(),
      createProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      getAttribLocation: jest.fn(),
      vertexAttribPointer: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      useProgram: jest.fn(),
  } }),
  Camera: jest.fn().mockImplementation(() => ({
      position: [0,0,0],
      angles: [0,0,0],
      viewMatrix: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
      projectionMatrix: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
      updateMatrices: jest.fn()
  })),
}));

jest.mock('../../../../src/components/UniversalViewer/adapters/Md2Adapter');
jest.mock('../../../../src/services/screenshotService');

// Mock PerformanceGraph to avoid canvas issues
jest.mock('../../../../src/components/PerformanceGraph', () => ({
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
        jest.clearAllMocks();
        mockPakService = new PakService();
    });

    it('handles resize events', () => {
        render(
            <MapEditorProvider>
                <UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} />
            </MapEditorProvider>
        );

        act(() => {
            global.innerWidth = 1000;
            global.innerHeight = 800;
            fireEvent(window, new Event('resize'));
        });
    });

    it('handles screenshot errors', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (screenshotService.captureScreenshot as jest.Mock).mockRejectedValue(new Error('Capture failed'));

        render(
            <MapEditorProvider>
                <UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} />
            </MapEditorProvider>
        );

        fireEvent.keyDown(window, { code: 'F12' });

        await waitFor(() => {
             expect(screen.getByText('Error: Screenshot failed: Capture failed')).toBeInTheDocument();
        });

        consoleErrorSpy.mockRestore();
    });

    it('handles key shortcuts for playback', async () => {
         const mockController = {
             stepForward: jest.fn(),
             stepBackward: jest.fn(),
             seekToTime: jest.fn(),
             getDuration: jest.fn().mockReturnValue(100),
             getCurrentFrame: jest.fn().mockReturnValue(10),
             seekToFrame: jest.fn(),
             getFrameCount: jest.fn().mockReturnValue(1000),
             getDemoEvents: jest.fn().mockReturnValue([]),
         };

         const mockAdapter = {
             load: jest.fn(),
             cleanup: jest.fn(),
             getDemoController: jest.fn().mockReturnValue(mockController),
             hasCameraControl: jest.fn().mockReturnValue(true),
             update: jest.fn(),
             render: jest.fn(),
             play: jest.fn(),
             pause: jest.fn(),
             isPlaying: jest.fn().mockReturnValue(true), // Initially playing
         };

         (Md2Adapter as jest.Mock).mockImplementation(() => mockAdapter);

         render(
            <MapEditorProvider>
                <UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} showControls={true} />
            </MapEditorProvider>
         );

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
             load: jest.fn(),
             cleanup: jest.fn(),
             hasCameraControl: jest.fn().mockReturnValue(false), // Allow orbit
             update: jest.fn(),
             render: jest.fn(),
             pickEntity: jest.fn(),
             setHoveredEntity: jest.fn(),
         };
         (Md2Adapter as jest.Mock).mockImplementation(() => mockAdapterInstance);

         let capturedAdapter: any;
         const onAdapterReady = (adapter: any) => { capturedAdapter = adapter; };

         render(
            <MapEditorProvider>
                <UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} onAdapterReady={onAdapterReady} />
            </MapEditorProvider>
         );
         await waitFor(() => expect(capturedAdapter).toBeDefined());
         expect(capturedAdapter).toBe(mockAdapterInstance);

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
         jest.useFakeTimers();
         const mockAdapter = {
             load: jest.fn(),
             cleanup: jest.fn(),
             update: jest.fn(),
             render: jest.fn(),
             getStatistics: jest.fn().mockReturnValue({
                 cpuFrameTimeMs: 1,
                 drawCalls: 10,
                 triangles: 100,
                 vertices: 300,
                 textureBinds: 2,
                 visibleSurfaces: 50
             }),
             setSpeed: jest.fn(),
         };
         (Md2Adapter as jest.Mock).mockImplementation(() => mockAdapter);

         render(
            <MapEditorProvider>
                <UniversalViewer parsedFile={{ type: 'md2', model: {} } as any} pakService={mockPakService} showControls={true} />
            </MapEditorProvider>
         );
         await waitFor(() => expect(mockAdapter.load).toHaveBeenCalled());

         const statsLabel = screen.getByText('Show Performance Stats');
         fireEvent.click(statsLabel);

         // Advance time significantly
         act(() => {
             jest.advanceTimersByTime(1000);
         });

         expect(screen.getByText('FPS')).toBeInTheDocument();

         jest.useRealTimers();
    });
});
