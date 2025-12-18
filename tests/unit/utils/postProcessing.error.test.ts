import { PostProcessor } from '@/src/utils/postProcessing';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('PostProcessor Errors', () => {
    let gl: any;
    let processor: PostProcessor;

    beforeEach(() => {
        gl = {
            createShader: jest.fn(() => ({})),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            getShaderParameter: jest.fn(() => true),
            createProgram: jest.fn(() => ({})),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn(() => true),
            createVertexArray: jest.fn(() => ({})),
            bindVertexArray: jest.fn(),
            createBuffer: jest.fn(() => ({})),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            getAttribLocation: jest.fn(() => 0),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            getShaderInfoLog: jest.fn(),
            deleteShader: jest.fn(),
            getProgramInfoLog: jest.fn(),
            // Enums
            VERTEX_SHADER: 1,
            FRAGMENT_SHADER: 2,
            COMPILE_STATUS: 3,
            LINK_STATUS: 4,
            ARRAY_BUFFER: 5,
            STATIC_DRAW: 6,
            FLOAT: 7
        };
        processor = new PostProcessor(gl);
    });

    it('should throw if shader creation fails', () => {
        gl.createShader.mockReturnValue(null);
        expect(() => processor.init('vert', 'frag')).toThrow("Failed to create shader");
    });

    it('should throw if shader compilation fails', () => {
        gl.getShaderParameter.mockReturnValue(false);
        gl.getShaderInfoLog.mockReturnValue("syntax error");
        expect(() => processor.init('vert', 'frag')).toThrow("Shader compilation failed: syntax error");
    });

    it('should throw if program creation fails', () => {
        gl.createProgram.mockReturnValue(null);
        expect(() => processor.init('vert', 'frag')).toThrow("Failed to create program");
    });

    it('should throw if program linking fails', () => {
        gl.getProgramParameter.mockReturnValue(false);
        gl.getProgramInfoLog.mockReturnValue("link error");
        expect(() => processor.init('vert', 'frag')).toThrow("Could not link post-process program: link error");
    });
});
