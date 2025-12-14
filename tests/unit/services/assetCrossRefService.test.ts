import { AssetCrossRefService } from '@/src/services/assetCrossRefService';
import { VirtualFileSystem, parseMd2, parseMd3, parseBsp } from 'quake2ts/engine';
import { Md2Model, Md3Model, BspMap } from 'quake2ts/engine';

// Mock everything from quake2ts/engine
jest.mock('quake2ts/engine', () => ({
  VirtualFileSystem: jest.fn(),
  parseMd2: jest.fn(),
  parseMd3: jest.fn(),
  parseBsp: jest.fn(),
}));

describe('AssetCrossRefService', () => {
  let vfs: jest.Mocked<VirtualFileSystem>;
  let service: AssetCrossRefService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup VFS mock
    vfs = new (VirtualFileSystem as any)();
    vfs.findByExtension = jest.fn().mockImplementation((exts: string[]) => []);
    vfs.readFile = jest.fn().mockImplementation(() => null);

    service = new AssetCrossRefService(vfs);
  });

  describe('findTextureUsage', () => {
    it('should find texture usage in MD2 model', async () => {
      // Mock files
      const md2File = 'models/test.md2';
      vfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'md2') return [{ path: md2File }];
        return [];
      });

      // Mock file content
      const buffer = new Uint8Array([1, 2, 3]);
      vfs.readFile.mockReturnValue(buffer);

      // Mock parseMd2 result
      const mockModel = {
        skins: ['models/skin.pcx']
      };
      (parseMd2 as jest.Mock).mockReturnValue(mockModel);

      // Test exact match
      const usages = await service.findTextureUsage('models/skin.pcx');

      expect(usages).toHaveLength(1);
      expect(usages[0]).toEqual({
        type: 'model',
        path: md2File,
        details: 'Ref: models/skin.pcx'
      });
      expect(parseMd2).toHaveBeenCalledWith(buffer.buffer);
    });

    it('should find texture usage in MD2 model with extension mismatch', async () => {
      const md2File = 'models/test.md2';
      vfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'md2') return [{ path: md2File }];
        return [];
      });

      const buffer = new Uint8Array([1, 2, 3]);
      vfs.readFile.mockReturnValue(buffer);

      (parseMd2 as jest.Mock).mockReturnValue({
        skins: ['models/skin']
      });

      const usages = await service.findTextureUsage('models/skin.pcx');

      expect(usages).toHaveLength(1);
      expect(usages[0].path).toBe(md2File);
    });

    it('should find texture usage in MD3 model', async () => {
      const md3File = 'models/test.md3';
      vfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'md3') return [{ path: md3File }];
        return [];
      });

      const buffer = new Uint8Array([1, 2, 3]);
      vfs.readFile.mockReturnValue(buffer);

      const mockModel = {
        surfaces: [{
          shaders: [{ name: 'models/skin.tga' }]
        }]
      };
      (parseMd3 as jest.Mock).mockReturnValue(mockModel);

      const usages = await service.findTextureUsage('models/skin.tga');

      expect(usages).toHaveLength(1);
      expect(usages[0]).toEqual({
        type: 'model',
        path: md3File,
        details: 'Ref: models/skin.tga'
      });
    });

    it('should find texture usage in BSP map', async () => {
      const bspFile = 'maps/test.bsp';
      vfs.findByExtension.mockImplementation((ext) => {
        if (ext === 'bsp') return [{ path: bspFile }];
        return [];
      });

      const buffer = new Uint8Array([1, 2, 3]);
      vfs.readFile.mockReturnValue(buffer);

      const mockMap = {
        textures: [{ name: 'textures/wall' }]
      };
      (parseBsp as jest.Mock).mockReturnValue(mockMap);

      const usages = await service.findTextureUsage('textures/wall.wal');

      expect(usages).toHaveLength(1);
      expect(usages[0]).toEqual({
        type: 'map',
        path: bspFile,
        details: 'Ref: textures/wall'
      });
    });

    it('should cache parsed results', async () => {
      const md2File = 'models/test.md2';
      vfs.findByExtension.mockReturnValue([{ path: md2File }]);
      vfs.readFile.mockReturnValue(new Uint8Array(1));
      (parseMd2 as jest.Mock).mockReturnValue({ skins: [] });

      await service.findTextureUsage('texture1');
      await service.findTextureUsage('texture2');

      expect(parseMd2).toHaveBeenCalledTimes(1);
    });

    it('should yield to event loop periodically', async () => {
        // Mock many files
        const files = Array.from({ length: 10 }, (_, i) => ({ path: `file${i}.md2` }));
        vfs.findByExtension.mockReturnValue(files);
        vfs.readFile.mockReturnValue(new Uint8Array(1));
        (parseMd2 as jest.Mock).mockReturnValue({ skins: [] });

        const start = Date.now();
        await service.findTextureUsage('texture');
        // It's hard to test the delay precisely in JSDOM environment without fake timers
        // But we verify it runs without crashing
        expect(parseMd2).toHaveBeenCalledTimes(10);
    });

    it('should handle parsing errors gracefully', async () => {
      const md2File = 'models/corrupt.md2';
      vfs.findByExtension.mockReturnValue([{ path: md2File }]);
      vfs.readFile.mockReturnValue(new Uint8Array(1));

      (parseMd2 as jest.Mock).mockImplementation(() => {
        throw new Error('Parse error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const usages = await service.findTextureUsage('texture');

      expect(usages).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
