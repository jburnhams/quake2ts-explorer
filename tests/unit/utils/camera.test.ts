import { createPickingRay } from '../../../src/utils/camera';
import { Camera } from '@quake2ts/engine';
import { mat4, vec3 } from 'gl-matrix';

// Use real gl-matrix
vi.mock('gl-matrix', () => vi.requireActual('gl-matrix'));

// Mock quake2ts/engine
vi.mock('@quake2ts/engine', () => {
    return {
        Camera: vi.fn(),
    };
});

describe('createPickingRay', () => {
  it('unprojects center of screen to forward direction', () => {
     const camera = new Camera();
     // Set matrices manually
     const proj = mat4.create();
     // fov 90, aspect 1, near 1, far 100
     mat4.perspective(proj, Math.PI / 2, 1, 1, 100);
     (camera as any).projectionMatrix = proj;

     const view = mat4.create(); // Identity: Eye at 0,0,0 looking down -Z

     const viewport = { width: 100, height: 100 };
     const mouse = { x: 50, y: 50 }; // Center

     const ray = createPickingRay(camera, view, mouse, viewport);

     // Direction should be roughly 0,0,-1
     expect(ray.direction[0]).toBeCloseTo(0);
     expect(ray.direction[1]).toBeCloseTo(0);
     expect(ray.direction[2]).toBeCloseTo(-1);
  });
});
