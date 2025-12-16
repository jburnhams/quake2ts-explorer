import { vec3, vec4, mat4 } from 'gl-matrix';
import { Ray } from './types';

export type GizmoAxis = 'x' | 'y' | 'z' | null;

export class GizmoRenderer {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private vertexBuffer: WebGLBuffer | null = null;
    private indexBuffer: WebGLBuffer | null = null;

    // Axis colors
    private X_COLOR: vec4;
    private Y_COLOR: vec4;
    private Z_COLOR: vec4;
    private HOVER_COLOR: vec4;

    private hoveredAxis: GizmoAxis = null;
    private activeAxis: GizmoAxis = null;

    private static AXIS_LENGTH = 32;
    private static AXIS_THICKNESS = 2; // Visual thickness (lines) or hit radius

    // Uniform locations
    private uMvpLoc: WebGLUniformLocation | null = null;
    private uOriginLoc: WebGLUniformLocation | null = null;
    private uColorLoc: WebGLUniformLocation | null = null;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.X_COLOR = vec4.fromValues(1, 0, 0, 1);
        this.Y_COLOR = vec4.fromValues(0, 1, 0, 1);
        this.Z_COLOR = vec4.fromValues(0, 0, 1, 1);
        this.HOVER_COLOR = vec4.fromValues(1, 1, 0, 1);
        this.init();
    }

    private init() {
        const gl = this.gl;

        // Simple shader for colored lines/triangles
        const vsSource = `#version 300 es
            layout(location = 0) in vec3 a_position;

            uniform mat4 u_mvp;
            uniform vec3 u_origin;

            void main() {
                gl_Position = u_mvp * vec4(a_position + u_origin, 1.0);
            }
        `;

        const fsSource = `#version 300 es
            precision mediump float;
            uniform vec4 u_color;
            out vec4 outColor;

            void main() {
                outColor = u_color;
            }
        `;

        const vs = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);

        if (!vs || !fs) return;

        this.program = gl.createProgram();
        if (this.program) {
            gl.attachShader(this.program, vs);
            gl.attachShader(this.program, fs);
            gl.linkProgram(this.program);

            this.uMvpLoc = gl.getUniformLocation(this.program, 'u_mvp');
            this.uOriginLoc = gl.getUniformLocation(this.program, 'u_origin');
            this.uColorLoc = gl.getUniformLocation(this.program, 'u_color');
        }

        // Geometry: 3 lines for axes
        // We'll draw lines: (0,0,0)->(L,0,0), (0,0,0)->(0,L,0), (0,0,0)->(0,0,L)
        const L = GizmoRenderer.AXIS_LENGTH;
        const vertices = new Float32Array([
            0, 0, 0,  L, 0, 0, // X
            0, 0, 0,  0, L, 0, // Y
            0, 0, 0,  0, 0, L  // Z
        ]);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }

    private createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
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

    setHoveredAxis(axis: GizmoAxis) {
        this.hoveredAxis = axis;
    }

    setActiveAxis(axis: GizmoAxis) {
        this.activeAxis = axis;
    }

    render(position: vec3, viewProjection: mat4) {
        if (!this.program || !this.vao) return;
        const gl = this.gl;

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        if (this.uMvpLoc) gl.uniformMatrix4fv(this.uMvpLoc, false, viewProjection as Float32List);
        if (this.uOriginLoc) gl.uniform3fv(this.uOriginLoc, position as Float32List);

        // Draw X
        const xColor = (this.activeAxis === 'x' || this.hoveredAxis === 'x') ? this.HOVER_COLOR : this.X_COLOR;
        if (this.uColorLoc) gl.uniform4fv(this.uColorLoc, xColor as Float32List);
        gl.drawArrays(gl.LINES, 0, 2);

        // Draw Y
        const yColor = (this.activeAxis === 'y' || this.hoveredAxis === 'y') ? this.HOVER_COLOR : this.Y_COLOR;
        if (this.uColorLoc) gl.uniform4fv(this.uColorLoc, yColor as Float32List);
        gl.drawArrays(gl.LINES, 2, 2);

        // Draw Z
        const zColor = (this.activeAxis === 'z' || this.hoveredAxis === 'z') ? this.HOVER_COLOR : this.Z_COLOR;
        if (this.uColorLoc) gl.uniform4fv(this.uColorLoc, zColor as Float32List);
        gl.drawArrays(gl.LINES, 4, 2);

        gl.bindVertexArray(null);
    }

    // Raycast against the 3 axes (approximated as capsules or boxes)
    intersect(ray: Ray, origin: vec3): { axis: GizmoAxis, distance: number } | null {
        const threshold = 2.0; // Hit radius around the line
        const L = GizmoRenderer.AXIS_LENGTH;

        let bestAxis: GizmoAxis = null;
        let bestDist = Infinity;

        // X Axis: Segment (0,0,0) to (L,0,0) relative to origin
        const start = origin;
        const endX = vec3.fromValues(origin[0] + L, origin[1], origin[2]);
        const distX = this.distRaySegment(ray, start, endX);
        if (distX.dist < threshold && distX.t < bestDist) {
            bestDist = distX.t;
            bestAxis = 'x';
        }

        // Y Axis
        const endY = vec3.fromValues(origin[0], origin[1] + L, origin[2]);
        const distY = this.distRaySegment(ray, start, endY);
        if (distY.dist < threshold && distY.t < bestDist) {
            bestDist = distY.t;
            bestAxis = 'y';
        }

        // Z Axis
        const endZ = vec3.fromValues(origin[0], origin[1], origin[2] + L);
        const distZ = this.distRaySegment(ray, start, endZ);
        if (distZ.dist < threshold && distZ.t < bestDist) {
            bestDist = distZ.t;
            bestAxis = 'z';
        }

        if (bestAxis) {
            return { axis: bestAxis, distance: bestDist };
        }
        return null;
    }

    // Distance between ray and line segment
    private distRaySegment(ray: Ray, s0: vec3, s1: vec3): { dist: number, t: number } {
        // http://geomalgorithms.com/a07-_distance.html
        const u = vec3.create(); vec3.sub(u, s1, s0);
        const v = vec3.fromValues(ray.direction[0], ray.direction[1], ray.direction[2]);
        const w = vec3.create(); vec3.sub(w, s0, vec3.fromValues(ray.origin[0], ray.origin[1], ray.origin[2]));

        const a = vec3.dot(u, u);
        const b = vec3.dot(u, v);
        const c = vec3.dot(v, v);
        const d = vec3.dot(u, w);
        const e = vec3.dot(v, w);
        const D = a * c - b * b;

        let sc, tc;

        if (D < 0.000001) { // Parallel
            sc = 0.0;
            tc = (b > c ? d / b : e / c);
        } else {
            sc = (b * e - c * d) / D;
            tc = (a * e - b * d) / D;
        }

        // Clip to segment
        if (sc < 0) sc = 0;
        else if (sc > 1) sc = 1;

        // Recompute tc
        tc = (b > c ? d / b : e / c); // Wait, if we clamp sc, we might need to re-solve for tc?
        // For gizmo picking precision isn't critical, but let's be decent.
        // Actually, simpler: finding closest point on segment to ray line.

        // P(sc) = s0 + sc * u
        // Q(tc) = r0 + tc * v
        // vector = P - Q. length is distance.

        // Let's use a simpler check: distance from point on ray to line segment
        // Or distance between two lines.

        // Since we know t (distance along ray) is what matters for depth sorting:
        // We want the point on the ray that is closest to the segment.

        // Vector from ray origin to closest point on segment
        const dP = vec3.create();
        const P = vec3.create(); vec3.scaleAndAdd(P, s0, u, sc);

        // Project P onto ray to find t
        vec3.sub(dP, P, vec3.fromValues(ray.origin[0], ray.origin[1], ray.origin[2]));
        const t = vec3.dot(dP, v); // Assuming v is normalized

        // Point on ray
        const Q = vec3.create(); vec3.scaleAndAdd(Q, vec3.fromValues(ray.origin[0], ray.origin[1], ray.origin[2]), v, t);

        const distVec = vec3.create(); vec3.sub(distVec, P, Q);
        const dist = vec3.length(distVec);

        return { dist, t };
    }
}
