import { vec3, vec4, mat4 } from 'gl-matrix';
import { Ray } from './types';
import { TransformUtils } from '@/src/utils/transformUtils';

export type GizmoAxis = 'x' | 'y' | 'z' | null;
export type GizmoMode = 'translate' | 'rotate' | 'scale';

export class GizmoRenderer {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private vertexBuffer: WebGLBuffer | null = null;

    // Rotate Ring VAO
    private rotateVao: WebGLVertexArrayObject | null = null;
    private rotateVertexBuffer: WebGLBuffer | null = null;

    // Axis colors
    private X_COLOR: vec4;
    private Y_COLOR: vec4;
    private Z_COLOR: vec4;
    private HOVER_COLOR: vec4;

    private hoveredAxis: GizmoAxis = null;
    private activeAxis: GizmoAxis = null;
    private mode: GizmoMode = 'translate';

    private static AXIS_LENGTH = 32;
    private static RING_RADIUS = 32;
    private static RING_SEGMENTS = 64;

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

        // --- Translate Geometry (Lines) ---
        const L = GizmoRenderer.AXIS_LENGTH;
        const translateVertices = new Float32Array([
            0, 0, 0,  L, 0, 0, // X
            0, 0, 0,  0, L, 0, // Y
            0, 0, 0,  0, 0, L  // Z
        ]);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, translateVertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);


        // --- Rotate Geometry (Rings) ---
        // X-Ring: Circle in YZ plane
        // Y-Ring: Circle in XZ plane
        // Z-Ring: Circle in XY plane
        const segments = GizmoRenderer.RING_SEGMENTS;
        const radius = GizmoRenderer.RING_RADIUS;
        const ringVertices = [];

        // X-Ring (YZ plane) - Indices 0 to 2*segments-1
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const y = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            ringVertices.push(0, y, z);
        }

        // Y-Ring (XZ plane) - Indices 2*segments+2 ...
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            ringVertices.push(x, 0, z);
        }

        // Z-Ring (XY plane)
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = Math.cos(theta) * radius;
            const y = Math.sin(theta) * radius;
            ringVertices.push(x, y, 0);
        }

        this.rotateVao = gl.createVertexArray();
        gl.bindVertexArray(this.rotateVao);

        this.rotateVertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.rotateVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ringVertices), gl.STATIC_DRAW);
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

    setMode(mode: GizmoMode) {
        this.mode = mode;
    }

    render(position: vec3, viewProjection: mat4) {
        if (!this.program) return;
        const gl = this.gl;

        gl.useProgram(this.program);
        if (this.uMvpLoc) gl.uniformMatrix4fv(this.uMvpLoc, false, viewProjection as Float32List);
        if (this.uOriginLoc) gl.uniform3fv(this.uOriginLoc, position as Float32List);

        if (this.mode === 'translate' && this.vao) {
            gl.bindVertexArray(this.vao);
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
        } else if (this.mode === 'rotate' && this.rotateVao) {
            gl.bindVertexArray(this.rotateVao);
            const count = GizmoRenderer.RING_SEGMENTS + 1;

            // Draw X Ring
            const xColor = (this.activeAxis === 'x' || this.hoveredAxis === 'x') ? this.HOVER_COLOR : this.X_COLOR;
            if (this.uColorLoc) gl.uniform4fv(this.uColorLoc, xColor as Float32List);
            gl.drawArrays(gl.LINE_STRIP, 0, count);

            // Draw Y Ring
            const yColor = (this.activeAxis === 'y' || this.hoveredAxis === 'y') ? this.HOVER_COLOR : this.Y_COLOR;
            if (this.uColorLoc) gl.uniform4fv(this.uColorLoc, yColor as Float32List);
            gl.drawArrays(gl.LINE_STRIP, count, count);

            // Draw Z Ring
            const zColor = (this.activeAxis === 'z' || this.hoveredAxis === 'z') ? this.HOVER_COLOR : this.Z_COLOR;
            if (this.uColorLoc) gl.uniform4fv(this.uColorLoc, zColor as Float32List);
            gl.drawArrays(gl.LINE_STRIP, count * 2, count);
        }

        gl.bindVertexArray(null);
    }

    intersect(ray: Ray, origin: vec3): { axis: GizmoAxis, distance: number } | null {
        if (this.mode === 'translate') {
            return this.intersectTranslate(ray, origin);
        } else if (this.mode === 'rotate') {
            return this.intersectRotate(ray, origin);
        }
        return null;
    }

    private intersectTranslate(ray: Ray, origin: vec3): { axis: GizmoAxis, distance: number } | null {
        const threshold = 2.0;
        const L = GizmoRenderer.AXIS_LENGTH;
        let bestAxis: GizmoAxis = null;
        let bestDist = Infinity;

        const start = origin;

        // X Axis
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

    private intersectRotate(ray: Ray, origin: vec3): { axis: GizmoAxis, distance: number } | null {
        // Intersect with planes defined by rings
        const threshold = 4.0; // wider tolerance for rings
        const R = GizmoRenderer.RING_RADIUS;
        let bestAxis: GizmoAxis = null;
        let bestDist = Infinity;

        // X-Ring: Plane Normal (1,0,0) [YZ Plane]
        const hitX = TransformUtils.projectRayToPlane(ray, vec3.fromValues(1,0,0), origin);
        if (hitX) {
            const dist = vec3.distance(hitX.point, origin);
            if (Math.abs(dist - R) < threshold && hitX.t < bestDist) {
                bestDist = hitX.t;
                bestAxis = 'x';
            }
        }

        // Y-Ring: Plane Normal (0,1,0) [XZ Plane]
        const hitY = TransformUtils.projectRayToPlane(ray, vec3.fromValues(0,1,0), origin);
        if (hitY) {
            const dist = vec3.distance(hitY.point, origin);
            if (Math.abs(dist - R) < threshold && hitY.t < bestDist) {
                bestDist = hitY.t;
                bestAxis = 'y';
            }
        }

        // Z-Ring: Plane Normal (0,0,1) [XY Plane]
        const hitZ = TransformUtils.projectRayToPlane(ray, vec3.fromValues(0,0,1), origin);
        if (hitZ) {
            const dist = vec3.distance(hitZ.point, origin);
            if (Math.abs(dist - R) < threshold && hitZ.t < bestDist) {
                bestDist = hitZ.t;
                bestAxis = 'z';
            }
        }

        if (bestAxis) {
            return { axis: bestAxis, distance: bestDist };
        }
        return null;
    }

    private distRaySegment(ray: Ray, s0: vec3, s1: vec3): { dist: number, t: number } {
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

        if (D < 0.000001) {
            sc = 0.0;
            tc = (b > c ? d / b : e / c);
        } else {
            sc = (b * e - c * d) / D;
            tc = (a * e - b * d) / D;
        }

        if (sc < 0) sc = 0;
        else if (sc > 1) sc = 1;

        tc = (b > c ? d / b : e / c);

        const dP = vec3.create();
        const P = vec3.create(); vec3.scaleAndAdd(P, s0, u, sc);
        vec3.sub(dP, P, vec3.fromValues(ray.origin[0], ray.origin[1], ray.origin[2]));
        const t = vec3.dot(dP, v);
        const Q = vec3.create(); vec3.scaleAndAdd(Q, vec3.fromValues(ray.origin[0], ray.origin[1], ray.origin[2]), v, t);

        const distVec = vec3.create(); vec3.sub(distVec, P, Q);
        const dist = vec3.length(distVec);

        return { dist, t };
    }
}
