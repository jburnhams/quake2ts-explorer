import { describe, it, expect, jest, beforeEach } from '@jest/globals';
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
            createProgram: jest.fn().mockReturnValue(mockProgram),
            createShader: jest.fn().mockReturnValue(mockShader),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            getShaderParameter: jest.fn().mockReturnValue(true),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn().mockReturnValue(true),
            createVertexArray: jest.fn().mockReturnValue(mockVao),
            createBuffer: jest.fn().mockReturnValue(mockBuffer),
            bindVertexArray: jest.fn(),
            bindBuffer: jest.fn(),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            useProgram: jest.fn(),
            getUniformLocation: jest.fn().mockReturnValue(1),
            uniformMatrix4fv: jest.fn(),
            bufferData: jest.fn(),
            drawArrays: jest.fn(),
            deleteShader: jest.fn(),
            getShaderInfoLog: jest.fn(),
            getProgramInfoLog: jest.fn(),
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
        mockGl.getShaderParameter = jest.fn().mockReturnValue(false);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        new DebugRenderer(mockGl);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('handles program link error', () => {
        // First call to getProgramParameter is usually for LINK_STATUS
        mockGl.getProgramParameter = jest.fn().mockReturnValue(false);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        new DebugRenderer(mockGl);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
