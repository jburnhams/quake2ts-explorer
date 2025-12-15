import { captureBurst, captureScreenshot, BurstOptions } from '@/src/services/screenshotService';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';

// Mock dependencies
jest.mock('html2canvas', () => jest.fn());
jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    folder: jest.fn().mockReturnThis(),
    file: jest.fn(),
    generateAsync: jest.fn().mockResolvedValue(new Blob(['zip-content'], { type: 'application/zip' })),
  }));
});

describe('ScreenshotService - Burst Mode', () => {
    let mockElement: HTMLElement;
    let mockCanvas: any;

    beforeEach(() => {
        mockElement = document.createElement('div');

        // Mock html2canvas to return a mock canvas
        mockCanvas = {
            toBlob: jest.fn((callback) => {
                const blob = new Blob(['image-data'], { type: 'image/png' });
                callback(blob);
            }),
            width: 100,
            height: 100
        };
        (html2canvas as unknown as jest.Mock).mockResolvedValue(mockCanvas);

        jest.clearAllMocks();
    });

    test('captureBurst captures multiple screenshots', async () => {
        const options: BurstOptions = {
            format: 'png',
            burstCount: 3,
            burstInterval: 10,
            filenamePrefix: 'test'
        };

        const result = await captureBurst(mockElement, options);

        // html2canvas should be called 3 times (once per captureScreenshot)
        expect(html2canvas).toHaveBeenCalledTimes(3);
        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe('application/zip');
    });

    test('captureBurst uses default count if not provided', async () => {
         const options: BurstOptions = {
             format: 'png'
             // No burstCount provided
         };

         // Default is 5
         await captureBurst(mockElement, options);
         expect(html2canvas).toHaveBeenCalledTimes(5);
    });

    test('captureBurst adds files to zip with correct naming', async () => {
        const options: BurstOptions = {
            format: 'jpeg',
            burstCount: 2,
            burstInterval: 0,
            filenamePrefix: 'mycontext'
        };

        // We don't instantiate JSZip here because captureBurst does it.
        // We need to inspect the mock instance created inside captureBurst.

        await captureBurst(mockElement, options);

        // Check JSZip usage
        expect(JSZip).toHaveBeenCalled();
        const zipInstance = (JSZip as unknown as jest.Mock).mock.results[0].value;
        expect(zipInstance.folder).toHaveBeenCalledWith('burst_capture');
        expect(zipInstance.file).toHaveBeenCalledTimes(2);

        // Verify filenames (jpeg extension)
        const fileCall1 = zipInstance.file.mock.calls[0];
        // Expect format: mycontext_{timestamp}_frame_001.jpg
        expect(fileCall1[0]).toMatch(/mycontext_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_frame_001\.jpg/);

        const fileCall2 = zipInstance.file.mock.calls[1];
        expect(fileCall2[0]).toMatch(/mycontext_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_frame_002\.jpg/);
    });
});
