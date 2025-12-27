
import { PakService, getPakService, resetPakService } from '@/src/services/pakService';
import { VirtualFileSystem, PakArchive } from '@quake2ts/engine';
import { MOD_PRIORITY } from '@/src/types/modInfo';
import * as engine from '@quake2ts/engine';

// Mock dependencies
vi.mock('@quake2ts/engine', () => {
    return {
        PakArchive: {
            fromArrayBuffer: vi.fn().mockReturnValue({})
        },
        VirtualFileSystem: vi.fn().mockImplementation(() => ({
            mountPak: vi.fn(),
            unmountPak: vi.fn(),
            setPriority: vi.fn(),
            hasFile: vi.fn(),
            readFile: vi.fn(),
            stat: vi.fn(),
            list: vi.fn().mockReturnValue({ files: [], directories: [] }),
            findByExtension: vi.fn().mockReturnValue([])
        })),
        parsePcx: vi.fn(),
        pcxToRgba: vi.fn(),
        parseWal: vi.fn(),
        walToRgba: vi.fn(),
        parseMd2: vi.fn(),
        groupMd2Animations: vi.fn(),
        parseMd3: vi.fn(),
        parseTga: vi.fn(),
        parseWav: vi.fn(),
        parseBsp: vi.fn(),
        Texture2D: vi.fn(),
    };
});

// Mock workerService to expose inner mocks
const mocks = vi.hoisted(() => {
    const mockAssetWorker = {
        processMd2: vi.fn(),
        processPcx: vi.fn(),
        processWal: vi.fn(),
        processTga: vi.fn(),
        processMd3: vi.fn(),
        processSp2: vi.fn(),
        processWav: vi.fn(),
        processBsp: vi.fn(),
    };

    const mockPakParser = {
        parsePak: vi.fn()
    };

    return { mockAssetWorker, mockPakParser };
});

vi.mock('@/src/services/workerService', () => {
    return {
        workerService: {
            getAssetProcessor: vi.fn().mockReturnValue(mocks.mockAssetWorker),
            executeAssetProcessorTask: vi.fn(async (cb: any) => cb(mocks.mockAssetWorker)),
            getPakParser: vi.fn().mockReturnValue(mocks.mockPakParser),
            executePakParserTask: vi.fn(async (cb: any) => cb(mocks.mockPakParser)),
            // We expose these for testing purposes
            _mockAssetWorker: mocks.mockAssetWorker,
            _mockPakParser: mocks.mockPakParser,
        }
    };
});

// Mock cacheService fully including constants
vi.mock('@/src/services/cacheService', async (importOriginal) => {
    // We can't import actual here easily inside factory if we want to mock singleton
    // But we can define constants manually as they are simple strings
    return {
        cacheService: {
            get: vi.fn(),
            set: vi.fn(),
        },
        CACHE_STORES: {
            PAK_INDEX: 'pak-index',
            THUMBNAILS: 'thumbnails',
            ASSET_METADATA: 'asset-metadata',
            DEMO_INDEX: 'demo-index'
        }
    };
});

// Mock sp2Parser
vi.mock('@/src/utils/sp2Parser', () => ({
    parseSprite: vi.fn()
}));

// Mock Workers
vi.mock('../../../src/workers/pakParser.worker?worker', () => ({
    default: class {}
}));
vi.mock('../../../src/workers/assetProcessor.worker?worker', () => ({
    default: class {}
}));
vi.mock('../../../src/workers/indexer.worker?worker', () => ({
    default: class {}
}));


describe('PakService Coverage', () => {
    let service: PakService;
    let mockVfs: any;
    let mockCacheService: any;

    beforeEach(async () => {
        resetPakService();
        vi.clearAllMocks();
        service = getPakService();
        mockVfs = service.getVfs();

        const cacheModule = await import('@/src/services/cacheService');
        mockCacheService = cacheModule.cacheService;

        // Mock computeCacheKey (private) to bypass crypto issues
        (service as any).computeCacheKey = vi.fn().mockResolvedValue('mock-cache-key');
    });

    it('should handle unloadPak with VFS rebuild fallback', () => {
        const dumbVfs = {
            mountPak: vi.fn(),
            hasFile: vi.fn(),
        } as unknown as VirtualFileSystem;

        const dumbService = new PakService(dumbVfs);
        const archive = {};
        (dumbService as any).mountPak(archive, 'id1', 'test.pak', true, 100);

        dumbService.unloadPak('id1');
        expect(dumbService.getMountedPaks()).toHaveLength(0);
    });

    it('should update pak priority using setPriority if available', () => {
        const archive = {};
        (service as any).mountPak(archive, 'id1', 'test.pak', true, 100);
        service.updatePakPriority('id1', 200);
        expect(mockVfs.setPriority).toHaveBeenCalledWith(archive, 200);
    });

    it('should reorder paks and update priorities', () => {
        const archive1 = {};
        const archive2 = {};
        (service as any).mountPak(archive1, 'id1', 'pak1.pak', true, 100);
        (service as any).mountPak(archive2, 'id2', 'pak2.pak', true, 100);

        service.reorderPaks(['id2', 'id1']);

        expect(mockVfs.setPriority).toHaveBeenCalledWith(archive2, MOD_PRIORITY.USER_OVERRIDE);
        expect(mockVfs.setPriority).toHaveBeenCalledWith(archive1, MOD_PRIORITY.USER_OVERRIDE + 10);
    });

    it('should try to load palette from different paths', async () => {
        mockVfs.hasFile.mockImplementation((path: string) => path === 'colormap.pcx');
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));

        (engine.parsePcx as any).mockReturnValue({ palette: new Uint8Array(768) });

        const archive = {};
        (service as any).mountPak(archive, 'id1', 'pak.pak', false, 0);

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockVfs.hasFile).toHaveBeenCalledWith('pics/colormap.pcx');
        expect(mockVfs.hasFile).toHaveBeenCalledWith('colormap.pcx');
        expect(service.getPalette()).toBeDefined();
    });

    it('should parse MD2 via worker', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));
        mocks.mockAssetWorker.processMd2.mockResolvedValue({ type: 'md2', model: {}, animations: [] });

        const result = await service.parseFile('models/test.md2');

        expect(result.type).toBe('md2');
        expect(mocks.mockAssetWorker.processMd2).toHaveBeenCalled();
    });

    it('should handle worker failure and fallback to main thread for MD2', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));

        mocks.mockAssetWorker.processMd2.mockRejectedValue(new Error("Worker Fail"));

        (engine.parseMd2 as any).mockReturnValue({});
        (engine.groupMd2Animations as any).mockReturnValue([]);

        const result = await service.parseFile('models/test.md2');

        expect(result.type).toBe('md2');
        expect(engine.parseMd2).toHaveBeenCalled(); // Fallback called
    });

    it('should handle failure in both worker and fallback', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));

        mocks.mockAssetWorker.processMd2.mockRejectedValue(new Error("Worker Fail"));

        (engine.parseMd2 as any).mockImplementation(() => { throw new Error("Fallback Fail"); });

        const result = await service.parseFile('models/test.md2');

        expect(result.type).toBe('unknown');
        expect((result as any).error).toBe('Fallback Fail');
    });

    it('should build file tree in by-pak mode', () => {
        const archive = {};
        (service as any).mountPak(archive, 'id1', 'pak1.pak', true, 100);

        mockVfs.list.mockReturnValue({
            files: [{ path: 'file1.txt', sourcePak: 'id1', size: 10 }],
            directories: []
        });

        const tree = service.buildFileTree('by-pak');

        expect(tree.children).toHaveLength(1);
        expect(tree.children![0].name).toBe('pak1.pak');
        expect(tree.children![0].children![0].name).toBe('file1.txt');
    });

    it('should use cached pak index if available', async () => {
        mockCacheService.get.mockResolvedValue(new Map()); // Cache hit
        const file = {
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
            name: 'test.pak'
        } as unknown as File;

        await service.loadPakFile(file);

        expect(mockCacheService.get).toHaveBeenCalled();
        expect(mocks.mockPakParser.parsePak).not.toHaveBeenCalled();
    });

    it('should parse and cache pak if not in cache', async () => {
        mockCacheService.get.mockResolvedValue(null); // Cache miss
        mocks.mockPakParser.parsePak.mockResolvedValue({
            entries: new Map(),
            buffer: new ArrayBuffer(0),
            name: 'test.pak'
        });

        const file = {
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
            name: 'test.pak'
        } as unknown as File;

        await service.loadPakFile(file);

        expect(mockCacheService.get).toHaveBeenCalled();
        expect(mocks.mockPakParser.parsePak).toHaveBeenCalled();
        expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should fallback for other types (pcx, wal, tga, md3, sp2, wav, bsp)', async () => {
        const sp2Parser = await import('@/src/utils/sp2Parser');

        // PCX
        mocks.mockAssetWorker.processPcx.mockRejectedValue(new Error('fail'));
        (engine.parsePcx as any).mockReturnValue({ width: 10, height: 10, palette: new Uint8Array(768), data: new Uint8Array(100) });
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));
        await service.parseFile('test.pcx');
        expect(engine.parsePcx).toHaveBeenCalled();

        // WAL
        mocks.mockAssetWorker.processWal.mockRejectedValue(new Error('fail'));
        (engine.parseWal as any).mockReturnValue({ width: 10, height: 10, mipmaps: [] });
        await service.parseFile('test.wal');
        expect(engine.parseWal).toHaveBeenCalled();

        // TGA
        mocks.mockAssetWorker.processTga.mockRejectedValue(new Error('fail'));
        (engine.parseTga as any).mockReturnValue({ width: 10, height: 10, pixels: new Uint8Array(100) });
        await service.parseFile('test.tga');
        expect(engine.parseTga).toHaveBeenCalled();

        // MD3
        mocks.mockAssetWorker.processMd3.mockRejectedValue(new Error('fail'));
        (engine.parseMd3 as any).mockReturnValue({});
        await service.parseFile('test.md3');
        expect(engine.parseMd3).toHaveBeenCalled();

        // SP2
        mocks.mockAssetWorker.processSp2.mockRejectedValue(new Error('fail'));
        (sp2Parser.parseSprite as any).mockReturnValue({});
        await service.parseFile('test.sp2');
        expect(sp2Parser.parseSprite).toHaveBeenCalled();

        // WAV
        mocks.mockAssetWorker.processWav.mockRejectedValue(new Error('fail'));
        (engine.parseWav as any).mockReturnValue({});
        await service.parseFile('test.wav');
        expect(engine.parseWav).toHaveBeenCalled();

        // BSP
        mocks.mockAssetWorker.processBsp.mockRejectedValue(new Error('fail'));
        (engine.parseBsp as any).mockReturnValue({});
        await service.parseFile('test.bsp');
        expect(engine.parseBsp).toHaveBeenCalled();
    });
});
