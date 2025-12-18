import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('comlink', () => ({
    expose: jest.fn(),
    transfer: jest.fn((obj) => obj)
}));

import { expose, transfer } from 'comlink';
const mockExpose = expose as jest.Mock;
const mockTransfer = transfer as jest.Mock;

// Mock engine
jest.mock('quake2ts/engine', () => ({
    PakArchive: {
        fromArrayBuffer: jest.fn()
    }
}));

// Import worker
import '@/src/workers/pakParser.worker';
import { PakArchive } from 'quake2ts/engine';

describe('PakParserWorker', () => {
    let api: any;

    // Capture API before mocks are cleared
    const capturedApi = mockExpose.mock.calls[0]?.[0];

    beforeEach(() => {
        jest.clearAllMocks();
        api = capturedApi;
    });

    it('should expose API', () => {
        expect(api).toBeDefined();
        expect(api.parsePak).toBeInstanceOf(Function);
    });

    it('parsePak', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockEntries = new Map();
        const mockArchive = { entries: mockEntries };

        (PakArchive.fromArrayBuffer as jest.Mock).mockReturnValue(mockArchive);

        const result = api.parsePak('test.pak', mockBuffer);

        expect(PakArchive.fromArrayBuffer).toHaveBeenCalledWith('test.pak', mockBuffer);
        expect(result).toMatchObject({
            entries: mockEntries,
            buffer: mockBuffer,
            name: 'test.pak'
        });
        expect(mockTransfer).toHaveBeenCalled();
    });
});
