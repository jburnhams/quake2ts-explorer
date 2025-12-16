import { DebugRenderer } from './DebugRenderer';
import { Camera } from 'quake2ts/engine';
import { mat4, vec3, vec4, quat } from 'gl-matrix';
import { TransformMode, TransformAxis, GizmoState, intersectRayAABB } from '../../../utils/transformUtils';
import { Ray } from './types';

export class GizmoRenderer {
    private gl: WebGL2RenderingContext;
    private debugRenderer: DebugRenderer;
    private state: GizmoState = {
        activeAxis: TransformAxis.None,
        hoveredAxis: TransformAxis.None,
        mode: TransformMode.Translate,
        position: vec3.create(),
        rotation: quat.create(),
        scale: vec3.fromValues(1, 1, 1),
        isDragging: false
    };

    private readonly AXIS_LENGTH = 32;
    private readonly AXIS_THICKNESS = 1;
    private readonly HANDLE_SIZE = 4;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.debugRenderer = new DebugRenderer(gl);
    }

    setPosition(position: vec3) {
        vec3.copy(this.state.position, position);
    }

    setMode(mode: TransformMode) {
        this.state.mode = mode;
    }

    setHoveredAxis(axis: TransformAxis) {
        this.state.hoveredAxis = axis;
    }

    setActiveAxis(axis: TransformAxis) {
        this.state.activeAxis = axis;
    }

    getHoveredAxis(): TransformAxis {
        return this.state.hoveredAxis;
    }

    render(projection: mat4, view: mat4, camera: Camera) {
        // Only clear depth buffer if we want gizmo on top?
        // Usually gizmos are drawn with depth test disabled or on top.
        // For now, let's just rely on order.

        // However, DebugRenderer uses existing GL state.
        // We probably want to clear depth bit or disable depth test?
        this.gl.disable(this.gl.DEPTH_TEST);

        this.debugRenderer.clear();

        const p = this.state.position;
        const xColor = this.getAxisColor(TransformAxis.X, vec4.fromValues(1, 0, 0, 1));
        const yColor = this.getAxisColor(TransformAxis.Y, vec4.fromValues(0, 1, 0, 1));
        const zColor = this.getAxisColor(TransformAxis.Z, vec4.fromValues(0, 0, 1, 1));

        if (this.state.mode === TransformMode.Translate) {
            // X Axis
            this.debugRenderer.addLine(p, vec3.fromValues(p[0] + this.AXIS_LENGTH, p[1], p[2]), xColor);
            // Arrow head X (approximation with box for now)
            this.debugRenderer.addBox(
                vec3.fromValues(p[0] + this.AXIS_LENGTH - 2, p[1] - 2, p[2] - 2),
                vec3.fromValues(p[0] + this.AXIS_LENGTH + 2, p[1] + 2, p[2] + 2),
                xColor
            );

            // Y Axis
            this.debugRenderer.addLine(p, vec3.fromValues(p[0], p[1] + this.AXIS_LENGTH, p[2]), yColor);
            this.debugRenderer.addBox(
                vec3.fromValues(p[0] - 2, p[1] + this.AXIS_LENGTH - 2, p[2] - 2),
                vec3.fromValues(p[0] + 2, p[1] + this.AXIS_LENGTH + 2, p[2] + 2),
                yColor
            );

            // Z Axis
            this.debugRenderer.addLine(p, vec3.fromValues(p[0], p[1], p[2] + this.AXIS_LENGTH), zColor);
             this.debugRenderer.addBox(
                vec3.fromValues(p[0] - 2, p[1] - 2, p[2] + this.AXIS_LENGTH - 2),
                vec3.fromValues(p[0] + 2, p[1] + 2, p[2] + this.AXIS_LENGTH + 2),
                zColor
            );
        }

        // Calculate MVP
        const mvp = mat4.create();
        mat4.multiply(mvp, projection, view);

        this.debugRenderer.render(mvp);

        this.gl.enable(this.gl.DEPTH_TEST);
    }

    private getAxisColor(axis: TransformAxis, defaultColor: vec4): vec4 {
        if (this.state.activeAxis === axis) return vec4.fromValues(1, 1, 0, 1);
        if (this.state.hoveredAxis === axis) return vec4.fromValues(1, 1, 1, 1);
        return defaultColor;
    }

    checkIntersection(ray: Ray): TransformAxis {
        // Simple AABB checks for handles
        const p = this.state.position;
        const origin = vec3.fromValues(ray.origin[0], ray.origin[1], ray.origin[2]);
        const dir = vec3.fromValues(ray.direction[0], ray.direction[1], ray.direction[2]);

        // X Handle
        if (intersectRayAABB(
            origin, dir,
            vec3.fromValues(p[0], p[1] - 2, p[2] - 2),
            vec3.fromValues(p[0] + this.AXIS_LENGTH + 2, p[1] + 2, p[2] + 2)
        )) return TransformAxis.X;

        // Y Handle
        if (intersectRayAABB(
            origin, dir,
            vec3.fromValues(p[0] - 2, p[1], p[2] - 2),
            vec3.fromValues(p[0] + 2, p[1] + this.AXIS_LENGTH + 2, p[2] + 2)
        )) return TransformAxis.Y;

        // Z Handle
        if (intersectRayAABB(
            origin, dir,
            vec3.fromValues(p[0] - 2, p[1] - 2, p[2]),
            vec3.fromValues(p[0] + 2, p[1] + 2, p[2] + this.AXIS_LENGTH + 2)
        )) return TransformAxis.Z;

        return TransformAxis.None;
    }
}
