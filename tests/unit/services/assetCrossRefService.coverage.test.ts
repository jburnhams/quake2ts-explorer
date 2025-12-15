
import { AssetCrossRefService } from '@/src/services/assetCrossRefService';
import { VirtualFileSystem } from 'quake2ts/engine';

// Mock dependencies
jest.mock('quake2ts/engine', () => ({
    VirtualFileSystem: jest.fn().mockImplementation(() => ({
        findByExtension: jest.fn().mockReturnValue([]),
        readFile: jest.fn(),
        hasFile: jest.fn()
    })),
    parseMd2: jest.fn(),
    parseMd3: jest.fn(),
    parseBsp: jest.fn()
}));

describe('AssetCrossRefService Coverage', () => {
    let service: AssetCrossRefService;
    let mockVfs: any;

    beforeEach(() => {
        mockVfs = new VirtualFileSystem();
        service = new AssetCrossRefService(mockVfs);
        jest.clearAllMocks();
    });

    it('should find texture usage in models', async () => {
        mockVfs.findByExtension.mockImplementation((ext: string) => {
            if (ext === 'md2') return [{ path: 'models/test.md2' }];
            return [];
        });

        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));

        const { parseMd2 } = require('quake2ts/engine');
        parseMd2.mockReturnValue({
            skins: [{ name: 'models/test_skin.pcx' }]
        });

        const usages = await service.findTextureUsage('models/test_skin.pcx');

        expect(usages).toHaveLength(1);
        expect(usages[0].path).toBe('models/test.md2');
    });

    it('should handle scan errors', async () => {
        mockVfs.findByExtension.mockReturnValue([{ path: 'models/bad.md2' }]);
        mockVfs.readFile.mockRejectedValue(new Error('Read Fail'));

        const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        await service.findTextureUsage('any');

        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
