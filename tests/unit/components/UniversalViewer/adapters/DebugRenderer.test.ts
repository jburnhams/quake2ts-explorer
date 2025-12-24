
import { DebugRenderer } from '../../../../../src/components/UniversalViewer/adapters/DebugRenderer';
import { mat4, vec3, vec4 } from 'gl-matrix';

describe('DebugRenderer', () => {
    let renderer: DebugRenderer;
    let mockGl: WebGL2RenderingContext;
    let mockProgram: WebGLProgram;
    let mockVao: WebGLVertexArrayObject;
    let mockBuffer: WebGLBuffer;
    let mockShader: WebGLShader;

    beforeEach(() => {
        mockProgram = {} as WebGLProgram;
        mockVao = {} as WebGLVertexArrayObject;
        mockBuffer = {} as WebGLBuffer;
        mockShader = {} as WebGLShader;

        mockGl = {
            createProgram: vi.fn().mockReturnValue(mockProgram),
            createShader: vi.fn().mockReturnValue(mockShader),
            shaderSource: vi.fn(),
            compileShader: vi.fn(),
            getShaderParameter: vi.fn().mockReturnValue(true),
            attachShader: vi.fn(),
            linkProgram: vi.fn(),
            getProgramParameter: vi.fn().mockReturnValue(true),
            createVertexArray: vi.fn().mockReturnValue(mockVao),
            createBuffer: vi.fn().mockReturnValue(mockBuffer),
            bindVertexArray: vi.fn(),
            bindBuffer: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            useProgram: vi.fn(),
            getUniformLocation: vi.fn().mockReturnValue(1),
            uniformMatrix4fv: vi.fn(),
            bufferData: vi.fn(),
            drawArrays: vi.fn(),
            deleteShader: vi.fn(),
            getShaderInfoLog: vi.fn(),
            getProgramInfoLog: vi.fn(),
            VERTEX_SHADER: 1,
            FRAGMENT_SHADER: 2,
            ARRAY_BUFFER: 3,
            FLOAT: 4,
            DYNAMIC_DRAW: 5,
            LINES: 6,
            LINK_STATUS: 7,
            COMPILE_STATUS: 8,
        } as unknown as WebGL2RenderingContext;

        renderer = new DebugRenderer(mockGl);
    });

    it('initializes correctly', () => {
        expect(mockGl.createProgram).toHaveBeenCalled();
        expect(mockGl.createVertexArray).toHaveBeenCalled();
        expect(mockGl.createBuffer).toHaveBeenCalledTimes(2); // Vertex and Color buffers
        expect(mockGl.bindVertexArray).toHaveBeenCalledWith(mockVao);
        expect(mockGl.enableVertexAttribArray).toHaveBeenCalledWith(0);
        expect(mockGl.enableVertexAttribArray).toHaveBeenCalledWith(1);
    });

    it('adds lines', () => {
        const start = vec3.fromValues(0, 0, 0);
        const end = vec3.fromValues(1, 1, 1);
        const color = vec4.fromValues(1, 0, 0, 1);

        renderer.addLine(start, end, color);

        // Cannot easily check internal state, but can check if render uploads data
        renderer.render(mat4.create());
        expect(mockGl.bufferData).toHaveBeenCalled();
    });

    it('adds boxes', () => {
        const min = vec3.fromValues(0, 0, 0);
        const max = vec3.fromValues(1, 1, 1);
        const color = vec4.fromValues(1, 0, 0, 1);

        renderer.addBox(min, max, color);

        renderer.render(mat4.create());
        expect(mockGl.bufferData).toHaveBeenCalled();
    });

    it('clears data', () => {
        const start = vec3.fromValues(0, 0, 0);
        const end = vec3.fromValues(1, 1, 1);
        const color = vec4.fromValues(1, 0, 0, 1);

        renderer.addLine(start, end, color);
        renderer.clear();
        renderer.render(mat4.create());

        // If cleared, it should not draw (or buffer empty data depending on implementation)
        // Implementation check: if vertices length is 0, it returns early
        expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it('renders nothing if empty', () => {
        renderer.render(mat4.create());
        expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it('handles shader compilation error', () => {
        mockGl.getShaderParameter = vi.fn().mockReturnValue(false);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        new DebugRenderer(mockGl);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('handles program link error', () => {
        // First call to getProgramParameter is usually for LINK_STATUS
        mockGl.getProgramParameter = vi.fn().mockReturnValue(false);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        new DebugRenderer(mockGl);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
