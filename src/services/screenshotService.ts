export interface ScreenshotOptions {
    format: 'png' | 'jpeg';
    quality?: number;
    resolutionMultiplier?: number;
}

export const captureScreenshot = async (canvas: HTMLCanvasElement, options: ScreenshotOptions): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        let mimeType = 'image/png';
        if (options.format === 'jpeg') {
            mimeType = 'image/jpeg';
        }

        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to create blob from canvas'));
            }
        }, mimeType, options.quality);
    });
};

export const generateScreenshotFilename = (prefix: string = 'quake2ts_screenshot'): string => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `${prefix}_${dateStr}_${timeStr}.png`;
};

export const downloadScreenshot = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
