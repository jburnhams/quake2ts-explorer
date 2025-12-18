
import { PakService, getPakService, resetPakService } from '@/src/services/pakService';
import { VirtualFileSystem, PakArchive } from 'quake2ts/engine';
import { MOD_PRIORITY } from '@/src/types/modInfo';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
    const { jest } = require('@jest/globals');
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

jest.mock('@/src/services/workerService', () => {
    const { jest } = require('@jest/globals');
    return {
        workerService: {
            getPakParser: jest.fn().mockReturnValue({
                parsePak: jest.fn()
            }),
            getAssetProcessor: jest.fn().mockReturnValue({
                processPcx: jest.fn(),
                processWal: jest.fn(),
                processTga: jest.fn(),
                processMd2: jest.fn(),
                processMd3: jest.fn(),
                processSp2: jest.fn(),
                processWav: jest.fn(),
                processBsp: jest.fn()
            })
        }
    };
});

describe('PakService Coverage', () => {
    let service: PakService;
    let mockVfs: any;

    beforeEach(() => {
        resetPakService();
        jest.clearAllMocks();
        service = getPakService();
        mockVfs = service.getVfs();
    });

    it('should handle unloadPak with VFS rebuild fallback', () => {
        const dumbVfs = {
            mountPak: jest.fn(),
            hasFile: jest.fn(),
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

        const { parsePcx } = require('quake2ts/engine');
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
        const { workerService } = require('@/src/services/workerService');
        const mockWorker = workerService.getAssetProcessor();
        mockWorker.processMd2.mockResolvedValue({ type: 'md2', model: {}, animations: [] });

        const result = await service.parseFile('models/test.md2');

        expect(result.type).toBe('md2');
        expect(mockWorker.processMd2).toHaveBeenCalled();
    });

    it('should handle worker failure and fallback to main thread for MD2', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));

        const { workerService } = require('@/src/services/workerService');
        const mockWorker = workerService.getAssetProcessor();
        mockWorker.processMd2.mockRejectedValue(new Error("Worker Fail"));

        const { parseMd2, groupMd2Animations } = require('quake2ts/engine');
        parseMd2.mockReturnValue({});
        groupMd2Animations.mockReturnValue([]);

        const result = await service.parseFile('models/test.md2');

        expect(result.type).toBe('md2');
        expect(parseMd2).toHaveBeenCalled(); // Fallback called
    });

    it('should handle failure in both worker and fallback', async () => {
        mockVfs.readFile.mockResolvedValue(new Uint8Array(10));

        const { workerService } = require('@/src/services/workerService');
        const mockWorker = workerService.getAssetProcessor();
        mockWorker.processMd2.mockRejectedValue(new Error("Worker Fail"));

        const { parseMd2 } = require('quake2ts/engine');
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
});
