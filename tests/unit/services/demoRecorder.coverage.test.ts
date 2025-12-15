
import { demoRecorderService } from '@/src/services/demoRecorder';
import { DemoRecorder } from 'quake2ts/engine';

// Mock DemoRecorder
jest.mock('quake2ts/engine', () => {
    return {
        DemoRecorder: jest.fn().mockImplementation(() => ({
            startRecording: jest.fn(),
            stopRecording: jest.fn().mockReturnValue(new Uint8Array(10)),
            getIsRecording: jest.fn().mockReturnValue(true),
            recordMessage: jest.fn()
        }))
    };
});

describe('DemoRecorderService Coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset singleton if possible, or just re-use.
        // It's a singleton, so we need to be careful with state.
        // If it's already recording, stop it.
        if (demoRecorderService.isRecording()) {
            demoRecorderService.stopRecording();
        }
    });

    it('should start recording', () => {
        demoRecorderService.startRecording('test.dm2');
        expect(DemoRecorder).toHaveBeenCalled();
        expect(demoRecorderService.isRecording()).toBe(true);
    });

    it('should stop recording', () => {
        demoRecorderService.startRecording('test.dm2');
        const data = demoRecorderService.stopRecording();
        expect(data).toBeDefined();
        // Mock getIsRecording relies on the internal instance which is nulled on stop.
        // So checking isRecording() should return false (via the check `this.recorder ? ... : false`)
        expect(demoRecorderService.isRecording()).toBe(false);
    });

    it('should prevent double start', () => {
        demoRecorderService.startRecording('test.dm2');
        const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        demoRecorderService.startRecording('test2.dm2');
        expect(spy).toHaveBeenCalledWith('Already recording demo');
        spy.mockRestore();
    });

    it('should record message', () => {
        demoRecorderService.startRecording('test.dm2');
        // Access internal recorder
        const recorder = (demoRecorderService as any).recorder;

        demoRecorderService.recordMessage(new Uint8Array([1]));
        expect(recorder.recordMessage).toHaveBeenCalled();
    });
});
