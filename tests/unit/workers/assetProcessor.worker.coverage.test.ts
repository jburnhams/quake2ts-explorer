import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock comlink
jest.mock('comlink', () => ({
    expose: jest.fn(),
    transfer: jest.fn((obj) => obj)
}));

import { expose, transfer } from 'comlink';
const mockTransfer = transfer as jest.Mock;

// Mock engine
jest.mock('quake2ts/engine', () => ({
    parseWal: jest.fn(),
    walToRgba: jest.fn(),
    parsePcx: jest.fn(),
    pcxToRgba: jest.fn(),
    parseMd2: jest.fn(),
    groupMd2Animations: jest.fn(),
    parseMd3: jest.fn(),
    parseTga: jest.fn(),
    parseWav: jest.fn(),
    parseBsp: jest.fn(),
}));

jest.mock('@/src/utils/sp2Parser', () => ({
    parseSprite: jest.fn()
}));

// Import worker
import '@/src/workers/assetProcessor.worker';
import * as engine from 'quake2ts/engine';

describe('AssetProcessorWorker Coverage', () => {
    let api: any;

    beforeEach(() => {
        jest.clearAllMocks();
        // expose is called on import. Capture args.
        const mockExpose = expose as jest.Mock;
        // In some environments, module is cached, so expose might not be called again if not reset.
        // But we import it again? No, import is cached.
        // We rely on previous call or mock state.
        if (mockExpose.mock.calls.length > 0) {
             api = mockExpose.mock.calls[0][0];
        }
    });

    it('processWal with multiple mipmap levels', () => {
        if (!api) {
            // Re-require to force expose
             jest.isolateModules(() => {
                 const worker = require('@/src/workers/assetProcessor.worker');
                 // expose is called
             });
             api = (expose as jest.Mock).mock.calls[(expose as jest.Mock).mock.calls.length - 1][0];
        }

        const mockBuffer = new ArrayBuffer(8);
        const mockPalette = new Uint8Array(768);
        const mockTexture = { width: 32, height: 32 };

        // Mock levels with valid buffers to trigger transfer list population
        const mockRgba0 = new Uint8Array(10);
        const mockRgba1 = new Uint8Array(5);
        const mockLevels = [
            { width: 32, height: 32, rgba: mockRgba0 },
            { width: 16, height: 16, rgba: mockRgba1 }
        ];

        (engine.parseWal as jest.Mock).mockReturnValue(mockTexture);
        (engine.walToRgba as jest.Mock).mockReturnValue({ levels: mockLevels });

        const result = api.processWal(mockBuffer, mockPalette);

        // Verify transfer list contains buffers
        expect(mockTransfer).toHaveBeenCalledWith(
            expect.objectContaining({
                mipmaps: mockLevels
            }),
            expect.arrayContaining([
                mockRgba0.buffer,
                mockRgba1.buffer
            ])
        );

        // Verify we hit the loop
        expect(result.mipmaps).toHaveLength(2);
    });
});
