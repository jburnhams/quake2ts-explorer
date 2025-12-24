import { PostProcessor, defaultPostProcessOptions } from '../../../src/utils/postProcessing';


// Manually mock WebGL2 context to have full control for unit testing
const createMockGL = () => ({
    createProgram: vi.fn(() => ({})),
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getShaderParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    getShaderInfoLog: vi.fn(() => ''),
    createVertexArray: vi.fn(() => ({})),
    bindVertexArray: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    createFramebuffer: vi.fn(() => ({})),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    framebufferRenderbuffer: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
    createRenderbuffer: vi.fn(() => ({})),
    bindRenderbuffer: vi.fn(),
    renderbufferStorage: vi.fn(),
    viewport: vi.fn(),
    clear: vi.fn(),
    useProgram: vi.fn(),
    activeTexture: vi.fn(),
    drawArrays: vi.fn(),
    deleteTexture: vi.fn(),
    deleteRenderbuffer: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteProgram: vi.fn(),
    deleteVertexArray: vi.fn(),
    deleteShader: vi.fn(),
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
        (gl.getShaderParameter as vi.Mock).mockReturnValueOnce(false);
        expect(() => pp.init('vert', 'frag')).toThrow('Shader compilation failed');
    });

    it('throws on program link error', () => {
        (gl.getProgramParameter as vi.Mock).mockReturnValue(false);
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
        (gl.createTexture as vi.Mock).mockClear();
        pp.resize(100, 100);
        expect(gl.createTexture).not.toHaveBeenCalled();
    });

    it('logs error on incomplete framebuffer', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (gl.checkFramebufferStatus as vi.Mock).mockReturnValue(0); // Incomplete
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
