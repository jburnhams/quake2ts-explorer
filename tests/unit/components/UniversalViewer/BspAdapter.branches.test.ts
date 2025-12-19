import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { DebugMode } from '@/src/types/debugMode';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mocks
jest.mock('quake2ts/engine', () => {
    const { jest } = require('@jest/globals');
    return {
        Texture2D: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            uploadImage: jest.fn(),
            setParameters: jest.fn()
        })),
        BspSurfacePipeline: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            draw: jest.fn()
        })),
        createBspSurfaces: jest.fn().mockReturnValue([]),
        buildBspGeometry: jest.fn().mockReturnValue({
            surfaces: [],
            lightmaps: []
        }),
        resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(32)),
        applySurfaceState: jest.fn(),
        parseWal: jest.fn(),
        walToRgba: jest.fn(),
        findLeafForPoint: jest.fn(),
        CullFaceMode: { Back: 0 },
        BlendMode: { None: 0 }
    };
});

jest.mock('@/src/utils/collisionAdapter', () => {
    const { jest } = require('@jest/globals');
    return {
        createCollisionModel: jest.fn().mockReturnValue({
            traceBox: jest.fn(),
            traceRay: jest.fn()
        })
    };
});

jest.mock('@/src/components/UniversalViewer/adapters/DebugRenderer', () => {
    const { jest } = require('@jest/globals');
    return {
        DebugRenderer: jest.fn().mockImplementation(() => ({
            setProjectionMatrix: jest.fn(),
            render: jest.fn(),
            clear: jest.fn(),
            addBox: jest.fn()
        }))
    };
});

jest.mock('@/src/components/UniversalViewer/adapters/GizmoRenderer', () => {
    const { jest } = require('@jest/globals');
    return {
        GizmoRenderer: jest.fn().mockImplementation(() => ({
            setMode: jest.fn(),
            render: jest.fn(),
            intersect: jest.fn(),
            setHoveredAxis: jest.fn(),
            setActiveAxis: jest.fn()
        }))
    };
});

jest.mock('@/src/services/entityEditorService', () => {
    const { jest } = require('@jest/globals');
    return {
        EntityEditorService: {
            getInstance: jest.fn().mockReturnValue({
                setEntities: jest.fn(),
                getSelectedEntities: jest.fn().mockReturnValue([]),
                getSelectedEntityIds: jest.fn().mockReturnValue([]),
                selectEntity: jest.fn(),
                deselectAll: jest.fn(),
                getEntity: jest.fn(),
                updateEntity: jest.fn()
            })
        },
        SelectionMode: { Single: 0, Toggle: 1 } // Export SelectionMode directly
    };
});

jest.mock('@/src/utils/surfaceFlagParser', () => {
    const { jest } = require('@jest/globals');
    return {
        getSurfaceFlagNames: jest.fn().mockReturnValue([])
    };
});

describe('BspAdapter Branch Coverage', () => {
    let adapter: BspAdapter;
    let mockGl: any;

    beforeEach(() => {
        mockGl = {
            createShader: jest.fn(),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            getShaderParameter: jest.fn().mockReturnValue(true),
            createProgram: jest.fn(),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn().mockReturnValue(true),
            useProgram: jest.fn(),
            createVertexArray: jest.fn(),
            bindVertexArray: jest.fn(),
            createBuffer: jest.fn(),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            uniform1i: jest.fn(),
            uniform1f: jest.fn(),
            uniform3fv: jest.fn(),
            uniformMatrix4fv: jest.fn(),
            activeTexture: jest.fn(),
            bindTexture: jest.fn(),
            drawElements: jest.fn(),
            enable: jest.fn(),
            disable: jest.fn(),
            depthFunc: jest.fn(),
            cullFace: jest.fn(),
            blendFuncSeparate: jest.fn(),
            getExtension: jest.fn(),
            generateMipmap: jest.fn(),
            canvas: {
                width: 800,
                height: 600
            }
        };

        adapter = new BspAdapter(mockGl);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should throw error for invalid file type', async () => {
        await expect(adapter.load(mockGl, { type: 'unknown' } as any, {} as any, 'test')).rejects.toThrow('Invalid file type');
    });

    it('should handle pickEntity with no map', () => {
        expect(adapter.pickEntity({ origin: [0,0,0], direction: [0,0,1] } as any)).toBeNull();
    });

    it('should handle pickEntity with gizmo intersection', () => {
        // Setup mock gizmo hit
        const mockGizmo = require('@/src/components/UniversalViewer/adapters/GizmoRenderer').GizmoRenderer.mock.instances[0];
        // @ts-ignore
        adapter.gizmoRenderer = {
            intersect: jest.fn().mockReturnValue({ axis: 'x', distance: 10 }),
            setHoveredAxis: jest.fn()
        };

        // Mock selected entity
        const mockEntityService = require('@/src/services/entityEditorService').EntityEditorService.getInstance();
        mockEntityService.getSelectedEntities.mockReturnValue([{ properties: { origin: '0 0 0' } }]);

        // Provide map stub
        // @ts-ignore
        adapter.map = {
            entities: { entities: [] },
            pickEntity: jest.fn()
        };

        const result = adapter.pickEntity({ origin: [0,0,0], direction: [0,0,1] } as any);
        expect(result).not.toBeNull();
    });

    it('should handle pickEntity selection', () => {
        const mockEntity = {};
        // @ts-ignore
        adapter.map = {
            pickEntity: jest.fn().mockReturnValue({ entity: mockEntity }),
            entities: { entities: [mockEntity] }
        };

        const mockEntityService = require('@/src/services/entityEditorService').EntityEditorService.getInstance();

        adapter.pickEntity({ origin: [0,0,0], direction: [0,0,1] } as any, { multiSelect: true });

        expect(mockEntityService.selectEntity).toHaveBeenCalled();
    });

    it('should handle dragging start logic branches', () => {
        // Mock Entity Props variants
        const mockEntityService = require('@/src/services/entityEditorService').EntityEditorService.getInstance();

        // Case 1: Angle property instead of Angles
        mockEntityService.getSelectedEntities.mockReturnValue([{ properties: { origin: '0 0 0', angle: '90' } }]);

        // @ts-ignore
        adapter.gizmoRenderer = {
            intersect: jest.fn().mockReturnValue({ axis: 'z', distance: 10 }),
            setActiveAxis: jest.fn()
        };

        // Trigger drag start
        adapter.onMouseDown({ origin: [0,0,0], direction: [0,0,1] } as any, {} as any);

        // Expect no crash and drag state set (internal)
    });

    it('should render with fullbright and freeze lights', () => {
        // @ts-ignore
        adapter.geometry = {
            surfaces: [{ faceIndex: 0, texture: 'tex', surfaceFlags: 0, vao: { bind: jest.fn() }, indexCount: 0 }],
            lightmaps: []
        };
        // @ts-ignore
        adapter.pipeline = { bind: jest.fn(), draw: jest.fn() };
        // @ts-ignore
        adapter.whiteTexture = { bind: jest.fn() };

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
