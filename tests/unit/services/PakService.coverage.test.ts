import { PakService, PakDirectoryEntry, ParsedFile } from '@/src/services/pakService';
import { cacheService } from '@/src/services/cacheService';
import { workerService } from '@/src/services/workerService';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PakArchive } from 'quake2ts/engine';

// Mocks
jest.mock('@/src/services/cacheService');
jest.mock('@/src/services/workerService');
jest.mock('quake2ts/engine', () => {
    const { jest } = require('@jest/globals');
    return {
        PakArchive: {
            fromArrayBuffer: jest.fn().mockImplementation(() => ({
                entries: new Map(),
                listEntries: () => [],
                readFile: jest.fn()
            }))
        },
        VirtualFileSystem: jest.fn().mockImplementation(() => ({
            mountPak: jest.fn(),
            unmountPak: jest.fn(),
            hasFile: jest.fn().mockReturnValue(false),
            stat: jest.fn().mockReturnValue(null),
            readFile: jest.fn().mockResolvedValue(new Uint8Array(0)) // Mock readFile
        }))
    };
});

describe('PakService Coverage', () => {
    let pakService: PakService;

    beforeEach(() => {
        // Ensure manual instance creation works with mocked VFS
        pakService = new PakService();
        jest.clearAllMocks();
    });

    it('should handle cache miss gracefully', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);

        // Mock worker success to avoid fallback path
        (workerService.executePakParserTask as jest.Mock).mockResolvedValue({
            entries: [],
            buffer: new ArrayBuffer(0)
        });

        await pakService['loadPakInternal'](new ArrayBuffer(0), 'pak0.pak', 'test-id', false);

        expect(cacheService.get).toHaveBeenCalled();
        expect(workerService.executePakParserTask).toHaveBeenCalled();
    });

    it('should handle cache error gracefully', async () => {
        (cacheService.get as jest.Mock).mockRejectedValue(new Error('Cache Error'));

        (workerService.executePakParserTask as jest.Mock).mockResolvedValue({
            entries: [],
            buffer: new ArrayBuffer(0)
        });

        await pakService['loadPakInternal'](new ArrayBuffer(0), 'pak0.pak', 'test-id', false);

        // Should catch error and proceed
        expect(workerService.executePakParserTask).toHaveBeenCalled();
    });

    it('should fallback to main thread parsing on worker failure', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (workerService.executePakParserTask as jest.Mock).mockRejectedValue(new Error('Worker Error'));

        await pakService['loadPakInternal'](new ArrayBuffer(0), 'pak0.pak', 'test-id', false);

        expect(PakArchive.fromArrayBuffer).toHaveBeenCalled();
    });

    it('should handle cache set error', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (workerService.executePakParserTask as jest.Mock).mockResolvedValue({
            entries: [],
            buffer: new ArrayBuffer(0)
        });
        (cacheService.set as jest.Mock).mockRejectedValue(new Error('Set Error'));

        // Mock crypto.subtle.digest for hash generation if needed, or rely on undefined hash
        // The service generates hash if buffer provided.
        // We can just verify it doesn't crash.

        await pakService['loadPakInternal'](new ArrayBuffer(0), 'pak0.pak', 'test-id', false);
    });

    it('should parse file fallback on worker error', async () => {
        (workerService.executeAssetProcessorTask as jest.Mock).mockRejectedValue(new Error('Worker Error'));

        const data = new Uint8Array(10);
        // We need to spy on parseFileFallback (private method) or public parseFile
        // parseFile is what calls the worker

        // Mock file type detection
        // We can pass file type to parseFile? No, it infers from path.

        const result = await pakService.parseFile('test.md2', data);

        // Fallback logic returns { type: 'unknown' } for unhandled types or specific mocked returns?
        // Actually parseFileFallback handles md2 parsing on main thread.
        // But since we mocked quake2ts/engine imports (implicitly via environment or explicit mock),
        // we might need to ensure fallback logic dependencies are mocked if they crash.

        // The fallback logic uses Md2Model.parse etc.
        // We should verify that we entered fallback.
        expect(result).toBeDefined();
        // Since we mocked PakArchive but not Md2Model globally in this test file, let's see.
        // We didn't mock Md2Model.
    });
});
