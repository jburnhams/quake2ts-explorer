import { AssetCrossRefService } from '@/src/services/assetCrossRefService';
import { VirtualFileSystem } from '@quake2ts/engine';

// This is a "realistic" integration test that uses a real VFS but mocks file content slightly
// to avoid needing actual valid binary files for everything, while still exercising the service logic.
// We mock parseMd2/parseMd3/parseBsp to return structure but we rely on VFS behavior.

// Since we can't easily import real parse functions in test environment without wasm/binary setup sometimes,
// we will mock the engine imports but keep the service logic real.

vi.mock('@quake2ts/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@quake2ts/engine')>();
  return {
    VirtualFileSystem: actual.VirtualFileSystem,
    parseMd2: vi.fn(),
    parseMd3: vi.fn(),
    parseBsp: vi.fn(),
  };
});

import { parseMd2, parseMd3, parseBsp } from '@quake2ts/engine';

describe('AssetCrossRefService Integration', () => {
  let vfs: VirtualFileSystem;
  let service: AssetCrossRefService;

  beforeEach(() => {
    vi.clearAllMocks();
    vfs = new VirtualFileSystem();
    service = new AssetCrossRefService(vfs);
  });

  it('should find usage across multiple file types in VFS', async () => {
    // Setup VFS with some dummy files
    // VirtualFileSystem in quake2ts might need a PAK mounted or we can mock findByExtension
    // If we use real VFS, we need to inject files.
    // Since VFS is read-only usually (from PAKs), let's mock findByExtension and readFile on the instance
    // to simulate a loaded PAK scenario.

    const mockMd2 = 'models/hero.md2';
    const mockMd3 = 'models/weapon.md3';
    const mockBsp = 'maps/level1.bsp';

    // Mock VFS behavior
    vfs.findByExtension = vi.fn((ext: string) => {
      const results: { path: string }[] = [];
      if (ext === 'md2') results.push({ path: mockMd2 });
      if (ext === 'md3') results.push({ path: mockMd3 });
      if (ext === 'bsp') results.push({ path: mockBsp });
      return results;
    });

    vfs.readFile = vi.fn((path: string) => {
       return new Uint8Array([0]); // Dummy content
    });

    // Mock parsers
    (parseMd2 as vi.Mock).mockReturnValue({ skins: ['models/skin.pcx'] });
    (parseMd3 as vi.Mock).mockReturnValue({ surfaces: [{ shaders: [{ name: 'models/skin.tga' }] }] });
    (parseBsp as vi.Mock).mockReturnValue({ textures: [{ name: 'textures/wall' }] });

    // Test finding skin.pcx
    const result1 = await service.findTextureUsage('models/skin.pcx');
    expect(result1).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: mockMd2, type: 'model' })
    ]));

    // Test finding skin (loose match)
    const result2 = await service.findTextureUsage('models/skin');
    expect(result2.some(u => u.path === mockMd2)).toBe(true);
    // Should also match .tga one if logic allows
    // Our logic matches "models/skin" against "models/skin.tga" ref?
    // Code says: refBase === textureBase.
    // ref="models/skin.tga" -> base="models/skin"
    // search="models/skin" -> base="models/skin"
    // So yes.
    expect(result2.some(u => u.path === mockMd3)).toBe(true);
  });
});
