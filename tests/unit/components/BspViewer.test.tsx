import React from 'react';
import { render, act } from '@testing-library/react';
import { BspViewer } from '@/src/components/BspViewer';
import { PakService } from '@/src/services/pakService';
import { BspMap } from 'quake2ts/engine';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock quake2ts/engine
jest.mock('quake2ts/engine', () => {
  const { jest } = require('@jest/globals');
  return {
    createWebGLContext: jest.fn(() => ({
      gl: {
        viewport: jest.fn(),
        clearColor: jest.fn(),
        clear: jest.fn(),
        enable: jest.fn(),
        CULL_FACE: 1,
        DEPTH_TEST: 2,
        COLOR_BUFFER_BIT: 3,
        DEPTH_BUFFER_BIT: 4,
        createTexture: jest.fn(),
        bindTexture: jest.fn(),
        texParameteri: jest.fn(),
        texImage2D: jest.fn(),
        generateMipmap: jest.fn(),
        activeTexture: jest.fn(),
        drawElements: jest.fn(),
        TRIANGLES: 5,
        UNSIGNED_SHORT: 6,
        LINEAR_MIPMAP_LINEAR: 7,
        LINEAR: 8,
        REPEAT: 9,
        RGBA: 10,
        UNSIGNED_BYTE: 11,
        TEXTURE_2D: 12,
        TEXTURE0: 13,
        TEXTURE1: 14,
      }
    })),
    BspSurfacePipeline: jest.fn().mockImplementation(() => ({
      bind: jest.fn(() => ({})),
    })),
    createBspSurfaces: jest.fn(() => []),
    buildBspGeometry: jest.fn(() => ({
      surfaces: [
          { texture: 'tex1', surfaceFlags: 0, indexCount: 0, vao: { bind: jest.fn() }, lightmap: null }
      ],
      lightmaps: [],
    })),
    Camera: jest.fn().mockImplementation(() => ({
      projectionMatrix: new Float32Array(16),
      aspect: 1,
    })),
    Texture2D: jest.fn().mockImplementation(() => ({
      bind: jest.fn(),
      setParameters: jest.fn(),
      uploadImage: jest.fn(),
    })),
    parseWal: jest.fn(() => ({ width: 10, height: 10 })),
    walToRgba: jest.fn(() => ({ levels: [{ width: 10, height: 10, rgba: new Uint8Array(400) }] })),
    resolveLightStyles: jest.fn(() => new Float32Array(256)),
    applySurfaceState: jest.fn(),
  };
});

// Mock gl-matrix
jest.mock('gl-matrix', () => {
  const { jest } = require('@jest/globals');
  return {
  mat4: {
    create: jest.fn(() => new Float32Array(16)),
    lookAt: jest.fn(),
    multiply: jest.fn(),
  },
  vec3: {
    create: jest.fn(() => new Float32Array(3)),
    add: jest.fn(),
    scale: jest.fn(),
    distance: jest.fn(() => 100),
  }
  };
});

// Mock PakService
jest.mock('@/src/services/pakService');

describe('BspViewer', () => {
  let mockPakService: jest.Mocked<PakService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPakService = new PakService() as jest.Mocked<PakService>;
    mockPakService.hasFile.mockImplementation((path) => path === 'textures/tex1.wal');
    mockPakService.readFile.mockResolvedValue(new Uint8Array(10));
    mockPakService.getPalette.mockReturnValue(new Uint8Array(768));
  });

  const mockMap: BspMap = {
     version: 38,
     entities: "worldspawn",
     planes: [],
     vertices: [],
     visList: [],
     nodes: [],
     texInfo: [],
     faces: [],
     lightmaps: [],
     leaves: [],
     leafFaces: [],
     leafBrushes: [],
     edges: [],
     faceEdges: [],
     models: [{
         mins: [0,0,0],
         maxs: [100,100,100],
         origin: [0,0,0],
         headNode: 0,
         firstFace: 0,
         numFaces: 0
     }],
     brushes: [],
     brushSides: [],
     pop: [],
     clusters: [],
     clusterVis: [],
     areas: [],
     areaPortals: [],
  } as unknown as BspMap;

  it('renders without crashing', async () => {
    await act(async () => {
      render(<BspViewer map={mockMap} pakService={mockPakService} />);
    });
    // If we got here without error, it rendered.
    // We can check if CameraControls is present
    // CameraControls has text "Reset Camera"
    // But BspViewer renders it.
    // Since we didn't mock CameraControls child component, it renders real one.
    // But we need to import it. It is imported in BspViewer.
  });
});
