import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { BspMap } from '@quake2ts/engine';
import { createMockBspMap } from '@quake2ts/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@quake2ts/engine', async (importOriginal) => {
  const original = await importOriginal<typeof import('@quake2ts/engine')>();
  return {
    ...original,
    BspSurfacePipeline: vi.fn(),
    DebugRenderer: vi.fn(),
    createBspSurfaces: vi.fn(() => []),
    buildBspGeometry: vi.fn(() => ({ surfaces: [], lightmaps: [] })),
  };
});

describe('BspAdapter - Extended', () => {
  let adapter: BspAdapter;
  let mockMap: any;

  beforeEach(() => {
    adapter = new BspAdapter();
    mockMap = createMockBspMap({
      pickEntity: vi.fn(),
      faces: [{ texInfo: 0 }, { texInfo: 1 }] as any,
      texInfo: [
        { texture: 'wall1', flags: 1, value: 100, contents: 0 },
        { texture: 'sky', flags: 4, value: 0, contents: 0 }
      ] as any,
      entities: {
          getUniqueClassnames: vi.fn(() => []),
          entities: []
      } as any,
      models: [] as any,
      leafs: [] as any,
      planes: [] as any,
    });
    // Inject map directly for testing helper methods that depend on it
    (adapter as any).map = mockMap;
  });

  describe('getSurfaceProperties', () => {
    it('returns properties for valid face index', () => {
      // In BspAdapter.ts, it uses `texInfoIndex` property on face if available, otherwise `texinfo`.
      // The createMockBspMap faces might not have texInfoIndex.
      // Let's ensure the mock faces have texInfoIndex or whatever BspAdapter expects.
      // Looking at BspAdapter: const texInfoIndex = (face as any).texInfoIndex !== undefined ? (face as any).texInfoIndex : (face as any).texinfo;

      // Update mock faces to match expectations
      mockMap.faces[0].texInfoIndex = 0;
      mockMap.faces[1].texInfoIndex = 1;
      // also ensure texinfo property exists for legacy fallback
      mockMap.faces[0].texinfo = 0;
      mockMap.faces[1].texinfo = 1;

      const props = adapter.getSurfaceProperties(0);
      expect(props).toEqual({
        textureName: 'wall1',
        flags: 1,
        value: 100,
        contents: 0
      });
    });

    it('returns correct properties for another face', () => {
      mockMap.faces[0].texInfoIndex = 0;
      mockMap.faces[1].texInfoIndex = 1;
      mockMap.faces[0].texinfo = 0;
      mockMap.faces[1].texinfo = 1;

      const props = adapter.getSurfaceProperties(1);
      expect(props).toEqual({
        textureName: 'sky',
        flags: 4, // SURF_SKY
        value: 0,
        contents: 0
      });
    });

    it('returns null for invalid face index', () => {
      expect(adapter.getSurfaceProperties(-1)).toBeNull();
      expect(adapter.getSurfaceProperties(999)).toBeNull();
    });

    it('returns null if map is not loaded', () => {
      (adapter as any).map = null;
      expect(adapter.getSurfaceProperties(0)).toBeNull();
    });
  });

  describe('pickEntity', () => {
    it('delegates to map.pickEntity and returns result', () => {
      const mockResult = { entity: {}, distance: 100 };
      mockMap.pickEntity.mockReturnValue(mockResult);

      const ray = { origin: [0,0,0], direction: [0,0,1] } as any;
      const result = adapter.pickEntity(ray);

      expect(result).toBe(mockResult);
      expect(mockMap.pickEntity).toHaveBeenCalledWith(ray);
    });

    it('returns null if map.pickEntity returns null', () => {
      mockMap.pickEntity.mockReturnValue(null);
      const ray = { origin: [0,0,0], direction: [0,0,1] } as any;
      expect(adapter.pickEntity(ray)).toBeNull();
    });
  });
});
