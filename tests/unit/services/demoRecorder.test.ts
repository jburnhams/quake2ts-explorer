// tests/unit/services/demoRecorder.test.ts
import { demoRecorderService } from '../../../src/services/demoRecorder';
import { demoStorageService } from '../../../src/services/demoStorageService';
import { DemoRecorder } from '@quake2ts/engine';

const mockRecordMessage = vi.fn();
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn().mockReturnValue(new Uint8Array([1, 2, 3]));
const mockGetIsRecording = vi.fn().mockReturnValue(true);

vi.mock('@quake2ts/engine', () => {
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
  beforeEach(async () => {
    vi.clearAllMocks();
    // Stop any existing recording to reset state
    if (demoRecorderService.isRecording()) {
       // Mock engine recorder might return true for isRecording if we don't clear it
       // But demoRecorderService tracks its own instance.
       // We force stop to clear the internal 'recorder' instance in the service.
       // However, since we mock getIsRecording to ALWAYS return true in the mock engine,
       // the service.isRecording() might return true if it has a recorder instance.
       // We need to ensure startRecording resets or we manually reset via stopRecording.

       // Force stop (ignore warnings/returns)
       try {
         await demoRecorderService.stopRecording();
       } catch (e) {}
    }

    // Also reset mock behavior if needed
    mockGetIsRecording.mockReturnValue(true);
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

      // We need to ensure the service thinks it stopped.
      // But our mockGetIsRecording returns true always for the mock instance?
      // No, once stopRecording is called on service, it sets this.recorder = null.
      // So service.isRecording() should return false (check: return this.recorder ? ... : false).
      expect(demoRecorderService.isRecording()).toBe(false);
  });

  it('records messages', () => {
      demoRecorderService.startRecording('test.dm2');
      const msg = new Uint8Array([10, 20]);

      demoRecorderService.recordMessage(msg);
      expect(mockRecordMessage).toHaveBeenCalledWith(msg);
  });
});
