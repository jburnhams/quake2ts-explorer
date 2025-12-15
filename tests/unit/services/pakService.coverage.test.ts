
import { PakService, getPakService, resetPakService } from '@/src/services/pakService';
import { VirtualFileSystem, PakArchive } from 'quake2ts/engine';
import { MOD_PRIORITY } from '@/src/types/modInfo';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
    return {
        PakArchive: {
            fromArrayBuffer: jest.fn().mockReturnValue({})
        },
        VirtualFileSystem: jest.fn().mockImplementation(() => ({
            mountPak: jest.fn(),
            unmountPak: jest.fn(),
            setPriority: jest.fn(),
            hasFile: jest.fn(),
            readFile: jest.fn(),
            stat: jest.fn(),
            list: jest.fn().mockReturnValue({ files: [], directories: [] }),
            findByExtension: jest.fn().mockReturnValue([])
        })),
        parsePcx: jest.fn(),
        pcxToRgba: jest.fn(),
        parseWal: jest.fn(),
        walToRgba: jest.fn(),
        parseMd2: jest.fn(),
        groupMd2Animations: jest.fn(),
        parseMd3: jest.fn(),
        parseBsp: jest.fn(),
        parseWav: jest.fn(),
        parseTga: jest.fn()
    };
});

describe('PakService Coverage', () => {
    let service: PakService;
    let mockVfs: any;

    beforeEach(() => {
        resetPakService();
        service = getPakService();
        mockVfs = service.getVfs();
        jest.clearAllMocks();
    });

    it('should handle unloadPak with VFS rebuild fallback', () => {
        // Mock VFS without unmountPak/setPriority to force rebuild path?
        // Actually the mock above has them. Let's create a service with a "dumb" VFS.
        const dumbVfs = {
            mountPak: jest.fn(),
            hasFile: jest.fn(),
            // No unmountPak
        } as unknown as VirtualFileSystem;

        const dumbService = new PakService(dumbVfs);

        // Load a pak manually into state (bypassing loadPakFile which needs File)
        const archive = {};
        (dumbService as any).mountPak(archive, 'id1', 'test.pak', true, 100);

        // Unload
        dumbService.unloadPak('id1');

        // Should have triggered rebuild -> new VFS
        // Since we can't easily check if VFS instance changed without exposing it,
        // we can check if it tried to mount remaining paks (none here)
        // or check if paks map is empty.
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

        const { parsePcx } = require('quake2ts/engine');
        parsePcx.mockReturnValue({ palette: new Uint8Array(768) });

        // Trigger palette load via mount (it calls tryLoadPalette)
        const archive = {};
        (service as any).mountPak(archive, 'id1', 'pak.pak', false, 0);

        // Wait for async
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockVfs.hasFile).toHaveBeenCalledWith('pics/colormap.pcx');
        expect(mockVfs.hasFile).toHaveBeenCalledWith('colormap.pcx');
        expect(service.getPalette()).toBeDefined();
    });

    it('should handle parseFile errors for MD2', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));
        mockVfs.stat.mockReturnValue({}); // needed for getFileType? No, parseFile calls getFileType helper

        // Mock getFileType via helper? It imports from utils.
        // But we can just use a path with extension.

        const { parseMd2 } = require('quake2ts/engine');
        parseMd2.mockImplementation(() => { throw new Error("Parse Fail"); });

        const result = await service.parseFile('models/test.md2');
        expect(result.type).toBe('unknown');
        expect((result as any).error).toBe('Parse Fail');
    });

    it('should handle parseFile errors for BSP', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));
        const { parseBsp } = require('quake2ts/engine');
        parseBsp.mockImplementation(() => { throw new Error("BSP Fail"); });

        const result = await service.parseFile('maps/test.bsp');
        expect(result.type).toBe('unknown');
        expect((result as any).error).toBe('BSP Fail');
    });

    it('should handle parseFile errors for MD3', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));
        const { parseMd3 } = require('quake2ts/engine');
        parseMd3.mockImplementation(() => { throw new Error("MD3 Fail"); });

        const result = await service.parseFile('models/test.md3');
        expect(result.type).toBe('unknown');
        expect((result as any).error).toBe('MD3 Fail');
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
});
