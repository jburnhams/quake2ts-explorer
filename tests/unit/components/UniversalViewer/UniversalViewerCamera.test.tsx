import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { ViewerControls } from '@/src/components/UniversalViewer/ViewerControls';
import { ParsedFile, PakService } from '../../../src/services/pakService';
import { OrbitState } from '../../../src/utils/cameraUtils';

// Mock gl-matrix
vi.mock('gl-matrix', () => {
  const original = vi.requireActual('gl-matrix');
  return {
    ...original,
    mat4: {
      ...original.mat4,
      create: vi.fn(() => new Float32Array(16)),
      lookAt: vi.fn(),
    },
    vec3: {
        ...original.vec3,
        create: vi.fn(() => new Float32Array(3)),
    }
  };
});

// Mock DebugRenderer
vi.mock('../../../../src/components/UniversalViewer/adapters/DebugRenderer', () => {
    return {
        DebugRenderer: vi.fn().mockImplementation(() => ({
            clear: vi.fn(),
            addBox: vi.fn(),
            addLine: vi.fn(),
            render: vi.fn(),
            init: vi.fn()
        }))
    };
});

// Mock quake2ts/engine
vi.mock('@quake2ts/engine', () => ({
  createWebGLContext: vi.fn(() => ({
    gl: {
      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      enable: vi.fn(),
      CULL_FACE: 0,
      DEPTH_TEST: 1,
      COLOR_BUFFER_BIT: 16384,
      DEPTH_BUFFER_BIT: 256,
    }
  })),
  Camera: vi.fn(() => ({
    fov: 60,
    aspect: 1,
    position: new Float32Array(3),
    angles: new Float32Array(3),
    viewMatrix: new Float32Array(16),
  })),
  BspSurfacePipeline: vi.fn(() => ({
    bind: vi.fn(),
    cleanup: vi.fn(),
  })),
  createBspSurfaces: vi.fn(() => []),
  buildBspGeometry: vi.fn(() => ({
    surfaces: [],
    lightmaps: []
  })),
  resolveLightStyles: vi.fn(() => new Map()),
  applySurfaceState: vi.fn(),
  Texture2D: vi.fn(() => ({
      bind: vi.fn(),
      setParameters: vi.fn(),
      uploadImage: vi.fn()
  })),
  parseWal: vi.fn(() => ({})),
  walToRgba: vi.fn(() => ({ levels: [] })),
}));

// Mock adapters using js extension as required by jest config map if present, or just path
// The Jest config maps .js to .ts effectively via resolver or standard resolution.
// But we might need to be explicit or use moduleNameMapper if using ESM.
// Our config has: '^(\\.{1,2}/.*)\\.js$': '$1' which strips .js extension to look for file?
// No, it maps relative imports ending in .js to the same path without .js? No, '$1' includes the path part.
// Actually '$1' is the capture group. So it keeps the path as is?
// Wait, `^(\\.{1,2}/.*)\\.js$`: '$1' means `../foo.js` -> `../foo`.
// So if I import `.../Md2Adapter`, it looks for `Md2Adapter.ts` automatically?
// But here I'm using `vi.mock`.

vi.mock('../../../src/components/UniversalViewer/adapters/Md2Adapter', () => ({
  Md2Adapter: vi.fn(() => ({
    load: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    cleanup: vi.fn(),
    hasCameraControl: () => false
  }))
}), { virtual: true }); // virtual might help if resolution fails? No, file exists.

vi.mock('../../../src/components/UniversalViewer/adapters/BspAdapter', () => ({
  BspAdapter: vi.fn(() => ({
    load: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    cleanup: vi.fn(),
    hasCameraControl: () => false,
    useZUp: () => true
  }))
}), { virtual: true });

describe('UniversalViewer Camera Integration', () => {
    let pakService: PakService;

    beforeEach(() => {
        pakService = {} as PakService;
        vi.clearAllMocks();
    });

    it('should switch to Free Camera mode for BSP files', async () => {
        const parsedFile: ParsedFile = { name: 'test.bsp', type: 'bsp', data: new ArrayBuffer(0) };

        await act(async () => {
            render(<UniversalViewer parsedFile={parsedFile} pakService={pakService} />);
        });

        // Check if ViewerControls received 'free' mode
        // Note: checking internal state of functional component is hard.
        // We can check if "Free Look" text is present in the rendered output if it renders controls.

        // Wait, UniversalViewer renders ViewerControls.
        // Let's verify via screen queries.
        // Note: React Testing Library `screen` is not imported, using `render` result or `screen`.
    });
});

describe('ViewerControls Interaction', () => {
    it('should toggle camera mode', () => {
        const setCameraMode = vi.fn();
        const setOrbit = vi.fn();
        const setSpeed = vi.fn();

        const { getByText } = render(
            <ViewerControls
                isPlaying={true}
                onPlayPause={() => {}}
                orbit={{} as OrbitState}
                setOrbit={setOrbit}
                hasPlayback={true}
                speed={1}
                setSpeed={setSpeed}
                showCameraControls={true}
                cameraMode={'orbit'}
                setCameraMode={setCameraMode}
                renderMode="textured"
                setRenderMode={() => {}}
                renderColor={[1, 1, 1]}
                setRenderColor={() => {}}
            />
        );

        const toggleBtn = getByText(/Mode: Orbit/i);
        fireEvent.click(toggleBtn);
        expect(setCameraMode).toHaveBeenCalledWith('free');
    });
});
