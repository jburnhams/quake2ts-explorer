import { cacheService, CACHE_STORES } from './cacheService';

export class ThumbnailService {
  async saveThumbnail(key: string, blob: Blob): Promise<void> {
    await cacheService.set(CACHE_STORES.THUMBNAILS, key, blob);
  }

  async getThumbnail(key: string): Promise<Blob | undefined> {
    return cacheService.get<Blob>(CACHE_STORES.THUMBNAILS, key);
  }

  // Helper to generate thumbnail from canvas/image
  async generateThumbnail(
    source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
    width: number = 128,
    height: number = 128
  ): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Use default smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.7);
    });
  }
}

export const thumbnailService = new ThumbnailService();
