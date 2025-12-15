import React, { useEffect, useRef, useState } from 'react';
import { vec3, mat4 } from 'gl-matrix';
import { Camera } from 'quake2ts/engine';
import { entityEditorService } from '../services/entityEditorService';
import { ViewerAdapter } from './UniversalViewer/adapters/types';

interface TransformGizmoProps {
    adapter: ViewerAdapter | null;
    camera: Camera | null;
    // We use a ref for viewMatrix to avoid re-rendering every frame in UniversalViewer
    viewMatrixRef: React.MutableRefObject<mat4>;
    canvas: HTMLCanvasElement | null;
}

type Axis = 'x' | 'y' | 'z' | 'none';
type Mode = 'translate' | 'rotate' | 'scale';

export function TransformGizmo({ adapter, camera, viewMatrixRef, canvas }: TransformGizmoProps) {
    const [mode, setMode] = useState<Mode>('translate');
    const [activeAxis, setActiveAxis] = useState<Axis>('none');
    const [hoveredAxis, setHoveredAxis] = useState<Axis>('none');

    // We need to listen to selection changes
    const [selectedCenter, setSelectedCenter] = useState<vec3 | null>(null);

    // Initial drag state
    const [dragStartMouse, setDragStartMouse] = useState<{x: number, y: number} | null>(null);
    const [dragStartPos, setDragStartPos] = useState<vec3 | null>(null);

    useEffect(() => {
        const updateSelection = () => {
            const selected = entityEditorService.getSelectedEntities();
            if (selected.length === 0) {
                setSelectedCenter(null);
                return;
            }

            // Calculate center of selection
            const center = vec3.create();
            let count = 0;

            selected.forEach(e => {
                if (e.origin) {
                    vec3.add(center, center, vec3.fromValues(e.origin.x, e.origin.y, e.origin.z));
                    count++;
                }
            });

            if (count > 0) {
                vec3.scale(center, center, 1.0 / count);
                setSelectedCenter(center);
            } else {
                setSelectedCenter(null);
            }
        };

        const unsubscribe = entityEditorService.subscribe(updateSelection);
        updateSelection();
        return unsubscribe;
    }, []);

    // Handle Input
    useEffect(() => {
        if (!canvas || !camera) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!selectedCenter) return; // Need selected center for gizmo
            const viewMatrix = viewMatrixRef.current; // Get latest matrix without re-render dependency

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (activeAxis !== 'none' && dragStartMouse && dragStartPos) {
                // Dragging logic
                const axisDir = vec3.create();
                if (activeAxis === 'x') axisDir[0] = 1;
                else if (activeAxis === 'y') axisDir[1] = 1;
                else if (activeAxis === 'z') axisDir[2] = 1;

                const startScreen = project(dragStartPos, viewMatrix, camera, rect);
                const endPos = vec3.create();
                vec3.add(endPos, dragStartPos, axisDir);
                const endScreen = project(endPos, viewMatrix, camera, rect);

                if (startScreen && endScreen) {
                    const screenAxis = { x: endScreen.x - startScreen.x, y: endScreen.y - startScreen.y };
                    const len = Math.hypot(screenAxis.x, screenAxis.y);
                    if (len > 0) {
                        const axisNorm = { x: screenAxis.x / len, y: screenAxis.y / len };
                        const mouseDelta = { x: x - dragStartMouse.x, y: y - dragStartMouse.y };
                        const proj = mouseDelta.x * axisNorm.x + mouseDelta.y * axisNorm.y;

                        // Scale sensitivity
                        // When mouse moves along screen axis by 'len' pixels, that corresponds to 1 world unit
                        // So ratio is 1 unit / len pixels.
                        // However, 'len' is pixels for 1 unit length vector?
                        // Wait, endPos is startPos + axisDir (length 1).
                        // So 'len' IS pixels per world unit.
                        // So worldDelta = proj / len.

                        // But wait, if len is small (axis pointing away), movement is huge. That is correct in perspective.
                        // Clamp if too small?
                        if (len < 0.1) return;

                        const worldDelta = proj / len;

                        entityEditorService.previewMove(activeAxis, worldDelta);
                    }
                }
                return;
            }

            // Hit testing
            const origin = selectedCenter;
            const length = 50;

            const xAxisEnd = vec3.fromValues(origin[0] + length, origin[1], origin[2]);
            const yAxisEnd = vec3.fromValues(origin[0], origin[1] + length, origin[2]);
            const zAxisEnd = vec3.fromValues(origin[0], origin[1], origin[2] + length);

            const sOrigin = project(origin, viewMatrix, camera, rect);
            const sX = project(xAxisEnd, viewMatrix, camera, rect);
            const sY = project(yAxisEnd, viewMatrix, camera, rect);
            const sZ = project(zAxisEnd, viewMatrix, camera, rect);

            let bestAxis: Axis = 'none';
            let minStartDist = 15; // Increased hit area

            if (sOrigin) {
                if (sX) {
                    const d = distToSegment({x, y}, sOrigin, sX);
                    if (d < minStartDist) { bestAxis = 'x'; minStartDist = d; }
                }
                if (sY) {
                    const d = distToSegment({x, y}, sOrigin, sY);
                    if (d < minStartDist) { bestAxis = 'y'; minStartDist = d; }
                }
                if (sZ) {
                    const d = distToSegment({x, y}, sOrigin, sZ);
                    if (d < minStartDist) { bestAxis = 'z'; minStartDist = d; }
                }
            }

            setHoveredAxis(bestAxis);
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (hoveredAxis !== 'none') {
                setActiveAxis(hoveredAxis);
                const rect = canvas.getBoundingClientRect();
                setDragStartMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                // Need to clone current center because selectedCenter might change during preview
                setDragStartPos(vec3.clone(selectedCenter!));
                entityEditorService.startTransform();
                e.stopPropagation();
            }
        };

        const handleMouseUp = () => {
            if (activeAxis !== 'none') {
                setActiveAxis('none');
                setDragStartMouse(null);
                setDragStartPos(null);
                entityEditorService.commitTransform();
            }
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [canvas, selectedCenter, camera, viewMatrixRef, hoveredAxis, activeAxis, dragStartMouse, dragStartPos]);

    // Render Gizmo via Adapter
    useEffect(() => {
        if (adapter && (adapter as any).setGizmoState) {
            (adapter as any).setGizmoState({
                visible: !!selectedCenter,
                position: selectedCenter,
                hoveredAxis: hoveredAxis,
                activeAxis: activeAxis,
                mode: mode
            });
        }
    }, [adapter, selectedCenter, hoveredAxis, activeAxis, mode]);

    return (
        <div className="transform-gizmo-controls" style={{position: 'absolute', top: 60, left: 10, zIndex: 100}}>
            {selectedCenter && (
                <div className="gizmo-toolbar">
                    <button className={mode === 'translate' ? 'active' : ''} onClick={() => setMode('translate')}>Move (W)</button>
                </div>
            )}
        </div>
    );
}

function project(v: vec3, viewMatrix: mat4, camera: Camera, rect: DOMRect): {x: number, y: number} | null {
    const p = vec3.clone(v);
    vec3.transformMat4(p, p, viewMatrix);
    vec3.transformMat4(p, p, camera.projectionMatrix as mat4);
    if (p[2] > 1 || p[2] < -1) return null; // Clipped
    return {
        x: (p[0] * 0.5 + 0.5) * rect.width,
        y: (-(p[1] * 0.5) + 0.5) * rect.height
    };
}

function distToSegment(p: {x: number, y: number}, v: {x: number, y: number}, w: {x: number, y: number}) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
