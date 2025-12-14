
export interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number; // 0.0 to 1.0 (for jpeg)
  filename?: string;
}

export const captureScreenshot = (
  canvas: HTMLCanvasElement,
  options: ScreenshotOptions = {}
): Promise<Blob> => {
  const format = options.format || 'png';
  const quality = options.quality !== undefined ? options.quality : 0.95;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        mimeType,
        quality
      );
    } catch (e) {
      reject(e);
    }
  });
};

export const downloadScreenshot = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

export const generateScreenshotFilename = (prefix: string = 'quake2ts_screenshot'): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `${prefix}_${timestamp}.png`;
};
