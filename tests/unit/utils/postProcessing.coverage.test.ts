import { PostProcessor, defaultPostProcessOptions } from '../../../src/utils/postProcessing';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Manually mock WebGL2 context to have full control for unit testing
const createMockGL = () => ({
    createProgram: jest.fn(() => ({})),
    createShader: jest.fn(() => ({})),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getShaderParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => ''),
    getShaderInfoLog: jest.fn(() => ''),
    createVertexArray: jest.fn(() => ({})),
    bindVertexArray: jest.fn(),
    createBuffer: jest.fn(() => ({})),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    getAttribLocation: jest.fn(() => 0),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    getUniformLocation: jest.fn(() => ({})),
    uniform1i: jest.fn(),
    uniform1f: jest.fn(),
    uniform2f: jest.fn(),
    createTexture: jest.fn(() => ({})),
    bindTexture: jest.fn(),
    texImage2D: jest.fn(),
    texParameteri: jest.fn(),
    createFramebuffer: jest.fn(() => ({})),
    bindFramebuffer: jest.fn(),
    framebufferTexture2D: jest.fn(),
    framebufferRenderbuffer: jest.fn(),
    checkFramebufferStatus: jest.fn(() => 36053), // FRAMEBUFFER_COMPLETE
    createRenderbuffer: jest.fn(() => ({})),
    bindRenderbuffer: jest.fn(),
    renderbufferStorage: jest.fn(),
    viewport: jest.fn(),
    clear: jest.fn(),
    useProgram: jest.fn(),
    activeTexture: jest.fn(),
    drawArrays: jest.fn(),
    deleteTexture: jest.fn(),
    deleteRenderbuffer: jest.fn(),
    deleteFramebuffer: jest.fn(),
    deleteProgram: jest.fn(),
    deleteVertexArray: jest.fn(),
    deleteShader: jest.fn(),
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    LINK_STATUS: 35714,
    COMPILE_STATUS: 35713,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    FRAMEBUFFER: 36160,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    TEXTURE0: 33984,
    TEXTURE_2D: 3553,
    TRIANGLE_STRIP: 5,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    LINEAR: 9729,
    CLAMP_TO_EDGE: 33071,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    COLOR_ATTACHMENT0: 36064,
    DEPTH_ATTACHMENT: 36096,
    RENDERBUFFER: 36161,
    DEPTH_COMPONENT16: 33189,
    FRAMEBUFFER_COMPLETE: 36053
} as unknown as WebGL2RenderingContext);

describe('PostProcessor', () => {
    let gl: WebGL2RenderingContext;
    let pp: PostProcessor;

    beforeEach(() => {
        gl = createMockGL();
        pp = new PostProcessor(gl);
    });

    it('initializes shaders and buffers', () => {
        pp.init('vert', 'frag');
        expect(gl.createProgram).toHaveBeenCalled();
        expect(gl.createShader).toHaveBeenCalledTimes(2);
        expect(gl.linkProgram).toHaveBeenCalled();
        expect(gl.createVertexArray).toHaveBeenCalled();
    });

    it('throws on shader compilation error', () => {
        (gl.getShaderParameter as jest.Mock).mockReturnValueOnce(false);
        expect(() => pp.init('vert', 'frag')).toThrow('Shader compilation failed');
    });

    it('throws on program link error', () => {
        (gl.getProgramParameter as jest.Mock).mockReturnValue(false);
        expect(() => pp.init('vert', 'frag')).toThrow('Could not link post-process program');
    });

    it('creates buffers on resize', () => {
        pp.init('vert', 'frag');
        pp.resize(100, 100);
        expect(gl.createTexture).toHaveBeenCalled();
        expect(gl.createFramebuffer).toHaveBeenCalled();
    });

    it('does not resize if dimensions match', () => {
        pp.init('vert', 'frag');
        pp.resize(100, 100);
        (gl.createTexture as jest.Mock).mockClear();
        pp.resize(100, 100);
        expect(gl.createTexture).not.toHaveBeenCalled();
    });

    it('logs error on incomplete framebuffer', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (gl.checkFramebufferStatus as jest.Mock).mockReturnValue(0); // Incomplete
        pp.resize(100, 100);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Framebuffer incomplete'));
        consoleErrorSpy.mockRestore();
    });

    it('renders with options', () => {
        pp.init('vert', 'frag');
        pp.resize(100, 100);
        pp.render({
            ...defaultPostProcessOptions,
            bloomEnabled: true,
            gamma: 2.2
        });
        expect(gl.useProgram).toHaveBeenCalled();
        expect(gl.drawArrays).toHaveBeenCalled();
        expect(gl.uniform1i).toHaveBeenCalled();
        expect(gl.uniform1f).toHaveBeenCalled();
    });

    it('binds and unbinds framebuffer', () => {
        pp.init('vert', 'frag');
        pp.resize(100, 100);

        pp.bind();
        expect(gl.bindFramebuffer).toHaveBeenCalledWith(gl.FRAMEBUFFER, expect.anything());
        expect(gl.viewport).toHaveBeenCalledWith(0, 0, 100, 100);

        pp.unbind();
        expect(gl.bindFramebuffer).toHaveBeenCalledWith(gl.FRAMEBUFFER, null);
    });

    it('cleans up resources', () => {
        pp.init('vert', 'frag');
        pp.resize(100, 100);
        pp.cleanup();
        expect(gl.deleteTexture).toHaveBeenCalled();
        expect(gl.deleteFramebuffer).toHaveBeenCalled();
        expect(gl.deleteProgram).toHaveBeenCalled();
    });
});
