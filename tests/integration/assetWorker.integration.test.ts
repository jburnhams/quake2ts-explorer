
import { workerService } from '../../src/services/workerService';
import { PakService, getPakService, resetPakService } from '../../src/services/pakService';


vi.mock('../../src/services/workerService');

describe('Asset Worker Integration', () => {
    let service: PakService;

    beforeEach(() => {
        resetPakService();
        service = getPakService();
        vi.clearAllMocks();
    });

    it('should process MD2 using asset worker', async () => {
        const dummyBuffer = new ArrayBuffer(100);

        // Mock VFS to return file content
        const mockReadFile = vi.fn().mockResolvedValue(new Uint8Array(dummyBuffer));
        // We need to spy on or mock vfs methods. vfs is public.
        service.vfs.readFile = mockReadFile;
        service.vfs.stat = vi.fn().mockReturnValue({ path: 'models/test.md2', size: 100, sourcePak: 'id1' });

        // Mock worker response
        const mockProcessMd2 = vi.fn().mockResolvedValue({
            type: 'md2',
            model: { header: { numFrames: 1 } },
            animations: []
        });

        (workerService.executeAssetProcessorTask as vi.Mock).mockImplementation(async (cb: any) => {
            const api = { processMd2: mockProcessMd2 };
            return cb(api);
        });

        // PakService.parseFile calls readFile.
        const result = await service.parseFile('models/test.md2');

        expect(mockProcessMd2).toHaveBeenCalled();
        expect(result.type).toBe('md2');
    });

    it('should fallback if worker fails', async () => {
        const dummyBuffer = new ArrayBuffer(100);

        const mockReadFile = vi.fn().mockResolvedValue(new Uint8Array(dummyBuffer));
        service.vfs.readFile = mockReadFile;

        const mockProcessMd2 = vi.fn().mockRejectedValue(new Error("Worker fail"));

        (workerService.executeAssetProcessorTask as vi.Mock).mockImplementation(async (cb: any) => {
            const api = { processMd2: mockProcessMd2 };
            return cb(api);
        });

        // Real quake2ts parseMd2 will fail on empty/bad buffer
        const result = await service.parseFile('models/test.md2');

        expect(mockProcessMd2).toHaveBeenCalled();
        expect(result.type).toBe('unknown');
    });
});
