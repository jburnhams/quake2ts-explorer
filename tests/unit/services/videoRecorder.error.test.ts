import { videoRecorderService } from '@/src/services/videoRecorder';


describe('VideoRecorderService Errors', () => {
    let mockCanvas: HTMLCanvasElement;

    beforeEach(() => {
        mockCanvas = document.createElement('canvas');
        mockCanvas.captureStream = vi.fn() as any;
        (global as any).MediaRecorder = vi.fn().mockImplementation(() => ({
            start: vi.fn(),
            stop: vi.fn(),
            state: 'inactive',
            ondataavailable: null,
            onstop: null,
            onerror: null
        }));
        (global as any).MediaRecorder.isTypeSupported = vi.fn(() => true);
    });

    afterEach(() => {
        videoRecorderService.forceStop();
    });

    it('should handle startRecording errors', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (mockCanvas.captureStream as vi.Mock).mockImplementation(() => {
            throw new Error('Stream capture failed');
        });

        expect(() => {
            videoRecorderService.startRecording(mockCanvas);
        }).toThrow('Failed to start recording: Stream capture failed');
        expect(spy).toHaveBeenCalled();
    });

    it('should handle forceStop error', () => {
        (global as any).MediaRecorder.mockImplementation(() => ({
            start: vi.fn(),
            stop: vi.fn().mockImplementation(() => { throw new Error('Stop failed'); }),
            state: 'recording',
            ondataavailable: null,
            onstop: null,
            onerror: null
        }));

        videoRecorderService.startRecording(mockCanvas);

        expect(() => {
            videoRecorderService.forceStop();
        }).not.toThrow();

        expect(videoRecorderService.isRecording()).toBe(false);
    });
});
