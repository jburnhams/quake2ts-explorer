

// Mock dependencies
vi.mock('comlink', () => ({
    expose: vi.fn(),
    transfer: vi.fn((obj) => obj)
}));

import { expose, transfer } from 'comlink';
const mockExpose = expose as vi.Mock;
const mockTransfer = transfer as vi.Mock;

// Mock engine
vi.mock('quake2ts/engine', () => ({
    parsePcx: vi.fn(),
    pcxToRgba: vi.fn(),
    parseWal: vi.fn(),
    walToRgba: vi.fn(),
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

// Import worker (this will execute the top-level code and call expose)
// We use require to ensure it executes
import '@/src/workers/assetProcessor.worker';
import * as engine from 'quake2ts/engine';
import * as sp2 from '@/src/utils/sp2Parser';

describe('AssetProcessorWorker', () => {
    let api: any;

    // Capture API before mocks are cleared
    const capturedApi = mockExpose.mock.calls[0]?.[0];

    beforeEach(() => {
        vi.clearAllMocks();
        api = capturedApi;
    });

    it('should expose API', () => {
        expect(api).toBeDefined();
        expect(api.processPcx).toBeInstanceOf(Function);
        expect(api.processWal).toBeInstanceOf(Function);
    });

    it('processPcx', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockImage = { width: 10, height: 10 };
        const mockRgba = new Uint8Array(100);

        (engine.parsePcx as vi.Mock).mockReturnValue(mockImage);
        (engine.pcxToRgba as vi.Mock).mockReturnValue(mockRgba);

        const result = api.processPcx(mockBuffer);

        expect(engine.parsePcx).toHaveBeenCalledWith(mockBuffer);
        expect(engine.pcxToRgba).toHaveBeenCalledWith(mockImage);
        expect(result).toMatchObject({
            type: 'pcx',
            image: mockImage,
            rgba: mockRgba,
            width: 10,
            height: 10
        });
        expect(mockTransfer).toHaveBeenCalled();
    });

    it('processWal with palette', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockPalette = new Uint8Array(768);
        const mockTexture = { width: 32, height: 32 };
        const mockRgba = new Uint8Array(1024);
        const mockLevels = [{ width: 32, height: 32, rgba: mockRgba }];

        (engine.parseWal as vi.Mock).mockReturnValue(mockTexture);
        (engine.walToRgba as vi.Mock).mockReturnValue({ levels: mockLevels });

        const result = api.processWal(mockBuffer, mockPalette);

        expect(engine.parseWal).toHaveBeenCalledWith(mockBuffer);
        expect(engine.walToRgba).toHaveBeenCalledWith(mockTexture, mockPalette);
        expect(result).toMatchObject({
            type: 'wal',
            texture: mockTexture,
            rgba: mockRgba,
            mipmaps: mockLevels
        });
    });

    it('processWal without palette', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockTexture = { width: 32, height: 32 };

        (engine.parseWal as vi.Mock).mockReturnValue(mockTexture);

        const result = api.processWal(mockBuffer, null);

        expect(engine.parseWal).toHaveBeenCalledWith(mockBuffer);
        expect(engine.walToRgba).not.toHaveBeenCalled();
        expect(result.rgba).toBeNull();
    });

    it('processTga', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockImage = { width: 64, height: 64, pixels: new Uint8Array(10) };

        (engine.parseTga as vi.Mock).mockReturnValue(mockImage);

        const result = api.processTga(mockBuffer);

        expect(engine.parseTga).toHaveBeenCalledWith(mockBuffer);
        expect(result).toMatchObject({
            type: 'tga',
            image: mockImage,
            rgba: mockImage.pixels
        });
    });

    it('processMd2', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockModel = { frames: [] };
        const mockAnims = {};

        (engine.parseMd2 as vi.Mock).mockReturnValue(mockModel);
        (engine.groupMd2Animations as vi.Mock).mockReturnValue(mockAnims);

        const result = api.processMd2(mockBuffer);

        expect(engine.parseMd2).toHaveBeenCalledWith(mockBuffer);
        expect(engine.groupMd2Animations).toHaveBeenCalledWith(mockModel.frames);
        expect(result).toMatchObject({
            type: 'md2',
            model: mockModel,
            animations: mockAnims
        });
    });

    it('processMd3', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockModel = {};

        (engine.parseMd3 as vi.Mock).mockReturnValue(mockModel);

        const result = api.processMd3(mockBuffer);

        expect(engine.parseMd3).toHaveBeenCalledWith(mockBuffer);
        expect(result).toMatchObject({
            type: 'md3',
            model: mockModel
        });
    });

    it('processSp2', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockModel = {};

        (sp2.parseSprite as vi.Mock).mockReturnValue(mockModel);

        const result = api.processSp2(mockBuffer);

        expect(sp2.parseSprite).toHaveBeenCalledWith(mockBuffer);
        expect(result).toMatchObject({
            type: 'sp2',
            model: mockModel
        });
    });

    it('processWav', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockAudio = {};

        (engine.parseWav as vi.Mock).mockReturnValue(mockAudio);

        const result = api.processWav(mockBuffer);

        expect(engine.parseWav).toHaveBeenCalledWith(mockBuffer);
        expect(result).toMatchObject({
            type: 'wav',
            audio: mockAudio
        });
    });

    it('processBsp', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockMap = {};

        (engine.parseBsp as vi.Mock).mockReturnValue(mockMap);

        const result = api.processBsp(mockBuffer);

        expect(engine.parseBsp).toHaveBeenCalledWith(mockBuffer);
        expect(result).toMatchObject({
            type: 'bsp',
            map: mockMap
        });
    });
});
