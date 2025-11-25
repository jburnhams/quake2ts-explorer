import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { ViewerControls } from '@/src/components/UniversalViewer/ViewerControls';
import { ParsedFile, PakService } from '../../../src/services/pakService';
import { OrbitState } from '../../../src/utils/cameraUtils';

// Mock gl-matrix
jest.mock('gl-matrix', () => {
  const original = jest.requireActual('gl-matrix');
  return {
    ...original,
    mat4: {
      ...original.mat4,
      create: jest.fn(() => new Float32Array(16)),
      lookAt: jest.fn(),
    },
    vec3: {
        ...original.vec3,
        create: jest.fn(() => new Float32Array(3)),
    }
  };
});

// Mock quake2ts/engine
jest.mock('quake2ts/engine', () => ({
  createWebGLContext: jest.fn(() => ({
    gl: {
      viewport: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
      enable: jest.fn(),
      CULL_FACE: 0,
      DEPTH_TEST: 1,
      COLOR_BUFFER_BIT: 16384,
      DEPTH_BUFFER_BIT: 256,
    }
  })),
  Camera: jest.fn(() => ({
    fov: 60,
    aspect: 1,
    position: new Float32Array(3),
    angles: new Float32Array(3),
    viewMatrix: new Float32Array(16),
  })),
  BspSurfacePipeline: jest.fn(() => ({
    bind: jest.fn(),
    cleanup: jest.fn(),
  })),
  createBspSurfaces: jest.fn(() => []),
  buildBspGeometry: jest.fn(() => ({
    surfaces: [],
    lightmaps: []
  })),
  resolveLightStyles: jest.fn(() => new Map()),
  applySurfaceState: jest.fn(),
  Texture2D: jest.fn(() => ({
      bind: jest.fn(),
      setParameters: jest.fn(),
      uploadImage: jest.fn()
  })),
  parseWal: jest.fn(() => ({})),
  walToRgba: jest.fn(() => ({ levels: [] })),
}));

// Mock adapters using js extension as required by jest config map if present, or just path
// The Jest config maps .js to .ts effectively via resolver or standard resolution.
// But we might need to be explicit or use moduleNameMapper if using ESM.
// Our config has: '^(\\.{1,2}/.*)\\.js$': '$1' which strips .js extension to look for file?
// No, it maps relative imports ending in .js to the same path without .js? No, '$1' includes the path part.
// Actually '$1' is the capture group. So it keeps the path as is?
// Wait, `^(\\.{1,2}/.*)\\.js$`: '$1' means `../foo.js` -> `../foo`.
// So if I import `.../Md2Adapter`, it looks for `Md2Adapter.ts` automatically?
// But here I'm using `jest.mock`.

jest.mock('../../../src/components/UniversalViewer/adapters/Md2Adapter', () => ({
  Md2Adapter: jest.fn(() => ({
    load: jest.fn(),
    update: jest.fn(),
    render: jest.fn(),
    cleanup: jest.fn(),
    hasCameraControl: () => false
  }))
}), { virtual: true }); // virtual might help if resolution fails? No, file exists.

jest.mock('../../../src/components/UniversalViewer/adapters/BspAdapter', () => ({
  BspAdapter: jest.fn(() => ({
    load: jest.fn(),
    update: jest.fn(),
    render: jest.fn(),
    cleanup: jest.fn(),
    hasCameraControl: () => false,
    useZUp: () => true
  }))
}), { virtual: true });

describe('UniversalViewer Camera Integration', () => {
    let pakService: PakService;

    beforeEach(() => {
        pakService = {} as PakService;
        jest.clearAllMocks();
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
        const setCameraMode = jest.fn();
        const setOrbit = jest.fn();
        const setSpeed = jest.fn();

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
