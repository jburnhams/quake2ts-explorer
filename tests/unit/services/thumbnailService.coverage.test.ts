import { thumbnailService } from '../../../src/services/thumbnailService';
import { cacheService } from '../../../src/services/cacheService';


vi.mock('../../../src/services/cacheService');

describe('ThumbnailService Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('saves thumbnail', async () => {
        const blob = new Blob([''], { type: 'image/jpeg' });
        await thumbnailService.saveThumbnail('key', blob);
        expect(cacheService.set).toHaveBeenCalledWith(expect.anything(), 'key', blob);
    });

    it('gets thumbnail', async () => {
        const blob = new Blob([''], { type: 'image/jpeg' });
        (cacheService.get as vi.Mock).mockResolvedValue(blob);
        const result = await thumbnailService.getThumbnail('key');
        expect(result).toBe(blob);
    });

    it('generates thumbnail', async () => {
        // Mock canvas
        const mockBlob = new Blob([''], { type: 'image/jpeg' });
        const mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => ({
                drawImage: vi.fn(),
                imageSmoothingEnabled: false,
                imageSmoothingQuality: ''
            })),
            toBlob: vi.fn((cb: any) => cb(mockBlob))
        };
        vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

        const img = {} as any;
        const result = await thumbnailService.generateThumbnail(img, 100, 100);

        expect(result).toBe(mockBlob);
        expect(mockCanvas.width).toBe(100);
        expect(mockCanvas.height).toBe(100);
    });

    it('handles canvas context failure', async () => {
        vi.spyOn(document, 'createElement').mockReturnValue({
            getContext: vi.fn(() => null)
        } as any);

        const result = await thumbnailService.generateThumbnail({} as any);
        expect(result).toBeNull();
    });
});
