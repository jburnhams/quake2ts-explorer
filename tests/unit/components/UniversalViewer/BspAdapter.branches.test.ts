import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { DebugMode } from '@/src/types/debugMode';
import { GizmoRenderer } from '@/src/components/UniversalViewer/adapters/GizmoRenderer';
import { EntityEditorService } from '@/src/services/entityEditorService';
import type { Mock } from 'vitest';

// Mocks
vi.mock('@quake2ts/engine', () => {
    
    return {
        Texture2D: vi.fn().mockImplementation(() => ({
            bind: vi.fn(),
            uploadImage: vi.fn(),
            setParameters: vi.fn()
        })),
        BspSurfacePipeline: vi.fn().mockImplementation(() => ({
            bind: vi.fn(),
            draw: vi.fn()
        })),
        createBspSurfaces: vi.fn().mockReturnValue([]),
        buildBspGeometry: vi.fn().mockReturnValue({
            surfaces: [],
            lightmaps: []
        }),
        resolveLightStyles: vi.fn().mockReturnValue(new Float32Array(32)),
        applySurfaceState: vi.fn(),
        parseWal: vi.fn(),
        walToRgba: vi.fn(),
        findLeafForPoint: vi.fn(),
        CullFaceMode: { Back: 0 },
        BlendMode: { None: 0 }
    };
});

vi.mock('@/src/utils/collisionAdapter', () => {
    
    return {
        createCollisionModel: vi.fn().mockReturnValue({
            traceBox: vi.fn(),
            traceRay: vi.fn()
        })
    };
});

vi.mock('@/src/components/UniversalViewer/adapters/DebugRenderer', () => {
    
    return {
        DebugRenderer: vi.fn().mockImplementation(() => ({
            setProjectionMatrix: vi.fn(),
            render: vi.fn(),
            clear: vi.fn(),
            addBox: vi.fn()
        }))
    };
});

vi.mock('@/src/components/UniversalViewer/adapters/GizmoRenderer', () => {
    
    return {
        GizmoRenderer: vi.fn().mockImplementation(() => ({
            setMode: vi.fn(),
            render: vi.fn(),
            intersect: vi.fn(),
            setHoveredAxis: vi.fn(),
            setActiveAxis: vi.fn()
        }))
    };
});

vi.mock('@/src/services/entityEditorService', () => {
    
    return {
        EntityEditorService: {
            getInstance: vi.fn().mockReturnValue({
                setEntities: vi.fn(),
                getSelectedEntities: vi.fn().mockReturnValue([]),
                getSelectedEntityIds: vi.fn().mockReturnValue([]),
                selectEntity: vi.fn(),
                deselectAll: vi.fn(),
                getEntity: vi.fn(),
                updateEntity: vi.fn()
            })
        },
        SelectionMode: { Single: 0, Toggle: 1 } // Export SelectionMode directly
    };
});

vi.mock('@/src/utils/surfaceFlagParser', () => {
    
    return {
        getSurfaceFlagNames: vi.fn().mockReturnValue([])
    };
});

describe('BspAdapter Branch Coverage', () => {
    let adapter: BspAdapter;
    let mockGl: any;

    beforeEach(() => {
        mockGl = {
            createShader: vi.fn(),
            shaderSource: vi.fn(),
            compileShader: vi.fn(),
            getShaderParameter: vi.fn().mockReturnValue(true),
            createProgram: vi.fn(),
            attachShader: vi.fn(),
            linkProgram: vi.fn(),
            getProgramParameter: vi.fn().mockReturnValue(true),
            useProgram: vi.fn(),
            createVertexArray: vi.fn(),
            bindVertexArray: vi.fn(),
            createBuffer: vi.fn(),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            uniform1i: vi.fn(),
            uniform1f: vi.fn(),
            uniform3fv: vi.fn(),
            uniformMatrix4fv: vi.fn(),
            activeTexture: vi.fn(),
            bindTexture: vi.fn(),
            drawElements: vi.fn(),
            enable: vi.fn(),
            disable: vi.fn(),
            depthFunc: vi.fn(),
            cullFace: vi.fn(),
            blendFuncSeparate: vi.fn(),
            getExtension: vi.fn(),
            generateMipmap: vi.fn(),
            canvas: {
                width: 800,
                height: 600
            }
        };

        adapter = new BspAdapter(mockGl);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should throw error for invalid file type', async () => {
        await expect(adapter.load(mockGl, { type: 'unknown' } as any, {} as any, 'test')).rejects.toThrow('Invalid file type');
    });

    it('should handle pickEntity with no map', () => {
        expect(adapter.pickEntity({ origin: [0,0,0], direction: [0,0,1] } as any)).toBeNull();
    });

    it('should handle pickEntity with gizmo intersection', () => {
        // Setup mock gizmo hit
        // const mockGizmo = (GizmoRenderer as unknown as Mock).mock.instances[0];
        // @ts-ignore
        adapter.gizmoRenderer = {
            intersect: vi.fn().mockReturnValue({ axis: 'x', distance: 10 }),
            setHoveredAxis: vi.fn()
        };

        // Mock selected entity
        const mockEntityService = (EntityEditorService.getInstance as Mock)();
        mockEntityService.getSelectedEntities.mockReturnValue([{ properties: { origin: '0 0 0' } }]);

        // Provide map stub
        // @ts-ignore
        adapter.map = {
            entities: { entities: [] },
            pickEntity: vi.fn()
        };

        const result = adapter.pickEntity({ origin: [0,0,0], direction: [0,0,1] } as any);
        expect(result).not.toBeNull();
    });

    it('should handle pickEntity selection', () => {
        const mockEntity = {};
        // @ts-ignore
        adapter.map = {
            pickEntity: vi.fn().mockReturnValue({ entity: mockEntity }),
            entities: { entities: [mockEntity] }
        };

        const mockEntityService = (EntityEditorService.getInstance as Mock)();

        adapter.pickEntity({ origin: [0,0,0], direction: [0,0,1] } as any, { multiSelect: true });

        expect(mockEntityService.selectEntity).toHaveBeenCalled();
    });

    it('should handle dragging start logic branches', () => {
        // Mock Entity Props variants
        const mockEntityService = (EntityEditorService.getInstance as Mock)();

        // Case 1: Angle property instead of Angles
        mockEntityService.getSelectedEntities.mockReturnValue([{ properties: { origin: '0 0 0', angle: '90' } }]);

        // @ts-ignore
        adapter.gizmoRenderer = {
            intersect: vi.fn().mockReturnValue({ axis: 'z', distance: 10 }),
            setActiveAxis: vi.fn()
        };

        // Trigger drag start
        adapter.onMouseDown({ origin: [0,0,0], direction: [0,0,1] } as any, {} as any);

        // Expect no crash and drag state set (internal)
    });

    it('should render with fullbright and freeze lights', () => {
        // @ts-ignore
        adapter.geometry = {
            surfaces: [{ faceIndex: 0, texture: 'tex', surfaceFlags: 0, vao: { bind: vi.fn() }, indexCount: 0 }],
            lightmaps: []
        };
        // @ts-ignore
        adapter.pipeline = { bind: vi.fn(), draw: vi.fn() };
        // @ts-ignore
        adapter.whiteTexture = { bind: vi.fn() };

        adapter.setRenderOptions({ fullbright: true, freezeLights: true, color: [1,1,1] });

        const camera = {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            projectionMatrix: new Float32Array(16),
            fov: 90,
            aspectRatio: 1.33
        };

        adapter.render(mockGl, camera as any, new Float32Array(16));
    });
});
