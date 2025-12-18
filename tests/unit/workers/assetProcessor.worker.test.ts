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
    parsePcx: jest.fn(),
    pcxToRgba: jest.fn(),
    parseWal: jest.fn(),
    walToRgba: jest.fn(),
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
        jest.clearAllMocks();
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

        (engine.parsePcx as jest.Mock).mockReturnValue(mockImage);
        (engine.pcxToRgba as jest.Mock).mockReturnValue(mockRgba);

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

        (engine.parseWal as jest.Mock).mockReturnValue(mockTexture);
        (engine.walToRgba as jest.Mock).mockReturnValue({ levels: mockLevels });

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

        (engine.parseWal as jest.Mock).mockReturnValue(mockTexture);

        const result = api.processWal(mockBuffer, null);

        expect(engine.parseWal).toHaveBeenCalledWith(mockBuffer);
        expect(engine.walToRgba).not.toHaveBeenCalled();
        expect(result.rgba).toBeNull();
    });

    it('processTga', () => {
        const mockBuffer = new ArrayBuffer(8);
        const mockImage = { width: 64, height: 64, pixels: new Uint8Array(10) };

        (engine.parseTga as jest.Mock).mockReturnValue(mockImage);

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

        (engine.parseMd2 as jest.Mock).mockReturnValue(mockModel);
        (engine.groupMd2Animations as jest.Mock).mockReturnValue(mockAnims);

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

        (engine.parseMd3 as jest.Mock).mockReturnValue(mockModel);

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

        (sp2.parseSprite as jest.Mock).mockReturnValue(mockModel);

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

        (engine.parseWav as jest.Mock).mockReturnValue(mockAudio);

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

        (engine.parseBsp as jest.Mock).mockReturnValue(mockMap);

        const result = api.processBsp(mockBuffer);

        expect(engine.parseBsp).toHaveBeenCalledWith(mockBuffer);
        expect(result).toMatchObject({
            type: 'bsp',
            map: mockMap
        });
    });
});
