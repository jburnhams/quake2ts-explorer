import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { PakService } from '@/src/services/pakService';
import { Md2Adapter } from '@/src/components/UniversalViewer/adapters/Md2Adapter';

// Mock dependencies
vi.mock('@/src/components/UniversalViewer/adapters/Md2Adapter');
vi.mock('@/src/services/performanceService', () => ({
  performanceService: {
    createFpsCounter: () => ({
      update: vi.fn(),
      getAverageFps: () => 60,
      getMinFps: () => 58,
      getMaxFps: () => 62,
      reset: vi.fn(),
    }),
    now: () => 1000,
    startMeasure: vi.fn(),
    endMeasure: vi.fn(),
  },
}));

// Mock WebGL context
const mockGl = {
  clearColor: vi.fn(),
  clear: vi.fn(),
  enable: vi.fn(),
  viewport: vi.fn(),
} as unknown as WebGL2RenderingContext;

vi.mock('@quake2ts/engine', () => ({
  createWebGLContext: () => ({ gl: mockGl }),
  Camera: vi.fn().mockImplementation(() => ({
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
      load: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      cleanup: vi.fn(),
      setRenderOptions: vi.fn(),
      setDebugMode: vi.fn(),
      update: vi.fn(),
      getStatistics: vi.fn().mockReturnValue({
        cpuFrameTimeMs: 16,
        drawCalls: 10,
        triangles: 100,
        vertices: 300,
        textureBinds: 2,
        visibleSurfaces: 5,
      }),
    };
    (Md2Adapter as vi.Mock).mockImplementation(() => mockAdapter);
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
