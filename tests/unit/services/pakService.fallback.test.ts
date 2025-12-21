import { PakService } from '@/src/services/pakService';
import { workerService } from '@/src/services/workerService';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PakArchive } from 'quake2ts/engine';

// Mocks
jest.mock('@/src/services/workerService');
jest.mock('@/src/services/cacheService', () => {
    // Cannot access 'jest' from outer scope in factory unless we require it
    // But this is usually ESM/TS issue.
    // Simplest way: return a basic object, and we can spyOn/mock implementations later if needed,
    // or just assume standard mock if auto-mocked.
    // However, since we are providing a factory, we must define the object.
    return {
        cacheService: {
            get: () => Promise.resolve(null),
            set: () => Promise.resolve(undefined)
        },
        CACHE_STORES: { PAK_INDEX: 'PAK_INDEX' }
    };
});

// Mock quake2ts/engine
jest.mock('quake2ts/engine', () => {
    const { jest } = require('@jest/globals');
    return {
        PakArchive: {
            fromArrayBuffer: jest.fn()
        },
        VirtualFileSystem: jest.fn().mockImplementation(() => ({
            mountPak: jest.fn(),
            unmountPak: jest.fn(),
            hasFile: jest.fn().mockReturnValue(false),
            stat: jest.fn().mockReturnValue(null),
            readFile: jest.fn().mockResolvedValue(new Uint8Array(0))
        })),
        // Add other needed exports if any
        parsePcx: jest.fn(),
        pcxToRgba: jest.fn(),
        parseWal: jest.fn(),
        walToRgba: jest.fn(),
        parseMd2: jest.fn(),
        groupMd2Animations: jest.fn(),
        parseMd3: jest.fn(),
        parseWav: jest.fn(),
        parseBsp: jest.fn(),
        parseTga: jest.fn()
    };
});

describe('PakService Fallback', () => {
    let pakService: PakService;

    beforeEach(() => {
        pakService = new PakService();
        jest.clearAllMocks();
    });

    it('should successfully fallback to main thread when worker fails', async () => {
        // Arrange
        const mockBuffer = new ArrayBuffer(100);
        const mockPakId = 'test-pak-id';

        // Mock worker failure
        (workerService.executePakParserTask as jest.Mock).mockRejectedValue(new Error('Worker crashed'));

        // Mock PakArchive.fromArrayBuffer to return a valid archive object
        const mockArchive = {
            entries: new Map([['test.txt', {}]]),
            listEntries: () => [{ name: 'test.txt' }],
            readFile: jest.fn()
        };
        (PakArchive.fromArrayBuffer as jest.Mock).mockReturnValue(mockArchive);

        // Act
        const result = await pakService.loadPakFromBuffer('test.pak', mockBuffer, mockPakId, false, 0);

        // Assert
        expect(workerService.executePakParserTask).toHaveBeenCalled();
        expect(PakArchive.fromArrayBuffer).toHaveBeenCalledWith(mockPakId, mockBuffer);
        expect(result).toBe(mockArchive);

        // Verify it was mounted
        // accessing private map or checking VFS side effects
        // Since VFS is mocked, we can check if mountPak was called
        // The service calls this.vfs.mountPak
        // We can check if the mocked VFS instance had mountPak called.
        // But pakService.vfs is the instance.
        expect(pakService.vfs.mountPak).toHaveBeenCalledWith(mockArchive, 0);
    });
});
