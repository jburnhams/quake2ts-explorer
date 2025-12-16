import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { EntityEditorService } from '@/src/services/entityEditorService';
import { vec3 } from 'gl-matrix';
import { GizmoRenderer } from '@/src/components/UniversalViewer/adapters/GizmoRenderer';
import { TransformUtils } from '@/src/utils/transformUtils';

// Mocks
jest.mock('quake2ts/engine', () => {
    return {
        BspSurfacePipeline: jest.fn().mockImplementation(() => ({
            bind: jest.fn().mockReturnValue({}),
        })),
        createBspSurfaces: jest.fn().mockReturnValue([]),
        buildBspGeometry: jest.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
        Texture2D: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            uploadImage: jest.fn(),
            setParameters: jest.fn(),
        })),
        resolveLightStyles: jest.fn().mockReturnValue([]),
        applySurfaceState: jest.fn(),
        findLeafForPoint: jest.fn().mockReturnValue(-1),
    };
});

// Mock WebGL context
const glMock = {
    createShader: jest.fn(),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn().mockReturnValue(true),
    createProgram: jest.fn(),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getUniformLocation: jest.fn(),
    createVertexArray: jest.fn(),
    bindVertexArray: jest.fn(),
    createBuffer: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    deleteShader: jest.fn(),
    useProgram: jest.fn(),
    uniformMatrix4fv: jest.fn(),
    uniform3fv: jest.fn(),
    uniform4fv: jest.fn(),
    drawArrays: jest.fn(),
    disable: jest.fn(),
    enable: jest.fn(),
    TEXTURE0: 0,
    TEXTURE1: 1,
    RGBA: 123,
    UNSIGNED_BYTE: 123,
    NEAREST: 123,
    CLAMP_TO_EDGE: 123,
    LINEAR_MIPMAP_LINEAR: 123,
    LINEAR: 123,
    REPEAT: 123,
    LINES: 1,
    LINE_STRIP: 2,
    TRIANGLES: 3,
    STATIC_DRAW: 1,
    ARRAY_BUFFER: 1,
} as unknown as WebGL2RenderingContext;

// Mock GizmoRenderer
jest.mock('@/src/components/UniversalViewer/adapters/GizmoRenderer');

describe('BspAdapter Manipulation', () => {
    let adapter: BspAdapter;
    let mockGizmoRenderer: any;

    beforeEach(() => {
        jest.clearAllMocks();
        EntityEditorService.getInstance().reset();

        adapter = new BspAdapter();

        const mapMock = {
            entities: {
                entities: [
                    {
                        classname: 'info_player_start',
                        properties: {
                            origin: '100 0 0',
                            angles: '0 90 0',
                            angle: '90'
                        }
                    }
                ],
                getUniqueClassnames: () => ['info_player_start']
            },
            faces: [],
            planes: [],
            models: [],
            leafs: []
        };

        adapter.loadMap(glMock, mapMock as any, {} as any);
        mockGizmoRenderer = (GizmoRenderer as jest.Mock).mock.instances[0];
    });

    it('handles translation drag', () => {
        EntityEditorService.getInstance().selectEntity(0);
        mockGizmoRenderer.intersect.mockReturnValue({ axis: 'x', distance: 10 });

        jest.spyOn(TransformUtils, 'projectRayToLine').mockReturnValue({
            point: vec3.fromValues(110, 0, 0),
            t: 0
        });

        const ray = { origin: [0, 0, 100], direction: [0, 0, -1] } as any;

        adapter.onMouseDown(ray, {} as any);
        expect(mockGizmoRenderer.setActiveAxis).toHaveBeenCalledWith('x');

        jest.spyOn(TransformUtils, 'projectRayToLine').mockReturnValue({
            point: vec3.fromValues(120, 0, 0),
            t: 0
        });

        adapter.onMouseMove(ray, { shiftKey: false } as any);

        const entity = EntityEditorService.getInstance().getEntity(0);
        expect(entity?.properties?.origin).toBe('110 0 0');
    });

    it('handles rotation drag', () => {
        // Manually switch mode as we didn't use adapter.load() which attaches listeners
        (adapter as any).handleKeyDown({ key: 'e' } as any);

        EntityEditorService.getInstance().selectEntity(0);

        mockGizmoRenderer.intersect.mockReturnValue({ axis: 'z', distance: 10 });

        jest.spyOn(TransformUtils, 'projectRayToPlane').mockReturnValue({
            point: vec3.fromValues(110, 0, 0),
            t: 0
        });

        const ray = { origin: [0, 0, 100], direction: [0, 0, -1] } as any;

        adapter.onMouseDown(ray, {} as any);
        expect(mockGizmoRenderer.setActiveAxis).toHaveBeenCalledWith('z');

        jest.spyOn(TransformUtils, 'projectRayToPlane').mockReturnValue({
            point: vec3.fromValues(100, 10, 0),
            t: 0
        });

        adapter.onMouseMove(ray, { shiftKey: false } as any);

        const entity = EntityEditorService.getInstance().getEntity(0);
        const angles = entity?.properties?.angles?.split(' ').map(parseFloat);

        expect(angles?.[1]).toBeCloseTo(180);
        expect(entity?.properties?.angle).toBe('180');
    });

    it('snaps rotation with shift key', () => {
        (adapter as any).handleKeyDown({ key: 'e' } as any);

        EntityEditorService.getInstance().selectEntity(0);

        mockGizmoRenderer.intersect.mockReturnValue({ axis: 'z', distance: 10 });

        jest.spyOn(TransformUtils, 'projectRayToPlane').mockReturnValue({
            point: vec3.fromValues(110, 0, 0),
            t: 0
        });
        adapter.onMouseDown({} as any, {} as any);

        // Move 13 degrees
        const rad13 = 13 * Math.PI / 180;
        jest.spyOn(TransformUtils, 'projectRayToPlane').mockReturnValue({
            point: vec3.fromValues(100 + 10 * Math.cos(rad13), 10 * Math.sin(rad13), 0),
            t: 0
        });

        adapter.onMouseMove({} as any, { shiftKey: true } as any);

        const entity = EntityEditorService.getInstance().getEntity(0);
        const angles = entity?.properties?.angles?.split(' ').map(parseFloat);

        expect(angles?.[1]).toBe(105);
    });
});
