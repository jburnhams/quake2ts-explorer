import { mat4, vec3, vec4 } from 'gl-matrix';

export class DebugRenderer {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private vertexBuffer: WebGLBuffer | null = null;
    private colorBuffer: WebGLBuffer | null = null;
    private vertices: number[] = [];
    private colors: number[] = [];

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.init();
    }

    private init() {
        const gl = this.gl;
        const vs = `#version 300 es
        layout(location = 0) in vec3 position;
        layout(location = 1) in vec4 color;
        uniform mat4 mvp;
        out vec4 vColor;
        void main() {
            gl_Position = mvp * vec4(position, 1.0);
            vColor = color;
        }`;

        const fs = `#version 300 es
        precision mediump float;
        in vec4 vColor;
        out vec4 outColor;
        void main() {
            outColor = vColor;
        }`;

        this.program = this.createProgram(vs, fs);
        this.vao = gl.createVertexArray();
        this.vertexBuffer = gl.createBuffer();
        this.colorBuffer = gl.createBuffer();

        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }

    private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
        const gl = this.gl;
        const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return null;

        const program = gl.createProgram();
        if (!program) return null;

        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    private compileShader(type: number, source: string): WebGLShader | null {
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    public clear() {
        this.vertices = [];
        this.colors = [];
    }

    public addLine(start: vec3, end: vec3, color: vec4) {
        this.vertices.push(start[0], start[1], start[2]);
        this.vertices.push(end[0], end[1], end[2]);
        this.colors.push(color[0], color[1], color[2], color[3]);
        this.colors.push(color[0], color[1], color[2], color[3]);
    }

    public addBox(min: vec3, max: vec3, color: vec4) {
        const [x1, y1, z1] = min;
        const [x2, y2, z2] = max;

        const points = [
            vec3.fromValues(x1, y1, z1), vec3.fromValues(x2, y1, z1),
            vec3.fromValues(x2, y2, z1), vec3.fromValues(x1, y2, z1),
            vec3.fromValues(x1, y1, z2), vec3.fromValues(x2, y1, z2),
            vec3.fromValues(x2, y2, z2), vec3.fromValues(x1, y2, z2)
        ];

        // Bottom face
        this.addLine(points[0], points[1], color);
        this.addLine(points[1], points[2], color);
        this.addLine(points[2], points[3], color);
        this.addLine(points[3], points[0], color);

        // Top face
        this.addLine(points[4], points[5], color);
        this.addLine(points[5], points[6], color);
        this.addLine(points[6], points[7], color);
        this.addLine(points[7], points[4], color);

        // Vertical edges
        this.addLine(points[0], points[4], color);
        this.addLine(points[1], points[5], color);
        this.addLine(points[2], points[6], color);
        this.addLine(points[3], points[7], color);
    }

    public render(mvp: mat4) {
        const gl = this.gl;
        if (!this.program || !this.vao || this.vertices.length === 0) return;

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        const mvpLoc = gl.getUniformLocation(this.program, 'mvp');
        gl.uniformMatrix4fv(mvpLoc, false, mvp);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.DYNAMIC_DRAW);

        gl.drawArrays(gl.LINES, 0, this.vertices.length / 3);
        gl.bindVertexArray(null);
    }
}
