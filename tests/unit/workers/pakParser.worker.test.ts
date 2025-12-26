
// Mock dependencies
vi.mock('comlink', () => ({
    expose: vi.fn(),
    transfer: vi.fn((obj) => obj)
}));

import { expose, transfer } from 'comlink';
const mockExpose = expose as vi.Mock;
const mockTransfer = transfer as vi.Mock;

// Mock engine
vi.mock('@quake2ts/engine', () => ({
    PakArchive: {
        fromArrayBuffer: vi.fn()
    }
}));

// Import worker
// @ts-ignore
import { parsePak } from '@/src/workers/pakParser.worker';
import { PakArchive } from '@quake2ts/engine';

describe('PakParserWorker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should expose API', () => {
        expect(parsePak).toBeInstanceOf(Function);
    });

    it('parsePak', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockEntries = new Map();
        const mockArchive = { entries: mockEntries };

        (PakArchive.fromArrayBuffer as vi.Mock).mockReturnValue(mockArchive);

        const result = parsePak('test.pak', mockBuffer);

        expect(PakArchive.fromArrayBuffer).toHaveBeenCalledWith('test.pak', mockBuffer);
        expect(result).toMatchObject({
            entries: mockEntries,
            buffer: mockBuffer,
            name: 'test.pak'
        });
        expect(mockTransfer).toHaveBeenCalled();
    });
});
