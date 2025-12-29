
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { PakService } from '@/src/services/pakService';
import { Dm2Adapter } from '@/src/components/UniversalViewer/adapters/Dm2Adapter';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('@/src/components/UniversalViewer/adapters/Dm2Adapter');
vi.mock('@/src/services/pakService');
vi.mock('@/src/components/DemoStats', () => ({
  DemoStats: ({ visible }: { visible: boolean }) => visible ? <div data-testid="demo-stats">Demo Stats Overlay</div> : null
}));

// Mock PostProcessor
vi.mock('@/src/utils/postProcessing', () => {
  return {
    PostProcessor: vi.fn().mockImplementation(() => ({
      init: vi.fn(),
      resize: vi.fn(),
      render: vi.fn(),
      bind: vi.fn(),
      unbind: vi.fn(),
      cleanup: vi.fn()
    })),
    defaultPostProcessOptions: { enabled: false }
  };
});

// Mock WebGL
const mockGl = {
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn(() => true),
  useProgram: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  createVertexArray: vi.fn(),
  bindVertexArray: vi.fn(),
  drawElements: vi.fn(),
  viewport: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  enable: vi.fn(),
  blendFunc: vi.fn(),
  depthFunc: vi.fn(),
  cullFace: vi.fn(),
  blendFuncSeparate: vi.fn(), // Added missing function
  createTexture: vi.fn(),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  activeTexture: vi.fn(),
  uniform1i: vi.fn(),
  uniform1f: vi.fn(),
  uniform3fv: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  getUniformLocation: vi.fn(),
  getAttribLocation: vi.fn(),
} as unknown as WebGL2RenderingContext;

describe('UniversalViewer Demo Stats Integration', () => {
  let pakService: PakService;

  beforeAll(() => {
    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
        if (contextId === 'webgl2') return mockGl;
        return null;
    }) as any;
  });

  beforeEach(() => {
    pakService = new PakService();
    vi.clearAllMocks();
  });

  it('renders DemoStats when S key is pressed during demo playback', async () => {
    const mockController = {
        getCurrentFrame: vi.fn(() => 0),
        getFrameCount: vi.fn(() => 100),
        getCurrentTime: vi.fn(() => 0),
        getDuration: vi.fn(() => 10),
        isPlaying: vi.fn(() => true),
        play: vi.fn(),
        pause: vi.fn(),
        seekToFrame: vi.fn(),
        seekToTime: vi.fn(),
        timeToFrame: vi.fn(),
        getDemoStatistics: vi.fn(),
        getPlayerStatistics: vi.fn(),
        getFrameData: vi.fn(),
    };

    // Setup adapter mock to return controller
    (Dm2Adapter as vi.Mock).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn(),
      update: vi.fn(),
      render: vi.fn(),
      getDemoController: vi.fn(() => mockController),
      hasCameraControl: vi.fn(() => true),
      setCameraMode: vi.fn(),
      isPlaying: vi.fn(() => true),
    }));

    await act(async () => {
      render(
        <UniversalViewer
          parsedFile={{ type: 'dm2', name: 'test.dm2', path: 'demos/test.dm2', data: new ArrayBuffer(0) } as any}
          pakService={pakService}
          filePath="demos/test.dm2"
        />
      );
    });

    // Should not be visible initially
    expect(screen.queryByTestId('demo-stats')).not.toBeInTheDocument();

    // Press S
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyS' });
    });

    // Should be visible now
    expect(screen.getByTestId('demo-stats')).toBeInTheDocument();

    // Press S again
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyS' });
    });

    // Should be hidden again
    expect(screen.queryByTestId('demo-stats')).not.toBeInTheDocument();
  });
});
