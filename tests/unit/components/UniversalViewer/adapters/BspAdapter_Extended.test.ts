import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { BspMap } from '@quake2ts/engine';
import { createMockBspMap } from '@quake2ts/test-utils/src/engine/mocks/assets';

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
      faces: [{ texInfoIndex: 0 }, { texInfoIndex: 1 }] as any,
      // @ts-ignore - legacy property
      texinfo: [
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
      const props = adapter.getSurfaceProperties(0);
      expect(props).toEqual({
        textureName: 'wall1',
        flags: 1,
        value: 100,
        contents: 0
      });
    });

    it('returns correct properties for another face', () => {
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
