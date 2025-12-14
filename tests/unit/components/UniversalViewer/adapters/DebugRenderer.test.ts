import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DebugRenderer } from '../../../../../src/components/UniversalViewer/adapters/DebugRenderer';
import { mat4, vec3, vec4 } from 'gl-matrix';

describe('DebugRenderer', () => {
    let renderer: DebugRenderer;
    let mockGl: WebGL2RenderingContext;

    beforeEach(() => {
        mockGl = {
            createVertexArray: jest.fn().mockReturnValue({}),
            bindVertexArray: jest.fn(),
            createBuffer: jest.fn().mockReturnValue({}),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            createShader: jest.fn().mockReturnValue({}),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            createProgram: jest.fn().mockReturnValue({}),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn().mockReturnValue(true),
            getShaderParameter: jest.fn().mockReturnValue(true),
            getUniformLocation: jest.fn().mockReturnValue({}),
            useProgram: jest.fn(),
            uniformMatrix4fv: jest.fn(),
            drawArrays: jest.fn(),
            deleteShader: jest.fn(),
            TRIANGLES: 0,
            LINES: 1,
            ARRAY_BUFFER: 2,
            STATIC_DRAW: 3,
            FLOAT: 4,
            VERTEX_SHADER: 5,
            FRAGMENT_SHADER: 6,
            LINK_STATUS: 7,
            COMPILE_STATUS: 8,
            NONE: 0,
        } as unknown as WebGL2RenderingContext;

        renderer = new DebugRenderer(mockGl);
    });

    it('initializes correctly', () => {
        expect(mockGl.createVertexArray).toHaveBeenCalled();
        expect(mockGl.createBuffer).toHaveBeenCalledTimes(2); // Vertex and Color buffers
        expect(mockGl.createProgram).toHaveBeenCalled();
    });

    it('adds a line', () => {
        const start = vec3.fromValues(0, 0, 0);
        const end = vec3.fromValues(10, 10, 10);
        const color = vec4.fromValues(1, 0, 0, 1);

        renderer.addLine(start, end, color);
        // Checking internal state is hard without exposing it, but we can check if render calls bufferData with data

        const mvp = mat4.create();
        renderer.render(mvp);

        expect(mockGl.bufferData).toHaveBeenCalled();
    });

    it('adds a box', () => {
        const min = vec3.fromValues(-5, -5, -5);
        const max = vec3.fromValues(5, 5, 5);
        const color = vec4.fromValues(0, 1, 0, 1);

        renderer.addBox(min, max, color);

        const mvp = mat4.create();
        renderer.render(mvp);

        expect(mockGl.bufferData).toHaveBeenCalled();
    });

    it('clears buffers', () => {
        renderer.clear();
        // clear just resets arrays, doesn't call GL until render or data add
        const mvp = mat4.create();
        renderer.render(mvp);
        // Should ideally draw nothing or update empty buffers
        // The implementation checks if this.vertices.length === 0 and returns if so.
        expect(mockGl.bufferData).not.toHaveBeenCalled();
    });

    it('handles shader compilation error', () => {
        mockGl.getShaderParameter = jest.fn().mockReturnValue(false);
        mockGl.getShaderInfoLog = jest.fn().mockReturnValue('Error compiling shader');
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        new DebugRenderer(mockGl);

        expect(consoleSpy).toHaveBeenCalledWith('Error compiling shader');
        consoleSpy.mockRestore();
    });

    it('handles program link error', () => {
        // First calls to getShaderParameter return true (vertex, fragment)
        // Then getProgramParameter returns false
        mockGl.getShaderParameter = jest.fn().mockReturnValue(true);
        mockGl.getProgramParameter = jest.fn().mockReturnValue(false);
        mockGl.getProgramInfoLog = jest.fn().mockReturnValue('Error linking program');
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        new DebugRenderer(mockGl);

        expect(consoleSpy).toHaveBeenCalledWith('Error linking program');
        consoleSpy.mockRestore();
    });
});
