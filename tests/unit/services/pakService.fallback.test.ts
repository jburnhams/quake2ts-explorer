import { PakService } from '@/src/services/pakService';
import { workerService } from '@/src/services/workerService';

import { PakArchive } from 'quake2ts/engine';

// Mocks
vi.mock('@/src/services/workerService');
vi.mock('@/src/services/cacheService', () => {
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
vi.mock('quake2ts/engine', () => {
    
    return {
        PakArchive: {
            fromArrayBuffer: vi.fn()
        },
        VirtualFileSystem: vi.fn().mockImplementation(() => ({
            mountPak: vi.fn(),
            unmountPak: vi.fn(),
            hasFile: vi.fn().mockReturnValue(false),
            stat: vi.fn().mockReturnValue(null),
            readFile: vi.fn().mockResolvedValue(new Uint8Array(0))
        })),
        // Add other needed exports if any
        parsePcx: vi.fn(),
        pcxToRgba: vi.fn(),
        parseWal: vi.fn(),
        walToRgba: vi.fn(),
        parseMd2: vi.fn(),
        groupMd2Animations: vi.fn(),
        parseMd3: vi.fn(),
        parseWav: vi.fn(),
        parseBsp: vi.fn(),
        parseTga: vi.fn()
    };
});

describe('PakService Fallback', () => {
    let pakService: PakService;

    beforeEach(() => {
        pakService = new PakService();
        vi.clearAllMocks();
    });

    it('should successfully fallback to main thread when worker fails', async () => {
        // Arrange
        const mockBuffer = new ArrayBuffer(100);
        const mockPakId = 'test-pak-id';

        // Mock worker failure
        (workerService.executePakParserTask as vi.Mock).mockRejectedValue(new Error('Worker crashed'));

        // Mock PakArchive.fromArrayBuffer to return a valid archive object
        const mockArchive = {
            entries: new Map([['test.txt', {}]]),
            listEntries: () => [{ name: 'test.txt' }],
            readFile: vi.fn()
        };
        (PakArchive.fromArrayBuffer as vi.Mock).mockReturnValue(mockArchive);

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
