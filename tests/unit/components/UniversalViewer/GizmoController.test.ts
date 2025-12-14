import { GizmoController } from '@/src/components/UniversalViewer/GizmoController';
import { vec3 } from 'gl-matrix';

// Mock gl-matrix
jest.mock('gl-matrix', () => jest.requireActual('gl-matrix'));

describe('GizmoController', () => {
  let gizmo: GizmoController;

  beforeEach(() => {
    gizmo = new GizmoController();
    gizmo.setPosition(vec3.fromValues(100, 100, 100));
  });

  it('renders axes', () => {
    const mockRenderer = {
      addLine: jest.fn(),
      addBox: jest.fn(),
      clear: jest.fn(),
      render: jest.fn(),
      init: jest.fn()
    };
    gizmo.render(mockRenderer as any);
    expect(mockRenderer.addLine).toHaveBeenCalledTimes(9); // 3 axes * (1 main line + 2 arrow lines)
  });

  it('intersects X axis', () => {
    // Ray parallel to X axis, slightly offset but within threshold
    const ray = {
      origin: vec3.fromValues(0, 100, 100),
      direction: vec3.fromValues(1, 0, 0)
    };

    // Position is at 100,100,100. Ray goes through 0,100,100 -> 1,0,0. passes through 100,100,100.
    const hit = gizmo.intersect(ray);
    expect(hit).toBe('x');
  });

  it('calculates new position constrained to axis', () => {
      const startPos = vec3.fromValues(100, 100, 100);
      const cameraForward = vec3.fromValues(0, 0, -1); // Looking down -Z

      // Ray casting to new X position
      // Origin at 150, 100, 200 (camera)
      // Direction towards 150, 100, 100 (target)
      const ray = {
          origin: vec3.fromValues(150, 100, 200),
          direction: vec3.fromValues(0, 0, -1)
      };

      const newPos = gizmo.getNewPosition('x', startPos, ray, cameraForward);

      // Should move to X=150, keeping Y=100, Z=100
      expect(newPos[0]).toBeCloseTo(150);
      expect(newPos[1]).toBeCloseTo(100);
      expect(newPos[2]).toBeCloseTo(100);
  });
});
