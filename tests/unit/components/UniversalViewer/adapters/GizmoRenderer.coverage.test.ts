import { GizmoRenderer } from '@/src/components/UniversalViewer/adapters/GizmoRenderer';
import { vec3, mat4 } from 'gl-matrix';
import { createMockWebGL2Context, MockWebGL2RenderingContext } from '@quake2ts/test-utils/src/engine/mocks/webgl';

describe('GizmoRenderer Coverage', () => {
    let renderer: GizmoRenderer;
    let mockGl: MockWebGL2RenderingContext;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGl = createMockWebGL2Context();
        // Setup uniform locations map so getUniformLocation returns a valid location
        mockGl.uniformLocations.set('u_color', {} as WebGLUniformLocation);
        mockGl.uniformLocations.set('u_mvp', {} as WebGLUniformLocation);
        mockGl.uniformLocations.set('u_origin', {} as WebGLUniformLocation);
        renderer = new GizmoRenderer(mockGl as unknown as WebGL2RenderingContext);
    });

    test('handles shader compilation failure', () => {
        const gl = createMockWebGL2Context();
        gl.compileSucceeds = false;
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
        new GizmoRenderer(gl as unknown as WebGL2RenderingContext);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('handles program creation failure', () => {
         const gl = createMockWebGL2Context();
         gl.createProgram = vi.fn().mockReturnValue(null);

         new GizmoRenderer(gl as unknown as WebGL2RenderingContext);
         // Expect no crash
    });

    test('setHoveredAxis', () => {
        renderer.setHoveredAxis('x');
        // Render to verify color change logic (indirectly)
        renderer.render(vec3.create(), mat4.create());
        expect(mockGl.uniform4fv).toHaveBeenCalled();
    });

    test('setActiveAxis', () => {
        renderer.setActiveAxis('y');
        renderer.render(vec3.create(), mat4.create());
        expect(mockGl.uniform4fv).toHaveBeenCalled();
    });

    test('setMode and render rotate', () => {
        renderer.setMode('rotate');
        renderer.render(vec3.create(), mat4.create());
        expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.LINE_STRIP, expect.any(Number), expect.any(Number));
    });

    test('render early exit if no program', () => {
        (renderer as any).program = null;
        renderer.render(vec3.create(), mat4.create());
        expect(mockGl.useProgram).not.toHaveBeenCalled();
    });

    test('intersect rotate mode - X axis', () => {
        renderer.setMode('rotate');
        const origin = vec3.fromValues(0, 0, 0);
        // Pointing at YZ ring (X normal) at radius 32
        // Ray from (-100, 32, 0) -> (1, 0, 0)
        // Hit plane x=0 at (0, 32, 0). dist=32. Matches radius.
        const ray = {
            origin: [-100, 32, 0] as [number, number, number],
            direction: [1, 0, 0] as [number, number, number]
        };
        const result = renderer.intersect(ray, origin);
        expect(result?.axis).toBe('x');
    });

    test('intersect rotate mode - Y axis', () => {
        renderer.setMode('rotate');
        const origin = vec3.fromValues(0, 0, 0);
        // Pointing at XZ ring (Y normal) at radius 32
        const ray = {
            origin: [32, -100, 0] as [number, number, number],
            direction: [0, 1, 0] as [number, number, number]
        };
        const result = renderer.intersect(ray, origin);
        expect(result?.axis).toBe('y');
    });

    test('intersect rotate mode - Z axis', () => {
        renderer.setMode('rotate');
        const origin = vec3.fromValues(0, 0, 0);
        // Pointing at XY ring (Z normal) at radius 32
        const ray = {
            origin: [32, 0, -100] as [number, number, number],
            direction: [0, 0, 1] as [number, number, number]
        };
        const result = renderer.intersect(ray, origin);
        expect(result?.axis).toBe('z');
    });

     test('intersect rotate mode - miss', () => {
        renderer.setMode('rotate');
        const origin = vec3.fromValues(0, 0, 0);
        const ray = {
            origin: [0, 0, -100] as [number, number, number],
            direction: [0, 0, 1] as [number, number, number]
        };
        const result = renderer.intersect(ray, origin);
        expect(result).toBeNull();
    });

     test('intersect translate mode - Y axis', () => {
        const origin = vec3.fromValues(0, 0, 0);
        // Aim at mid-point of Y axis (0, 16, 0) from X direction
        const ray = {
            origin: [10, 16, 0] as [number, number, number],
            direction: [-1, 0, 0] as [number, number, number]
        };
        const result = renderer.intersect(ray, origin);
        expect(result?.axis).toBe('y');
    });

     test('intersect translate mode - Z axis', () => {
        const origin = vec3.fromValues(0, 0, 0);
        // Aim at mid-point of Z axis (0, 0, 16) from X direction
        const ray = {
            origin: [10, 0, 16] as [number, number, number],
            direction: [-1, 0, 0] as [number, number, number]
        };
        const result = renderer.intersect(ray, origin);
        expect(result?.axis).toBe('z');
    });

    test('distRaySegment logic branches', () => {
        // D < epsilon case
        const rendererAny = renderer as any;
        // Parallel ray to segment
        const ray = { origin: [0,0,0], direction: [1,0,0] } as any;
        const s0 = vec3.fromValues(0,1,0);
        const s1 = vec3.fromValues(10,1,0);
        // u = (10,0,0), v=(1,0,0). Cross is 0. D=0.
        const res = rendererAny.distRaySegment(ray, s0, s1);
        expect(res.dist).toBeCloseTo(1);
    });
});
