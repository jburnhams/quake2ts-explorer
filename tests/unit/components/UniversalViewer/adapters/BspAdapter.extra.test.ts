import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { DebugMode } from '@/src/types/debugMode';
import { ViewerAdapter } from '@/src/components/UniversalViewer/ViewerAdapter';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Texture2D } from 'quake2ts/engine';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
    const { jest } = require('@jest/globals');
    return {
        Texture2D: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            uploadImage: jest.fn(),
            uploadData: jest.fn(),
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
            setViewMatrix: jest.fn(),
            render: jest.fn(),
            clear: jest.fn(),
            update: jest.fn(),
            addBoundingBox: jest.fn(),
            addLine: jest.fn(),
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
            }),
            SelectionMode: { Single: 0, Toggle: 1 }
        }
    };
});

jest.mock('@/src/utils/surfaceFlagParser', () => {
    const { jest } = require('@jest/globals');
    return {
        getSurfaceFlagNames: jest.fn().mockReturnValue([])
    };
});

describe('BspAdapter Extra Coverage', () => {
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
        adapter.gizmoRenderer = { setMode: jest.fn() };

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
            surfaces: [{ faceIndex: 0, texture: 'tex', surfaceFlags: 0, vao: { bind: jest.fn() }, indexCount: 0 }],
            lightmaps: []
        };
        // @ts-ignore
        adapter.pipeline = { bind: jest.fn(), draw: jest.fn() };
        // @ts-ignore
        adapter.debugRenderer = {
            clear: jest.fn(),
            addBox: jest.fn(),
            addLine: jest.fn(),
            render: jest.fn()
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
            intersect: jest.fn().mockReturnValue({ axis: 'x', distance: 10 }),
            setActiveAxis: jest.fn(),
            setHoveredAxis: jest.fn(),
            setMode: jest.fn()
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
            intersect: jest.fn().mockReturnValue({ axis: 'z', distance: 10 }),
            setActiveAxis: jest.fn(),
            setHoveredAxis: jest.fn(),
            setMode: jest.fn()
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
