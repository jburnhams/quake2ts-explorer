import { GizmoRenderer } from '@/src/components/UniversalViewer/adapters/GizmoRenderer';
import { TransformMode, TransformAxis } from '@/src/utils/transformUtils';
import { vec3, mat4 } from 'gl-matrix';

// Mock engine dependencies
jest.mock('quake2ts/engine', () => {
    return {
        Camera: jest.fn()
    };
});

// Mock DebugRenderer
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

describe('GizmoRenderer', () => {
    let gizmoRenderer: GizmoRenderer;
    let mockGl: WebGL2RenderingContext;

    beforeEach(() => {
        mockGl = {
            DEPTH_TEST: 0,
            disable: jest.fn(),
            enable: jest.fn(),
        } as unknown as WebGL2RenderingContext;

        gizmoRenderer = new GizmoRenderer(mockGl);
    });

    test('should initialize with default state', () => {
        // We can't access private state directly, but we can verify behavior
        // Or cast to any to verify internals for this unit test
        const state = (gizmoRenderer as any).state;
        expect(state.mode).toBe(TransformMode.Translate);
        expect(state.activeAxis).toBe(TransformAxis.None);
    });

    test('should update position', () => {
        const newPos = vec3.fromValues(10, 20, 30);
        gizmoRenderer.setPosition(newPos);
        const state = (gizmoRenderer as any).state;
        expect(vec3.equals(state.position, newPos)).toBe(true);
    });

    test('should update mode', () => {
        gizmoRenderer.setMode(TransformMode.Rotate);
        const state = (gizmoRenderer as any).state;
        expect(state.mode).toBe(TransformMode.Rotate);
    });

    test('should render gizmo lines and boxes', () => {
        const mockCamera = {} as any;
        const projection = mat4.create();
        const view = mat4.create();

        gizmoRenderer.render(projection, view, mockCamera);

        const debugRenderer = (gizmoRenderer as any).debugRenderer;
        expect(debugRenderer.clear).toHaveBeenCalled();
        // For Translate mode (default), we expect 3 lines and 3 boxes (X, Y, Z axes)
        expect(debugRenderer.addLine).toHaveBeenCalledTimes(3);
        expect(debugRenderer.addBox).toHaveBeenCalledTimes(3);
        expect(debugRenderer.render).toHaveBeenCalled();
    });

    test('checkIntersection should return correct axis', () => {
         // This is a bit tricky to mock without real ray casting logic working on mocks.
         // However, our util function `intersectRayAABB` is imported.
         // But we are not mocking `intersectRayAABB` yet, we are using the real one.
         // So if we set up a ray that hits the X axis box...

         // X axis box is from (0, -2, -2) to (32+2, 2, 2) relative to pos 0,0,0
         // Let's fire a ray from (-10, 0, 0) towards (1, 0, 0)
         const ray = {
             origin: [-10, 0, 0] as [number, number, number],
             direction: [1, 0, 0] as [number, number, number]
         };

         const axis = gizmoRenderer.checkIntersection(ray);
         expect(axis).toBe(TransformAxis.X);
    });
});
