export interface PostProcessOptions {
    enabled: boolean;
    bloomEnabled: boolean;
    bloomThreshold: number;
    bloomIntensity: number;
    fxaaEnabled: boolean;
    gamma: number;
    contrast: number;
    saturation: number;
    brightness: number;
}

export const defaultPostProcessOptions: PostProcessOptions = {
    enabled: false,
    bloomEnabled: false,
    bloomThreshold: 0.8,
    bloomIntensity: 1.0,
    fxaaEnabled: false,
    gamma: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    brightness: 1.0
};

export class PostProcessor {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private framebuffer: WebGLFramebuffer | null = null;
    private texture: WebGLTexture | null = null;
    private depthBuffer: WebGLRenderbuffer | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private width: number = 0;
    private height: number = 0;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
    }

    init(vertSource: string, fragSource: string) {
        // Compile shaders
        const vert = this.compileShader(this.gl.VERTEX_SHADER, vertSource);
        const frag = this.compileShader(this.gl.FRAGMENT_SHADER, fragSource);

        this.program = this.gl.createProgram();
        if (!this.program) throw new Error("Failed to create program");

        this.gl.attachShader(this.program, vert);
        this.gl.attachShader(this.program, frag);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.program);
            throw new Error(`Could not link post-process program: ${info}`);
        }

        // Create Quad VAO
        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);

        const vbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        const posLoc = this.gl.getAttribLocation(this.program, "aPosition");
        this.gl.enableVertexAttribArray(posLoc);
        this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindVertexArray(null);
    }

    resize(width: number, height: number) {
        if (this.width === width && this.height === height) return;
        this.width = width;
        this.height = height;

        this.cleanupBuffers();
        this.createBuffers();
    }

    bind() {
        if (!this.framebuffer) return;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    unbind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    render(options: PostProcessOptions) {
        if (!this.program || !this.vao || !this.texture) return;

        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

        // Set uniforms
        this.setUniform1i("tDiffuse", 0);
        this.setUniform1i("uBloomEnabled", options.bloomEnabled ? 1 : 0);
        this.setUniform1f("uBloomThreshold", options.bloomThreshold);
        this.setUniform1f("uBloomIntensity", options.bloomIntensity);
        this.setUniform1i("uFxaaEnabled", options.fxaaEnabled ? 1 : 0);
        this.setUniform2f("uResolution", this.width, this.height);
        this.setUniform1f("uGamma", options.gamma);
        this.setUniform1f("uContrast", options.contrast);
        this.setUniform1f("uSaturation", options.saturation);
        this.setUniform1f("uBrightness", options.brightness);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.bindVertexArray(null);
    }

    private createBuffers() {
        // Texture
        this.texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        // Renderbuffer for Depth
        this.depthBuffer = this.gl.createRenderbuffer();
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthBuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.width, this.height);

        // Framebuffer
        this.framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture, 0);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.depthBuffer);

        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            console.error("Framebuffer incomplete: " + status);
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    private cleanupBuffers() {
        if (this.texture) {
            this.gl.deleteTexture(this.texture);
            this.texture = null;
        }
        if (this.depthBuffer) {
            this.gl.deleteRenderbuffer(this.depthBuffer);
            this.depthBuffer = null;
        }
        if (this.framebuffer) {
            this.gl.deleteFramebuffer(this.framebuffer);
            this.framebuffer = null;
        }
    }

    cleanup() {
        this.cleanupBuffers();
        if (this.program) this.gl.deleteProgram(this.program);
        if (this.vao) this.gl.deleteVertexArray(this.vao);
    }

    private compileShader(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) throw new Error("Failed to create shader");

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${info}`);
        }
        return shader;
    }

    private setUniform1i(name: string, value: number) {
        const loc = this.gl.getUniformLocation(this.program!, name);
        if (loc) this.gl.uniform1i(loc, value);
    }

    private setUniform1f(name: string, value: number) {
        const loc = this.gl.getUniformLocation(this.program!, name);
        if (loc) this.gl.uniform1f(loc, value);
    }

    private setUniform2f(name: string, x: number, y: number) {
        const loc = this.gl.getUniformLocation(this.program!, name);
        if (loc) this.gl.uniform2f(loc, x, y);
    }
}
