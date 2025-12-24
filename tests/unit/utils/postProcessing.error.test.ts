import { PostProcessor } from '@/src/utils/postProcessing';


describe('PostProcessor Errors', () => {
    let gl: any;
    let processor: PostProcessor;

    beforeEach(() => {
        gl = {
            createShader: vi.fn(() => ({})),
            shaderSource: vi.fn(),
            compileShader: vi.fn(),
            getShaderParameter: vi.fn(() => true),
            createProgram: vi.fn(() => ({})),
            attachShader: vi.fn(),
            linkProgram: vi.fn(),
            getProgramParameter: vi.fn(() => true),
            createVertexArray: vi.fn(() => ({})),
            bindVertexArray: vi.fn(),
            createBuffer: vi.fn(() => ({})),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            getAttribLocation: vi.fn(() => 0),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            getShaderInfoLog: vi.fn(),
            deleteShader: vi.fn(),
            getProgramInfoLog: vi.fn(),
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
