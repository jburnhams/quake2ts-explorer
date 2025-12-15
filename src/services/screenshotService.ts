import html2canvas from 'html2canvas';

export interface ScreenshotOptions {
    format: 'png' | 'jpeg';
    quality?: number;
    resolutionMultiplier?: number;
    includeHud?: boolean;
}

export const captureScreenshot = async (target: HTMLElement, options?: ScreenshotOptions): Promise<Blob> => {
    const format = options?.format || 'png';
    const quality = options?.quality;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

    // If target is canvas and we DON'T want HUD, use native toBlob for best performance/quality
    if (target instanceof HTMLCanvasElement && !options?.includeHud) {
         return new Promise((resolve, reject) => {
            target.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
            }, mimeType, quality);
        });
    }

    // Otherwise use html2canvas
    // Scale should account for devicePixelRatio to match native resolution, multiplied by user multiplier
    const dpr = window.devicePixelRatio || 1;
    const multiplier = options?.resolutionMultiplier || 1;
    const scale = dpr * multiplier;

    const canvas = await html2canvas(target, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Transparent background if possible
        logging: false,
        scale: scale
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to create blob from html2canvas'));
            }
        }, mimeType, quality);
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
