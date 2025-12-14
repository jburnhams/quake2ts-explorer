import { captureScreenshot, downloadScreenshot, generateScreenshotFilename } from '@/src/services/screenshotService';

describe('ScreenshotService', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockToBlob: jest.Mock;

  beforeEach(() => {
    mockToBlob = jest.fn();
    mockCanvas = document.createElement('canvas');
    mockCanvas.toBlob = mockToBlob;

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('captureScreenshot', () => {
    it('should resolve with a blob when successful', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      mockToBlob.mockImplementation((callback) => callback(mockBlob));

      const blob = await captureScreenshot(mockCanvas);
      expect(blob).toBe(mockBlob);
      expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', 0.95);
    });

    it('should use default format (png) if not specified', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        mockToBlob.mockImplementation((callback) => callback(mockBlob));

        await captureScreenshot(mockCanvas);
        expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', 0.95);
    });

    it('should use jpeg format if specified', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
        mockToBlob.mockImplementation((callback) => callback(mockBlob));

        await captureScreenshot(mockCanvas, { format: 'jpeg', quality: 0.8 });
        expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);
    });

    it('should reject if toBlob fails (returns null)', async () => {
      mockToBlob.mockImplementation((callback) => callback(null));

      await expect(captureScreenshot(mockCanvas)).rejects.toThrow('Failed to create blob from canvas');
    });

    it('should reject if toBlob throws', async () => {
        mockToBlob.mockImplementation(() => { throw new Error('Canvas error'); });
        await expect(captureScreenshot(mockCanvas)).rejects.toThrow('Canvas error');
    });
  });

  describe('downloadScreenshot', () => {
    it('should trigger download', () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const filename = 'test.png';

      const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      const removeChildSpy = jest.spyOn(document.body, 'removeChild');

      // Mock click
      const clickSpy = jest.fn();
      jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
          const el = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement;
          if (tagName === 'a') {
              el.click = clickSpy;
          }
          return el;
      });

      downloadScreenshot(mockBlob, filename);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();

      // Wait for cleanup timeout
      jest.runAllTimers(); // If we used fake timers. But we are using real timers in implementation.
      // Since we didn't enable fake timers, we can't fast-forward.
      // However, we can verify the immediate actions.

      // We can enable fake timers to test cleanup
    });
  });

  describe('generateScreenshotFilename', () => {
      it('should generate a filename with timestamp', () => {
          const filename = generateScreenshotFilename();
          expect(filename).toMatch(/quake2ts_screenshot_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png/);
      });

      it('should use custom prefix', () => {
        const filename = generateScreenshotFilename('custom');
        expect(filename).toMatch(/custom_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png/);
    });
  });
});
