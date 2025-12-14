// tests/unit/services/demoRecorder.test.ts
import { demoRecorderService } from '../../../src/services/demoRecorder';
import { DemoRecorder } from 'quake2ts/engine';

const mockRecordMessage = jest.fn();
const mockStartRecording = jest.fn();
const mockStopRecording = jest.fn().mockReturnValue(new Uint8Array([1, 2, 3]));
const mockGetIsRecording = jest.fn().mockReturnValue(true);

jest.mock('quake2ts/engine', () => {
    return {
        DemoRecorder: jest.fn().mockImplementation(() => ({
            startRecording: mockStartRecording,
            stopRecording: mockStopRecording,
            getIsRecording: mockGetIsRecording,
            recordMessage: mockRecordMessage
        }))
    };
});

describe('DemoRecorderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Stop any existing recording to reset state
    if (demoRecorderService.isRecording()) {
        demoRecorderService.stopRecording();
    }
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

  it('stops recording and returns data', () => {
      demoRecorderService.startRecording('test.dm2');
      const data = demoRecorderService.stopRecording();
      expect(data).toEqual(new Uint8Array([1, 2, 3]));
      expect(mockStopRecording).toHaveBeenCalled();

      // After stop, the internal recorder is null, so isRecording should return false
      // regardless of what the mock returns (because recorder is null)
      expect(demoRecorderService.isRecording()).toBe(false);
  });

  it('records messages', () => {
      demoRecorderService.startRecording('test.dm2');
      const msg = new Uint8Array([10, 20]);

      demoRecorderService.recordMessage(msg);
      expect(mockRecordMessage).toHaveBeenCalledWith(msg);
  });
});
