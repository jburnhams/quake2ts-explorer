import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PostProcessor, defaultPostProcessOptions } from '../../../src/utils/postProcessing';

describe('PostProcessor', () => {
    let gl: WebGL2RenderingContext;
    let postProcessor: PostProcessor;

    beforeEach(() => {
        gl = {
            createProgram: jest.fn().mockReturnValue({}),
            createShader: jest.fn().mockReturnValue({}),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn().mockReturnValue(true),
            getShaderInfoLog: jest.fn().mockReturnValue(''),
            getShaderParameter: jest.fn().mockReturnValue(true),
            getProgramInfoLog: jest.fn().mockReturnValue(''),
            createVertexArray: jest.fn().mockReturnValue({}),
            bindVertexArray: jest.fn(),
            createBuffer: jest.fn().mockReturnValue({}),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            getAttribLocation: jest.fn().mockReturnValue(0),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            createTexture: jest.fn().mockReturnValue({}),
            bindTexture: jest.fn(),
            texImage2D: jest.fn(),
            texParameteri: jest.fn(),
            createRenderbuffer: jest.fn().mockReturnValue({}),
            bindRenderbuffer: jest.fn(),
            renderbufferStorage: jest.fn(),
            createFramebuffer: jest.fn().mockReturnValue({}),
            bindFramebuffer: jest.fn(),
            framebufferTexture2D: jest.fn(),
            framebufferRenderbuffer: jest.fn(),
            checkFramebufferStatus: jest.fn().mockReturnValue(36053), // FRAMEBUFFER_COMPLETE
            deleteTexture: jest.fn(),
            deleteRenderbuffer: jest.fn(),
            deleteFramebuffer: jest.fn(),
            deleteProgram: jest.fn(),
            deleteVertexArray: jest.fn(),
            deleteShader: jest.fn(),
            useProgram: jest.fn(),
            activeTexture: jest.fn(),
            getUniformLocation: jest.fn().mockReturnValue({}),
            uniform1i: jest.fn(),
            uniform1f: jest.fn(),
            uniform2f: jest.fn(),
            drawArrays: jest.fn(),
            viewport: jest.fn(),
            clear: jest.fn(),
            // Constants
            VERTEX_SHADER: 35633,
            FRAGMENT_SHADER: 35632,
            LINK_STATUS: 35714,
            COMPILE_STATUS: 35713,
            ARRAY_BUFFER: 34962,
            STATIC_DRAW: 35044,
            FLOAT: 5126,
            TEXTURE_2D: 3553,
            RGBA: 6408,
            UNSIGNED_BYTE: 5121,
            TEXTURE_MIN_FILTER: 10241,
            TEXTURE_MAG_FILTER: 10240,
            LINEAR: 9729,
            TEXTURE_WRAP_S: 10242,
            TEXTURE_WRAP_T: 10243,
            CLAMP_TO_EDGE: 33071,
            RENDERBUFFER: 36161,
            DEPTH_COMPONENT16: 33189,
            FRAMEBUFFER: 36160,
            COLOR_ATTACHMENT0: 36064,
            DEPTH_ATTACHMENT: 36096,
            FRAMEBUFFER_COMPLETE: 36053,
            COLOR_BUFFER_BIT: 16384,
            DEPTH_BUFFER_BIT: 256,
            TEXTURE0: 33984,
            TRIANGLE_STRIP: 5
        } as unknown as WebGL2RenderingContext;

        postProcessor = new PostProcessor(gl);
    });

    it('initializes correctly', () => {
        postProcessor.init('vert', 'frag');
        expect(gl.createProgram).toHaveBeenCalled();
        expect(gl.createShader).toHaveBeenCalledTimes(2);
        expect(gl.linkProgram).toHaveBeenCalled();
        expect(gl.createVertexArray).toHaveBeenCalled();
    });

    it('resizes and recreates buffers', () => {
        postProcessor.init('vert', 'frag');
        postProcessor.resize(100, 100);
        expect(gl.createFramebuffer).toHaveBeenCalled();

        // Resize again to same size - no op
        (gl.createFramebuffer as jest.Mock).mockClear();
        postProcessor.resize(100, 100);
        expect(gl.createFramebuffer).not.toHaveBeenCalled();

        // Resize to new size
        postProcessor.resize(200, 200);
        expect(gl.createFramebuffer).toHaveBeenCalled();
        expect(gl.deleteFramebuffer).toHaveBeenCalled();
    });

    it('binds and unbinds', () => {
        postProcessor.init('vert', 'frag');
        postProcessor.resize(100, 100);

        postProcessor.bind();
        expect(gl.bindFramebuffer).toHaveBeenCalledWith(gl.FRAMEBUFFER, expect.anything());
        expect(gl.viewport).toHaveBeenCalledWith(0, 0, 100, 100);

        postProcessor.unbind();
        expect(gl.bindFramebuffer).toHaveBeenCalledWith(gl.FRAMEBUFFER, null);
    });

    it('renders with options', () => {
        postProcessor.init('vert', 'frag');
        postProcessor.resize(100, 100);

        postProcessor.render(defaultPostProcessOptions);
        expect(gl.useProgram).toHaveBeenCalled();
        expect(gl.drawArrays).toHaveBeenCalled();

        // Verify uniforms
        expect(gl.uniform1f).toHaveBeenCalled(); // many times
    });

    it('cleans up', () => {
        postProcessor.init('vert', 'frag');
        postProcessor.resize(100, 100);

        postProcessor.cleanup();
        expect(gl.deleteProgram).toHaveBeenCalled();
        expect(gl.deleteFramebuffer).toHaveBeenCalled();
    });

    it('throws on link error', () => {
        (gl.getProgramParameter as jest.Mock).mockReturnValue(false);
        (gl.getProgramInfoLog as jest.Mock).mockReturnValue('Link error');

        expect(() => postProcessor.init('vert', 'frag')).toThrow('Link error');
    });

    it('throws on shader compile error', () => {
         (gl.getShaderParameter as jest.Mock).mockReturnValue(false);
         (gl.getShaderInfoLog as jest.Mock).mockReturnValue('Compile error');

         expect(() => postProcessor.init('vert', 'frag')).toThrow('Compile error');
    });
});
