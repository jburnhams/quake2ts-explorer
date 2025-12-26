

// Mock dependencies
vi.mock('comlink', () => ({
    expose: vi.fn(),
}));

import { expose } from 'comlink';
const mockExpose = expose as vi.Mock;

// Mock engine
vi.mock('@quake2ts/engine', () => ({
    parseMd2: vi.fn(),
    parseMd3: vi.fn(),
    parseBsp: vi.fn(),
}));

import '@/src/workers/indexer.worker';
import * as engine from '@quake2ts/engine';

describe('IndexerWorker', () => {
    let api: any;
    const capturedApi = mockExpose.mock.calls[0]?.[0];

    beforeEach(() => {
        vi.clearAllMocks();
        api = capturedApi;
    });

    it('should analyze MD2', () => {
        (engine.parseMd2 as vi.Mock).mockReturnValue({
            skins: ['skin.pcx', { name: 'skin2.pcx' }]
        });
        const refs = api.analyzeMd2(new ArrayBuffer(0));
        expect(refs).toEqual([
            { path: 'skin.pcx', type: 'texture', context: 'skin' },
            { path: 'skin2.pcx', type: 'texture', context: 'skin' }
        ]);
    });

    it('should handle MD2 parse error', () => {
        (engine.parseMd2 as vi.Mock).mockImplementation(() => { throw new Error('fail'); });
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const refs = api.analyzeMd2(new ArrayBuffer(0));
        expect(refs).toEqual([]);
        expect(spy).toHaveBeenCalledWith('Failed to analyze MD2', expect.any(Error));
    });

    it('should analyze MD3', () => {
        (engine.parseMd3 as vi.Mock).mockReturnValue({
            surfaces: [
                { shaders: [{ name: 'shader1' }] },
                { shaders: [{ name: 'shader2' }] }
            ]
        });
        const refs = api.analyzeMd3(new ArrayBuffer(0));
        expect(refs).toEqual([
            { path: 'shader1', type: 'texture', context: 'shader' },
            { path: 'shader2', type: 'texture', context: 'shader' }
        ]);
    });

    it('should handle MD3 parse error', () => {
        (engine.parseMd3 as vi.Mock).mockImplementation(() => { throw new Error('fail'); });
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const refs = api.analyzeMd3(new ArrayBuffer(0));
        expect(refs).toEqual([]);
        expect(spy).toHaveBeenCalledWith('Failed to analyze MD3', expect.any(Error));
    });

    it('should analyze BSP textures', () => {
        (engine.parseBsp as vi.Mock).mockReturnValue({
            textures: ['tex1', { name: 'tex2' }]
        });
        const refs = api.analyzeBsp(new ArrayBuffer(0));
        expect(refs).toContainEqual({ path: 'tex1', type: 'texture', context: 'surface' });
        expect(refs).toContainEqual({ path: 'tex2', type: 'texture', context: 'surface' });
    });

    it('should analyze BSP entities', () => {
        const entities = [
            { classname: 'info_player_start', origin: '0 0 0' },
            { classname: 'weapon_rocketlauncher', model: 'models/w_rl.md2' }, // model key
            { classname: 'func_door', model: '*1' }, // brush model ignored
            { classname: 'target_speaker', noise: 'sound/misc/test.wav' }, // sound key
            { classname: 'misc_actor', skin: 'skins/actor.pcx' }, // skin key
            { classname: 'misc_test', custom: 'custom/file.tga' } // heuristic
        ];

        (engine.parseBsp as vi.Mock).mockReturnValue({
            textures: [],
            entities: entities
        });

        const refs = api.analyzeBsp(new ArrayBuffer(0));

        expect(refs).toContainEqual({ path: 'models/w_rl.md2', type: 'model', context: 'entity:model|weapon_rocketlauncher' });
        expect(refs).toContainEqual({ path: 'sound/misc/test.wav', type: 'sound', context: 'entity:noise|target_speaker' });
        expect(refs).toContainEqual({ path: 'skins/actor.pcx', type: 'texture', context: 'entity:skin|misc_actor' });
        expect(refs).toContainEqual({ path: 'custom/file.tga', type: 'other', context: 'entity:custom|misc_test' });

        // Ensure *1 is NOT included
        expect(refs.find((r: any) => r.path === '*1')).toBeUndefined();
    });

    it('should handle BSP parse error', () => {
        (engine.parseBsp as vi.Mock).mockImplementation(() => { throw new Error('fail'); });
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const refs = api.analyzeBsp(new ArrayBuffer(0));
        expect(refs).toEqual([]);
        expect(spy).toHaveBeenCalledWith('Failed to analyze BSP', expect.any(Error));
    });

    it('should build and search index', () => {
        api.buildSearchIndex(['path/to/file1.txt', 'other/file2.txt']);
        const results = api.searchFiles('file1');
        expect(results).toEqual(['path/to/file1.txt']);

        expect(api.searchFiles('')).toEqual([]);
        expect(api.searchFiles('missing')).toEqual([]);
    });
});
