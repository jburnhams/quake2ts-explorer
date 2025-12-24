import { GizmoRenderer } from '@/src/components/UniversalViewer/adapters/GizmoRenderer';
import { vec3, mat4 } from 'gl-matrix';

// Mock WebGL context
const mockGl = {
    createShader: vi.fn(() => 'shader'),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => 'program'),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    createBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    createVertexArray: vi.fn(() => 'vao'),
    bindVertexArray: vi.fn(),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn(() => 'loc'),
    uniformMatrix4fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    drawArrays: vi.fn(),
    deleteShader: vi.fn(),
} as unknown as WebGL2RenderingContext;

describe('GizmoRenderer', () => {
    let renderer: GizmoRenderer;

    beforeEach(() => {
        renderer = new GizmoRenderer(mockGl);
    });

    test('initializes correctly', () => {
        expect(mockGl.createProgram).toHaveBeenCalled();
        expect(mockGl.createVertexArray).toHaveBeenCalled();
    });

    test('renders', () => {
        const pos = vec3.create();
        const vp = mat4.create();
        renderer.render(pos, vp);
        expect(mockGl.useProgram).toHaveBeenCalled();
        expect(mockGl.drawArrays).toHaveBeenCalledTimes(3); // 3 axes
    });

    test('intersects ray', () => {
        const origin = vec3.fromValues(0, 0, 0);
        // Ray pointing along X axis
        const ray = {
            origin: [-10, 0, 0] as [number, number, number],
            direction: [1, 0, 0] as [number, number, number]
        };

        const result = renderer.intersect(ray, origin);
        expect(result).not.toBeNull();
        expect(result?.axis).toBe('x');
    });

    test('misses ray', () => {
        const origin = vec3.fromValues(0, 0, 0);
        // Ray pointing away
        const ray = {
            origin: [-10, 50, 0] as [number, number, number],
            direction: [1, 0, 0] as [number, number, number]
        };

        const result = renderer.intersect(ray, origin);
        expect(result).toBeNull();
    });
});
