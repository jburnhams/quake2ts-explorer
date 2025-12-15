import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { PakService } from '@/src/services/pakService';
import { Md2Adapter } from '@/src/components/UniversalViewer/adapters/Md2Adapter';
import 'jest-canvas-mock';

// Mock dependencies
jest.mock('@/src/components/UniversalViewer/adapters/Md2Adapter');
jest.mock('@/src/services/performanceService', () => ({
  performanceService: {
    createFpsCounter: () => ({
      update: jest.fn(),
      getAverageFps: () => 60,
      getMinFps: () => 58,
      getMaxFps: () => 62,
      reset: jest.fn(),
    }),
    now: () => 1000,
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
  },
}));

// Mock WebGL context
const mockGl = {
  clearColor: jest.fn(),
  clear: jest.fn(),
  enable: jest.fn(),
  viewport: jest.fn(),
} as unknown as WebGL2RenderingContext;

jest.mock('quake2ts/engine', () => ({
  createWebGLContext: () => ({ gl: mockGl }),
  Camera: jest.fn().mockImplementation(() => ({
    fov: 60,
    aspect: 1,
    position: [0, 0, 0],
    angles: [0, 0, 0],
  })),
}));

describe('PerformanceStats Integration', () => {
  let mockAdapter: any;

  beforeEach(() => {
    mockAdapter = {
      load: jest.fn().mockResolvedValue(undefined),
      render: jest.fn(),
      cleanup: jest.fn(),
      setRenderOptions: jest.fn(),
      setDebugMode: jest.fn(),
      update: jest.fn(),
      getStatistics: jest.fn().mockReturnValue({
        cpuFrameTimeMs: 16,
        drawCalls: 10,
        triangles: 100,
        vertices: 300,
        textureBinds: 2,
        visibleSurfaces: 5,
      }),
    };
    (Md2Adapter as jest.Mock).mockImplementation(() => mockAdapter);
  });

  it('renders performance stats when enabled', async () => {
    const mockParsedFile = { type: 'md2' } as any;
    const mockPakService = {} as PakService;

    await act(async () => {
      render(
        <UniversalViewer
          parsedFile={mockParsedFile}
          pakService={mockPakService}
          showControls={true}
        />
      );
    });

    // Stats are hidden by default
    expect(screen.queryByText('FPS')).not.toBeInTheDocument();

    // Enable stats via controls (checkbox)
    // We need to find the checkbox. It has label "Show Performance Stats"
    const checkbox = screen.getByLabelText('Show Performance Stats');
    expect(checkbox).toBeInTheDocument();

    await act(async () => {
        checkbox.click();
    });

    // Now stats should be visible
    expect(screen.getByText('FPS')).toBeInTheDocument();

    // Since we mocked getStatistics, we should see Rendering section
    // Wait for the update interval (200ms)
    // We can use fake timers to advance time
  });
});
