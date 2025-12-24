// tests/unit/services/demoRecorder.test.ts
import { demoRecorderService } from '../../../src/services/demoRecorder';
import { demoStorageService } from '../../../src/services/demoStorageService';
import { DemoRecorder } from 'quake2ts/engine';

const mockRecordMessage = vi.fn();
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn().mockReturnValue(new Uint8Array([1, 2, 3]));
const mockGetIsRecording = vi.fn().mockReturnValue(true);

vi.mock('quake2ts/engine', () => {
    return {
        DemoRecorder: vi.fn().mockImplementation(() => ({
            startRecording: mockStartRecording,
            stopRecording: mockStopRecording,
            getIsRecording: mockGetIsRecording,
            recordMessage: mockRecordMessage
        }))
    };
});

// Mock demoStorageService
vi.mock('../../../src/services/demoStorageService', () => ({
  demoStorageService: {
    saveDemo: vi.fn().mockResolvedValue('demo-id')
  }
}));

describe('DemoRecorderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stop any existing recording to reset state
    // We need to access private state or just ensure we are clean
    // The service is a singleton, so we rely on stopRecording clearing it.
    // However, stopRecording is async now.
  });

  it('starts recording', () => {
      demoRecorderService.startRecording('test.dm2');
      expect(DemoRecorder).toHaveBeenCalled();
      expect(mockStartRecording).toHaveBeenCalledWith('test.dm2', expect.any(Number));
  });

  it('checks isRecording status', () => {
      demoRecorderService.startRecording('test.dm2');
      expect(demoRecorderService.isRecording()).toBe(true);
  });

  it('stops recording and saves data', async () => {
      demoRecorderService.startRecording('test.dm2');
      const data = await demoRecorderService.stopRecording();
      expect(data).toEqual(new Uint8Array([1, 2, 3]));
      expect(mockStopRecording).toHaveBeenCalled();
      expect(demoStorageService.saveDemo).toHaveBeenCalledWith('test.dm2', data);

      expect(demoRecorderService.isRecording()).toBe(false);
  });

  it('records messages', () => {
      demoRecorderService.startRecording('test.dm2');
      const msg = new Uint8Array([10, 20]);

      demoRecorderService.recordMessage(msg);
      expect(mockRecordMessage).toHaveBeenCalledWith(msg);
  });
});
