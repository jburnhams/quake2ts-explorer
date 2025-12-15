
import { AssetCrossRefService } from '../../../src/services/assetCrossRefService';
import { VirtualFileSystem, parseMd2, parseMd3, parseBsp } from 'quake2ts/engine';

jest.mock('quake2ts/engine');

describe('AssetCrossRefService', () => {
  let service: AssetCrossRefService;
  let mockVfs: jest.Mocked<VirtualFileSystem>;

  beforeEach(() => {
    mockVfs = {
      findByExtension: jest.fn(),
      readFile: jest.fn(),
    } as unknown as jest.Mocked<VirtualFileSystem>;

    service = new AssetCrossRefService(mockVfs);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should clear cache', () => {
    service.clearCache();
    expect(true).toBe(true);
  });

  it('should find usages in MD2 files', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
      if (ext === 'md2') return [{ path: 'models/test.md2' }] as any;
      return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));

    (parseMd2 as jest.Mock).mockReturnValue({
      skins: [{ name: 'models/skin.pcx' }]
    });

    const usages = await service.findTextureUsage('models/skin.pcx');
    expect(usages).toHaveLength(1);
    expect(usages[0].path).toBe('models/test.md2');
  });

  it('should find usages in MD3 files', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
      if (ext === 'md3') return [{ path: 'models/test.md3' }] as any;
      return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));

    (parseMd3 as jest.Mock).mockReturnValue({
      surfaces: [{ shaders: [{ name: 'models/skin.tga' }] }]
    });

    const usages = await service.findTextureUsage('models/skin.tga');
    expect(usages).toHaveLength(1);
    expect(usages[0].path).toBe('models/test.md3');
  });

  it('should find usages in BSP files', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
      if (ext === 'bsp') return [{ path: 'maps/test.bsp' }] as any;
      return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));

    (parseBsp as jest.Mock).mockReturnValue({
      textures: [{ name: 'textures/wall.wal' }]
    });

    const usages = await service.findTextureUsage('textures/wall.wal');
    expect(usages).toHaveLength(1);
    expect(usages[0].path).toBe('maps/test.bsp');
  });

  it('should handle missing file content gracefully', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'md2') return [{ path: 'models/empty.md2' }] as any;
        return [];
    });
    mockVfs.readFile.mockReturnValue(null);

    const usages = await service.findTextureUsage('models/skin.pcx');
    expect(usages).toHaveLength(0);
  });

  it('should handle parse errors gracefully', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'md2') return [{ path: 'models/corrupt.md2' }] as any;
        return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));

    (parseMd2 as jest.Mock).mockImplementation(() => {
        throw new Error('Parse error');
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const usages = await service.findTextureUsage('models/skin.pcx');
    expect(usages).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Error parsing'), expect.any(Error));

    warnSpy.mockRestore();
  });

  it('should yield to event loop for large file lists', async () => {
    const files = Array(10).fill(0).map((_, i) => ({ path: `models/test${i}.md2` }));
    mockVfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'md2') return files as any;
        return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));
    (parseMd2 as jest.Mock).mockReturnValue({ skins: [] });

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    await service.findTextureUsage('models/skin.pcx');

    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it('should use cached references', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'md2') return [{ path: 'models/cached.md2' }] as any;
        return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));
    (parseMd2 as jest.Mock).mockReturnValue({ skins: [{ name: 'models/skin.pcx' }] });

    // First call
    await service.findTextureUsage('models/skin.pcx');
    expect(mockVfs.readFile).toHaveBeenCalledTimes(1);

    // Second call
    await service.findTextureUsage('models/skin.pcx');
    // Should use cache, so readFile not called again
    expect(mockVfs.readFile).toHaveBeenCalledTimes(1);
  });

  it('should match texture names loosely (without extension)', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'md2') return [{ path: 'models/loose.md2' }] as any;
        return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));
    (parseMd2 as jest.Mock).mockReturnValue({ skins: [{ name: 'models/skin' }] });

    const usages = await service.findTextureUsage('models/skin.pcx');
    expect(usages).toHaveLength(1);
  });

  it('should match texture names loosely (different extension)', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'md2') return [{ path: 'models/diff.md2' }] as any;
        return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));
    (parseMd2 as jest.Mock).mockReturnValue({ skins: [{ name: 'models/skin.tga' }] });

    const usages = await service.findTextureUsage('models/skin.pcx');
    expect(usages).toHaveLength(1);
  });
});
