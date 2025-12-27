import { captureScreenshot, generateScreenshotFilename, downloadScreenshot, ScreenshotOptions } from '@/src/services/screenshotService';
import html2canvas from 'html2canvas';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock html2canvas
// vi.mock requires returning an object with 'default' property for default exports in ESM/Vitest
vi.mock('html2canvas', () => ({
    default: vi.fn()
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

describe('captureScreenshot', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockDiv: HTMLDivElement;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Create mock canvas
        mockCanvas = document.createElement('canvas');
        mockCanvas.toBlob = vi.fn((callback, type, quality) => {
             // Mock blob creation
             const blob = new Blob(['mock-image-data'], { type: type || 'image/png' });
             callback(blob);
        });

        mockDiv = document.createElement('div');
    });

    it('captures canvas screenshot as png by default', async () => {
        const blob = await captureScreenshot(mockCanvas);
        expect(blob.type).toBe('image/png');
        expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined);
    });

    it('captures canvas screenshot as jpeg with quality', async () => {
        const options: ScreenshotOptions = { format: 'jpeg', quality: 0.8 };
        const blob = await captureScreenshot(mockCanvas, options);
        expect(blob.type).toBe('image/jpeg');
        expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);
    });

    it('uses html2canvas when target is not a canvas', async () => {
        // Mock html2canvas return
        const mockResultCanvas = document.createElement('canvas');
        mockResultCanvas.toBlob = vi.fn((cb) => cb(new Blob(['html2canvas-data'], { type: 'image/png' })));
        (html2canvas as unknown as vi.Mock).mockResolvedValue(mockResultCanvas);

        await captureScreenshot(mockDiv);

        expect(html2canvas).toHaveBeenCalledWith(mockDiv, expect.objectContaining({
            scale: 1
        }));
    });

    it('uses html2canvas when includeHud is true, even for canvas target', async () => {
        const mockResultCanvas = document.createElement('canvas');
        mockResultCanvas.toBlob = vi.fn((cb) => cb(new Blob(['html2canvas-data'], { type: 'image/png' })));
        (html2canvas as unknown as vi.Mock).mockResolvedValue(mockResultCanvas);

        const options: ScreenshotOptions = { format: 'png', includeHud: true };
        await captureScreenshot(mockCanvas, options);

        expect(html2canvas).toHaveBeenCalled();
    });

    it('passes resolution multiplier to html2canvas scale option', async () => {
        const mockResultCanvas = document.createElement('canvas');
        mockResultCanvas.toBlob = vi.fn((cb) => cb(new Blob([''], { type: 'image/png' })));
        (html2canvas as unknown as vi.Mock).mockResolvedValue(mockResultCanvas);

        const options: ScreenshotOptions = { format: 'png', resolutionMultiplier: 2, includeHud: true };
        await captureScreenshot(mockDiv, options);

        expect(html2canvas).toHaveBeenCalledWith(mockDiv, expect.objectContaining({
            scale: 2
        }));
    });
});

describe('generateScreenshotFilename', () => {
    it('generates filename with prefix and date', () => {
        const filename = generateScreenshotFilename('test');
        expect(filename).toMatch(/^test_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png$/);
    });

    it('uses default prefix if not provided', () => {
        const filename = generateScreenshotFilename();
        expect(filename).toMatch(/^quake2ts_screenshot_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png$/);
    });
});

describe('downloadScreenshot', () => {
    it('creates download link and triggers click', () => {
        const blob = new Blob(['test'], { type: 'image/png' });
        const filename = 'test.png';
        const mockUrl = 'blob:test';
        (global.URL.createObjectURL as vi.Mock).mockReturnValue(mockUrl);

        // We need to return a real element for appendChild to work in jsdom
        const mockLink = document.createElement('a');
        mockLink.click = vi.fn();

        const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
        const removeChildSpy = vi.spyOn(document.body, 'removeChild');

        downloadScreenshot(blob, filename);

        expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(mockLink.href).toBe(mockUrl);
        expect(mockLink.download).toBe(filename);
        expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
        expect(mockLink.click).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });
});
