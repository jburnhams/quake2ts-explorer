
// Mock comlink
vi.mock('comlink', () => ({
    expose: vi.fn(),
    transfer: vi.fn((obj) => obj)
}));

import { expose, transfer } from 'comlink';
const mockTransfer = transfer as vi.Mock;

// Mock engine
vi.mock('@quake2ts/engine', () => ({
    parseWal: vi.fn(),
    walToRgba: vi.fn(),
    parsePcx: vi.fn(),
    pcxToRgba: vi.fn(),
    parseMd2: vi.fn(),
    groupMd2Animations: vi.fn(),
    parseMd3: vi.fn(),
    parseTga: vi.fn(),
    parseWav: vi.fn(),
    parseBsp: vi.fn(),
}));

vi.mock('@/src/utils/sp2Parser', () => ({
    parseSprite: vi.fn()
}));

// Import worker
import '@/src/workers/assetProcessor.worker';
import * as engine from '@quake2ts/engine';

describe('AssetProcessorWorker Coverage', () => {
    let api: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        // expose is called on import. Capture args.
        // Re-import to ensure expose is called again if possible, or grab from mock.
        // Jest/Vitest module cache handling:
        await vi.isolateModulesAsync(async () => {
             await import('@/src/workers/assetProcessor.worker');
        });
        const mockExpose = expose as vi.Mock;
        if (mockExpose.mock.calls.length > 0) {
             api = mockExpose.mock.calls[mockExpose.mock.calls.length - 1][0];
        }
    });

    it('processWal with multiple mipmap levels', () => {
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

        (engine.parseWal as vi.Mock).mockReturnValue(mockTexture);
        (engine.walToRgba as vi.Mock).mockReturnValue({ levels: mockLevels });

        const result = api.processWal(mockBuffer, mockPalette);

        expect(result).toMatchObject({
            type: 'wal',
            texture: mockTexture,
            rgba: mockRgba0,
            mipmaps: mockLevels
        });

        // Check transfer list (second arg to transfer)
        expect(mockTransfer).toHaveBeenCalled();
        const transferList = mockTransfer.mock.calls[0][1];
        expect(transferList).toContain(mockRgba0.buffer);
        expect(transferList).toContain(mockRgba1.buffer);
    });

    it('processPcx handles SharedArrayBuffer safely', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockImage = { width: 10, height: 10 };
        // Simulate SharedArrayBuffer
        const mockRgba = new Uint8Array(new SharedArrayBuffer(100));

        (engine.parsePcx as vi.Mock).mockReturnValue(mockImage);
        (engine.pcxToRgba as vi.Mock).mockReturnValue(mockRgba);

        api.processPcx(mockBuffer);

        const transferList = mockTransfer.mock.calls[0][1];
        expect(transferList).not.toContain(mockRgba.buffer);
    });
});
