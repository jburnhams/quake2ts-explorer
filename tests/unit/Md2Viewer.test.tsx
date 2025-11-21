import { render } from '@testing-library/react';
import { Md2Viewer } from '../../src/components/Md2Viewer';
import { computeCameraPosition } from '../../src/utils/cameraUtils';
import { vec3 } from 'quake2ts';

jest.mock('quake2ts', () => ({
  createWebGLContext: jest.fn().mockReturnValue({
    gl: {
      clearColor: jest.fn(),
      clear: jest.fn(),
      enable: jest.fn(),
      drawElements: jest.fn(),
      TRIANGLES: 0,
      COLOR_BUFFER_BIT: 0,
      DEPTH_BUFFER_BIT: 0,
      DEPTH_TEST: 0,
      CULL_FACE: 0,
      UNSIGNED_SHORT: 0,
      activeTexture: jest.fn(),
      TEXTURE0: 0,
    },
  }),
  Md2Pipeline: jest.fn().mockImplementation(() => ({
    bind: jest.fn(),
  })),
  buildMd2Geometry: jest.fn().mockReturnValue({ indices: { length: 0 } }),
  Md2MeshBuffers: jest.fn().mockImplementation(() => ({
    bind: jest.fn(),
    update: jest.fn(),
  })),
  Camera: jest.fn().mockImplementation(() => ({
    viewMatrix: new Float32Array(16),
    projectionMatrix: new Float32Array(16),
  })),
  createAnimationState: jest.fn().mockReturnValue({ time: 0 }),
  advanceAnimation: jest.fn(),
  computeFrameBlend: jest.fn().mockReturnValue({}),
  parsePcx: jest.fn(),
  pcxToRgba: jest.fn(),
  Texture2D: jest.fn().mockImplementation(() => ({
    upload: jest.fn(),
    bind: jest.fn(),
  })),
  mat4: {
    create: jest.fn().mockReturnValue(new Float32Array(16)),
    multiply: jest.fn(),
    lookAt: jest.fn(),
  },
}));

jest.mock('../../src/components/Md2AnimationControls', () => ({
  Md2AnimationControls: () => <div data-testid="md2-animation-controls" />,
}));

describe('Md2Viewer', () => {
  const model = {
    header: {
      ident: 'IDP2',
      version: 8,
      skinWidth: 0,
      skinHeight: 0,
      frameSize: 0,
      numSkins: 0,
      numVertices: 0,
      numTexCoords: 0,
      numTriangles: 0,
      numGlCommands: 0,
      numFrames: 0,
      offsetSkins: 0,
      offsetTexCoords: 0,
      offsetTriangles: 0,
      offsetFrames: 0,
      offsetGlCommands: 0,
      offsetEnd: 0,
    },
    skins: [],
    texCoords: [],
    triangles: [],
    frames: [],
    glCommands: [],
  };
  const animations = [
    { name: 'idle', firstFrame: 0, lastFrame: 39, fps: 9 },
  ];

  it('should render', () => {
    const { container } = render(
      <Md2Viewer
        model={model as any}
        animations={animations}
        hasFile={() => false}
        loadFile={() => Promise.resolve(new Uint8Array())}
      />
    );
    expect(container).toBeInTheDocument();
  });
});

describe('computeCameraPosition', () => {
  it('should calculate the correct camera position', () => {
    const orbit = {
      radius: 100,
      theta: 0,
      phi: Math.PI / 2,
      target: [0, 0, 0] as vec3,
      panOffset: [0, 0, 0] as vec3,
    };
    const position = computeCameraPosition(orbit);
    expect(position[0]).toBeCloseTo(100);
    expect(position[1]).toBeCloseTo(0);
    expect(position[2]).toBeCloseTo(0);
  });

  it('should handle different angles', () => {
    const orbit = {
      radius: 100,
      theta: Math.PI / 2,
      phi: Math.PI / 2,
      target: [0, 0, 0] as vec3,
      panOffset: [0, 0, 0] as vec3,
    };
    const position = computeCameraPosition(orbit);
    expect(position[0]).toBeCloseTo(0);
    expect(position[1]).toBeCloseTo(0);
    expect(position[2]).toBeCloseTo(100);
  });
});
