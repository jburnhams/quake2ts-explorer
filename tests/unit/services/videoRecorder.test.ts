import { videoRecorderService } from '../../../src/services/videoRecorder';

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  stream: MediaStream;
  mimeType: string;
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(stream: MediaStream, options: any) {
    this.stream = stream;
    this.mimeType = options.mimeType || '';
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }

  // Helper for tests to simulate data
  emitData(data: Blob) {
    if (this.ondataavailable) {
      // Mock BlobEvent since it's not in JSDOM environment by default
      const event = new Event('dataavailable');
      (event as any).data = data;
      this.ondataavailable(event as any);
    }
  }

  // Helper for tests to simulate error
  emitError(error: Error) {
      if (this.onerror) {
          const event = new Event('error');
          (event as any).error = error;
          this.onerror(event);
      }
  }
}

global.MediaRecorder = MockMediaRecorder as any;
(global.MediaRecorder as any).isTypeSupported = jest.fn().mockReturnValue(true);

describe('VideoRecorderService', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockStream: MediaStream;

  beforeEach(() => {
    // Reset service state (it's a singleton)
    (videoRecorderService as any).mediaRecorder = null;
    (videoRecorderService as any).chunks = [];
    (videoRecorderService as any).isRecordingState = false;

    mockStream = {
      getTracks: () => [],
    } as unknown as MediaStream;

    mockCanvas = {
      captureStream: jest.fn().mockReturnValue(mockStream),
    } as unknown as HTMLCanvasElement;
  });

  it('starts recording successfully', () => {
    videoRecorderService.startRecording(mockCanvas);
    expect(videoRecorderService.isRecording()).toBe(true);
    expect(mockCanvas.captureStream).toHaveBeenCalledWith(30); // Default FPS
  });

  it('collects data chunks', () => {
    videoRecorderService.startRecording(mockCanvas);
    const recorder = (videoRecorderService as any).mediaRecorder as MockMediaRecorder;

    const chunk1 = new Blob(['data1'], { type: 'video/webm' });
    const chunk2 = new Blob(['data2'], { type: 'video/webm' });

    recorder.emitData(chunk1);
    recorder.emitData(chunk2);

    expect((videoRecorderService as any).chunks).toHaveLength(2);
  });

  it('stops recording and returns blob', async () => {
    videoRecorderService.startRecording(mockCanvas);
    const recorder = (videoRecorderService as any).mediaRecorder as MockMediaRecorder;

    // Emit some data
    recorder.emitData(new Blob(['video data'], { type: 'video/webm' }));

    const stopPromise = videoRecorderService.stopRecording();

    // stopRecording calls recorder.stop(), which triggers onstop in our mock immediately
    // but in reality it's async event based. Our mock calls onstop synchronously in stop().
    // So the promise should resolve.

    const blob = await stopPromise;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('video/webm;codecs=vp9');
    expect(videoRecorderService.isRecording()).toBe(false);
  });

  it('throws error if stop called without start', async () => {
      await expect(videoRecorderService.stopRecording()).rejects.toThrow('No active recording');
  });

  it('handles recording errors', () => {
      // Setup error handling test if needed
  });
});
