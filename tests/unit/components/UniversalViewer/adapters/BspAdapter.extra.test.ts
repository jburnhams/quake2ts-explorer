import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { DebugMode } from '@/src/types/debugMode';
import { ViewerAdapter } from '@/src/components/UniversalViewer/ViewerAdapter';

import { Texture2D } from '@quake2ts/engine';

// Mock dependencies
vi.mock('@quake2ts/engine', () => {
    
    return {
        Texture2D: vi.fn().mockImplementation(() => ({
            bind: vi.fn(),
            uploadImage: vi.fn(),
            uploadData: vi.fn(),
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
            setViewMatrix: vi.fn(),
            render: vi.fn(),
            clear: vi.fn(),
            update: vi.fn(),
            addBoundingBox: vi.fn(),
            addLine: vi.fn(),
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
            }),
            SelectionMode: { Single: 0, Toggle: 1 }
        }
    };
});

vi.mock('@/src/utils/surfaceFlagParser', () => {
    
    return {
        getSurfaceFlagNames: vi.fn().mockReturnValue([])
    };
});

describe('BspAdapter Extra Coverage', () => {
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

    it('should set grid and rotation snap', () => {
        adapter.setGridSnap(32);
        adapter.setRotationSnap(45);
        // Values stored internally
    });

    it('should get surface properties', () => {
        const mockMap = {
            faces: [{ texInfoIndex: 0 }],
            texInfo: [{ texture: 'wall', flags: 0, value: 0, contents: 1 }],
            planes: [],
            entities: { entities: [] }
        };
        // @ts-ignore
        adapter.map = mockMap;
        const props = adapter.getSurfaceProperties(0);
        expect(props).toEqual({ textureName: 'wall', flags: 0, value: 0, contents: 1 });
    });

    it('should handle lightmap highlighting and filtering', () => {
        adapter.highlightLightmapSurfaces(1);
        adapter.setSurfaceFlagFilter('sky');
        adapter.clearHighlights();
    });

    it('should handle lightmap info', () => {
        // @ts-ignore
        adapter.geometry = {
            lightmaps: [{ texture: {} }],
            surfaces: [{ lightmap: { atlasIndex: 0 } }]
        };
        const info = adapter.getLightmapInfo(0);
        expect(info.surfaceCount).toBe(1);
        expect(info.width).toBe(128); // Hardcoded in adapter logic currently
    });

    it('should handle hidden classes', () => {
        // @ts-ignore
        adapter.map = { entities: { entities: [] } };
        // @ts-ignore
        adapter.gl = mockGl;
        adapter.setHiddenClasses(new Set(['func_door']));
        // Should trigger rebuild
    });

    it('should handle key events for gizmo', () => {
        const keyW = new KeyboardEvent('keydown', { key: 'w' });
        const keyE = new KeyboardEvent('keydown', { key: 'e' });
        const keyR = new KeyboardEvent('keydown', { key: 'r' });

        // Mock gizmo renderer explicitly since it's used in handler
        // @ts-ignore
        adapter.gizmoRenderer = { setMode: vi.fn() };

        // @ts-ignore
        adapter.handleKeyDown(keyW);
        // @ts-ignore
        adapter.handleKeyDown(keyE);
        // @ts-ignore
        adapter.handleKeyDown(keyR);
        // @ts-ignore
        expect(adapter.gizmoMode).toBe('scale');
    });

    it('should render debug primitives', () => {
        const mockMap = {
            header: { version: 38 },
            entities: { entities: [
                { classname: 'worldspawn' },
                { classname: 'info_player_start', properties: { origin: '0 0 0' } }
            ] },
            models: [{ min: [0,0,0], max: [10,10,10] }],
            leafs: [
                { contents: 1, mins: [0,0,0], maxs: [10,10,10] } // Solid
            ],
            planes: [{ normal: [0,1,0] }],
            faces: [{ planeIndex: 0 }]
        };

        // @ts-ignore
        adapter.map = mockMap;
        // @ts-ignore
        adapter.isLoaded = true;

        // Mock geometry
        // @ts-ignore
        adapter.geometry = {
            surfaces: [{ faceIndex: 0, texture: 'tex', surfaceFlags: 0, vao: { bind: vi.fn() }, indexCount: 0 }],
            lightmaps: []
        };
        // @ts-ignore
        adapter.pipeline = { bind: vi.fn(), draw: vi.fn() };
        // @ts-ignore
        adapter.debugRenderer = {
            clear: vi.fn(),
            addBox: vi.fn(),
            addLine: vi.fn(),
            render: vi.fn()
        };

        const camera = {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            projectionMatrix: new Float32Array(16),
            fov: 90,
            aspectRatio: 1.33
        };

        // Test various debug modes
        adapter.setDebugMode(DebugMode.BoundingBoxes);
        adapter.render(mockGl, camera as any, new Float32Array(16));

        adapter.setDebugMode(DebugMode.CollisionHulls);
        adapter.render(mockGl, camera as any, new Float32Array(16));

        adapter.setDebugMode(DebugMode.Normals);
        // @ts-ignore
        adapter.surfaces = [{ faceIndex: 0, vertices: [0,0,0, 1,0,0, 0,1,0] }]; // Mock surfaces for normals
        adapter.render(mockGl, camera as any, new Float32Array(16));
    });

    it('should handle dragging (translate)', () => {
        // Setup mocks
        // @ts-ignore
        adapter.gizmoRenderer = {
            intersect: vi.fn().mockReturnValue({ axis: 'x', distance: 10 }),
            setActiveAxis: vi.fn(),
            setHoveredAxis: vi.fn(),
            setMode: vi.fn()
        };

        // Mock entity service
        const mockEntityService = require('@/src/services/entityEditorService').EntityEditorService.getInstance();
        mockEntityService.getSelectedEntities.mockReturnValue([{ properties: { origin: '0 0 0' } }]);
        mockEntityService.getSelectedEntityIds.mockReturnValue([0]);
        mockEntityService.getEntity.mockReturnValue({ properties: { origin: '0 0 0' } });

        // Set translate mode
        const keyW = new KeyboardEvent('keydown', { key: 'w' });
        // @ts-ignore
        adapter.handleKeyDown(keyW);

        // Mouse Down
        const ray = { origin: [0,0,10], direction: [0,0,-1] };
        adapter.onMouseDown(ray as any, {} as any);

        // Mouse Move
        adapter.onMouseMove(ray as any, { shiftKey: true } as any);

        expect(mockEntityService.updateEntity).toHaveBeenCalled();

        // Mouse Up
        adapter.onMouseUp(ray as any, {} as any);
    });

    it('should handle dragging (rotate)', () => {
        // Setup mocks
        // @ts-ignore
        adapter.gizmoRenderer = {
            intersect: vi.fn().mockReturnValue({ axis: 'z', distance: 10 }),
            setActiveAxis: vi.fn(),
            setHoveredAxis: vi.fn(),
            setMode: vi.fn()
        };

        const mockEntityService = require('@/src/services/entityEditorService').EntityEditorService.getInstance();
        mockEntityService.getSelectedEntities.mockReturnValue([{ properties: { origin: '0 0 0', angles: '0 0 0' } }]);

        // Set rotate mode
        const keyE = new KeyboardEvent('keydown', { key: 'e' });
        // @ts-ignore
        adapter.handleKeyDown(keyE);

        // Mouse Down
        const ray = { origin: [10,10,10], direction: [-1,-1,-1] };
        adapter.onMouseDown(ray as any, {} as any);

        // Mouse Move
        adapter.onMouseMove(ray as any, { shiftKey: true } as any);

        expect(mockEntityService.updateEntity).toHaveBeenCalled();

        // Mouse Up
        adapter.onMouseUp(ray as any, {} as any);
    });
});
