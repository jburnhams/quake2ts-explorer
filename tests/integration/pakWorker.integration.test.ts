import { workerService } from '@/src/services/workerService';
import { PakArchive } from 'quake2ts/engine';
import { PakService } from '@/src/services/pakService';
import { WorkerPakArchive } from '@/src/utils/WorkerPakArchive';

// Mock dependencies
jest.mock('@/src/services/workerService');

describe('PakService with Worker Integration', () => {
    let pakService: PakService;

    beforeEach(() => {
        pakService = new PakService();
        jest.clearAllMocks();
    });

    it('should parse PAK using workerService', async () => {
        const dummyBuffer = new ArrayBuffer(1024);
        const dummyEntries = new Map<string, any>();
        dummyEntries.set('test.txt', { offset: 100, length: 50 });

        const mockParsePak = jest.fn().mockResolvedValue({
            entries: dummyEntries,
            buffer: dummyBuffer,
            name: 'test-pak'
        });

        (workerService.getPakParser as jest.Mock).mockReturnValue({
            parsePak: mockParsePak
        });

        const file = {
            name: 'test.pak',
            arrayBuffer: jest.fn().mockResolvedValue(dummyBuffer)
        } as unknown as File;

        const archive = await pakService.loadPakFile(file);

        expect(mockParsePak).toHaveBeenCalled();
        expect(archive).toBeInstanceOf(WorkerPakArchive);
        expect(archive.has('test.txt')).toBe(true);
    });

    it('should fallback to main thread if worker fails', async () => {
        const dummyBuffer = new ArrayBuffer(1024);

        // Mock PakArchive.fromArrayBuffer returning an object that satisfies VFS
        const mockFromArrayBuffer = jest.spyOn(PakArchive, 'fromArrayBuffer').mockImplementation((name, buffer) => {
            return {
                name,
                buffer,
                entries: new Map(),
                readFile: () => null,
                list: () => [],
                has: () => false,
                getEntries: () => [],
                listEntries: () => [],
                validate: () => ({ isValid: true, errors: [] })
            } as unknown as PakArchive;
        });

        const mockParsePak = jest.fn().mockRejectedValue(new Error('Worker crashed'));

        (workerService.getPakParser as jest.Mock).mockReturnValue({
            parsePak: mockParsePak
        });

        const file = {
            name: 'test.pak',
            arrayBuffer: jest.fn().mockResolvedValue(dummyBuffer)
        } as unknown as File;

        const archive = await pakService.loadPakFile(file);

        expect(mockParsePak).toHaveBeenCalled();
        expect(mockFromArrayBuffer).toHaveBeenCalled();
    });
});
