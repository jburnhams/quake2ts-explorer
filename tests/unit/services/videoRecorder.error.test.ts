import { videoRecorderService } from '@/src/services/videoRecorder';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('VideoRecorderService Errors', () => {
    let mockCanvas: HTMLCanvasElement;

    beforeEach(() => {
        mockCanvas = document.createElement('canvas');
        mockCanvas.captureStream = jest.fn() as any;
        (global as any).MediaRecorder = jest.fn().mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            state: 'inactive',
            ondataavailable: null,
            onstop: null,
            onerror: null
        }));
        (global as any).MediaRecorder.isTypeSupported = jest.fn(() => true);
    });

    afterEach(() => {
        videoRecorderService.forceStop();
    });

    it('should handle startRecording errors', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (mockCanvas.captureStream as jest.Mock).mockImplementation(() => {
            throw new Error('Stream capture failed');
        });

        expect(() => {
            videoRecorderService.startRecording(mockCanvas);
        }).toThrow('Failed to start recording: Stream capture failed');
        expect(spy).toHaveBeenCalled();
    });

    it('should handle forceStop error', () => {
        (global as any).MediaRecorder.mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn().mockImplementation(() => { throw new Error('Stop failed'); }),
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
