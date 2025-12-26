
import { BspAdapter } from '../../src/components/UniversalViewer/adapters/BspAdapter';
import { Md2Adapter } from '../../src/components/UniversalViewer/adapters/Md2Adapter';
import { Md3Adapter } from '../../src/components/UniversalViewer/adapters/Md3Adapter';
import { DebugMode } from '../../src/types/debugMode';
import { mat4 } from 'gl-matrix';

// Mock DebugRenderer
const mockDebugRendererInstance = {
    clear: vi.fn(),
    addBox: vi.fn(),
    addLine: vi.fn(),
    render: vi.fn(),
    init: vi.fn()
};

vi.mock('../../src/components/UniversalViewer/adapters/DebugRenderer', () => {
    return {
        DebugRenderer: vi.fn().mockImplementation(() => mockDebugRendererInstance)
    };
});

// Mock dependencies
vi.mock('@quake2ts/engine', () => ({
    BspSurfacePipeline: vi.fn().mockImplementation(() => ({ bind: vi.fn() })),
    createBspSurfaces: vi.fn().mockReturnValue([]),
    buildBspGeometry: vi.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
    Texture2D: vi.fn().mockImplementation(() => ({
        bind: vi.fn(),
        setParameters: vi.fn(),
        uploadImage: vi.fn(),
    })),
    Md2Pipeline: vi.fn().mockImplementation(() => ({ bind: vi.fn() })),
    Md2MeshBuffers: vi.fn().mockImplementation(() => ({ bind: vi.fn(), update: vi.fn(), indexCount: 0 })),
    Md3Pipeline: vi.fn().mockImplementation(() => ({ bind: vi.fn(), drawSurface: vi.fn() })),
    Md3SurfaceMesh: vi.fn(),
    createAnimationState: vi.fn(),
    advanceAnimation: vi.fn(),
    computeFrameBlend: vi.fn().mockReturnValue({ frame0: 0, frame1: 0, lerp: 0 }),
    parsePcx: vi.fn().mockReturnValue({}),
    pcxToRgba: vi.fn().mockReturnValue({}),
    parseWal: vi.fn(),
    walToRgba: vi.fn(),
    resolveLightStyles: vi.fn().mockReturnValue(new Float32Array(32)),
    applySurfaceState: vi.fn(),
    findLeafForPoint: vi.fn().mockReturnValue(0),
}));

describe('Adapter Debug Modes', () => {
    let mockGl: WebGL2RenderingContext;
    let mockPakService: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGl = {
            createVertexArray: vi.fn(),
            createBuffer: vi.fn(),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            bindVertexArray: vi.fn(),
            createProgram: vi.fn(),
            createShader: vi.fn(),
            shaderSource: vi.fn(),
            compileShader: vi.fn(),
            attachShader: vi.fn(),
            linkProgram: vi.fn(),
            getProgramParameter: vi.fn().mockReturnValue(true),
            getShaderParameter: vi.fn().mockReturnValue(true),
            getUniformLocation: vi.fn(),
            uniformMatrix4fv: vi.fn(),
            drawArrays: vi.fn(),
            useProgram: vi.fn(),
            activeTexture: vi.fn(),
            generateMipmap: vi.fn(),
            drawElements: vi.fn(),
        } as unknown as WebGL2RenderingContext;

        mockPakService = {
            hasFile: vi.fn().mockReturnValue(false),
            readFile: vi.fn(),
        };
    });

    describe('BspAdapter', () => {
        it('renders bounding boxes in DebugMode.BoundingBoxes', async () => {
            const adapter = new BspAdapter();
            const map = {
                entities: {
                    entities: [{ classname: 'worldspawn' }],
                    getUniqueClassnames: vi.fn()
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
                 entities: { entities: [], getUniqueClassnames: vi.fn() },
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
                 entities: { entities: [], getUniqueClassnames: vi.fn() },
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
                        vertices: [
                            { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } },
                            { position: { x: 10, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } },
                            { position: { x: 0, y: 10, z: 0 }, normal: { x: 0, y: 0, z: 1 } }
                        ]
                    }],
                    triangles: [{ vertexIndices: [0, 1, 2], texCoordIndices: [0, 0, 0] }]
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
