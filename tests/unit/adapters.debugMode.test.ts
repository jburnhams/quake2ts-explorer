import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BspAdapter } from '../../src/components/UniversalViewer/adapters/BspAdapter';
import { Md2Adapter } from '../../src/components/UniversalViewer/adapters/Md2Adapter';
import { Md3Adapter } from '../../src/components/UniversalViewer/adapters/Md3Adapter';
import { DebugMode } from '../../src/types/debugMode';
import { mat4 } from 'gl-matrix';

// Mock DebugRenderer
const mockDebugRendererInstance = {
    clear: jest.fn(),
    addBox: jest.fn(),
    addLine: jest.fn(),
    render: jest.fn(),
    init: jest.fn()
};

jest.mock('../../src/components/UniversalViewer/adapters/DebugRenderer', () => {
    return {
        DebugRenderer: jest.fn().mockImplementation(() => mockDebugRendererInstance)
    };
});

// Mock dependencies
jest.mock('quake2ts/engine', () => ({
    BspSurfacePipeline: jest.fn().mockImplementation(() => ({ bind: jest.fn() })),
    createBspSurfaces: jest.fn().mockReturnValue([]),
    buildBspGeometry: jest.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
    Texture2D: jest.fn().mockImplementation(() => ({
        bind: jest.fn(),
        setParameters: jest.fn(),
        uploadImage: jest.fn(),
    })),
    Md2Pipeline: jest.fn().mockImplementation(() => ({ bind: jest.fn() })),
    Md2MeshBuffers: jest.fn().mockImplementation(() => ({ bind: jest.fn(), update: jest.fn(), indexCount: 0 })),
    Md3Pipeline: jest.fn().mockImplementation(() => ({ bind: jest.fn(), drawSurface: jest.fn() })),
    Md3SurfaceMesh: jest.fn(),
    createAnimationState: jest.fn(),
    advanceAnimation: jest.fn(),
    computeFrameBlend: jest.fn().mockReturnValue({ frame0: 0, frame1: 0, lerp: 0 }),
    parsePcx: jest.fn().mockReturnValue({}),
    pcxToRgba: jest.fn().mockReturnValue({}),
    parseWal: jest.fn(),
    walToRgba: jest.fn(),
    resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(32)),
    applySurfaceState: jest.fn(),
    findLeafForPoint: jest.fn().mockReturnValue(0),
}));

describe('Adapter Debug Modes', () => {
    let mockGl: WebGL2RenderingContext;
    let mockPakService: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGl = {
            createVertexArray: jest.fn(),
            createBuffer: jest.fn(),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            bindVertexArray: jest.fn(),
            createProgram: jest.fn(),
            createShader: jest.fn(),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn().mockReturnValue(true),
            getShaderParameter: jest.fn().mockReturnValue(true),
            getUniformLocation: jest.fn(),
            uniformMatrix4fv: jest.fn(),
            drawArrays: jest.fn(),
            useProgram: jest.fn(),
            activeTexture: jest.fn(),
            generateMipmap: jest.fn(),
            drawElements: jest.fn(),
        } as unknown as WebGL2RenderingContext;

        mockPakService = {
            hasFile: jest.fn().mockReturnValue(false),
            readFile: jest.fn(),
        };
    });

    describe('BspAdapter', () => {
        it('renders bounding boxes in DebugMode.BoundingBoxes', async () => {
            const adapter = new BspAdapter();
            const map = {
                entities: {
                    entities: [{ classname: 'worldspawn' }],
                    getUniqueClassnames: jest.fn()
                },
                models: [{ min: [0,0,0], max: [10,10,10], firstFace: 0, numFaces: 0 }]
            };
            const file = { type: 'bsp', map: map } as any;

            await adapter.load(mockGl, file, mockPakService, 'test.bsp');
            adapter.setDebugMode(DebugMode.BoundingBoxes);
            adapter.render(mockGl, { projectionMatrix: mat4.create() } as any, mat4.create());

            expect(mockDebugRendererInstance.clear).toHaveBeenCalled();
            expect(mockDebugRendererInstance.addBox).toHaveBeenCalled();
            expect(mockDebugRendererInstance.render).toHaveBeenCalled();
        });

        it('does not render debug info in DebugMode.None', async () => {
            const adapter = new BspAdapter();
            const file = { type: 'bsp', map: { entities: { entities: [] }, models: [] } } as any;
            await adapter.load(mockGl, file, mockPakService, 'test.bsp');
            adapter.setDebugMode(DebugMode.None);
            adapter.render(mockGl, { projectionMatrix: mat4.create() } as any, mat4.create());

            expect(mockDebugRendererInstance.render).not.toHaveBeenCalled();
        });

        it('renders PVS cluster box in DebugMode.PVSClusters', async () => {
             const adapter = new BspAdapter();
             const map = {
                 entities: { entities: [], getUniqueClassnames: jest.fn() },
                 models: [],
                 faces: [],
                 planes: [],
                 leafs: [{ cluster: 0, mins: [0,0,0], maxs: [10,10,10] }]
             };
             const file = { type: 'bsp', map: map } as any;

             await adapter.load(mockGl, file, mockPakService, 'test.bsp');
             adapter.setDebugMode(DebugMode.PVSClusters);

             const camera = {
                 projectionMatrix: mat4.create(),
                 position: new Float32Array([0,0,0])
             } as any;

             adapter.render(mockGl, camera, mat4.create());

             expect(mockDebugRendererInstance.addBox).toHaveBeenCalled();
        });

        it('renders collision hulls in DebugMode.CollisionHulls', async () => {
             const adapter = new BspAdapter();
             const map = {
                 entities: { entities: [], getUniqueClassnames: jest.fn() },
                 models: [],
                 faces: [],
                 planes: [],
                 leafs: [
                     { contents: 1, mins: [0,0,0], maxs: [10,10,10] }, // Solid
                     { contents: 32, mins: [20,20,20], maxs: [30,30,30] } // Water
                 ]
             };
             const file = { type: 'bsp', map: map } as any;

             await adapter.load(mockGl, file, mockPakService, 'test.bsp');
             adapter.setDebugMode(DebugMode.CollisionHulls);

             adapter.render(mockGl, { projectionMatrix: mat4.create() } as any, mat4.create());

             // Expect at least two boxes (Solid and Water)
             expect(mockDebugRendererInstance.addBox).toHaveBeenCalledTimes(2);
        });
    });

    describe('Md2Adapter', () => {
        it('renders bounding boxes in DebugMode.BoundingBoxes', async () => {
            const adapter = new Md2Adapter();
            const file = { type: 'md2', model: { skins: [], header: {} }, animations: [] } as any;
            await adapter.load(mockGl, file, mockPakService, 'test.md2');
            adapter.setDebugMode(DebugMode.BoundingBoxes);
            adapter.render(mockGl, { projectionMatrix: mat4.create() } as any, mat4.create());

            expect(mockDebugRendererInstance.addBox).toHaveBeenCalled();
            expect(mockDebugRendererInstance.render).toHaveBeenCalled();
        });

        it('renders normals in DebugMode.Normals', async () => {
            const adapter = new Md2Adapter();
            // Mock a simple triangle model
            const file = {
                type: 'md2',
                model: {
                    skins: [],
                    header: { numFrames: 1 },
                    frames: [{
                        scale: [1,1,1], translate: [0,0,0],
                        vertices: [[0,0,0], [10,0,0], [0,10,0]] // Triangle
                    }],
                    triangles: [[0, 1, 2]]
                },
                animations: []
            } as any;

            await adapter.load(mockGl, file, mockPakService, 'test.md2');
            // Mock animState to ensure we have a frame
            (adapter as any).animState = { sequence: {}, time: 0 };
            (adapter as any).model = file.model;

            adapter.setDebugMode(DebugMode.Normals);
            adapter.render(mockGl, { projectionMatrix: mat4.create() } as any, mat4.create());

            expect(mockDebugRendererInstance.addLine).toHaveBeenCalled();
        });
    });

    describe('Md3Adapter', () => {
        it('renders bounding boxes in DebugMode.BoundingBoxes', async () => {
             const adapter = new Md3Adapter();
             const file = { type: 'md3', model: { header: { numFrames: 10 }, surfaces: [{ name: 's1', shaders: [] }] } } as any;
             await adapter.load(mockGl, file, mockPakService, 'test.md3');
             adapter.setDebugMode(DebugMode.BoundingBoxes);
             adapter.render(mockGl, { projectionMatrix: mat4.create() } as any, mat4.create());

             expect(mockDebugRendererInstance.addBox).toHaveBeenCalled();
             expect(mockDebugRendererInstance.render).toHaveBeenCalled();
        });
    });
});
