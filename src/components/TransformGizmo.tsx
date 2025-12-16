import React, { useCallback, useEffect, useRef, useState } from 'react';
import { vec3 } from 'gl-matrix';

export enum TransformMode {
    Translate = 'translate',
    Rotate = 'rotate',
    Scale = 'scale'
}

interface TransformGizmoProps {
    mode: TransformMode;
    position: vec3;
    onTransformStart: () => void;
    onTransform: (delta: vec3) => void;
    onTransformEnd: () => void;
}

// This component is currently a placeholder/wrapper logic
// The actual rendering happens in the Adapter via GizmoRenderer
// But we might need UI controls or overlay here?
// For now, let's keep it minimal as most logic is in BspAdapter.

export function TransformGizmo({ mode, position, onTransformStart, onTransform, onTransformEnd }: TransformGizmoProps) {
    return null; // Logic is handled in WebGL adapter
}
