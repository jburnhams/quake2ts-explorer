import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { videoRecorderService } from '@/src/services/videoRecorder';
import { PakService, ParsedFile } from '@/src/services/pakService';
import { Md2Adapter } from '@/src/components/UniversalViewer/adapters/Md2Adapter';

// Mocks
jest.mock('quake2ts/engine', () => ({
  createWebGLContext: jest.fn(() => ({
    gl: {
      viewport: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
      enable: jest.fn(),
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      getUniformLocation: jest.fn(),
      getAttribLocation: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      createVertexArray: jest.fn(),
      bindVertexArray: jest.fn(),
      getExtension: jest.fn(),
      getParameter: jest.fn(),
      deleteProgram: jest.fn(),
      deleteShader: jest.fn(),
      deleteBuffer: jest.fn(),
      deleteVertexArray: jest.fn(),
    }
  })),
  Camera: jest.fn().mockImplementation(() => ({
    fov: 60,
    aspect: 1,
    updateMatrices: jest.fn(),
    viewMatrix: [],
  })),
}));

jest.mock('@/src/services/videoRecorder', () => ({
  videoRecorderService: {
    startRecording: jest.fn(),
    stopRecording: jest.fn().mockResolvedValue(new Blob(['video'], { type: 'video/webm' })),
    isRecording: jest.fn().mockReturnValue(false),
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();

describe('UniversalViewer Integration - Video Recording', () => {
  const mockPakService = {
    loadPak: jest.fn(),
  } as unknown as PakService;

  const mockParsedFile: ParsedFile = {
    name: 'test.md2',
    type: 'md2',
    data: new ArrayBuffer(0),
    path: 'models/test/test.md2',
  };

  // Mock Md2Adapter load
  const loadMock = jest.spyOn(Md2Adapter.prototype, 'load').mockResolvedValue(undefined);
  const cleanupMock = jest.spyOn(Md2Adapter.prototype, 'cleanup').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows starting and stopping video recording', async () => {
    // 1. Render UniversalViewer
    await act(async () => {
        render(
            <UniversalViewer
                parsedFile={mockParsedFile}
                pakService={mockPakService}
            />
        );
    });

    // Wait for canvas to be present (it might not be role presentation, just look for the canvas element by class or similar)
    // In UniversalViewer, canvas has className="md2-viewer-canvas"
    // And is inside a div with className="md2-canvas-container"

    // We can just verify the controls are there first

    // 2. Find Record Button (ensure Controls are rendered)
    const recordBtn = await screen.findByTitle('Record Video');
    expect(recordBtn).toBeInTheDocument();

    // 3. Click Record
    fireEvent.click(recordBtn);

    // 4. Verify service called
    expect(videoRecorderService.startRecording).toHaveBeenCalled();

    // 5. Update mock to reflect recording state (since we mocked the service methods individually,
    // the component's internal state handles the UI switch, but we can verify startRecording was called)

    // 6. Find Stop Button (UI updates based on local state 'isRecording')
    const stopBtn = await screen.findByTitle('Stop Recording');
    expect(stopBtn).toBeInTheDocument();

    // 7. Click Stop
    await act(async () => {
        fireEvent.click(stopBtn);
    });

    // 8. Verify stop called and download triggered
    expect(videoRecorderService.stopRecording).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    // Check if record button is back
    const recordBtnAgain = await screen.findByTitle('Record Video');
    expect(recordBtnAgain).toBeInTheDocument();
  });
});
