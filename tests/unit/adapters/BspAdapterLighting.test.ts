import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { BspSurfacePipeline, createBspSurfaces, buildBspGeometry, Texture2D, resolveLightStyles, BspMap } from 'quake2ts/engine';
import { PakService } from '@/src/services/pakService';
import { ParsedFile } from '@/src/services/pakService';
import { RenderOptions } from '@/src/components/UniversalViewer/adapters/types';
import { DebugMode } from '@/src/types/debugMode';
import { mat4, vec3 } from 'gl-matrix';

// Setup mock return value accessible in scope
const mockPipelineBind = jest.fn().mockReturnValue({});

// Mock dependencies
jest.mock('quake2ts/engine', () => {
    // Need to use local vars inside factory or require inside
    const glMatrix = jest.requireActual('gl-matrix');
    return {
        Camera: jest.fn().mockImplementation(() => ({
            projectionMatrix: glMatrix.mat4.create(),
            position: glMatrix.vec3.fromValues(0, 0, 0),
            updateMatrices: jest.fn(),
        })),
        BspSurfacePipeline: jest.fn().mockImplementation(() => {
            return {
                bind: mockPipelineBind
            };
        }),
        createBspSurfaces: jest.fn().mockReturnValue([]),
        buildBspGeometry: jest.fn().mockReturnValue({
            surfaces: [
                { texture: 'tex1', indexCount: 6, vao: { bind: jest.fn() }, lightmap: { atlasIndex: 0 } }
            ],
            lightmaps: [
                { texture: { bind: jest.fn() } }
            ]
        }),
        Texture2D: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            uploadImage: jest.fn(),
            setParameters: jest.fn(),
        })),
        parseWal: jest.fn(),
        walToRgba: jest.fn().mockReturnValue({ levels: [{ width: 32, height: 32, rgba: new Uint8Array(1024) }] }),
        resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(32).fill(1.0)),
        applySurfaceState: jest.fn(),
        findLeafForPoint: jest.fn().mockReturnValue(0),
    };
});

jest.mock('@/src/components/UniversalViewer/adapters/DebugRenderer', () => {
    return {
        DebugRenderer: jest.fn().mockImplementation(() => ({
            clear: jest.fn(),
            addBox: jest.fn(),
            addLine: jest.fn(),
            render: jest.fn(),
        }))
    };
});

describe('BspAdapter Lighting', () => {
    let adapter: BspAdapter;
    let mockGl: WebGL2RenderingContext;
    let mockPakService: PakService;

    beforeEach(async () => {
        mockPipelineBind.mockClear();

        // Mock WebGL context
        mockGl = {
            createTexture: jest.fn(),
            bindTexture: jest.fn(),
            texImage2D: jest.fn(),
            generateMipmap: jest.fn(),
            texParameteri: jest.fn(),
            activeTexture: jest.fn(),
            drawElements: jest.fn(),
            // Add other needed GL methods mock
            LINEAR: 9729,
            LINEAR_MIPMAP_LINEAR: 9987,
            REPEAT: 10497,
            RGBA: 6408,
            UNSIGNED_BYTE: 5121,
            TEXTURE0: 33984,
            TEXTURE1: 33985,
            TEXTURE_2D: 3553,
            LINES: 1,
            TRIANGLES: 4,
            UNSIGNED_SHORT: 5123,
        } as unknown as WebGL2RenderingContext;

        mockPakService = {
            hasFile: jest.fn().mockReturnValue(true),
            readFile: jest.fn().mockResolvedValue(new Uint8Array(100)),
            getPalette: jest.fn().mockReturnValue(new Uint8Array(768)),
        } as unknown as PakService;

        adapter = new BspAdapter();
        const mockMap = {
             entities: { entities: [], getUniqueClassnames: jest.fn().mockReturnValue([]) },
             models: [],
             faces: [],
             planes: [],
             leafs: []
        } as unknown as BspMap;

        await adapter.load(mockGl, { type: 'bsp', map: mockMap } as ParsedFile, mockPakService, 'maps/test.bsp');
    });

    it('applies brightness by scaling light styles', () => {
        const camera = new (jest.requireMock('quake2ts/engine').Camera)();
        const viewMatrix = mat4.create();

        // Default brightness (1.0)
        adapter.render(mockGl, camera, viewMatrix);

        expect(mockPipelineBind).toHaveBeenCalled();
        let lastCall = mockPipelineBind.mock.calls[mockPipelineBind.mock.calls.length - 1][0];
        expect(lastCall.styleValues[0]).toBe(1.0);

        // Set brightness to 2.0
        adapter.setRenderOptions({ mode: 'textured', color: [1,1,1], brightness: 2.0 });
        adapter.render(mockGl, camera, viewMatrix);

        lastCall = mockPipelineBind.mock.calls[mockPipelineBind.mock.calls.length - 1][0];
        expect(lastCall.styleValues[0]).toBe(2.0);
    });

    it('enables fullbright mode', () => {
        const camera = new (jest.requireMock('quake2ts/engine').Camera)();
        const viewMatrix = mat4.create();

        // Enable fullbright
        adapter.setRenderOptions({ mode: 'textured', color: [1,1,1], fullbright: true });
        adapter.render(mockGl, camera, viewMatrix);

        expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE1);
    });
});
