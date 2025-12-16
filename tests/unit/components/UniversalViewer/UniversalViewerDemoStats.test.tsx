
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { PakService } from '@/src/services/pakService';
import { Dm2Adapter } from '@/src/components/UniversalViewer/adapters/Dm2Adapter';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/src/components/UniversalViewer/adapters/Dm2Adapter');
jest.mock('@/src/services/pakService');
jest.mock('@/src/components/DemoStats', () => ({
  DemoStats: ({ visible }: { visible: boolean }) => visible ? <div data-testid="demo-stats">Demo Stats Overlay</div> : null
}));

// Mock WebGL
const mockGl = {
  getExtension: jest.fn(),
  getParameter: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn(() => true),
  createProgram: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  useProgram: jest.fn(),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  createVertexArray: jest.fn(),
  bindVertexArray: jest.fn(),
  drawElements: jest.fn(),
  viewport: jest.fn(),
  clearColor: jest.fn(),
  clear: jest.fn(),
  enable: jest.fn(),
  blendFunc: jest.fn(),
  depthFunc: jest.fn(),
  cullFace: jest.fn(),
  blendFuncSeparate: jest.fn(), // Added missing function
  createTexture: jest.fn(),
  bindTexture: jest.fn(),
  texImage2D: jest.fn(),
  texParameteri: jest.fn(),
  activeTexture: jest.fn(),
  uniform1i: jest.fn(),
  uniform1f: jest.fn(),
  uniform3fv: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  getUniformLocation: jest.fn(),
  getAttribLocation: jest.fn(),
} as unknown as WebGL2RenderingContext;

describe('UniversalViewer Demo Stats Integration', () => {
  let pakService: PakService;

  beforeAll(() => {
    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
        if (contextId === 'webgl2') return mockGl;
        return null;
    }) as any;
  });

  beforeEach(() => {
    pakService = new PakService();
    jest.clearAllMocks();
  });

  it('renders DemoStats when S key is pressed during demo playback', async () => {
    const mockController = {
        getCurrentFrame: jest.fn(() => 0),
        getFrameCount: jest.fn(() => 100),
        getCurrentTime: jest.fn(() => 0),
        getDuration: jest.fn(() => 10),
        isPlaying: jest.fn(() => true),
        play: jest.fn(),
        pause: jest.fn(),
        seekToFrame: jest.fn(),
        seekToTime: jest.fn(),
        timeToFrame: jest.fn(),
        getDemoStatistics: jest.fn(),
        getPlayerStatistics: jest.fn(),
        getFrameData: jest.fn(),
    };

    // Setup adapter mock to return controller
    (Dm2Adapter as jest.Mock).mockImplementation(() => ({
      load: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn(),
      update: jest.fn(),
      render: jest.fn(),
      getDemoController: jest.fn(() => mockController),
      hasCameraControl: jest.fn(() => true),
      setCameraMode: jest.fn(),
      isPlaying: jest.fn(() => true),
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
