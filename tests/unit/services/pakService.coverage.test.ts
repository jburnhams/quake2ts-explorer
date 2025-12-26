
import { PakService, getPakService, resetPakService } from '@/src/services/pakService';
import { VirtualFileSystem, PakArchive } from '@quake2ts/engine';
import { MOD_PRIORITY } from '@/src/types/modInfo';


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
        parseBsp: vi.fn(),
        parseWav: vi.fn(),
        parseTga: vi.fn(),
    };
});

vi.mock('@/src/utils/sp2Parser', () => {
    
    return {
        parseSprite: vi.fn()
    };
});

vi.mock('@/src/services/workerService', () => {
    

    const mockAssetWorker = {
        processPcx: vi.fn(),
        processWal: vi.fn(),
        processTga: vi.fn(),
        processMd2: vi.fn(),
        processMd3: vi.fn(),
        processSp2: vi.fn(),
        processWav: vi.fn(),
        processBsp: vi.fn()
    };

    const mockPakParser = {
        parsePak: vi.fn()
    };

    return {
        workerService: {
            getPakParser: vi.fn().mockReturnValue(mockPakParser),
            getAssetProcessor: vi.fn().mockReturnValue(mockAssetWorker),
            executeAssetProcessorTask: vi.fn(async (cb: any) => cb(mockAssetWorker)),
            executePakParserTask: vi.fn(async (cb: any) => cb(mockPakParser)),
            // Expose mocks for test access
            _mockAssetWorker: mockAssetWorker,
            _mockPakParser: mockPakParser
        }
    };
});

vi.mock('@/src/services/cacheService', () => {
    
    return {
        cacheService: {
            get: vi.fn(),
            set: vi.fn().mockResolvedValue(undefined)
        },
        CACHE_STORES: { PAK_INDEX: 'pak-index' }
    };
});

describe('PakService Coverage', () => {
    let service: PakService;
    let mockVfs: any;
    let mockAssetWorker: any;
    let mockCacheService: any;
    let mockPakParser: any;

    beforeEach(() => {
        resetPakService();
        vi.clearAllMocks();
        service = getPakService();
        mockVfs = service.getVfs();

        // Get the mock worker to inspect calls
        const { workerService } = require('@/src/services/workerService');
        mockAssetWorker = workerService._mockAssetWorker;
        mockPakParser = workerService._mockPakParser;

        const { cacheService } = require('@/src/services/cacheService');
        mockCacheService = cacheService;
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

        const { parsePcx } = require('@quake2ts/engine');
        parsePcx.mockReturnValue({ palette: new Uint8Array(768) });

        const archive = {};
        (service as any).mountPak(archive, 'id1', 'pak.pak', false, 0);

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockVfs.hasFile).toHaveBeenCalledWith('pics/colormap.pcx');
        expect(mockVfs.hasFile).toHaveBeenCalledWith('colormap.pcx');
        expect(service.getPalette()).toBeDefined();
    });

    it('should parse MD2 via worker', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));
        mockAssetWorker.processMd2.mockResolvedValue({ type: 'md2', model: {}, animations: [] });

        const result = await service.parseFile('models/test.md2');

        expect(result.type).toBe('md2');
        expect(mockAssetWorker.processMd2).toHaveBeenCalled();
    });

    it('should handle worker failure and fallback to main thread for MD2', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));

        mockAssetWorker.processMd2.mockRejectedValue(new Error("Worker Fail"));

        const { parseMd2, groupMd2Animations } = require('@quake2ts/engine');
        parseMd2.mockReturnValue({});
        groupMd2Animations.mockReturnValue([]);

        const result = await service.parseFile('models/test.md2');

        expect(result.type).toBe('md2');
        expect(parseMd2).toHaveBeenCalled(); // Fallback called
    });

    it('should handle failure in both worker and fallback', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));

        mockAssetWorker.processMd2.mockRejectedValue(new Error("Worker Fail"));

        const { parseMd2 } = require('@quake2ts/engine');
        parseMd2.mockImplementation(() => { throw new Error("Fallback Fail"); });

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

        // Mock crypto safely
        const mockRandomUUID = vi.fn().mockReturnValue('uuid');
        const mockDigest = vi.fn().mockResolvedValue(new ArrayBuffer(32));

        if (global.crypto) {
             Object.defineProperty(global.crypto, 'randomUUID', {
                 value: mockRandomUUID,
                 writable: true
             });
             if (global.crypto.subtle) {
                 Object.defineProperty(global.crypto.subtle, 'digest', {
                     value: mockDigest,
                     writable: true
                 });
             } else {
                 // @ts-ignore
                 Object.defineProperty(global.crypto, 'subtle', {
                     value: { digest: mockDigest },
                     writable: true
                 });
             }
        } else {
            (global as any).crypto = {
                randomUUID: mockRandomUUID,
                subtle: { digest: mockDigest }
            };
        }

        await service.loadPakFile(file);

        expect(mockCacheService.get).toHaveBeenCalled();
        expect(mockPakParser.parsePak).not.toHaveBeenCalled();
    });

    it('should parse and cache pak if not in cache', async () => {
        mockCacheService.get.mockResolvedValue(null); // Cache miss
        mockPakParser.parsePak.mockResolvedValue({
            entries: new Map(),
            buffer: new ArrayBuffer(0),
            name: 'test.pak'
        });

        const file = {
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
            name: 'test.pak'
        } as unknown as File;

        // Mock crypto safely
        const mockRandomUUID = vi.fn().mockReturnValue('uuid');
        const mockDigest = vi.fn().mockResolvedValue(new ArrayBuffer(32));

        if (global.crypto) {
             Object.defineProperty(global.crypto, 'randomUUID', {
                 value: mockRandomUUID,
                 writable: true
             });
             // Ensure subtle exists
             if (!global.crypto.subtle) {
                 // @ts-ignore
                 Object.defineProperty(global.crypto, 'subtle', {
                     value: { digest: mockDigest },
                     writable: true
                 });
             } else {
                 Object.defineProperty(global.crypto.subtle, 'digest', {
                     value: mockDigest,
                     writable: true
                 });
             }
        } else {
             (global as any).crypto = {
                randomUUID: mockRandomUUID,
                subtle: { digest: mockDigest }
            };
        }

        await service.loadPakFile(file);

        expect(mockCacheService.get).toHaveBeenCalled();
        expect(mockPakParser.parsePak).toHaveBeenCalled();
        expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should fallback for other types (pcx, wal, tga, md3, sp2, wav, bsp)', async () => {
        // Setup mocks for fallbacks
        const { parsePcx, parseWal, parseTga, parseMd3, parseWav, parseBsp } = require('@quake2ts/engine');
        const { parseSprite } = require('@/src/utils/sp2Parser');

        // PCX
        mockAssetWorker.processPcx.mockRejectedValue(new Error('fail'));
        parsePcx.mockReturnValue({ width: 10, height: 10, palette: new Uint8Array(768), data: new Uint8Array(100) });
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));
        await service.parseFile('test.pcx');
        expect(parsePcx).toHaveBeenCalled();

        // WAL
        mockAssetWorker.processWal.mockRejectedValue(new Error('fail'));
        parseWal.mockReturnValue({ width: 10, height: 10, mipmaps: [] });
        await service.parseFile('test.wal');
        expect(parseWal).toHaveBeenCalled();

        // TGA
        mockAssetWorker.processTga.mockRejectedValue(new Error('fail'));
        parseTga.mockReturnValue({ width: 10, height: 10, pixels: new Uint8Array(100) });
        await service.parseFile('test.tga');
        expect(parseTga).toHaveBeenCalled();

        // MD3
        mockAssetWorker.processMd3.mockRejectedValue(new Error('fail'));
        parseMd3.mockReturnValue({});
        await service.parseFile('test.md3');
        expect(parseMd3).toHaveBeenCalled();

        // SP2
        mockAssetWorker.processSp2.mockRejectedValue(new Error('fail'));
        parseSprite.mockReturnValue({});
        await service.parseFile('test.sp2');
        expect(parseSprite).toHaveBeenCalled();

        // WAV
        mockAssetWorker.processWav.mockRejectedValue(new Error('fail'));
        parseWav.mockReturnValue({});
        await service.parseFile('test.wav');
        expect(parseWav).toHaveBeenCalled();

        // BSP
        mockAssetWorker.processBsp.mockRejectedValue(new Error('fail'));
        parseBsp.mockReturnValue({});
        await service.parseFile('test.bsp');
        expect(parseBsp).toHaveBeenCalled();
    });
});
