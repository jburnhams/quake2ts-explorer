

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

    beforeEach(() => {
        vi.clearAllMocks();
        // expose is called on import. Capture args.
        const mockExpose = expose as vi.Mock;
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
             vi.isolateModules(() => {
                 const worker = require('@/src/workers/assetProcessor.worker');
                 // expose is called
             });
             api = (expose as vi.Mock).mock.calls[(expose as vi.Mock).mock.calls.length - 1][0];
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

        (engine.parseWal as vi.Mock).mockReturnValue(mockTexture);
        (engine.walToRgba as vi.Mock).mockReturnValue({ levels: mockLevels });

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
