// tests/unit/services/demoRecorder.test.ts
import { demoRecorderService } from '../../../src/services/demoRecorder';
import { demoStorageService } from '../../../src/services/demoStorageService';
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

// Mock demoStorageService
jest.mock('../../../src/services/demoStorageService', () => ({
  demoStorageService: {
    saveDemo: jest.fn().mockResolvedValue('demo-id')
  }
}));

describe('DemoRecorderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
