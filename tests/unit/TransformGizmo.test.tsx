import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TransformGizmo } from '../../src/components/TransformGizmo';
import { entityEditorService } from '../../src/services/entityEditorService';
import { vec3, mat4 } from 'gl-matrix';

// Mock gl-matrix
jest.mock('gl-matrix', () => ({
  vec3: {
    create: jest.fn(() => new Float32Array([0, 0, 0])),
    fromValues: jest.fn((x, y, z) => new Float32Array([x, y, z])),
    add: jest.fn(),
    sub: jest.fn(),
    scale: jest.fn(),
    transformMat4: jest.fn(),
    clone: jest.fn(v => new Float32Array(v)),
    distance: jest.fn(() => 10),
  },
  vec4: {
    fromValues: jest.fn(),
  },
  mat4: {
    create: jest.fn(() => new Float32Array(16)),
    multiply: jest.fn(),
  },
}));

describe('TransformGizmo', () => {
  let mockAdapter: any;
  let mockCamera: any;
  let mockViewMatrixRef: any;
  let mockCanvas: any;

  beforeEach(() => {
    mockAdapter = {
        setGizmoState: jest.fn()
    };
    mockCamera = {
        projectionMatrix: new Float32Array(16)
    };
    mockViewMatrixRef = { current: new Float32Array(16) };
    mockCanvas = document.createElement('canvas');
    mockCanvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, width: 800, height: 600
    }));

    // Setup selection
    const mockEntities = [
        { id: 0, isSelected: true, origin: { x: 0, y: 0, z: 0 }, properties: {} }
    ];
    jest.spyOn(entityEditorService, 'getSelectedEntities').mockReturnValue(mockEntities as any);
    jest.spyOn(entityEditorService, 'subscribe').mockImplementation((cb) => {
        cb();
        return jest.fn();
    });
  });

  it('should call setGizmoState on adapter when selection exists', async () => {
    render(
      <TransformGizmo
        adapter={mockAdapter}
        camera={mockCamera}
        viewMatrixRef={mockViewMatrixRef}
        canvas={mockCanvas}
      />
    );

    await waitFor(() => {
        expect(mockAdapter.setGizmoState).toHaveBeenCalled();
        const lastCallIndex = mockAdapter.setGizmoState.mock.calls.length - 1;
        const args = mockAdapter.setGizmoState.mock.calls[lastCallIndex][0];
        expect(args.visible).toBe(true);
        expect(args.mode).toBe('translate');
    });
  });

  it('should not show gizmo if no selection', () => {
    jest.spyOn(entityEditorService, 'getSelectedEntities').mockReturnValue([]);

    render(
        <TransformGizmo
          adapter={mockAdapter}
          camera={mockCamera}
          viewMatrixRef={mockViewMatrixRef}
          canvas={mockCanvas}
        />
      );

    const args = mockAdapter.setGizmoState.mock.calls[0][0];
    expect(args.visible).toBe(false);
  });
});
