import { GizmoRenderer } from '@/src/components/UniversalViewer/adapters/GizmoRenderer';
import { vec3, mat4 } from 'gl-matrix';

// Mock WebGL context
const mockGl = {
    createShader: jest.fn(() => 'shader'),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    createProgram: jest.fn(() => 'program'),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    createBuffer: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    createVertexArray: jest.fn(() => 'vao'),
    bindVertexArray: jest.fn(),
    useProgram: jest.fn(),
    getUniformLocation: jest.fn(() => 'loc'),
    uniformMatrix4fv: jest.fn(),
    uniform3fv: jest.fn(),
    uniform4fv: jest.fn(),
    drawArrays: jest.fn(),
    deleteShader: jest.fn(),
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
